// src/controllers/allocationController.js
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

export const submitAllocation = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { roomPreference, session } = req.validated || req.body;
    const existing = await Allocation.findOne({ student: studentId, status: { $in: ["pending", "approved"] } });
    if (existing) throw new ValidationError("You already have a pending/approved allocation");
    const allocation = await Allocation.create({
      student: studentId,
      room: roomPreference?.roomId || null,
      session: session || new Date().getFullYear().toString(),
      status: "pending",
    });
    return res.status(201).json({ id: allocation._id, status: "pending", submittedAt: allocation.createdAt });
  } catch (err) {
    return next(err);
  }
};

export const adminCreateAllocation = async (req, res, next) => {
  try {
    const { studentId, roomId, session } = req.validated || req.body;
    if (!studentId || !roomId) throw new ValidationError("studentId and roomId required");
    const student = await User.findById(studentId);
    if (!student) throw new NotFoundError("Student not found");
    const room = await Room.findById(roomId);
    if (!room) throw new NotFoundError("Room not found");
    if ((room.occupied || 0) + 1 > (room.capacity || 0)) throw new ValidationError("Room is full");
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
    const [allocations, total] = await Promise.all([
      Allocation.find()
        .populate("student", "fullName matricNumber email")
        .populate({ path: "room", populate: { path: "hostel", model: "Hostel" } })
        .sort({ allocatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Allocation.countDocuments()
    ]);
    return res.json(buildPagedResponse({ items: allocations, total, page, limit }));
  } catch (err) {
    return next(err);
  }
};

export const getAllocationStatus = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) throw new ForbiddenError("Forbidden");
    const allocation = await Allocation.findOne({ student: studentId }).populate({ path: "room", populate: { path: "hostel", model: "Hostel" } });
    if (!allocation) return res.json({ status: "pending", roomDetails: null });
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
