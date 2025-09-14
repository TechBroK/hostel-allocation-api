import mongoose from "mongoose";

const allocationMetaSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

allocationMetaSchema.index({ key: 1 }, { unique: true });

export default mongoose.model("AllocationMeta", allocationMetaSchema);
