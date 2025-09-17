import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Room from '../src/models/Room.js';
import Allocation from '../src/models/Allocation.js';
import Hostel from '../src/models/Hostel.js';

// Helper to create auth token
function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
}

async function createStudent(overrides={}) {
  const base = {
    fullName: 'Test Student',
    email: `student_${Math.random().toString(16).slice(2)}@test.com`,
    password: 'Pass1234!',
    role: 'student',
    gender: overrides.gender || 'male',
    department: overrides.department || 'Computer Science',
    level: overrides.level || '200'
  };
  return User.create({ ...base, ...overrides });
}

async function createAdmin() {
  return User.create({ fullName: 'Admin', email: `admin_${Math.random().toString(16).slice(2)}@test.com`, password: 'Admin123!', role: 'admin' });
}

async function bootstrapAllocationsDataset() {
  const admin = await createAdmin();
  const hostel = await Hostel.create({ name: 'Alpha', type: 'male', capacity: 100 });
  const room = await Room.create({ hostel: hostel._id, roomNumber: 'A1', type: 'Standard', capacity: 4, occupied: 0 });
  const s1 = await createStudent({ gender: 'male', department: 'Computer Science', level: '200' });
  const s2 = await createStudent({ gender: 'male', department: 'Mathematics', level: '300' });
  const s3 = await createStudent({ gender: 'female', department: 'Mass Communication', level: '200' });
  await Allocation.create({ student: s1._id, room: room._id, session: '2025', status: 'approved', allocatedAt: new Date(Date.now() - 3600 * 1000) });
  await Allocation.create({ student: s2._id, session: '2025', status: 'pending' });
  return { admin, hostel, room, students: { s1, s2, s3 } };
}

beforeEach(async () => {
  await Allocation.deleteMany({});
  await Room.deleteMany({});
  await Hostel.deleteMany({});
  await User.deleteMany({});
});

describe('Admin aggregation endpoints', () => {
  test('Students list empty when no students', async () => {
    const admin = await createAdmin();
    const token = tokenFor(admin);
    const res = await request(app).get('/api/admin/students').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });

  test('Allocations listing returns shape & filters', async () => {
    const { admin } = await bootstrapAllocationsDataset();
    const token = tokenFor(admin);
    const res = await request(app).get('/api/admin/allocations?status=approved').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const { data, meta } = res.body;
    expect(meta.total).toBeGreaterThanOrEqual(1);
    const first = data[0];
    expect(first).toHaveProperty('student');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('compatibility');
  });

  test('Unallocated students excludes approved', async () => {
    const { admin } = await bootstrapAllocationsDataset();
    const token = tokenFor(admin);
    const res = await request(app).get('/api/admin/students/unallocated').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const statuses = res.body.data.map(s => s.allocationStatus);
    expect(statuses).not.toContain('approved');
  });

  test('Recent students filter by gender', async () => {
    const { admin } = await bootstrapAllocationsDataset();
    const token = tokenFor(admin);
    const res = await request(app).get('/api/admin/students/recent?gender=female').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
