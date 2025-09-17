import Room from '../../models/Room.js';
import Hostel from '../../models/Hostel.js';
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
  return { id: room._id, status: 'created' };
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

export default { createRoomService, listRoomsByHostelService, getRoomService, listUnallocatedRoomsService };
