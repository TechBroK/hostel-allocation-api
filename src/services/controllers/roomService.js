import Room from '../../models/Room.js';
import Hostel from '../../models/Hostel.js';
import Allocation from '../../models/Allocation.js';
import { ValidationError, NotFoundError } from '../../errors/AppError.js';
import { getPaginationParams, buildPagedResponse } from '../../utils/pagination.js';

export async function createRoomService(hostelId, { roomNumber, type, capacity }) {
  if (!roomNumber || !type || capacity === null || capacity === undefined) {
    throw new ValidationError('roomNumber, type and capacity are required');
  }
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) { throw new NotFoundError('Hostel not found'); }
  const exists = await Room.findOne({ hostel: hostelId, roomNumber });
  if (exists) { throw new ValidationError('Room number already exists in this hostel'); }
  const room = await Room.create({ hostel: hostelId, roomNumber, type, capacity, occupied: 0 });
  return { id: room._id, roomNumber: room.roomNumber, type: room.type, capacity: room.capacity, occupied: room.occupied || 0, hostel: hostelId };
}

export async function listRoomsByHostelService(hostelId, query) {
  const { page, limit, skip } = getPaginationParams(query);
  const [rooms, total] = await Promise.all([
    Room.find({ hostel: hostelId }).skip(skip).limit(limit).lean(),
    Room.countDocuments({ hostel: hostelId })
  ]);
  const mapped = rooms.map(r => ({ id: r._id, roomNumber: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied }));
  return buildPagedResponse({ items: mapped, total, page, limit });
}

export async function getRoomService(id) {
  const room = await Room.findById(id).populate('hostel', 'name type capacity').lean();
  if (!room) { throw new NotFoundError('Room not found'); }
  return { id: room._id, roomNumber: room.roomNumber, type: room.type, capacity: room.capacity, occupied: room.occupied, hostel: room.hostel ? { id: room.hostel._id, name: room.hostel.name, type: room.hostel.type } : null };
}

// List rooms that are not fully occupied (capacity - occupied > 0)
export async function listUnallocatedRoomsService(query = {}) {
  const { page, limit, skip } = getPaginationParams(query);
  const hostelId = query.hostelId;
  // Prefer aggregation to compute availability and paginate
  const pipeline = [
    { $match: { ...(hostelId ? { hostel: new Room.collection.db.bsonLib.ObjectId(hostelId) } : {}) } },
    { $addFields: { remaining: { $subtract: [ { $ifNull: ['$capacity',0] }, { $ifNull: ['$occupied',0] } ] } } },
    { $match: { remaining: { $gt: 0 } } },
    { $sort: { remaining: -1, _id: 1 } },
    { $facet: { data: [ { $skip: skip }, { $limit: limit }, { $project: { _id:1, roomNumber:1, type:1, capacity:1, occupied:1, remaining:1, hostel:1 } } ], meta: [ { $count: 'total' } ] } },
    { $project: { data:1, total: { $ifNull: [ { $arrayElemAt: ['$meta.total',0] }, 0 ] } } }
  ];
  const agg = await Room.aggregate(pipeline);
  const data = agg[0]?.data || [];
  const total = agg[0]?.total || 0;
  const mapped = data.map(r => ({ id: r._id, roomNumber: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied || 0, remaining: r.remaining }));
  return buildPagedResponse({ items: mapped, total, page, limit });
}

export async function deleteRoomService(roomId) {
  const room = await Room.findById(roomId);
  if (!room) { throw new NotFoundError('Room not found'); }

  const allocationsCount = await Allocation.countDocuments({ room: roomId });
  if (allocationsCount > 0) {
    throw new ValidationError('Cannot delete room with existing allocations. Reassign or remove those allocations first.');
  }

  await room.deleteOne();
  return { success: true, message: 'Room deleted' };
}

export async function updateRoomService(roomId, payload) {
  const room = await Room.findById(roomId);
  if (!room) { throw new NotFoundError('Room not found'); }
  if (payload.capacity !== undefined && payload.capacity < (room.occupied || 0)) {
    throw new ValidationError('New capacity cannot be less than currently occupied beds');
  }
  if (payload.roomNumber !== undefined) room.roomNumber = payload.roomNumber;
  if (payload.type !== undefined) room.type = payload.type;
  if (payload.capacity !== undefined) room.capacity = payload.capacity;
  await room.save();
  return { id: room._id, roomNumber: room.roomNumber, type: room.type, capacity: room.capacity, occupied: room.occupied || 0 };
}

export default { createRoomService, listRoomsByHostelService, getRoomService, listUnallocatedRoomsService, deleteRoomService, updateRoomService };
