/* eslint-disable no-console */
// Simulates a burst/wave of allocation submissions (and later reallocations) hitting the API concurrently.
// Usage examples:
//  Submit only:
//    node src/scripts/simulateAllocations.js baseUrl=http://localhost:8080 count=50 concurrency=10 authFile=./studentTokens.txt
//  Reallocate only (admin tokens required; implementation added in later steps):
//    node src/scripts/simulateAllocations.js mode=reallocate adminAuthFile=./adminTokens.txt
//  Mixed mode (some submissions, some reallocations):
//    node src/scripts/simulateAllocations.js mode=mixed reallocateRatio=0.25 authFile=./studentTokens.txt adminAuthFile=./adminTokens.txt
// Tokens files should contain one JWT per line.

import axios from 'axios';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    baseUrl: 'http://localhost:8080',
    count: 50,
    concurrency: 10,
    delayBetweenBatchesMs: 250,
    authFile: null,
    adminAuthFile: null, // for reallocation (admin) requests
    session: new Date().getFullYear().toString(),
    timeoutMs: 8000,
    mode: 'submit', // submit | reallocate | mixed
    reallocateRatio: 0.3 // when mode=mixed, probability a given attempt is reallocate
  };
  args.forEach(a => {
    const [k, v] = a.split('=');
    if (v && Object.prototype.hasOwnProperty.call(opts, k)) {
      const num = Number(v);
      opts[k] = Number.isNaN(num) ? v : num;
    }
  });
  // Basic validation
  const allowedModes = ['submit','reallocate','mixed'];
  if (!allowedModes.includes(opts.mode)) {
    console.error(`[simulate] Invalid mode=${opts.mode}. Allowed: ${allowedModes.join(', ')}`);
    process.exit(1);
  }
  if (typeof opts.reallocateRatio !== 'number' || opts.reallocateRatio < 0 || opts.reallocateRatio > 1) {
    console.error('[simulate] reallocateRatio must be between 0 and 1');
    process.exit(1);
  }
  if (opts.mode !== 'submit' && !opts.adminAuthFile) {
    console.warn('[simulate] WARNING: mode requires adminAuthFile (will be needed for reallocation requests).');
  }
  return opts;
}

function loadTokens(authFile) {
  if (!authFile) { throw new Error('authFile required (path to file with one JWT per line)'); }
  const full = path.resolve(authFile);
  const content = fs.readFileSync(full, 'utf8');
  return content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

async function submitAllocation(baseUrl, token, session, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {     
    const res = await axios.post(`${baseUrl}/api/allocations`, { session }, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
    clearTimeout(timer);
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.response?.data || err.message, status: err.response?.status };
  }
}

async function reallocateAllocation(baseUrl, adminToken, pickCache, timeoutMs) {
  // pickCache holds { allocations: [...], rooms: [...] } fetched lazily
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (!pickCache.allocations || pickCache.allocations.length === 0 || Date.now() - (pickCache.allocationsLoadedAt || 0) > 15000) {
      // Fetch all allocations (admin endpoint) page size crude (assumes API returns list without paging or with default reasonable size)
      const allocRes = await axios.get(`${baseUrl}/api/allocations`, { headers: { Authorization: `Bearer ${adminToken}` } });
      pickCache.allocations = (allocRes.data?.data || allocRes.data?.items || allocRes.data || []).filter(a => a.status === 'approved');
      pickCache.allocationsLoadedAt = Date.now();
    }
    if (!pickCache.rooms || pickCache.rooms.length === 0 || Date.now() - (pickCache.roomsLoadedAt || 0) > 30000) {
      // Fetch hostels then their rooms (not ideal but acceptable for simulation). We infer /api/hostels and /api/rooms/hostel/:hostelId endpoints.
      const hostelsRes = await axios.get(`${baseUrl}/api/hostels`);
      const hostels = hostelsRes.data?.data || hostelsRes.data || [];
      const rooms = [];
      for (const h of hostels) {
        try {
          const rRes = await axios.get(`${baseUrl}/api/rooms/hostel/${h._id}`);
          const arr = rRes.data?.data || rRes.data || [];
          for (const r of arr) { rooms.push(r); }
        } catch { /* ignore */ }
      }
      pickCache.rooms = rooms;
      pickCache.roomsLoadedAt = Date.now();
    }
    if (!pickCache.allocations.length || !pickCache.rooms.length) {
      clearTimeout(timer);
      return { ok: false, error: 'insufficient-data' };
    }
    // Choose a random allocation and a different target room with free capacity.
    const allocation = pickCache.allocations[Math.floor(Math.random() * pickCache.allocations.length)];
    const candidateRooms = pickCache.rooms.filter(r => (!r._id || r._id !== allocation.room?._id) && (r.capacity - (r.occupied || 0)) > 0);
    if (!candidateRooms.length) {
      clearTimeout(timer);
      return { ok: false, error: 'no-target-room' };
    }
    const target = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
    const patchRes = await axios.patch(`${baseUrl}/api/allocations/${allocation._id}/reallocate`, { targetRoomId: target._id }, {
      headers: { Authorization: `Bearer ${adminToken}` },
      signal: controller.signal
    });
    clearTimeout(timer);
    return { ok: true, status: patchRes.status, data: patchRes.data };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.response?.data || err.message, status: err.response?.status };
  }
}

