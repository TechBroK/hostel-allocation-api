import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Hostel from '../src/models/Hostel.js';
import Room from '../src/models/Room.js';
import Allocation from '../src/models/Allocation.js';
import AllocationMeta from '../src/models/AllocationMeta.js';

const PWD = 'Password123!';

async function makeStudent(overrides = {}) {
  const email = overrides.email || `student-${new mongoose.Types.ObjectId()}@example.com`;
  const password = await bcrypt.hash(PWD, 10);
  return User.create({
    fullName: overrides.fullName || 'Auto Pair Student',
    email,
    password,
    role: 'student',
    gender: overrides.gender || 'male',
    personalityTraits: overrides.personalityTraits || { quiet: 1, cleanliness: 0.9 },
  });
}

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PWD });
  return res.body.token;
}

async function seedHostelWithRoom() {
  const hostel = await Hostel.create({ name: 'PairHostel', type: 'male', capacity: 20, description: 'For pairing tests' });
  const room = await Room.create({ hostel: hostel._id, roomNumber: 'P1', capacity: 4, occupied: 0, type: 'Standard' });
  return { hostel, room };
}

// We need two students submitting allocations such that second triggers pairing.
// To increase chance of compatibility "veryHigh/high" we align traits.

describe('Allocation auto pairing', () => {
  test('second compatible student submission auto-pairs both into a room', async () => {
    // Ensure isolation across collections so no stray pending allocation affects outcome
    await Promise.all([
      Allocation.deleteMany({}),
      AllocationMeta.deleteMany({}),
      Room.deleteMany({}),
      Hostel.deleteMany({}),
      User.deleteMany({})
    ]);
    await seedHostelWithRoom();
    const s1 = await makeStudent({ fullName: 'Student One' });
    const s2 = await makeStudent({ fullName: 'Student Two' });
    const t1 = await login(s1.email);
    const t2 = await login(s2.email);

    // First submission — usually pending (no peer yet) but allow autoPaired=true if prior logic changes.
    const sub1 = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${t1}`)
      .send({ preferences: ['quiet'] });
    expect(sub1.statusCode).toBe(201);
    // Accept either pending or already paired (defensive); capture initial pairing state
    const firstWasPaired = !!sub1.body.autoPaired;

    // Second submission — if first wasn't paired, this one should trigger pairing; if first already paired, still expect approved state
    const sub2 = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${t2}`)
      .send({ preferences: ['quiet'] });
    expect(sub2.statusCode).toBe(201);
    expect(sub2.body.roomId).toBeTruthy();
    // Ensure at least one of the two responses indicates an autoPair event occurred
    expect(firstWasPaired || sub2.body.autoPaired).toBe(true);

    // Fetch status for both to confirm approved & same room
    const status1 = await request(app)
      .get(`/api/allocations/${s1._id}/status`)
      .set('Authorization', `Bearer ${t1}`);
    const status2 = await request(app)
      .get(`/api/allocations/${s2._id}/status`)
      .set('Authorization', `Bearer ${t2}`);
    expect(status1.body.status).toBe('approved');
    expect(status2.body.status).toBe('approved');
    expect(status1.body.roomDetails.hostelId.toString()).toBeDefined();
    expect(status1.body.roomDetails.roomNumber).toBe('P1');
    expect(status1.body.roomDetails.roomNumber).toBe(status2.body.roomDetails.roomNumber);
  });
});
