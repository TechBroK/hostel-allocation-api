import Hostel from "../models/Hostel.js";
import Room from "../models/Room.js";
import AllocationMeta from "../models/AllocationMeta.js";

// Round-robin hostel selection: rotate through hostels of matching gender type.
export async function selectRoomForPair({ gender, minFreeSlots = 2 }) {
  const hostels = await Hostel.find(gender ? { type: gender } : {}).sort({ _id: 1 }).lean();
  if (!hostels.length) {
    return null;
  }
  const meta = await AllocationMeta.findOne({ key: "lastHostelIndex" });
  let lastIndex = meta?.value?.index || -1;
  // Try at most hostels.length attempts
  for (let attempt = 0; attempt < hostels.length; attempt += 1) {
    lastIndex = (lastIndex + 1) % hostels.length;
    const hostel = hostels[lastIndex];
    // find best room in this hostel with required free slots
    const rooms = await Room.find({ hostel: hostel._id }).lean();
    let best = null; let bestScore = -Infinity;
    for (const r of rooms) {
      const free = (r.capacity || 0) - (r.occupied || 0);
      if (free < minFreeSlots) {
        continue;
      }
      const score = (free / r.capacity) + Math.random() * 0.005; // prefer more free capacity
      if (score > bestScore) { bestScore = score; best = r; }
    }
    if (best) {
      await AllocationMeta.findOneAndUpdate(
        { key: "lastHostelIndex" },
        { value: { index: lastIndex }, updatedAt: new Date() },
        { upsert: true }
      );
      return best;
    }
  }
  return null; // none available
}

export default { selectRoomForPair };