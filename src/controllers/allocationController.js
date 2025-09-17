// src/controllers/allocationController.js
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { logInfo, logError } from "../utils/logger.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";
import { allocateStudent, recordApprovedPairing, listApprovedPairings, traitSignature, getCachedSuggestions, cacheSuggestions, computeCompatibility } from "../services/allocationAlgorithm.js";
import { submitStudentAllocation } from "../services/allocationSubmission.js";

export const submitAllocation = async (req, res, next) => {
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    const t0 = Date.now();
    const sessionMongo = await Allocation.startSession();
    try {
      sessionMongo.startTransaction();
      const studentId = req.user._id;
      const { session: academicSessionLabel } = req.validated || req.body;
      const { allocation, paired, compatibilityMeta } = await submitStudentAllocation({
        session: sessionMongo,
        studentId,
        sessionLabel: academicSessionLabel
      });
      await sessionMongo.commitTransaction();
      sessionMongo.endSession();
      logInfo('allocation.submit.success', {
        allocationId: allocation._id.toString(),
        paired,
        compatibilityRange: compatibilityMeta?.range,
        durationMs: Date.now() - t0,
        attempt: attempt + 1
      });
      return res.status(201).json({
        id: allocation._id,
        status: allocation.status,
        autoPaired: paired,
        roomId: allocation.room || null,
        compatibility: compatibilityMeta,
      });
    } catch (err) {
      await sessionMongo.abortTransaction().catch(() => {});
      sessionMongo.endSession();
      // Transient retryable conditions:
      // 112 = WriteConflict / transient transaction error
      // 24  = LockTimeout (unable to acquire collection/DB lock quickly) observed in CI under contention
      if ([112, 24].includes(err?.code) && attempt < maxRetries - 1) {
        const backoff = 50 * Math.pow(2, attempt); // 50ms, 100ms, 200ms
        logError('allocation.submit.retry', { attempt: attempt + 1, backoffMs: backoff, code: err.code, message: err.message });
        await new Promise(r => setTimeout(r, backoff));
        attempt += 1;
        continue; // retry
      }
      logError('allocation.submit.error', { message: err.message, stack: err.stack, attempt: attempt + 1, code: err.code });
      if (err?.code === 11000) {
        return next(new ValidationError("Allocation for this student & session already exists"));
      }
      return next(err);
    }
  }
};

export const adminCreateAllocation = async (req, res, next) => {
  try {
    const { studentId, roomId, session } = req.validated || req.body;
    if (!studentId || !roomId) {
      throw new ValidationError("studentId and roomId required");
    }
    const student = await User.findById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }
    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }
    if ((room.occupied || 0) + 1 > (room.capacity || 0)) {
      throw new ValidationError("Room is full");
    }
    const allocation = await Allocation.create({
      student: studentId,
      room: roomId,
      session: session || new Date().getFullYear().toString(),
      status: "approved",
      allocatedAt: new Date(),
    });
    room.occupied = (room.occupied || 0) + 1;
    await room.save();
    return res.status(201).json({ id: allocation._id, status: "allocated" });
  } catch (err) {
    return next(err);
  }
};

export const listAllocations = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const {
      session,
      status,
      gender,
      department,
      level,
      allocatedFrom,
      allocatedTo,
    } = req.query || {};

    // Build initial match for allocation-level filters
    const match = {};
  if (session) { match.session = session; }
  if (status) { match.status = status; }
    if (allocatedFrom || allocatedTo) {
      const range = {};
      if (allocatedFrom) {
        const d = new Date(allocatedFrom);
        if (!isNaN(d)) { range.$gte = d; }
      }
      if (allocatedTo) {
        const d = new Date(allocatedTo);
        if (!isNaN(d)) { range.$lte = d; }
      }
      if (Object.keys(range).length) { match.allocatedAt = range; }
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: match },
      { $sort: { allocatedAt: -1, _id: -1 } },
      // Join student
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      // Student-level filters
      {
        $match: {
          ...(gender ? { 'student.gender': gender } : {}),
          ...(department ? { 'student.department': department } : {}),
          ...(level ? { 'student.level': level } : {}),
        }
      },
      // Join room
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'room'
        }
      },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
      // Join hostel
      {
        $lookup: {
          from: 'hostels',
          localField: 'room.hostel',
          foreignField: '_id',
          as: 'hostel'
        }
      },
      { $unwind: { path: '$hostel', preserveNullAndEmptyArrays: true } },
      // Shape output
      {
        $project: {
          id: '$_id',
          _id: 0,
          status: 1,
          session: 1,
            allocatedAt: 1,
          autoPaired: 1,
          compatibility: {
            score: '$compatibilityScore',
            range: '$compatibilityRange'
          },
          student: {
            id: '$student._id',
            fullName: '$student.fullName',
            matricNumber: '$student.matricNumber',
            email: '$student.email',
            gender: '$student.gender',
            level: '$student.level',
            department: '$student.department'
          },
          room: '$room._id',
          roomDetails: {
            $cond: [
              { $ifNull: ['$room._id', false] },
              {
                roomNumber: '$room.roomNumber',
                type: '$room.type',
                capacity: '$room.capacity'
              },
              null
            ]
          },
          hostel: {
            $cond: [
              { $ifNull: ['$hostel._id', false] },
              { id: '$hostel._id', name: '$hostel.name', type: '$hostel.type' },
              null
            ]
          }
        }
      },
      // Pagination facet
      {
        $facet: {
          meta: [ { $count: 'total' } ],
          data: [ { $skip: skip }, { $limit: limit } ]
        }
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [ { $arrayElemAt: [ '$meta.total', 0 ] }, 0 ] }
        }
      }
    ];

    const aggResult = await Allocation.aggregate(pipeline);
    const { data = [], total = 0 } = aggResult[0] || {};
    return res.json(buildPagedResponse({ items: data, total, page, limit }));
  } catch (err) {
    return next(err);
  }
};

