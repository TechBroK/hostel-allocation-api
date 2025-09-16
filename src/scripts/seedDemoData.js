/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

import User from '../models/User.js';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import Allocation from '../models/Allocation.js';
import Complaint from '../models/Complaint.js';
import ApprovedPairing from '../models/ApprovedPairing.js';
import { generateStudent, generateHostel, generateRoom, generateComplaint, hashWarning } from './generators.js';
import { computeCompatibility } from '../services/allocationAlgorithm.js';

dotenv.config();

async function connect() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_allocation';
  await mongoose.connect(uri, { autoIndex: true });
  console.log('[seed] Connected to MongoDB');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    students: 120,
    hostelsPerGender: 3,
    roomsPerHostel: 15,
    complaints: 30,
    session: new Date().getFullYear().toString(),
    fresh: true
  };
  args.forEach(a => {
    const [k, v] = a.split('=');
    if (k && v && Object.prototype.hasOwnProperty.call(opts, k)) {
      opts[k] = isNaN(Number(v)) ? v : Number(v);
    }
    if (a === '--keep') { opts.fresh = false; }
  });
  return opts;
}

// async function wipeCollections() {
//   await Promise.all([
//     User.deleteMany({ role: 'student' }),
//     Hostel.deleteMany({}),
//     Room.deleteMany({}),
//     Allocation.deleteMany({}),
//     Complaint.deleteMany({}),
//     ApprovedPairing.deleteMany({})
//   ]);
//   console.log('[seed] Collections cleared');
// }

async function seed() {
  const opts = parseArgs();
  await connect();
  // if (opts.fresh) { await wipeCollections(); }

  // Ensure at least one admin remains if clearing only students? (We leave existing non-student users.)
  console.log('[seed] Generating hostels');
  const hostelDocs = [];
  for (const gender of ['male','female']) {
    for (let i = 0; i < opts.hostelsPerGender; i += 1) {
      hostelDocs.push(generateHostel({ gender }));
    }
  }
  const createdHostels = await Hostel.insertMany(hostelDocs);

  console.log('[seed] Generating rooms');
  const roomDocs = [];
  createdHostels.forEach(h => {
    for (let r = 0; r < opts.roomsPerHostel; r += 1) {
      roomDocs.push(generateRoom({ hostelId: h._id }));
    }
  });
  const createdRooms = await Room.insertMany(roomDocs);

  console.log('[seed] Generating students');
  const studentObjs = [];
  for (let s = 0; s < opts.students; s += 1) {
    studentObjs.push(generateStudent({}));
  }
  // Hash a single password value for all seeded students for convenience
  const plain = 'DemoUser123!';
  const hash = await bcrypt.hash(plain, 10);
  studentObjs.forEach(u => { u.password = hash; });
  const studentDocs = await User.insertMany(studentObjs, { ordered: false });
  console.log(`[seed] Inserted students=${studentDocs.length}`);

  console.log('[seed] Creating initial pending allocations');
  const sessionYear = opts.session;
  const allocationDocs = await Allocation.insertMany(studentDocs.map(st => ({ student: st._id, session: sessionYear, status: 'pending' })));
  console.log(`[seed] Pending allocations=${allocationDocs.length}`);

  console.log('[seed] Attempting naive compatibility-based approvals');
  // Pair students greedily for demo
  let approvals = 0;
  const unpaired = [...allocationDocs];
  while (unpaired.length > 1) {
    const a = unpaired.pop();
    const studentA = studentDocs.find(u => u._id.equals(a.student));
    if (!studentA) { continue; }
    for (let i = 0; i < unpaired.length; i += 1) {
      const b = unpaired[i];
      const studentB = studentDocs.find(u => u._id.equals(b.student));
      if (!studentB) { continue; }
      if (studentA.gender !== studentB.gender) { continue; } // same gender for hostel assignment
      const { score, range } = computeCompatibility(studentA.toObject(), studentB.toObject());
      if (['veryHigh','high'].includes(range)) {
        // pick a room with 2 free slots
        const candidate = createdRooms.find(r => (r.capacity - (r.occupied || 0)) >= 2 && studentA.gender === createdHostels.find(h => h._id.equals(r.hostel))?.type);
        if (!candidate) { break; }
        candidate.occupied = (candidate.occupied || 0) + 2;
        a.room = candidate._id; a.status = 'approved'; a.allocatedAt = new Date(); a.autoPaired = true; a.compatibilityScore = score; a.compatibilityRange = range;
        b.room = candidate._id; b.status = 'approved'; b.allocatedAt = new Date(); b.autoPaired = true; b.compatibilityScore = score; b.compatibilityRange = range;
        unpaired.splice(i,1);
        approvals += 2;
        break;
      }
    }
  }
  await Promise.all(createdRooms.map(r => r.save()));
  await Promise.all(allocationDocs.map(a => a.save()));
  console.log(`[seed] Auto-approved allocations=${approvals}`);

  console.log('[seed] Creating complaints');
  const complaintSeed = [];
  for (let c = 0; c < opts.complaints; c += 1) {
    const randomStudent = faker.helpers.arrayElement(studentDocs);
    complaintSeed.push(generateComplaint({ studentId: randomStudent._id }));
  }
  await Complaint.insertMany(complaintSeed);

  console.log('[seed] Done');
  console.log(`[seed] Demo student password: ${plain}`);
  console.log(hashWarning());
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[seed] ERROR', err);
  process.exit(1);
});
