import bcrypt from 'bcryptjs';

import User from '../../models/User.js';
import Allocation from '../../models/Allocation.js';
import Room from '../../models/Room.js';
import { ValidationError, NotFoundError } from '../../errors/AppError.js';
import { getPaginationParams, buildPagedResponse } from '../../utils/pagination.js';
import { getDepartments } from '../../utils/departmentCache.js';

export async function listStudentsService(query) {
  const { page, limit, skip } = getPaginationParams(query);
  // Aggregation to fetch students with latest allocation status in one pass
  const match = { role: 'student' };
  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1, _id: 1 } },
    { $facet: {
      data: [
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'allocations', let: { studentId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$student','$$studentId'] } } }, { $sort: { allocatedAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { status: 1 } } ], as: 'latestAllocation' } },
        { $addFields: { status: { $ifNull: [ { $arrayElemAt: ['$latestAllocation.status',0] }, 'pending' ] } } },
        { $project: { _id:1, fullName:1, matricNumber:1, level:1, email:1, status:1, createdAt:1, updatedAt:1 } }
      ],
      meta: [ { $count: 'total' } ]
    } }
  ];
  const agg = await User.aggregate(pipeline);
  const items = agg[0]?.data || [];
  const total = agg[0]?.meta?.[0]?.total || 0;
  const mapped = items.map(i => ({ id: i._id, fullName: i.fullName, matricNumber: i.matricNumber, level: i.level, email: i.email, status: i.status, createdAt: i.createdAt, updatedAt: i.updatedAt }));
  return buildPagedResponse({ items: mapped, total, page, limit });
}

// List students without an approved allocation. Optionally include those with 'pending' only (default) or strictly no allocation document.
export async function listUnallocatedStudentsService(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const session = query.session; // optional filter by academic session label
  const match = { role: 'student' };
  const allocPipeline = [
    { $match: match },
    { $sort: { createdAt: -1, _id: 1 } },
    { $facet: {
      data: [
        { $lookup: { from: 'allocations', let: { sid: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$student','$$sid'] }, ...(session ? { session } : {}) } }, { $sort: { allocatedAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { status:1 } } ], as: 'alloc' } },
        { $addFields: { allocationStatus: { $ifNull: [ { $arrayElemAt: ['$alloc.status',0] }, 'none' ] } } },
        { $match: { allocationStatus: { $in: ['none','pending','rejected'] } } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id:1, fullName:1, matricNumber:1, level:1, email:1, allocationStatus:1, createdAt:1, updatedAt:1 } }
      ],
      meta: [
        { $lookup: { from: 'allocations', let: { sid: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$student','$$sid'] }, ...(session ? { session } : {}) } }, { $sort: { allocatedAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { status:1 } } ], as: 'alloc' } },
        { $addFields: { allocationStatus: { $ifNull: [ { $arrayElemAt: ['$alloc.status',0] }, 'none' ] } } },
        { $match: { allocationStatus: { $in: ['none','pending','rejected'] } } },
        { $count: 'total' }
      ]
    } }
  ];
  const agg = await User.aggregate(allocPipeline);
  const items = agg[0]?.data || [];
  const total = agg[0]?.meta?.[0]?.total || 0;
  const mapped = items.map(i => ({ id: i._id, fullName: i.fullName, matricNumber: i.matricNumber, level: i.level, email: i.email, allocationStatus: i.allocationStatus, createdAt: i.createdAt, updatedAt: i.updatedAt }));
  return buildPagedResponse({ items: mapped, total, page, limit });
}

export async function createAdminUserService(data) {
  const { fullName, name, email, password, phone } = data;
  const effectiveName = fullName || name;
  if (!effectiveName || !email || !password) {
    throw new ValidationError('name/fullName, email and password required');
  }
  const existing = await User.findOne({ email });
  if (existing) { throw new ValidationError('Email already in use'); }
  const hashed = await bcrypt.hash(password, 10);
  const admin = await User.create({ fullName: effectiveName, email, password: hashed, phone, role: 'admin' });
  return { id: admin._id, status: 'admin created' };
}

export async function listRecentStudentsService({ hours = 24, limit = 50 }) {
  const h = Number(hours) || 24;
  const lim = Math.min(Number(limit) || 50, 200);
  const since = new Date(Date.now() - h*60*60*1000);
  const pipeline = [
    { $match: { role: 'student', updatedAt: { $gte: since } } },
    { $sort: { updatedAt: -1, _id: -1 } },
    { $limit: lim },
    { $lookup: {
      from: 'allocations',
      let: { sid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$student', '$$sid'] } } },
        { $sort: { allocatedAt: -1, _id: -1 } },
        { $limit: 1 },
        { $project: { status: 1 } }
      ],
      as: 'alloc'
    } },
    { $addFields: { allocationStatus: { $ifNull: [ { $arrayElemAt: ['$alloc.status', 0] }, 'pending' ] } } },
    { $project: { _id: 1, fullName: 1, email: 1, matricNumber: 1, level: 1, allocationStatus: 1, createdAt: 1, updatedAt: 1 } }
  ];
  const data = await User.aggregate(pipeline);
  const mapped = data.map(d => ({ id: d._id, fullName: d.fullName, email: d.email, matricNumber: d.matricNumber, level: d.level, allocationStatus: d.allocationStatus, createdAt: d.createdAt, updatedAt: d.updatedAt }));
  return { hours: h, count: mapped.length, data: mapped };
}

export async function updateStudentStatusService(studentId, status) {
  if (!['allocated','pending','rejected'].includes(status)) { throw new ValidationError('Invalid status'); }
  const allocation = await Allocation.findOne({ student: studentId }).sort({ allocatedAt: -1 });
  if (!allocation) { throw new NotFoundError('Allocation not found for student'); }
  allocation.status = status; await allocation.save();
  return { id: allocation._id, status: allocation.status };
}

export async function getSummaryService() {
  const since24 = new Date(Date.now() - 24*60*60*1000);
  const [studentAgg, roomAgg, departments] = await Promise.all([
    User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [ { $gte: ['$updatedAt', since24] }, 1, 0 ] } } } }
    ]),
    Room.aggregate([
      { $group: { _id: null, totalRooms: { $sum: 1 }, occupiedBeds: { $sum: { $ifNull: ['$occupied',0] } }, totalBeds: { $sum: { $ifNull: ['$capacity',0] } } } }
    ]),
    getDepartments()
  ]);
  const studentMeta = studentAgg[0] || { total: 0, active: 0 };
  const roomMeta = roomAgg[0] || { totalRooms: 0, occupiedBeds: 0, totalBeds: 0 };
  return {
    totalStudents: studentMeta.total,
    recentlyActiveStudents24h: studentMeta.active,
    totalRooms: roomMeta.totalRooms,
    occupiedRooms: roomMeta.occupiedBeds,
    availableRooms: Math.max(0, (roomMeta.totalBeds - roomMeta.occupiedBeds)),
    departmentCount: departments.length
  };
}