export const getAllocationStatus = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError("Forbidden");
    }
    const allocation = await Allocation.findOne({ student: studentId }).populate({ path: "room", populate: { path: "hostel", model: "Hostel" } });
    if (!allocation) {
      return res.json({ status: "pending", roomDetails: null });
    }
    return res.json({
      status: allocation.status,
      roomDetails: allocation.room
        ? {
            hostelId: allocation.room.hostel?._id,
            roomNumber: allocation.room.roomNumber,
            type: allocation.room.type,
            capacity: allocation.room.capacity,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/allocations/:studentId/match-suggestions
export const getMatchSuggestions = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError("Forbidden");
    }
    const target = await User.findById(studentId).lean();
    if (!target) {
      throw new NotFoundError("Student not found");
    }
    // limit candidate pool for now (same gender & not already allocated approved)
    const candidateUsers = await User.find({ _id: { $ne: studentId }, role: "student" }).lean();
    const sig = traitSignature(target);
    const cached = getCachedSuggestions(studentId, sig);
    let grouped;
    if (cached) {
      grouped = cached;
    } else {
      grouped = allocateStudent(target, candidateUsers, {});
      cacheSuggestions(studentId, sig, grouped);
    }
    return res.json({
      studentId,
      generatedAt: new Date().toISOString(),
      suggestions: grouped,
      info: {
        rangeDefinitions: {
          veryHigh: "85-100 auto-pair eligible (capacity permitting)",
          high: "70-84 strong match (suggest / may require approval)",
          moderate: "55-69 review needed",
          low: "<55 generally not recommended",
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/allocations/approve-pairing  { studentIdA, studentIdB }
export const approvePairing = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      throw new ForbiddenError("Admin only");
    }
    const { studentIdA, studentIdB } = req.body || {};
    if (!studentIdA || !studentIdB) {
      throw new ValidationError("studentIdA and studentIdB required");
    }
    const [a, b] = await Promise.all([User.findById(studentIdA), User.findById(studentIdB)]);
    if (!a || !b) {
      throw new NotFoundError("One or both students not found");
    }
    const doc = await recordApprovedPairing({ studentIdA, studentIdB, approvedBy: req.user._id });
    return res.status(201).json({ status: "recorded", id: doc._id });
  } catch (err) {
    return next(err);
  }
};

// GET /api/allocations/approved-pairings (admin)
export const getApprovedPairings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      throw new ForbiddenError("Admin only");
    }
    const items = await listApprovedPairings();
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
};

// Auto allocate two students into a specified room if compatibility qualifies and capacity allows.
// POST /api/allocations/auto-allocate { studentIdA, studentIdB, roomId }
export const autoAllocatePair = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      throw new ForbiddenError("Admin only");
    }
    const { studentIdA, studentIdB, roomId } = req.body || {};
    if (!studentIdA || !studentIdB || !roomId) {
      throw new ValidationError("studentIdA, studentIdB and roomId required");
    }
    if (studentIdA === studentIdB) {
      throw new ValidationError("studentIdA and studentIdB must differ");
    }
    const [a, b, room] = await Promise.all([
      User.findById(studentIdA),
      User.findById(studentIdB),
      Room.findById(roomId),
    ]);
    if (!a || !b) { throw new NotFoundError("One or both students not found"); }
    if (!room) { throw new NotFoundError("Room not found"); }

    // Check existing allocations for either student
    const existing = await Allocation.find({ student: { $in: [a._id, b._id] }, status: { $in: ["approved"] } });
    if (existing.length) {
      throw new ValidationError("One or both students already allocated");
    }

    // Compute compatibility fresh (not from cache) for accuracy
    const { score, range } = computeCompatibility(a.toObject(), b.toObject());
    if (!['veryHigh','high'].includes(range)) {
      throw new ValidationError("Pair not eligible for auto allocation (needs higher compatibility)");
    }

    // Capacity check (assume both will reside in same room)
    const needed = 2;
    const remaining = (room.capacity || 0) - (room.occupied || 0);
    if (remaining < needed) {
      throw new ValidationError("Room does not have enough remaining capacity");
    }

    const session = new Date().getFullYear().toString();
    const allocDocs = await Allocation.insertMany([
      { student: a._id, room: room._id, session, status: 'approved', allocatedAt: new Date(), compatibilityScore: score, compatibilityRange: range, autoPaired: true },
      { student: b._id, room: room._id, session, status: 'approved', allocatedAt: new Date(), compatibilityScore: score, compatibilityRange: range, autoPaired: true },
    ]);
    room.occupied = (room.occupied || 0) + 2;
    await room.save();

    return res.status(201).json({
      status: 'auto-allocated',
      compatibility: { score, range },
      allocations: allocDocs.map(d => ({ id: d._id, student: d.student })),
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/allocations/:allocationId/reallocate  { targetRoomId }
export const reallocate = async (req, res, next) => {
  let mongoSession;
  try {
  const t0 = Date.now();
  mongoSession = await Allocation.startSession();
    mongoSession.startTransaction();
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin only');
    }
    const { allocationId } = req.params;
    const { targetRoomId } = req.body || {};
    if (!targetRoomId) {
      throw new ValidationError('targetRoomId required');
    }
  const allocation = await Allocation.findById(allocationId).populate('student').session(mongoSession);
    if (!allocation) {
      throw new NotFoundError('Allocation not found');
    }
  const targetRoom = await Room.findById(targetRoomId).populate('hostel').session(mongoSession);
    if (!targetRoom) {
      throw new NotFoundError('Target room not found');
    }
    if ((targetRoom.occupied || 0) >= (targetRoom.capacity || 0)) {
      throw new ValidationError('Target room is full');
    }
    if (allocation.student.gender && targetRoom.hostel && targetRoom.hostel.type && allocation.student.gender !== targetRoom.hostel.type) {
      throw new ValidationError('Gender-hostel type mismatch');
    }
    // Load current occupants (excluding this allocation if already assigned)
  const occupantAllocs = await Allocation.find({ room: targetRoom._id, status: 'approved' }).populate('student').session(mongoSession);
    const movingStudent = allocation.student.toObject ? allocation.student.toObject() : allocation.student;
    // Verify compatibility with each existing occupant
    for (const occ of occupantAllocs) {
      const { range } = computeCompatibility(movingStudent, occ.student.toObject ? occ.student.toObject() : occ.student);
      if (!['veryHigh','high','moderate'].includes(range)) {
        throw new ValidationError('Compatibility requirements not met with one or more occupants');
      }
    }
    // Adjust old room occupancy if previously assigned
    let oldRoom = null;
    if (allocation.room) {
      oldRoom = await Room.findById(allocation.room).session(mongoSession);
    }
    allocation.room = targetRoom._id;
    allocation.status = 'approved';
    allocation.allocatedAt = new Date();
    allocation.autoPaired = false;
  await allocation.save({ session: mongoSession });

    targetRoom.occupied = (targetRoom.occupied || 0) + 1;
  await targetRoom.save({ session: mongoSession });
    if (oldRoom && oldRoom._id.toString() !== targetRoom._id.toString()) {
      oldRoom.occupied = Math.max(0, (oldRoom.occupied || 1) - 1);
      await oldRoom.save({ session: mongoSession });
    }
    await mongoSession.commitTransaction();
    mongoSession.endSession();
  logInfo('allocation.reallocate.success', { allocationId: allocation._id.toString(), targetRoomId, durationMs: Date.now() - t0 });
    return res.json({ status: 'reallocated', allocationId: allocation._id, roomId: targetRoom._id });
  } catch (err) {
    // Abort if active transaction
    try {
      if (mongoSession) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
      }
  } catch { /* swallow */ }
    logError('allocation.reallocate.error', { message: err.message, stack: err.stack, allocationId: req.params.allocationId });
    return next(err);
  }
};
