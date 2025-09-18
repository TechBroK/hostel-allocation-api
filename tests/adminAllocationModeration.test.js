import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Room from '../src/models/Room.js';
import Hostel from '../src/models/Hostel.js';
import Allocation from '../src/models/Allocation.js';

const PWD = 'Password123!';

async function makeUser(role = 'student', overrides = {}) {
  const email = overrides.email || `${role}-${new mongoose.Types.ObjectId()}@example.com`;
  const hashed = await bcrypt.hash(PWD, 10);
  return User.create({
    fullName: overrides.fullName || `${role} User`,
    email,
    password: hashed,
    role,
    gender: overrides.gender || 'male',
  });
}

async function login(email, password = PWD) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function seedRoom({ gender = 'male', capacity = 2, roomNumber = 'R1' } = {}) {
  const hostel = await Hostel.create({ name: `H-${Date.now()}`, type: gender, capacity: capacity * 5, description: 'Test' });
  const room = await Room.create({ hostel: hostel._id, roomNumber, capacity, occupied: 0, type: 'Standard' });
  return { hostel, room };
}

describe('Admin allocation moderation', () => {
  test('lists pending allocations with expected shape', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student', { gender: 'male' });
    const { room } = await seedRoom({ gender: 'male' });
    // create a pending allocation manually
    await Allocation.create({ student: student._id, room: room._id, session: '2025', status: 'pending' });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/api/admin/allocations/unallocated')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.allocations)).toBe(true);
    const first = res.body.allocations[0];
    expect(first).toHaveProperty('_id');
    expect(first).toHaveProperty('student');
    expect(first).toHaveProperty('room');
    expect(first).toHaveProperty('session');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('appliedAt');
  });

  test('approve pending allocation increments room occupancy', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student', { gender: 'male' });
    const { room } = await seedRoom({ gender: 'male', capacity: 2 });
    const allocation = await Allocation.create({ student: student._id, room: room._id, session: '2025', status: 'pending' });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const res = await request(app)
      .patch(`/api/admin/allocations/${allocation._id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom.occupied).toBe(1);
  });

  test('approve with override roomId assigns different room', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student', { gender: 'male' });
    const { room: roomA } = await seedRoom({ gender: 'male', capacity: 2, roomNumber: 'A1' });
    const { room: roomB } = await seedRoom({ gender: 'male', capacity: 2, roomNumber: 'B1' });
    const allocation = await Allocation.create({ student: student._id, room: roomA._id, session: '2025', status: 'pending' });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const res = await request(app)
      .patch(`/api/admin/allocations/${allocation._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId: roomB._id.toString() });
    expect(res.statusCode).toBe(200);
    const updated = await Allocation.findById(allocation._id);
    expect(updated.room.toString()).toBe(roomB._id.toString());
  });

  test('reject allocation sets status to rejected', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student', { gender: 'male' });
    const { room } = await seedRoom({ gender: 'male', capacity: 2 });
    const allocation = await Allocation.create({ student: student._id, room: room._id, session: '2025', status: 'pending' });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const res = await request(app)
      .patch(`/api/admin/allocations/${allocation._id}/reject`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    const updated = await Allocation.findById(allocation._id);
    expect(updated.status).toBe('rejected');
  });

  test('cannot approve when room full', async () => {
    const admin = await makeUser('admin');
    const student1 = await makeUser('student', { gender: 'male' });
    const student2 = await makeUser('student', { gender: 'male' });
    const { room } = await seedRoom({ gender: 'male', capacity: 1 });
    await Allocation.create({ student: student1._id, room: room._id, session: '2025', status: 'pending' });
    const fullAlloc = await Allocation.create({ student: student2._id, room: room._id, session: '2025', status: 'pending' });
    // First approve to fill capacity
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    await request(app)
      .patch(`/api/admin/allocations/${fullAlloc._id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    // Second attempt should fail because capacity now 1 and will be full after first approval
    const anotherStudent = await makeUser('student', { gender: 'male' });
    const anotherAlloc = await Allocation.create({ student: anotherStudent._id, room: room._id, session: '2025', status: 'pending' });
    const res = await request(app)
      .patch(`/api/admin/allocations/${anotherAlloc._id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body.message || '').toMatch(/full/i);
  });
});
