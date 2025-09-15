// Use replica set memory server so Mongo transactions (used in allocation flows) work
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Increase default timeout for potentially slower CI environments
jest.setTimeout(15000);

let mongo;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-key';
  }
  mongo = await MongoMemoryReplSet.create({
    replSet: { storageEngine: 'wiredTiger', count: 1 },
  });
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'test' });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  // Clean all collections to keep tests isolated
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  }
});
