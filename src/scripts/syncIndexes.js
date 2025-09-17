#!/usr/bin/env node
/* eslint-disable no-console */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import models so their index declarations are registered
import User from '../models/User.js';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import Allocation from '../models/Allocation.js';
import Complaint from '../models/Complaint.js';
import ApprovedPairing from '../models/ApprovedPairing.js';

dotenv.config();

/*
  Index Synchronization Script

  Usage:
    node src/scripts/syncIndexes.js           # ensure indexes (create missing)
    node src/scripts/syncIndexes.js mode=sync # sync (drop unused + create new) Mongoose >= 6.0
    node src/scripts/syncIndexes.js verbose=true

  Options:
    mode=ensure (default) | sync
    verbose=true to list existing indexes per model

  NOTES:
    - ensureIndexes() creates any missing indexes but does not remove extras.
    - syncIndexes() (mongoose >= 5.2) will drop indexes not defined in schema. Use with caution in prod.
    - For large collections consider building indexes manually during maintenance windows.
*/

function parseArgs() {
  const opts = { mode: 'ensure', verbose: false };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.split('=');
    if (k === 'mode') { opts.mode = v; }
    if (k === 'verbose') { opts.verbose = v === 'true'; }
  }
  return opts;
}

const models = [
  { name: 'User', model: User },
  { name: 'Hostel', model: Hostel },
  { name: 'Room', model: Room },
  { name: 'Allocation', model: Allocation },
  { name: 'Complaint', model: Complaint },
  { name: 'ApprovedPairing', model: ApprovedPairing }
];

async function run() {
  const { mode, verbose } = parseArgs();
  const start = Date.now();
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('[indexes] Missing MONGO_URI'); process.exit(1); }
  await mongoose.connect(uri);
  console.log(`[indexes] Connected -> ${uri}`);

  for (const { name, model } of models) {
    try {
      if (mode === 'sync' && model.syncIndexes) {
        const dropped = await model.syncIndexes();
        console.log(`[indexes] syncIndexes ${name}:`, dropped);
      } else {
        await model.createIndexes();
        console.log(`[indexes] ensureIndexes ${name}: done`);
      }
      if (verbose) {
        const existing = await model.collection.indexes();
        console.log(`[indexes] existing ${name}:`);
        existing.forEach(ix => console.log('  -', ix.name, ix.key));
      }
    } catch (err) {
      console.error(`[indexes] error on ${name}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`[indexes] Completed in ${Date.now() - start}ms`);
}

run().catch(err => { console.error('[indexes] fatal', err); process.exit(1); });
