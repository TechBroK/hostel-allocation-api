import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  // Start a single in-memory server for all test suites
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  global.__MONGO_INSTANCE = mongo; // store for teardown
  process.env.MONGO_MEMORY_URI = uri;
  await mongoose.connect(uri, { dbName: 'test' });
}
