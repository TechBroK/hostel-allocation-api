import mongoose from 'mongoose';

export default async function globalTeardown() {
  try {
    // Drop DB then close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } catch (err) {
    // ignore
  }
  if (global.__MONGO_INSTANCE) {
    await global.__MONGO_INSTANCE.stop();
  }
}
