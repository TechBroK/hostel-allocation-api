import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { autoAllocatePair } from "../controllers/allocationController.js";

const router = express.Router();

/**
 * @swagger
 * /api/allocations/auto-allocate:
 *   post:
 *     summary: Auto allocate two students into a room if their compatibility is high enough
 *     tags: [Allocation]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentIdA, studentIdB, roomId]
 *             properties:
 *               studentIdA: { type: string }
 *               studentIdB: { type: string }
 *               roomId: { type: string }
 *     responses:
 *       201:
 *         description: Pair allocated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
// NOTE: The previous version incorrectly called protect("admin") which returned a non-function (protect expects no args).
// Correct chain: authenticate first, then authorize by role.
router.post("/auto-allocate", protect, permit("admin", "super-admin"), autoAllocatePair);

export default router;
