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

  // Find potential peer allocations
  const pendingPeers = await Allocation.find({
    _id: { $ne: allocationDoc._id },
    room: { $exists: false },
    status: 'pending'
  }).populate('student').session(session);

  let paired = false; let chosenPeer = null; let compatibilityMeta = null;
  for (const peerAlloc of pendingPeers) {
    const peerUser = peerAlloc.student;
  if (!peerUser) { continue; }
    const { score, range } = computeCompatibility(user, peerUser.toObject ? peerUser.toObject() : peerUser);
    if (['veryHigh', 'high'].includes(range)) {
      chosenPeer = peerAlloc;
      compatibilityMeta = { score, range };
      break;
    }
  }
  if (chosenPeer) {
    const selectedRoomLean = await selectRoomForPair({ gender: user.gender, minFreeSlots: 2 });
    if (selectedRoomLean) {
      const selectedRoom = await Room.findById(selectedRoomLean._id).session(session).populate('hostel');
      if (selectedRoom && (selectedRoom.capacity - (selectedRoom.occupied || 0)) >= 2) {
        if (!(user.gender && selectedRoom.hostel && selectedRoom.hostel.type && user.gender !== selectedRoom.hostel.type)) {
          allocationDoc.room = selectedRoom._id;
          allocationDoc.status = 'approved';
          allocationDoc.allocatedAt = new Date();
          allocationDoc.compatibilityScore = compatibilityMeta.score;
          allocationDoc.compatibilityRange = compatibilityMeta.range;
          allocationDoc.autoPaired = true;
          await allocationDoc.save({ session });

          chosenPeer.room = selectedRoom._id;
          chosenPeer.status = 'approved';
          chosenPeer.allocatedAt = new Date();
          chosenPeer.autoPaired = true;
          chosenPeer.compatibilityScore = compatibilityMeta.score;
          chosenPeer.compatibilityRange = compatibilityMeta.range;
          await chosenPeer.save({ session });

          selectedRoom.occupied = (selectedRoom.occupied || 0) + 2;
          await selectedRoom.save({ session });
          paired = true;
        }
      }
    }
  }
  return { allocation: allocationDoc, paired, compatibilityMeta };
}

export default { submitStudentAllocation };
