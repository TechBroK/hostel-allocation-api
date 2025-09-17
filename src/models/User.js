import mongoose from "mongoose";

import { LASU_DEPARTMENTS } from "../config/departments.js";


const LEVELS = ['100','200','300','400','500'];

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  matricNumber: { type: String },
  email: { type: String, required: true, unique: true },
  // Nigerian MSISDN format: enforce +234 prefix; stored normalized (e.g. +2348012345678)
  phone: {
    type: String,
    validate: {
      validator(v) {
        if (!v) { return true; } // optional
        return /^\+234\d{10}$/.test(v); // +234 followed by 10 digits (total 14 chars)
      },
      message: 'Phone must be a Nigerian number in +234XXXXXXXXXX format'
    }
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "admin", "super-admin"], default: "student" },
  gender: { type: String, enum: ["male", "female"], index: true },
  level: { type: String, enum: LEVELS }, // optional on creation for non-students
  department: { type: String, enum: LASU_DEPARTMENTS },
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
}, { timestamps: true });

// Indexes to optimize common academic filtering queries
// Compound index helps queries filtering by both department & level
userSchema.index({ department: 1, level: 1 });
// Individual indexes assist when filtering by only one of the fields
userSchema.index({ department: 1 });
userSchema.index({ level: 1 });
// Recency queries (e.g., latest updated users)
userSchema.index({ updatedAt: -1 });

// Normalize phone before save: accept common Nigerian local formats (0XXXXXXXXXX or 234XXXXXXXXXX)
userSchema.pre('save', function(next) {
  if (this.phone) {
    let p = this.phone.trim();
    // Replace leading 0 with +234
    if (/^0\d{10}$/.test(p)) { p = '+234' + p.slice(1); }
    // If starts with 234 and length 13, add +
    if (/^234\d{10}$/.test(p)) { p = '+' + p; }
    // If already +234 and correct length keep
    this.phone = p;
  }
  next();
});

// Query Helpers & Statics
// Usage: User.find().recent(24)  -> updated in last 24 hours
userSchema.query.recent = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.where({ updatedAt: { $gte: since } });
};

// Static convenience: User.recentlyUpdated(hours, match)
userSchema.statics.recentlyUpdated = function(hours = 24, criteria = {}) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ ...criteria, updatedAt: { $gte: since } }).sort({ updatedAt: -1 });
};

export { LASU_DEPARTMENTS, LEVELS };

export default mongoose.model("User", userSchema);
