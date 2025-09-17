import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" }, // optional until assigned
  session: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  allocatedAt: { type: Date },
  compatibilityScore: { type: Number }, // 0-100 if algorithm used
  // Updated classification ranges: veryHigh | high | moderate | low
  compatibilityRange: { type: String, enum: ["veryHigh", "high", "moderate", "low" ] },
  matchBreakdown: { type: Object }, // { base, affinity }
  autoPaired: { type: Boolean, default: false },
});

allocationSchema.index({ student: 1, session: 1 }, { unique: true });
// For latest allocation lookups & status filtering
allocationSchema.index({ student: 1, allocatedAt: -1 });
allocationSchema.index({ status: 1, allocatedAt: -1 });

export default mongoose.model("Allocation", allocationSchema);
