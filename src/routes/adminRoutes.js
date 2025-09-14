// src/routes/adminRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { listStudents, updateStudentStatus, getSummary, exportReport, createAdminUser } from "../controllers/adminController.js";
import { createHostel, listHostels } from "../controllers/hostelController.js";
import { createRoom, listRoomsByHostel } from "../controllers/roomController.js";
import { adminCreateAllocation, listAllocations } from "../controllers/allocationController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and reporting
 */

/**
 * @swagger
 * /api/admin/admins:
 *   post:
 *     summary: Create a new admin (super-admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Admin created }
 *       403: { description: Forbidden }
 */
// super-admin creates admin
router.post("/admins", protect, permit("super-admin"), createAdminUser);

// students
router.get("/students", protect, permit("admin"), listStudents);
router.put("/students/:studentId", protect, permit("admin"), updateStudentStatus);

// hostels & rooms
router.post("/hostels", protect, permit("admin"), createHostel);
router.get("/hostels", protect, permit("admin"), listHostels);
router.post("/hostels/:hostelId/rooms", protect, permit("admin"), createRoom);
router.get("/hostels/:hostelId/rooms", protect, permit("admin"), listRoomsByHostel);

// allocations
router.post("/allocations", protect, permit("admin"), adminCreateAllocation);
router.get("/allocations", protect, permit("admin"), listAllocations);

// reports
router.get("/reports/summary", protect, permit("admin"), getSummary);
router.get("/reports/export", protect, permit("admin"), exportReport);

export default router;
