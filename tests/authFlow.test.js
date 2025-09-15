import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';

const PLAIN = 'Password123!';

async function createUser({ fullName = 'Test User', email, role = 'student', password = PLAIN }) {
  const hashed = await bcrypt.hash(password, 10);
  return User.create({ fullName, email, password: hashed, role });
}

async function login(email, password = PLAIN) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('Auth flow & role guard', () => {
  test('login success returns token and no password leakage', async () => {
    const email = 'login-success@example.com';
    await createUser({ email });
    const res = await login(email);
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('login failure with wrong password', async () => {
    const email = 'login-fail@example.com';
    await createUser({ email });
    const res = await login(email, 'WrongPass!');
    expect(res.statusCode).toBe(401);
  });

  test('role guard forbids student calling admin route', async () => {
    const email = 'student-role@example.com';
    await createUser({ email, role: 'student' });
    const loginRes = await login(email);
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  test('admin can access admin route', async () => {
    const email = 'admin-role@example.com';
    await createUser({ email, role: 'admin', fullName: 'Admin User' });
    const loginRes = await login(email);
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});
