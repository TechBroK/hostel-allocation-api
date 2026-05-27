import Hostel from '../../models/Hostel.js';
import Room from '../../models/Room.js';
import Allocation from '../../models/Allocation.js';
import { ValidationError, NotFoundError } from '../../errors/AppError.js';
import { getPaginationParams, buildPagedResponse } from '../../utils/pagination.js';

export async function createHostelService({ name, type, capacity, description }) {
  if (!name || !type || capacity === null || capacity === undefined) {
    throw new ValidationError('name, type, capacity required');
  }
  const hostel = await Hostel.create({ name, type, capacity, description });

  // Auto-create rooms equal to hostel capacity (1 bed per room)
  // Room numbers will be sequential starting from 1
  const roomsToCreate = Array.from({ length: Number(capacity) || 0 }, (_, idx) => ({
    hostel: hostel._id,
    roomNumber: String(idx + 1),
    type: 'Standard',
    capacity: 1,
    occupied: 0
  }));
  if (roomsToCreate.length > 0) {
    await Room.insertMany(roomsToCreate);
  }

  // Build response similar to listHostelsService for consistency
  const rooms = await Room.find({ hostel: hostel._id }).lean();
  const occupied = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
  return {
    id: hostel._id,
    name: hostel.name,
    type: hostel.type,
    capacity: hostel.capacity,
    occupied,
    available: Math.max(0, hostel.capacity - occupied),
    maintenance: 0,
    rooms: rooms.map(r => ({ id: r._id, roomNumber: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied || 0 }))
  };
}

export async function listHostelsService(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const [hostels, total] = await Promise.all([
    Hostel.find().skip(skip).limit(limit).lean(),
    Hostel.countDocuments()
  ]);
  const results = await Promise.all(hostels.map(async h => {
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
      rooms: rooms.map(r => ({ id: r._id, roomNumber: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied }))
    };
  }));
  return buildPagedResponse({ items: results, total, page, limit });
}

export async function getHostelRoomsService(hostelId) {
  const rooms = await Room.find({ hostel: hostelId }).lean();
  if (!rooms) { throw new NotFoundError('Hostel or rooms not found'); }
  return rooms;
}

export async function deleteHostelService(hostelId) {
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) { throw new NotFoundError('Hostel not found'); }

  // Find all rooms in this hostel
  const roomIds = await Room.find({ hostel: hostelId }).distinct('_id');

  if (roomIds.length > 0) {
    // Check if any allocations exist that reference these rooms (any status)
    const allocationsCount = await Allocation.countDocuments({ room: { $in: roomIds } });
    if (allocationsCount > 0) {
      throw new ValidationError('Cannot delete hostel with existing allocations in its rooms. Reassign or remove those allocations first.');
    }
  }

  // Safe to delete: first delete rooms, then hostel
  await Room.deleteMany({ hostel: hostelId });
  await hostel.deleteOne();
  return { success: true, message: 'Hostel and its rooms deleted' };
}

export async function updateHostelService(hostelId, payload) {
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) { throw new NotFoundError('Hostel not found'); }
  // If capacity is reduced below current number of rooms or occupied beds, we still allow but note that rooms remain
  if (payload.name !== undefined) hostel.name = payload.name;
  if (payload.type !== undefined) hostel.type = payload.type;
  if (payload.capacity !== undefined) hostel.capacity = payload.capacity;
  if (payload.description !== undefined) hostel.description = payload.description;
  await hostel.save();

  // Reuse listHostels-style response for consistency
  const rooms = await Room.find({ hostel: hostel._id }).lean();
  const occupied = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
  return {
    id: hostel._id,
    name: hostel.name,
    type: hostel.type,
    capacity: hostel.capacity,
    occupied,
    available: Math.max(0, hostel.capacity - occupied),
    maintenance: 0,
    rooms: rooms.map(r => ({ id: r._id, roomNumber: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied || 0 }))
  };
}

export default { createHostelService, listHostelsService, getHostelRoomsService, deleteHostelService, updateHostelService };
