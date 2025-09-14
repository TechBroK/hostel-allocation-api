// src/controllers/allocationController.js
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

export const submitAllocation = async (req, res) => {
  try {
    // authenticated student submits a request
    const studentId = req.user._id;
    const { roomPreference, personalityTraits, studentDetails, session } = req.body;

    // Basic check: prevent duplicate pending requests
    const existing = await Allocation.findOne({ student: studentId, status: { $in: ["pending", "approved"] } });
    if (existing) {
      return res.status(400).json({ message: "You already have a pending/approved allocation" });
    }

    const allocation = await Allocation.create({
      student: studentId,
      room: roomPreference?.roomId || null,
      session: session || new Date().getFullYear().toString(),
      status: "pending",
    });

    return res.status(201).json({ id: allocation._id, status: "pending", submittedAt: allocation.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const adminCreateAllocation = async (req, res) => {
  try {
    const { studentId, roomId, session } = req.body;
    if (!studentId || !roomId) return res.status(400).json({ message: "studentId and roomId required" });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if ((room.occupied || 0) + 1 > (room.capacity || 0))
      return res.status(400).json({ message: "Room is full" });

    // set any previous allocations to inactive? For now, create approved allocation
    const allocation = await Allocation.create({
      student: studentId,
      room: roomId,
      session: session || new Date().getFullYear().toString(),
      status: "approved",
      allocatedAt: new Date(),
    });

    // increment room occupied
    room.occupied = (room.occupied || 0) + 1;
    await room.save();

    return res.status(201).json({ id: allocation._id, status: "allocated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const listAllocations = async (req, res) => {
  try {
    const allocations = await Allocation.find()
      .populate("student", "fullName matricNumber email")
      .populate({
        path: "room",
        populate: { path: "hostel", model: "Hostel" },
      })
      .sort({ allocatedAt: -1 })
      .lean();

    return res.json(allocations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllocationStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const allocation = await Allocation.findOne({ student: studentId }).populate({
      path: "room",
      populate: { path: "hostel", model: "Hostel" },
    });

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
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
