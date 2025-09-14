// src/routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student
 * @access  Public
 * @body    { fullName, email, password, matricNumber?, level?, phone? }
 * @returns { id, status }
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email + password
 * @access  Public
 * @body    { email, password }
 * @returns { token, user }
 */
router.post("/login", login);

export default router;
