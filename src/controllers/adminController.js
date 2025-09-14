// src/controllers/adminController.js

import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";

export const listStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select(
      "fullName matricNumber level email"
    );

    const studentsWithStatus = await Promise.all(
      students.map(async (s) => {
        const allocation = await Allocation.findOne({ student: s._id }).sort({ allocatedAt: -1 }).lean();
        return {
          id: s._id,
          fullName: s.fullName,
          matricNumber: s.matricNumber,
          level: s.level,
          status: allocation ? allocation.status : "pending",
        };
      })
    );

    return res.json(studentsWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

  // Super-admin creates an admin user
  export const createAdminUser = async (req, res) => {
    try {
      // Only super-admin can access (enforced by route)
      const { fullName, email, password, phone } = req.body;
      if (!fullName || !email || !password) {
        return res.status(400).json({ message: "fullName, email and password required" });
      }
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ message: "Email already in use" });
      const hashed = await bcrypt.hash(password, 10);
      const admin = await User.create({
        fullName,
        email,
        password: hashed,
        phone,
        role: "admin"
      });
      return res.status(201).json({ id: admin._id, status: "admin created" });
    } catch (err) {
      console.error("Create admin error:", err);
      return res.status(500).json({ message: err.message });
    }
  };
export const updateStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.body; // allocated|pending|rejected
    if (!["allocated", "pending", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const allocation = await Allocation.findOne({ student: studentId }).sort({ allocatedAt: -1 });
    if (!allocation) return res.status(404).json({ message: "Allocation not found for student" });

    allocation.status = status;
    await allocation.save();

    return res.json({ id: allocation._id, status: allocation.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getSummary = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalRooms = await Room.countDocuments();
    const rooms = await Room.find().select("capacity occupied").lean();
    const occupiedRooms = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);

    return res.json({
      totalStudents,
      totalRooms,
      occupiedRooms,
      availableRooms: Math.max(0, totalCapacity - occupiedRooms),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    // query params: type=allocations|students|rooms, format=csv|pdf (we'll implement csv)
    const { type = "allocations", format = "csv" } = req.query;
    if (format !== "csv") return res.status(400).json({ message: "Only csv export supported in this endpoint" });

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
      const csv =
        header +
        rooms
          .map((r) => `${r._id},${r.hostel?.name || ""},${r.roomNumber},${r.type},${r.capacity},${r.occupied || 0}`)
          .join("\n");
      res.header("Content-Type", "text/csv");
      res.attachment("rooms.csv");
      return res.send(csv);
    }

    // default allocations
    const allocs = await Allocation.find()
      .populate("student", "fullName matricNumber")
      .populate("room", "roomNumber")
      .lean();
    const header = "id,student,matricNumber,roomNumber,status,allocatedAt\n";
    const csv =
      header +
      allocs
        .map((a) => `${a._id},${a.student?.fullName || ""},${a.student?.matricNumber || ""},${a.room?.roomNumber || ""},${a.status},${a.allocatedAt || ""}`)
        .join("\n");

    res.header("Content-Type", "text/csv");
    res.attachment("allocations.csv");
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
