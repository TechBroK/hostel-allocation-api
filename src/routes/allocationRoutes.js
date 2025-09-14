// src/routes/allocationRoutes.js
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { submitAllocation, adminCreateAllocation, listAllocations, getAllocationStatus, getMatchSuggestions, approvePairing, getApprovedPairings } from "../controllers/allocationController.js";
import { validate } from "../middleware/validate.js";
import { submitAllocationSchema, adminCreateAllocationSchema, studentIdParamSchema } from "../validators/allocation.validator.js";

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
router.post("/", protect, validate(submitAllocationSchema), submitAllocation);

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
router.get("/:studentId/status", protect, validate(studentIdParamSchema), getAllocationStatus);

/**
 * @swagger
 * /api/allocations/{studentId}/match-suggestions:
 *   get:
 *     summary: Generate compatibility-based match suggestions for a student
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Suggestions grouped by range }
 */
router.get("/:studentId/match-suggestions", protect, validate(studentIdParamSchema), getMatchSuggestions);

/**
 * @swagger
 * /api/allocations/approved-pairings:
 *   get:
 *     summary: (Deprecated) List admin-approved pairings (legacy learning mechanism)
 *     deprecated: true
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Approved pairings list }
 */
router.get("/approved-pairings", protect, permit("admin"), getApprovedPairings);

/**
 * @swagger
 * /api/allocations/approve-pairing:
 *   post:
 *     summary: (Deprecated) Approve a pairing (legacy adaptive weighting)
 *     deprecated: true
 *     tags: [Allocations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentIdA: { type: string }
 *               studentIdB: { type: string }
 *     responses:
 *       201: { description: Pairing recorded }
 */
router.post("/approve-pairing", protect, permit("admin"), approvePairing);

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
router.post("/admin", protect, permit("admin"), validate(adminCreateAllocationSchema), adminCreateAllocation);

export default router;
