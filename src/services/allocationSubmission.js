// Extracted service for submitting an allocation with potential auto-pairing.
// This isolates transaction + pairing logic for improved testability.
import Allocation from '../models/Allocation.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { selectRoomForPair } from './roomSelection.js';
import { computeCompatibility } from './allocationAlgorithm.js';
import { ValidationError } from '../errors/AppError.js';

/**
 * submitStudentAllocation
 * @param {Object} opts
 * @param {import('mongoose').ClientSession} opts.session - Active mongoose session
 * @param {string} opts.studentId - Student ObjectId
 * @param {string} [opts.sessionLabel] - Academic session label
 * @returns {Promise<{ allocation: any, paired: boolean, compatibilityMeta: any }>} response
 */
export async function submitStudentAllocation({ session, studentId, sessionLabel }) {
  if (!session) { throw new Error('Session required'); }
  // Ensure no existing pending/approved allocation
  const existing = await Allocation.findOne({ student: studentId, status: { $in: ['pending', 'approved'] } }).session(session);
  if (existing) {
    throw new ValidationError('You already have a pending/approved allocation');
  }
  const user = await User.findById(studentId).lean();
  const academicSession = sessionLabel || new Date().getFullYear().toString();
  const allocationArr = await Allocation.create([
    { student: studentId, session: academicSession, status: 'pending' }
  ], { session });
  const allocationDoc = allocationArr[0];

  // Auto-pairing and auto-approval disabled: keep allocation pending for admin approval.
  // Optionally, compute compatibility meta without applying side effects in the future.
  const paired = false;
  const compatibilityMeta = null;
  return { allocation: allocationDoc, paired, compatibilityMeta };
}

export default { submitStudentAllocation };
