// src/controllers/studentController.js
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError.js";

export const getProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) throw new ForbiddenError();
    const user = await User.findById(studentId).select("-password");
    if (!user) throw new NotFoundError("Student not found");
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
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) throw new ForbiddenError();
    const updates = { ...(req.validated || req.body) };
    delete updates.role;
    delete updates.password;
    const updated = await User.findByIdAndUpdate(studentId, updates, { new: true }).select("-password");
    if (!updated) throw new NotFoundError("Student not found");
    return res.json({ status: "updated", user: updated });
  } catch (err) {
    return next(err);
  }
};

// avatar upload handler (expects multer has run and put file on req.file)
export const uploadAvatar = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) throw new ForbiddenError();
    if (!req.file) throw new ValidationError("No file uploaded");
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
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) throw new ForbiddenError();
    const allocation = await Allocation.findOne({ student: studentId, status: "approved" }).populate("room");
    if (!allocation) throw new NotFoundError("No active allocation found for student");
    const roommateAlloc = await Allocation.findOne({ room: allocation.room._id, student: { $ne: studentId }, status: "approved" }).populate("student", "fullName matricNumber");
    if (!roommateAlloc) return res.json({ message: "No roommate assigned yet" });
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
