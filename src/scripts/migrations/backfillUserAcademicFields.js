#!/usr/bin/env node
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';

import User, { LEVELS } from '../../models/User.js';
import { LASU_DEPARTMENTS } from '../../config/departments.js';

dotenv.config();

/*
 Migration: Backfill department, level, phone for existing student users.

 Features:
 - dryRun (default true): only reports counts and a sample batch; no writes.
 - batchSize: process users in chunks (default 100).
 - phoneStrategy: generate or leaveBlank (default generate) for missing phone.
 - filter: optionally limit to userIds passed via comma-separated list: ids=ID1,ID2

 Usage examples:
   node src/scripts/migrations/backfillUserAcademicFields.js dryRun=false
   node src/scripts/migrations/backfillUserAcademicFields.js batchSize=200 phoneStrategy=leaveBlank
   node src/scripts/migrations/backfillUserAcademicFields.js ids=64fa...,650b...
*/

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: true, batchSize: 100, phoneStrategy: 'generate' };
  for (const a of args) {
    const [k, v] = a.split('=');
    if (k === 'dryRun') {
      opts.dryRun = v === 'false' ? false : true;
    } else if (k === 'batchSize') {
      opts.batchSize = parseInt(v, 10) || opts.batchSize;
    } else if (k === 'phoneStrategy') {
      opts.phoneStrategy = v;
    } else if (k === 'ids') {
      opts.ids = v.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return opts;
}

function randomDepartment() { return faker.helpers.arrayElement(LASU_DEPARTMENTS); }
function randomLevel() { return faker.helpers.arrayElement(LEVELS); }
function randomNigerianPhone() {
  // +234 followed by 10 digits
  return '+234' + faker.string.numeric(10, { allowLeadingZeros: true });
}

async function main() {
  const opts = parseArgs();
  const start = Date.now();
  await mongoose.connect(process.env.MONGO_URI);

  const query = { role: 'student', $or: [ { department: { $exists: false } }, { level: { $exists: false } }, { phone: { $exists: false } }, { department: null }, { level: null }, { phone: null } ] };
  if (opts.ids?.length) { query._id = { $in: opts.ids }; }

  const totalNeeding = await User.countDocuments(query);
  console.warn(`[migration] Users needing backfill: ${totalNeeding}`);
  if (totalNeeding === 0) { await mongoose.disconnect(); return; }

  const cursor = User.find(query).cursor();
  const batch = [];
  let processed = 0;
  let modified = 0;

  const updates = [];
  for (let doc = await cursor.next(); doc !== null; doc = await cursor.next()) {
    processed++;
    const update = {};

    if (!doc.department) { update.department = randomDepartment(); }
    if (!doc.level) { update.level = randomLevel(); }
    if (!doc.phone && opts.phoneStrategy === 'generate') { update.phone = randomNigerianPhone(); }

    if (Object.keys(update).length) {
      modified++;
      if (!opts.dryRun) {
        updates.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { ...update, updatedAt: new Date() } } } });
      } else if (batch.length < 5) {
        batch.push({ _id: doc._id.toString(), ...update });
      }
    }

    if (!opts.dryRun && updates.length >= opts.batchSize) {
      await User.bulkWrite(updates, { ordered: false });
      updates.length = 0;
      console.warn(`[migration] Applied batch; total modified so far: ${modified}`);
    }
  }

  if (!opts.dryRun && updates.length) {
    await User.bulkWrite(updates, { ordered: false });
  }

  const durationMs = Date.now() - start;
  console.warn(`[migration] Processed=${processed} Modified=${modified} DryRun=${opts.dryRun} DurationMs=${durationMs}`);
  if (opts.dryRun) {
    console.warn('[migration] Sample planned updates (first few):');
    console.warn(batch);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[migration] Error', err);
  process.exit(1);
});
