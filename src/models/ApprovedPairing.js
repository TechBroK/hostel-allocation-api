import mongoose from "mongoose";

const approvedPairingSchema = new mongoose.Schema({
  studentIdA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentIdB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedAt: { type: Date, default: Date.now },
  weightSnapshot: { type: Object }, // record weights at approval time for audit
}, { timestamps: true });

// Deterministic orderless unique key to prevent A|B vs B|A duplicates
approvedPairingSchema.add({ pairKey: { type: String, unique: true, index: true } });
approvedPairingSchema.pre('validate', function(next) {
  if (this.studentIdA && this.studentIdB) {
    const a = this.studentIdA.toString();
    const b = this.studentIdB.toString();
    this.pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
  }
  next();
});
approvedPairingSchema.index({ approvedAt: -1 });
approvedPairingSchema.index({ approvedBy: 1, approvedAt: -1 });

export default mongoose.model("ApprovedPairing", approvedPairingSchema);
