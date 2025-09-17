// src/controllers/studentController.js
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

export const listStudents = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin only');
    }
    const { page, limit, skip } = getPaginationParams(req.query);
    const { q, gender, sort = 'createdAt:desc', allocationStatus } = req.query;

    // Parse sort (field:direction[,field:direction...])
    const sortSpec = {};
    if (sort) {
      const parts = String(sort).split(',');
      for (const p of parts) {
        const [field, dir] = p.split(':');
        if (['fullName','email','createdAt','updatedAt'].includes(field)) {
          sortSpec[field] = dir === 'asc' ? 1 : -1;
        }
      }
    }
    if (Object.keys(sortSpec).length === 0) { sortSpec.createdAt = -1; }

    // Base match
    const match = { role: 'student' };
  if (gender) { match.gender = gender; }
  if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ fullName: rx }, { email: rx }];
    }

    // Aggregation to optionally join allocation status
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'allocations', localField: '_id', foreignField: 'student', as: 'allocs' } },
      { $addFields: { currentAllocation: { $first: {
        $filter: { input: '$allocs', as: 'a', cond: { $in: ['$$a.status', ['pending','approved']] } }
      } } } },
    ];
  if (allocationStatus === 'approved') {
      pipeline.push({ $match: { 'currentAllocation.status': 'approved' } });
  } else if (allocationStatus === 'pending') {
      pipeline.push({ $match: { 'currentAllocation.status': 'pending' } });
  } else if (allocationStatus === 'none') {
      pipeline.push({ $match: { currentAllocation: { $eq: null } } });
    }
    pipeline.push(
      { $sort: sortSpec },
      { $skip: skip },
      { $limit: limit },
      { $project: { fullName:1, email:1, gender:1, createdAt:1, updatedAt:1, allocationStatus: '$currentAllocation.status' } }
    );

    const countPipeline = pipeline
      .filter(st => !st.$skip && !st.$limit && !st.$project && !st.$sort) // remove paging stages
      .concat([{ $count: 'total' }]);

    // Run both (need to re-run base pipeline without skip/limit for total; simpler to clone)
    const [items, totalArr] = await Promise.all([
      User.aggregate(pipeline),
      User.aggregate(countPipeline)
    ]);
    const total = totalArr[0]?.total || 0;
    const paged = buildPagedResponse({ items, total, page, limit });
    return res.json({
      items: paged.data,
      page: paged.meta.page,
      limit: paged.meta.limit,
      total: paged.meta.total,
      totalPages: paged.meta.pageCount
    });
  } catch (err) {
    return next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    const user = await User.findById(studentId).select("-password");
    if (!user) {
      throw new NotFoundError("Student not found");
    }
    const allocation = await Allocation.findOne({ student: studentId })
      .populate({ path: "room", populate: { path: "hostel", model: "Hostel" } })
      .lean();
    return res.json({
      personal: user,
      allocation: allocation
        ? {
            status: allocation.status,
            hostel: allocation.room?.hostel?.name,
            hostelId: allocation.room?.hostel?._id,
            roomNumber: allocation.room?.roomNumber,
            allocatedAt: allocation.allocatedAt,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    const updates = { ...(req.validated || req.body) };
    delete updates.role;
    delete updates.password;
    const updated = await User.findByIdAndUpdate(studentId, updates, { new: true }).select("-password");
    if (!updated) {
      throw new NotFoundError("Student not found");
    }
    return res.json({ status: "updated", user: updated });
  } catch (err) {
    return next(err);
  }
};

export const updatePersonalityTraits = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError("Forbidden");
    }
    const user = await User.findById(studentId);
    if (!user) {
      throw new NotFoundError("Student not found");
    }
    const traits = req.validated?.body?.personalityTraits || req.body.personalityTraits;
    if (!traits || Object.keys(traits).length === 0) {
      throw new ValidationError("No traits provided");
    }
    user.personalityTraits = { ...(user.personalityTraits || {}), ...traits };
    await user.save();
    return res.json({ status: "updated", personalityTraits: user.personalityTraits });
  } catch (err) {
    return next(err);
  }
};

// avatar upload handler (expects multer has run and put file on req.file)
export const uploadAvatar = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    if (!req.file) {
      throw new ValidationError("No file uploaded");
    }
    const profilePicPath = `/${req.file.path.replace(/\\/g, "/")}`;
    const updated = await User.findByIdAndUpdate(studentId, { profilePic: profilePicPath }, { new: true }).select("-password");
    return res.json({ status: "success", profilePic: profilePicPath, user: updated });
  } catch (err) {
    return next(err);
  }
};

export const getRoommate = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    const allocation = await Allocation.findOne({ student: studentId, status: "approved" }).populate("room");
    if (!allocation) {
      throw new NotFoundError("No active allocation found for student");
    }
    const roommateAlloc = await Allocation.findOne({ room: allocation.room._id, student: { $ne: studentId }, status: "approved" }).populate("student", "fullName matricNumber");
    if (!roommateAlloc) {
      return res.json({ message: "No roommate assigned yet" });
    }
    return res.json({
      id: roommateAlloc.student._id,
      name: roommateAlloc.student.fullName,
      personality: roommateAlloc.student.personality || null,
      compatibility: { score: 88, matchingTraits: [] },
    });
  } catch (err) {
    return next(err);
  }
};
