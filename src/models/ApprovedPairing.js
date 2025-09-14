import mongoose from "mongoose";

const approvedPairingSchema = new mongoose.Schema({
  studentIdA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentIdB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedAt: { type: Date, default: Date.now },
  weightSnapshot: { type: Object }, // record weights at approval time for audit
}, { timestamps: true, indexes: true });

approvedPairingSchema.index({ studentIdA: 1, studentIdB: 1 }, { unique: true });

export default mongoose.model("ApprovedPairing", approvedPairingSchema);
