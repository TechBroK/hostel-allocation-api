// src/controllers/roomController.js
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";

/**
 * @desc    Create a new room in a hostel (Admin only)
 * @route   POST /api/rooms/:hostelId/rooms
 * @access  Admin
 */
export const createRoom = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { roomNumber, type, capacity } = req.body;

    if (!roomNumber || !type || !capacity) {
      return res.status(400).json({ message: "roomNumber, type and capacity are required" });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // prevent duplicate room numbers in same hostel
    const exists = await Room.findOne({ hostel: hostelId, roomNumber });
    if (exists) {
      return res.status(409).json({ message: "Room number already exists in this hostel" });
    }

    const room = await Room.create({
      hostel: hostelId,
      roomNumber,
      type,
      capacity,
      occupied: 0
    });

    return res.status(201).json({ id: room._id, status: "created" });
  } catch (err) {
    console.error("CreateRoom error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    List all rooms in a hostel
 * @route   GET /api/rooms/hostel/:hostelId
 * @access  Public
 */
export const listRoomsByHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const rooms = await Room.find({ hostel: hostelId }).lean();

    return res.json(
      rooms.map((r) => ({
        id: r._id,
        roomNumber: r.roomNumber,
        type: r.type,
        capacity: r.capacity,
        occupied: r.occupied
      }))
    );
  } catch (err) {
    console.error("ListRooms error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get details of a single room
 * @route   GET /api/rooms/:id
 * @access  Public
 */
export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id).populate("hostel", "name type capacity").lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.json({
      id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      occupied: room.occupied,
      hostel: room.hostel ? { id: room.hostel._id, name: room.hostel.name, type: room.hostel.type } : null
    });
  } catch (err) {
    console.error("GetRoom error:", err);
    return res.status(500).json({ message: err.message });
  }
};
