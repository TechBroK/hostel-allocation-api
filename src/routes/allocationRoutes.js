// src/routes/allocationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import {
  submitAllocation,
  adminCreateAllocation,
  listAllocations,
  getAllocationStatus,
} from "../controllers/allocationController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Allocations
 *   description: Room allocation submission and admin management
 */

/**
 * @swagger
 * /api/allocations:
 *   post:
 *     summary: Submit an allocation request (student)
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201: { description: Allocation submitted }
 */

// student submission (authenticated)
router.post("/", protect, submitAllocation);

/**
 * @swagger
 * /api/allocations/{studentId}/status:
 *   get:
 *     summary: Get allocation status for a student
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Allocation status }
 *       404: { description: Not found }
 */

// get status for student
router.get("/:studentId/status", protect, getAllocationStatus);

/**
 * @swagger
 * /api/allocations:
 *   get:
 *     summary: List all allocations (admin)
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of allocations }
 */

// admin list
router.get("/", protect, permit("admin"), listAllocations);

/**
 * @swagger
 * /api/allocations/admin:
 *   post:
 *     summary: Admin creates allocation directly
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Allocation created }
 */

// admin create (also exposed on /api/admin/allocations)
router.post("/admin", protect, permit("admin"), adminCreateAllocation);

export default router;
