// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { AuthError, ValidationError } from "../errors/AppError.js";

export const register = async (req, res, next) => {
  try {
    // Prefer validated payload if present
    const { fullName, email, password, matricNumber, level, phone } = req.validated || req.body;

    // Redundant guard (schema should enforce) but kept for backward safety
    if (!fullName || !email || !password) {
      throw new ValidationError("fullName, email and password required");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new ValidationError("Email already in use");
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      password: hashed,
      matricNumber,
      level,
      phone
    });

    return res.status(201).json({ id: user._id, status: "created" });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated || req.body;
    if (!email || !password) {
      throw new ValidationError("Email and password required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AuthError("Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new AuthError("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Preserve legacy shape
    return res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (err) {
    return next(err);
  }
};
