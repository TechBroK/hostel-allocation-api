import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { startTestDb, stopTestDb, clearCollections } from './utils/testDb.js';

jest.setTimeout(15000);

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key';
  await startTestDb();
});

afterAll(async () => {
  await stopTestDb();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await clearCollections();
  }
});
