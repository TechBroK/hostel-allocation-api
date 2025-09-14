import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["male", "female"], required: true },
  capacity: { type: Number, required: true },
  description: String,
});

export default mongoose.model("Hostel", hostelSchema);

