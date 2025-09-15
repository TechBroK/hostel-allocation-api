import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';

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

describe('GET /api/students (admin only)', () => {
  test('lists students with pagination metadata', async () => {
    const admin = await makeUser('admin', { email: 'admin-list@example.com' });
    const studentA = await makeUser('student', { gender: 'male' });
    const studentB = await makeUser('student', { gender: 'female' });
    const adminLogin = await login(admin.email);
    const token = adminLogin.body.token;
    const res = await request(app)
      .get('/api/students?limit=10&page=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    const item = res.body.items.find(i => i._id === studentA._id.toString());
    expect(item).toBeTruthy();
    expect(item.fullName).toBe(studentA.fullName);
  });

  test('forbidden for non-admin', async () => {
    const student = await makeUser('student', { email: 'stud-nonadmin@example.com' });
    const loginRes = await login(student.email);
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
