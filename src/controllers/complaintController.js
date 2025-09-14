// src/controllers/complaintController.js
import Complaint from "../models/Complaint.js";
import { ValidationError, ForbiddenError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

export const createComplaint = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    const { type, description } = req.validated || req.body;
    if (!type || !description) {
      throw new ValidationError("type and description required");
    }
    const complaint = await Complaint.create({ student: studentId, type, description, status: "Pending", response: null });
    return res.status(201).json(complaint);
  } catch (err) {
    return next(err);
  }
};

export const getComplaintsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId) {
      throw new ForbiddenError();
    }
    const { page, limit, skip } = getPaginationParams(req.query);
    const [complaints, total] = await Promise.all([
      Complaint.find({ student: studentId }).sort({ date: -1 }).skip(skip).limit(limit),
      Complaint.countDocuments({ student: studentId })
    ]);
    return res.json(buildPagedResponse({ items: complaints, total, page, limit }));
  } catch (err) {
    return next(err);
  }
};
