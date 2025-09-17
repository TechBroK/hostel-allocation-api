import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replset = null;

export async function startTestDb() {
  if (replset) return replset;
  replset = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger', count: 1 } });
  const uri = replset.getUri();
  await mongoose.connect(uri, { dbName: 'test' });
  return replset;
}

export async function stopTestDb() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.connection.close().catch(() => {});
  if (replset) {
    await replset.stop();
    replset = null;
  }
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    const collection = collections[key];
    try {
      await collection.deleteMany();
    } catch (err) {
      // ignore
    }
  }
}
