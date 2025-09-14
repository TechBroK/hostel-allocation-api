// src/routes/complaintRoutes.js
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { createComplaint, getComplaintsByStudent } from "../controllers/complaintController.js";
import { validate } from "../middleware/validate.js";
import { createComplaintSchema, studentIdParamSchema } from "../validators/complaint.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Complaints
 *   description: Student complaints
 */

/**
 * @swagger
 * /api/complaints/{studentId}:
 *   post:
 *     summary: Submit a complaint
 *     tags: [Complaints]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       201: { description: Complaint submitted }
 */

// POST /api/complaints/:studentId
router.post("/:studentId", protect, validate(studentIdParamSchema), validate(createComplaintSchema), createComplaint);

/**
 * @swagger
 * /api/complaints/{studentId}:
 *   get:
 *     summary: Get complaints for a student
 *     tags: [Complaints]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of complaints }
 */

// GET /api/complaints/:studentId
router.get("/:studentId", protect, validate(studentIdParamSchema), getComplaintsByStudent);

export default router;
