import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Room from '../src/models/Room.js';
import Hostel from '../src/models/Hostel.js';

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
    personalityTraits: overrides.personalityTraits || {},
  });
}

async function login(email, password = PWD) { return request(app).post('/api/auth/login').send({ email, password }); }

async function seedHostelRoom({ gender = 'male', capacity = 4 } = {}) {
  const hostel = await Hostel.create({ name: `Test Hostel ${Date.now()}`, type: gender, capacity, description: 'Test hostel' });
  const room = await Room.create({ hostel: hostel._id, roomNumber: '101', capacity: 4, occupied: 0, type: 'Standard' });
  return { hostel, room };
}

describe('Allocation endpoints', () => {
  test('student submits allocation and sees pending status', async () => {
    const student = await makeUser('student', { email: 'alloc-student@example.com' });
    const loginRes = await login(student.email);
    const token = loginRes.body.token;
    const submit = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferences: ['quiet'] });
  expect(submit.statusCode).toBe(201);
    const status = await request(app)
      .get(`/api/allocations/${student._id}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.statusCode).toBe(200);
    expect(status.body.status).toBeDefined();
  });

  test('admin lists allocations (empty or populated)', async () => {
    const admin = await makeUser('admin', { email: 'alloc-admin@example.com' });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const list = await request(app)
      .get('/api/allocations')
      .set('Authorization', `Bearer ${token}`);
  expect(list.statusCode).toBe(200);
  });

  test('admin creates allocation directly for student', async () => {
    const admin = await makeUser('admin', { email: 'alloc-admin2@example.com' });
    const student = await makeUser('student', { email: 'alloc-student2@example.com', gender: 'male' });
    const { room } = await seedHostelRoom({ gender: 'male', capacity: 4 });
    const loginRes = await login(admin.email);
    const token = loginRes.body.token;
    const create = await request(app)
      .post('/api/allocations/admin')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: student._id.toString(), roomId: room._id.toString(), session: '2025' });
  expect(create.statusCode).toBe(201);
  });
});
