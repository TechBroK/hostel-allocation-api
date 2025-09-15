import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Allocation from '../src/models/Allocation.js';
import Room from '../src/models/Room.js';
import Hostel from '../src/models/Hostel.js';

const PWD = 'Password123!';
async function makeUser(role = 'student', overrides = {}) {
  const password = await bcrypt.hash(PWD, 10);
  return User.create({
    fullName: overrides.fullName || `${role} User ${(Math.random()*1000).toFixed(0)}`,
    email: overrides.email || `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password,
    role,
    gender: overrides.gender || 'male',
  });
}
async function login(email) { return request(app).post('/api/auth/login').send({ email, password: PWD }); }

async function seedApprovedAllocation(student) {
  const hostel = await Hostel.create({ name: 'FilterHostel', type: student.gender, capacity: 10, description: 'Filter' });
  const room = await Room.create({ hostel: hostel._id, roomNumber: 'F1', capacity: 4, occupied: 0, type: 'Standard' });
  await Allocation.create({ student: student._id, room: room._id, session: new Date().getFullYear().toString(), status: 'approved', allocatedAt: new Date() });
}

describe('GET /api/students filters & sorting', () => {
  test('search by q, filter allocationStatus, and sort by name asc', async () => {
    const admin = await makeUser('admin', { email: 'admin-filters@example.com' });
    const s1 = await makeUser('student', { fullName: 'Alice Filter', gender: 'female' });
    const s2 = await makeUser('student', { fullName: 'Bob Filter', gender: 'male' });
    const s3 = await makeUser('student', { fullName: 'Charlie Filter', gender: 'male' });
    await seedApprovedAllocation(s2);
    const adminLogin = await login(admin.email);
    const token = adminLogin.body.token;

    // search for 'Alice'
    const searchRes = await request(app)
      .get('/api/students?q=Alice')
      .set('Authorization', `Bearer ${token}`);
    expect(searchRes.statusCode).toBe(200);
    expect(searchRes.body.items.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.items[0].fullName).toMatch(/Alice/i);

    // filter approved
    const approvedRes = await request(app)
      .get('/api/students?allocationStatus=approved')
      .set('Authorization', `Bearer ${token}`);
    expect(approvedRes.statusCode).toBe(200);
    expect(approvedRes.body.items.some(i => i.allocationStatus === 'approved')).toBe(true);

    // filter none
    const noneRes = await request(app)
      .get('/api/students?allocationStatus=none')
      .set('Authorization', `Bearer ${token}`);
    expect(noneRes.statusCode).toBe(200);
    expect(noneRes.body.items.every(i => !i.allocationStatus)).toBe(true);

    // sort by fullName asc
    const sortRes = await request(app)
      .get('/api/students?sort=fullName:asc')
      .set('Authorization', `Bearer ${token}`);
    expect(sortRes.statusCode).toBe(200);
    const names = sortRes.body.items.map(i => i.fullName);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });
});
