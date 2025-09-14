// src/controllers/complaintController.js
import Complaint from "../models/Complaint.js";

export const createComplaint = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const { type, description } = req.body;
    if (!type || !description) return res.status(400).json({ message: "type and description required" });

    const complaint = await Complaint.create({
      student: studentId,
      type,
      description,
      status: "Pending",
      response: null,
    });

    return res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getComplaintsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const complaints = await Complaint.find({ student: studentId }).sort({ date: -1 });
    return res.json({ complaints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
