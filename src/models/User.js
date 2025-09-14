import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  matricNumber: { type: String },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "admin", "super-admin"], default: "student" },
  gender: { type: String, enum: ["male", "female"], index: true },
  level: String,
  personalityTraits: {
    sleepSchedule: String,
    studyHabits: String,
    cleanlinessLevel: { type: Number, min: 1, max: 5 },
    socialPreference: String,
    noisePreference: String,
    hobbies: [String],
    musicPreference: String,
    visitorFrequency: String,
  },
});

export default mongoose.model("User", userSchema);
