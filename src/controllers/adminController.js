// src/controllers/adminController.js

import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

export const listStudents = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [students, total] = await Promise.all([
      User.find({ role: "student" }).select("fullName matricNumber level email").skip(skip).limit(limit),
      User.countDocuments({ role: "student" })
    ]);
    const studentsWithStatus = await Promise.all(students.map(async (s) => {
      const allocation = await Allocation.findOne({ student: s._id }).sort({ allocatedAt: -1 }).lean();
      return { id: s._id, fullName: s.fullName, matricNumber: s.matricNumber, level: s.level, status: allocation ? allocation.status : "pending" };
    }));
    return res.json(buildPagedResponse({ items: studentsWithStatus, total, page, limit }));
  } catch (err) {
    return next(err);
  }
};

  // Super-admin creates an admin user
  export const createAdminUser = async (req, res, next) => {
    try {
      const { fullName, email, password, phone } = req.validated || req.body;
      if (!fullName || !email || !password) throw new ValidationError("fullName, email and password required");
      const existing = await User.findOne({ email });
      if (existing) throw new ValidationError("Email already in use");
      const hashed = await bcrypt.hash(password, 10);
      const admin = await User.create({ fullName, email, password: hashed, phone, role: "admin" });
      return res.status(201).json({ id: admin._id, status: "admin created" });
    } catch (err) {
      return next(err);
    }
  };
export const updateStudentStatus = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { status } = req.validated || req.body;
    if (!["allocated", "pending", "rejected"].includes(status)) throw new ValidationError("Invalid status");
    const allocation = await Allocation.findOne({ student: studentId }).sort({ allocatedAt: -1 });
    if (!allocation) throw new NotFoundError("Allocation not found for student");
    allocation.status = status;
    await allocation.save();
    return res.json({ id: allocation._id, status: allocation.status });
  } catch (err) {
    return next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalRooms = await Room.countDocuments();
    const rooms = await Room.find().select("capacity occupied").lean();
    const occupiedRooms = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
    return res.json({ totalStudents, totalRooms, occupiedRooms, availableRooms: Math.max(0, totalCapacity - occupiedRooms) });
  } catch (err) {
    return next(err);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { type = "allocations", format = "csv" } = req.query;
    if (format !== "csv") throw new ValidationError("Only csv export supported in this endpoint");
    if (type === "students") {
      const students = await User.find({ role: "student" }).select("fullName matricNumber email level").lean();
      const header = "id,fullName,matricNumber,email,level\n";
      const csv = header + students.map((s) => `${s._id},${s.fullName},${s.matricNumber},${s.email},${s.level}`).join("\n");
      res.header("Content-Type", "text/csv");
      res.attachment("students.csv");
      return res.send(csv);
    }
    if (type === "rooms") {
      const rooms = await Room.find().populate("hostel", "name").lean();
      const header = "id,hostel,roomNumber,type,capacity,occupied\n";
      const csv = header + rooms.map((r) => `${r._id},${r.hostel?.name || ""},${r.roomNumber},${r.type},${r.capacity},${r.occupied || 0}`).join("\n");
      res.header("Content-Type", "text/csv");
      res.attachment("rooms.csv");
      return res.send(csv);
    }
    const allocs = await Allocation.find().populate("student", "fullName matricNumber").populate("room", "roomNumber").lean();
    const header = "id,student,matricNumber,roomNumber,status,allocatedAt\n";
    const csv = header + allocs.map((a) => `${a._id},${a.student?.fullName || ""},${a.student?.matricNumber || ""},${a.room?.roomNumber || ""},${a.status},${a.allocatedAt || ""}`).join("\n");
    res.header("Content-Type", "text/csv");
    res.attachment("allocations.csv");
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};