export async function exportReportService({ type='allocations', format='csv' }) {
  if (format !== 'csv') { throw new ValidationError('Only csv export supported in this endpoint'); }
  if (type === 'students') {
    const students = await User.aggregate([
      { $match: { role: 'student' } },
      { $project: { fullName:1, matricNumber:1, email:1, level:1 } }
    ]);
    const header = 'id,fullName,matricNumber,email,level\n';
    const csv = header + students.map((s) => `${s._id},${s.fullName},${s.matricNumber},${s.email},${s.level}`).join('\n');
    return { filename: 'students.csv', csv };
  }
  if (type === 'rooms') {
    const rooms = await Room.aggregate([
      { $lookup: { from: 'hostels', localField: 'hostel', foreignField: '_id', as: 'hostel' } },
      { $addFields: { hostelName: { $ifNull: [ { $arrayElemAt: ['$hostel.name',0] }, '' ] } } },
      { $project: { roomNumber:1, type:1, capacity:1, occupied:1, hostelName:1 } }
    ]);
    const header = 'id,hostel,roomNumber,type,capacity,occupied\n';
    const csv = header + rooms.map((r) => `${r._id},${r.hostelName},${r.roomNumber},${r.type},${r.capacity},${r.occupied || 0}`).join('\n');
    return { filename: 'rooms.csv', csv };
  }
  const allocs = await Allocation.aggregate([
    { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' } },
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomDoc' } },
    { $addFields: {
      studentName: { $ifNull: [ { $arrayElemAt: ['$studentDoc.fullName',0] }, '' ] },
      studentMatric: { $ifNull: [ { $arrayElemAt: ['$studentDoc.matricNumber',0] }, '' ] },
      roomNumber: { $ifNull: [ { $arrayElemAt: ['$roomDoc.roomNumber',0] }, '' ] }
    } },
    { $project: { studentName:1, studentMatric:1, roomNumber:1, status:1, allocatedAt:1 } }
  ]);
  const header = 'id,student,matricNumber,roomNumber,status,allocatedAt\n';
  const csv = header + allocs.map((a) => `${a._id},${a.studentName},${a.studentMatric},${a.roomNumber},${a.status},${a.allocatedAt || ''}`).join('\n');
  return { filename: 'allocations.csv', csv };
}

export default {
  listStudentsService,
  listUnallocatedStudentsService,
  listRecentStudentsService,
  createAdminUserService,
  updateStudentStatusService,
  getSummaryService,
  exportReportService
};