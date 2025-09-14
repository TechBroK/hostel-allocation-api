// Conflict Resolution Worker
// Periodically scans for stale pending allocations and attempts to auto-pair them
// using the fairness-based room selection logic.
import Allocation from '../models/Allocation.js';
import Room from '../models/Room.js';
import { computeCompatibility } from '../services/allocationAlgorithm.js';
import { selectRoomForPair } from '../services/roomSelection.js';
import { logInfo, logError } from '../utils/logger.js';

const STALE_MINUTES = parseInt(process.env.ALLOCATION_STALE_MINUTES || '10', 10); // age threshold
const BATCH_LIMIT = parseInt(process.env.CONFLICT_RESOLVER_BATCH || '25', 10);
const LOOP_INTERVAL_MS = parseInt(process.env.CONFLICT_RESOLVER_INTERVAL_MS || '60000', 10); // 1m default

async function processBatch() {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60000);
  const stale = await Allocation.find({ status: 'pending', createdAt: { $lte: cutoff }, room: { $exists: false } })
    .sort({ createdAt: 1 })
    .limit(BATCH_LIMIT)
    .populate('student')
    .lean();
  if (!stale.length) {
    return { processed: 0, paired: 0 };
  }
  let paired = 0;
  for (let i = 0; i < stale.length; i += 1) {
    const a = stale[i];
    if (!a || !a.student) { continue; }
    // Skip if already approved in earlier iteration
    const freshA = await Allocation.findById(a._id);
    if (!freshA || freshA.status !== 'pending' || freshA.room) { continue; }
    // Try finding another pending stale (compatibility high) among later entries to reduce duplicate scans
    for (let j = i + 1; j < stale.length; j += 1) {
      const b = stale[j];
      if (!b || !b.student) { continue; }
      const freshB = await Allocation.findById(b._id);
      if (!freshB || freshB.status !== 'pending' || freshB.room) { continue; }
      const { score, range } = computeCompatibility(a.student, b.student);
      if (!['veryHigh','high'].includes(range)) { continue; }
      // Attempt fairness room allocation inside a transaction
      const session = await Allocation.startSession();
      try {
        session.startTransaction();
        const roomLean = await selectRoomForPair({ gender: a.student.gender, minFreeSlots: 2 });
        if (!roomLean) {
          await session.abortTransaction();
          session.endSession();
          break; // no suitable room now; move to next a
        }
        const roomDoc = await Room.findById(roomLean._id).session(session);
        if (!roomDoc || (roomDoc.capacity - (roomDoc.occupied || 0)) < 2) {
          await session.abortTransaction();
          session.endSession();
          continue;
        }
        freshA.room = roomDoc._id;
        freshA.status = 'approved';
        freshA.allocatedAt = new Date();
        freshA.autoPaired = true;
        freshA.compatibilityScore = score;
        freshA.compatibilityRange = range;
        await freshA.save({ session });

        freshB.room = roomDoc._id;
        freshB.status = 'approved';
        freshB.allocatedAt = new Date();
        freshB.autoPaired = true;
        freshB.compatibilityScore = score;
        freshB.compatibilityRange = range;
        await freshB.save({ session });

        roomDoc.occupied = (roomDoc.occupied || 0) + 2;
        await roomDoc.save({ session });
        await session.commitTransaction();
        paired += 2;
        session.endSession();
        break; // move to next a after successful pairing
      } catch {
        try { await session.abortTransaction(); session.endSession(); } catch { /* noop */ }
      }
    }
  }
  return { processed: stale.length, paired };
}

export function startConflictResolver() {
  if (process.env.CONFLICT_RESOLVER_DISABLED === '1') {
    logInfo('conflictResolver.disabled');
    return () => {};
  }
  logInfo('conflictResolver.start', { intervalMs: LOOP_INTERVAL_MS, staleMinutes: STALE_MINUTES });
  const handle = setInterval(async () => {
    try {
      const { processed, paired } = await processBatch();
      if (processed) {
        logInfo('conflictResolver.cycle', { processed, paired });
      }
    } catch (err) {
      logError('conflictResolver.error', { message: err.message, stack: err.stack });
    }
  }, LOOP_INTERVAL_MS);
  return () => clearInterval(handle);
}

export default { startConflictResolver };