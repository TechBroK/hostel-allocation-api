import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  hostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", required: true },
  roomNumber: { type: String, required: true },
  type: { type: String, enum: ["Standard", "Premium"], required: true },
  capacity: { type: Number, required: true },
  occupied: { type: Number, default: 0 }
});

export default mongoose.model("Room", roomSchema);
