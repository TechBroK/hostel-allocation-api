/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

import User from '../models/User.js';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import Allocation from '../models/Allocation.js';
import { generateStudent, generateHostel, generateRoom } from './generators.js';

dotenv.config();

async function connect() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_allocation';
  await mongoose.connect(uri, { autoIndex: true });
  console.log('[seed-pending] Connected to MongoDB');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    students: 30,
    hostelsPerGender: 1,
    roomsPerHostel: 5,
    session: new Date().getFullYear().toString(),
    fresh: false,
  };
  args.forEach(a => {
    const [k, v] = a.split('=');
    if (k && v && Object.prototype.hasOwnProperty.call(opts, k)) {
      opts[k] = isNaN(Number(v)) ? v : Number(v);
    }
    if (a === '--fresh') { opts.fresh = true; }
  });
  return opts;
}

async function ensureBasics(opts) {
  // Create a small set of hostels/rooms if DB is empty
  const hostelCount = await Hostel.countDocuments();
  if (hostelCount === 0) {
    console.log('[seed-pending] Creating demo hostels');
    const hostels = [];
    for (const gender of ['male','female']) {
      for (let i = 0; i < opts.hostelsPerGender; i += 1) {
        hostels.push(generateHostel({ gender }));
      }
    }
    const createdHostels = await Hostel.insertMany(hostels);
    const rooms = [];
    createdHostels.forEach(h => {
      for (let r = 0; r < opts.roomsPerHostel; r += 1) {
        rooms.push(generateRoom({ hostelId: h._id }));
      }
    });
    await Room.insertMany(rooms);
  }
}

async function seedPending() {
  const opts = parseArgs();
  await connect();
  if (opts.fresh) {
    console.log('[seed-pending] Clearing existing allocations');
    await Allocation.deleteMany({});
  }
  await ensureBasics(opts);

  // Create demo students if none
  let students = await User.find({ role: 'student' }).limit(opts.students).lean();
  const needed = Math.max(0, opts.students - students.length);
  if (needed > 0) {
    console.log(`[seed-pending] Creating ${needed} students`);
    const plain = 'DemoUser123!';
    const hash = await bcrypt.hash(plain, 10);
    const seedStudents = [];
    for (let s = 0; s < needed; s += 1) {
      const stub = generateStudent({});
      stub.password = hash;
      seedStudents.push(stub);
    }
    await User.insertMany(seedStudents);
    students = await User.find({ role: 'student' }).limit(opts.students).lean();
    console.log(`[seed-pending] Demo student password: ${plain}`);
  }

  const session = opts.session;
  const existing = await Allocation.find({ session }).select('student').lean();
  const existingIds = new Set(existing.map(a => a.student.toString()));

  const toCreate = students
    .filter(s => !existingIds.has(s._id.toString()))
    .map(s => ({ student: s._id, session, status: 'pending' }));

  if (toCreate.length === 0) {
    console.log('[seed-pending] No new pending allocations to create');
  } else {
    const created = await Allocation.insertMany(toCreate, { ordered: false });
    console.log(`[seed-pending] Created pending allocations: ${created.length}`);
  }

  await mongoose.disconnect();
  console.log('[seed-pending] Done');
}

seedPending().catch(err => {
  console.error('[seed-pending] ERROR', err);
  process.exit(1);
});
