import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Allocation from '../src/models/Allocation.js';
import Room from '../src/models/Room.js';
import Hostel from '../src/models/Hostel.js';
import { listStudentsService, exportReportService } from '../src/services/controllers/adminService.js';

describe('adminService.listStudentsService (aggregation)', () => {
  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/hostel_unit');
    }
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Allocation.deleteMany({});
    await User.deleteMany({});
    await Room.deleteMany({});
    await Hostel.deleteMany({});
  });

  it('returns pending status when no allocation exists', async () => {
    const s = await User.create({ fullName: 'Alice', email: 'alice@test.com', password: 'Pass1234!', role: 'student', gender: 'female', department: 'Computer Science', level: '100' });
    const res = await listStudentsService({ page: 1, limit: 10 });
    expect(res.data[0]).toMatchObject({ fullName: 'Alice', status: 'pending' });
    expect(res.meta.total).toBe(1);
  });

  it('reflects allocated status when allocation exists', async () => {
    const s = await User.create({ fullName: 'Bob', email: 'bob@test.com', password: 'Pass1234!', role: 'student', gender: 'male', department: 'Computer Science', level: '200' });
    await Allocation.create({ student: s._id, session: '2025', status: 'approved', allocatedAt: new Date() });
    const res = await listStudentsService({ page: 1, limit: 10 });
  // Allocation.status is 'approved'; aggregation surfaces 'approved'
  expect(res.data[0]).toMatchObject({ fullName: 'Bob', status: 'approved' });
  });
});

describe('adminService.exportReportService (integration aggregates)', () => {
  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/hostel_unit');
    }
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Allocation.deleteMany({});
    await User.deleteMany({});
    await Room.deleteMany({});
    await Hostel.deleteMany({});
  });

  it('exports students csv with correct header', async () => {
    await User.create({ fullName: 'Al', email: 'al@test.com', password: 'x', role: 'student', level: '100', department: 'Computer Science', gender: 'male' });
    const { filename, csv } = await exportReportService({ type: 'students', format: 'csv' });
    expect(filename).toBe('students.csv');
    expect(csv.split('\n')[0]).toBe('id,fullName,matricNumber,email,level');
  });

  it('exports rooms csv with correct header', async () => {
    const hostel = await Hostel.create({ name: 'H1', type: 'male', capacity: 50 });
    await Room.create({ hostel: hostel._id, roomNumber: '101', type: 'Standard', capacity: 4, occupied: 2 });
    const { filename, csv } = await exportReportService({ type: 'rooms', format: 'csv' });
    expect(filename).toBe('rooms.csv');
    expect(csv.split('\n')[0]).toBe('id,hostel,roomNumber,type,capacity,occupied');
  });

  it('exports allocations csv with correct header as default', async () => {
    const hostel = await Hostel.create({ name: 'H2', type: 'male', capacity: 50 });
    const room = await Room.create({ hostel: hostel._id, roomNumber: '102', type: 'Standard', capacity: 2 });
    const stu = await User.create({ fullName: 'Al2', email: 'al2@test.com', password: 'x', role: 'student', level: '200', department: 'Computer Science', gender: 'male' });
    await Allocation.create({ student: stu._id, room: room._id, session: '2025', status: 'approved', allocatedAt: new Date() });
    const { filename, csv } = await exportReportService({});
    expect(filename).toBe('allocations.csv');
    expect(csv.split('\n')[0]).toBe('id,student,matricNumber,roomNumber,status,allocatedAt');
  });

  it('throws on unsupported format', async () => {
    await expect(exportReportService({ type: 'students', format: 'json' })).rejects.toThrow('Only csv export supported');
  });
});
