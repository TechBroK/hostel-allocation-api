// src/routes/authRoutes.js
import express from "express";

import { register, login } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new student user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Preferred full name (if both provided, fullName takes precedence)
 *               name:
 *                 type: string
 *                 description: Alternative to fullName (one of fullName or name is required)
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               matricNumber:
 *                 type: string
 *               level:
 *                 type: string
 *               phone:
 *                 type: string
 *             oneOf:
 *               - required: [fullName]
 *               - required: [name]
 *     responses:
 *       201:
 *         description: Student registered
 *       400:
 *         description: Validation error
 */
router.post("/register", validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and obtain a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authenticated successfully
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), login);

export default router;
