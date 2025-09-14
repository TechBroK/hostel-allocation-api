// src/controllers/hostelController.js
import Hostel from "../models/Hostel.js";
import Room from "../models/Room.js";

export const createHostel = async (req, res) => {
  try {
    const { name, type, capacity, description } = req.body;
    if (!name || !type || !capacity) return res.status(400).json({ message: "name, type, capacity required" });

    const hostel = await Hostel.create({ name, type, capacity, description });
    return res.status(201).json({ id: hostel._id, status: "created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const listHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().lean();

    // compute occupied and available per hostel
    const results = await Promise.all(
      hostels.map(async (h) => {
        const rooms = await Room.find({ hostel: h._id }).lean();
        const occupied = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
        const roomCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);

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

    return res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getHostelRooms = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const rooms = await Room.find({ hostel: hostelId }).lean();
    return res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

