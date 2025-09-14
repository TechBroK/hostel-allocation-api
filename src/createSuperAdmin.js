// Script to create a super-admin user
// Usage: node src/createSuperAdmin.js
/* eslint-disable no-console */

import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./models/User.js";
import connectDB from "./config/db.js";

dotenv.config();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';


async function createSuperAdmin() {
  try {
    await connectDB();
    const existing = await User.findOne({ role: 'super-admin' });
    if (existing) {
      console.log('Super-admin already exists:', existing.email); // console allowed in script context
      process.exit(0);
    }
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    const superAdmin = new User({
      fullName: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'super-admin'
    });
    await superAdmin.save();
  console.log('Super-admin created:', superAdmin.email);
    process.exit(0);
  } catch (err) {
  console.error('Error creating super-admin:', err);
    process.exit(1);
  }
}

createSuperAdmin();
