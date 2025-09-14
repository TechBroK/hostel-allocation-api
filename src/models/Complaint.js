import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["Maintenance", "Roommate", "Facilities", "Other"], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" },
  response: String,
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Complaint", complaintSchema);
