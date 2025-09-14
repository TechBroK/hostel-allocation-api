import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  matricNumber: { type: String },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "admin", "super-admin"], default: "student" },
  level: String,
});

export default mongoose.model("User", userSchema);
