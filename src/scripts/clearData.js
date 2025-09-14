/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import Allocation from '../models/Allocation.js';
import Complaint from '../models/Complaint.js';
import ApprovedPairing from '../models/ApprovedPairing.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_allocation';
  await mongoose.connect(uri);
  console.log('[clear] Connected');
  await Promise.all([
    User.deleteMany({ role: 'student' }),
    Hostel.deleteMany({}),
    Room.deleteMany({}),
    Allocation.deleteMany({}),
    Complaint.deleteMany({}),
    ApprovedPairing.deleteMany({})
  ]);
  console.log('[clear] Collections cleared');
  await mongoose.disconnect();
  console.log('[clear] Done');
}

run().catch(e => { console.error('[clear] ERROR', e); process.exit(1); });