async function run() {
  const opts = parseArgs();
  const tokens = opts.authFile ? loadTokens(opts.authFile) : [];
  if (opts.mode !== 'reallocate' && tokens.length === 0) {
    console.error('[simulate] No student tokens loaded (authFile required for submit or mixed modes)');
    process.exit(1);
  }
  if (tokens.length) {
    console.log(`[simulate] Loaded student tokens=${tokens.length}`);
  }
  // Placeholder: admin tokens will be loaded when reallocation logic is implemented.
  if (opts.mode !== 'submit') {
    if (!opts.adminAuthFile) {
      console.warn('[simulate] No adminAuthFile provided yet; reallocation attempts (when implemented) would fail.');
    }
  }
  const start = Date.now();
  let successes = 0; // submit successes
  let failures = 0;  // submit failures (non-duplicate)
  let already = 0;   // submit duplicates
  let reallocSuccess = 0;
  let reallocFail = 0;
  let reallocCompatibility = 0; // classification of compatibility failures
  let reallocCapacity = 0;      // classification of room full
  let reallocOther = 0;
  const results = [];
  const pickCache = {};
  const adminTokens = (opts.adminAuthFile ? loadTokens(opts.adminAuthFile) : []);
  if (opts.mode !== 'submit' && adminTokens.length === 0) {
    console.warn('[simulate] No admin tokens loaded; reallocation attempts will fail authorization');
  }

  const queue = Array.from({ length: opts.count }, (_, i) => i);
  async function worker(batch) {
    for (const _ of batch) {
      // Decide operation kind
      let op = 'submit';
      if (opts.mode === 'reallocate') { op = 'reallocate'; }
      else if (opts.mode === 'mixed') { op = Math.random() < opts.reallocateRatio ? 'reallocate' : 'submit'; }
      if (op === 'submit') {
        const token = tokens[Math.floor(Math.random() * tokens.length)];
        const r = await submitAllocation(opts.baseUrl, token, opts.session, opts.timeoutMs);
        if (r.ok) {
          successes += 1;
          results.push({ t: Date.now(), op, status: r.status });
        } else {
          const msg = (r.error?.message || JSON.stringify(r.error) || '').toLowerCase();
          if (msg.includes('pending/approved')) { already += 1; }
          else { failures += 1; }
          results.push({ t: Date.now(), op, status: r.status || 0, error: msg.slice(0,120) });
        }
      } else {
        const adminToken = adminTokens[Math.floor(Math.random() * (adminTokens.length || 1))];
        const r = await reallocateAllocation(opts.baseUrl, adminToken, pickCache, opts.timeoutMs);
        if (r.ok) {
          reallocSuccess += 1;
          results.push({ t: Date.now(), op, status: r.status });
        } else {
          const raw = r.error?.message || r.error || '';
            const msg = (typeof raw === 'string' ? raw : JSON.stringify(raw)).toLowerCase();
          reallocFail += 1;
          if (msg.includes('compatibility')) { reallocCompatibility += 1; }
          else if (msg.includes('full')) { reallocCapacity += 1; }
          else { reallocOther += 1; }
          results.push({ t: Date.now(), op, status: r.status || 0, error: msg.slice(0,120) });
        }
      }
    }
  }

  while (queue.length) {
    const slice = queue.splice(0, opts.concurrency);
    await Promise.all(slice.map(() => worker([0]))); // each worker processes one logical submission
    if (opts.delayBetweenBatchesMs) {
      await new Promise(r => setTimeout(r, opts.delayBetweenBatchesMs));
    }
  }

  const duration = Date.now() - start;
  console.log('[simulate] Completed');
  console.log(JSON.stringify({
    durationMs: duration,
    mode: opts.mode,
    attempted: opts.count,
    submit: { successes, failures, duplicates: already },
    reallocate: { success: reallocSuccess, failed: reallocFail, compatibility: reallocCompatibility, capacity: reallocCapacity, other: reallocOther }
  }, null, 2));
}

run().catch(e => { console.error('[simulate] ERROR', e); process.exit(1); });
