// src/controllers/hostelController.js
import Hostel from "../models/Hostel.js";
import Room from "../models/Room.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";
import { getPaginationParams, buildPagedResponse } from "../utils/pagination.js";

export const createHostel = async (req, res, next) => {
  try {
    const { name, type, capacity, description } = req.validated || req.body;
    if (!name || !type || capacity === null || capacity === undefined) {
      throw new ValidationError("name, type, capacity required");
    }
    const hostel = await Hostel.create({ name, type, capacity, description });
    return res.status(201).json({ id: hostel._id, status: "created" });
  } catch (err) {
    return next(err);
  }
};

export const listHostels = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [hostels, total] = await Promise.all([
      Hostel.find().skip(skip).limit(limit).lean(),
      Hostel.countDocuments()
    ]);
    const results = await Promise.all(
      hostels.map(async (h) => {
        const rooms = await Room.find({ hostel: h._id }).lean();
        const occupied = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
        return {
          id: h._id,
          name: h.name,
          type: h.type,
          capacity: h.capacity,
          occupied,
          available: Math.max(0, h.capacity - occupied),
          maintenance: 0,
          rooms: rooms.map((r) => ({
            id: r._id,
            roomNumber: r.roomNumber,
            type: r.type,
            capacity: r.capacity,
            occupied: r.occupied,
          })),
        };
      })
    );
  const response = buildPagedResponse({ items: results, total, page, limit });
  return res.json(response);
  } catch (err) {
    return next(err);
  }
};

export const getHostelRooms = async (req, res, next) => {
  try {
    const { hostelId } = req.validated || req.params;
    const rooms = await Room.find({ hostel: hostelId }).lean();
    if (!rooms) {
      throw new NotFoundError("Hostel or rooms not found");
    }
    return res.json(rooms);
  } catch (err) {
    return next(err);
  }
};

