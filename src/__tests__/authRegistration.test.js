/* eslint-env jest */
// Jest environment globals (describe, test, expect) provided by jest.
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
    await mongoose.connection.close();
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

  test('duplicate email fails', async () => {
    const email = 'test-alias-dup@example.com';
    // First registration
    const first = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ fullName: 'Dup User', email, password: 'Password123!' });
    expect([200,201]).toContain(first.statusCode);
    // Second registration (same email)
    const second = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ name: 'Another Name', email, password: 'Password123!' });
    expect(second.statusCode).toBe(400);
    expect(second.body.message || JSON.stringify(second.body)).toMatch(/email already in use/i);
  });

  test('both fullName and name provided prefers fullName (verified via login)', async () => {
    const email = 'test-alias-prefer@example.com';
    const preferred = 'Preferred Name';
    const ignored = 'Ignored Name';
    const reg = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ fullName: preferred, name: ignored, email, password: 'Password123!' });
    expect([200,201]).toContain(reg.statusCode);

    // Login to fetch stored user profile
    const login = await request('http://localhost:8080')
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' });
    expect(login.statusCode).toBe(200);
    expect(login.body?.user?.fullName).toBe(preferred);
  });

  test('short name (<2 chars) fails validation', async () => {
    const res = await request('http://localhost:8080')
      .post('/api/auth/register')
      .send({ name: 'A', email: 'test-alias-short@example.com', password: 'Password123!' });
    expect(res.statusCode).toBe(400);
    // Zod min length error message
    expect(JSON.stringify(res.body)).toMatch(/at least 2 characters/i);
  });
});
