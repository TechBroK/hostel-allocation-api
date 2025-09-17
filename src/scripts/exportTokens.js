/* eslint-disable no-console */
// Generates JWT tokens for existing users (students or admins) and writes them to newline-delimited files
// Usage examples:
//   node src/scripts/exportTokens.js kind=students limit=50 out=studentTokens.txt
//   node src/scripts/exportTokens.js kind=admins out=adminTokens.txt
//   node src/scripts/exportTokens.js kind=all studentOut=studentTokens.txt adminOut=adminTokens.txt studentLimit=40 adminLimit=5
// Environment: requires MONGO_URI + JWT_SECRET

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    kind: 'students', // students | admins | all
    limit: 100,       // generic limit when single kind
    studentLimit: 100,
    adminLimit: 20,
    out: 'tokens.txt',
    studentOut: 'studentTokens.txt',
    adminOut: 'adminTokens.txt'
  };
  args.forEach(a => {
    const [k,v] = a.split('=');
    if (!k) { return; }
    if (Object.prototype.hasOwnProperty.call(opts,k)) {
      const num = Number(v);
      opts[k] = Number.isNaN(num) ? v : num;
    }
  });
  return opts;
}

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function main() {
  const opts = parseArgs();
  if (!process.env.JWT_SECRET) {
    console.error('[tokens] JWT_SECRET not set');
    process.exit(1);
  }
  await connectDB();

  const tasks = [];
  if (opts.kind === 'students') {
    tasks.push({ query: { role: 'student' }, limit: opts.limit, out: opts.out });
  } else if (opts.kind === 'admins') {
    tasks.push({ query: { role: { $in: ['admin','super-admin'] } }, limit: opts.limit, out: opts.out });
  } else if (opts.kind === 'all') {
    tasks.push({ query: { role: 'student' }, limit: opts.studentLimit, out: opts.studentOut });
    tasks.push({ query: { role: { $in: ['admin','super-admin'] } }, limit: opts.adminLimit, out: opts.adminOut });
  } else {
    console.error('[tokens] Invalid kind');
    process.exit(1);
  }

  for (const t of tasks) {
    const users = await User.find(t.query).limit(t.limit).select('_id role');
    if (!users.length) {
      console.warn(`[tokens] No users found for ${JSON.stringify(t.query)}`);
      continue;
    }
    const lines = users.map(u => signToken(u));
    const outPath = path.resolve(t.out);
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`[tokens] Wrote ${lines.length} tokens to ${outPath}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error('[tokens] ERROR', e); process.exit(1); });
