import mongoose from "mongoose";
import dotenv from "dotenv";

import loggerModule from "../utils/logger.js";

const { logInfo, logError } = loggerModule;

dotenv.config();
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logInfo('db.connected');
  } catch (error) {
    logError('db.connection.error', { message: error.message, stack: error.stack });
    process.exit(1);
  }
};

export default connectDB;
