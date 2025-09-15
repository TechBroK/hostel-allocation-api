/* eslint-env jest */
import request from 'supertest';
import mongoose from 'mongoose';
import User from '../models/User.js';

// NOTE: app.js auto-starts the server; tests assume server listening on default port.

describe('Auth Registration name/fullName alias', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-alias-/ });
  });

  test('register with fullName works', async () => {
    const res = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ fullName: 'Test User One', email: 'test-alias-one@example.com', password: 'Password123!' });
    expect([200,201]).toContain(res.statusCode);
  });

  test('register with name works', async () => {
    const res = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ name: 'Test User Two', email: 'test-alias-two@example.com', password: 'Password123!' });
    expect([200,201]).toContain(res.statusCode);
  });

  test('missing both name/fullName fails', async () => {
    const res = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ email: 'test-alias-three@example.com', password: 'Password123!' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message || JSON.stringify(res.body)).toMatch(/either fullName or name/i);
  });
});
