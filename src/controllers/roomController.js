// src/controllers/roomController.js
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

/**
 * @desc    Create a new room in a hostel (Admin only)
 * @route   POST /api/rooms/:hostelId/rooms
 * @access  Admin
 */
export const createRoom = async (req, res, next) => {
  try {
    const { hostelId } = req.params;
    const { roomNumber, type, capacity } = req.validated || req.body;
    if (!roomNumber || !type || capacity == null) throw new ValidationError("roomNumber, type and capacity are required");
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new NotFoundError("Hostel not found");
    const exists = await Room.findOne({ hostel: hostelId, roomNumber });
    if (exists) throw new ValidationError("Room number already exists in this hostel");
    const room = await Room.create({ hostel: hostelId, roomNumber, type, capacity, occupied: 0 });
    return res.status(201).json({ id: room._id, status: "created" });
  } catch (err) {
    return next(err);
  }
};

/**
 * @desc    List all rooms in a hostel
 * @route   GET /api/rooms/hostel/:hostelId
 * @access  Public
 */
export const listRoomsByHostel = async (req, res, next) => {
  try {
    const { hostelId } = req.validated || req.params;
    const { page, limit, skip } = getPaginationParams(req.query);
    const [rooms, total] = await Promise.all([
      Room.find({ hostel: hostelId }).skip(skip).limit(limit).lean(),
      Room.countDocuments({ hostel: hostelId })
    ]);
    const mapped = rooms.map((r) => ({
      id: r._id,
      roomNumber: r.roomNumber,
      type: r.type,
      capacity: r.capacity,
      occupied: r.occupied
    }));
    return res.json(buildPagedResponse({ items: mapped, total, page, limit }));
  } catch (err) {
    return next(err);
  }
};

/**
 * @desc    Get details of a single room
 * @route   GET /api/rooms/:id
 * @access  Public
 */
export const getRoom = async (req, res, next) => {
  try {
    const { id } = req.validated || req.params;
    const room = await Room.findById(id).populate("hostel", "name type capacity").lean();
    if (!room) throw new NotFoundError("Room not found");
    return res.json({
      id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      occupied: room.occupied,
      hostel: room.hostel ? { id: room.hostel._id, name: room.hostel.name, type: room.hostel.type } : null
    });
  } catch (err) {
    return next(err);
  }
};
