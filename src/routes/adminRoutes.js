// src/routes/adminRoutes.js
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { listStudents, listUnallocatedStudents, listRecentStudents, updateStudentStatus, getSummary, exportReport, createAdminUser } from "../controllers/adminController.js";
import { createHostel, listHostels } from "../controllers/hostelController.js";
import { createRoom, listRoomsByHostel, listUnallocatedRooms } from "../controllers/roomController.js";
import { adminCreateAllocation, listAllocations } from "../controllers/allocationController.js";
import { validate } from "../middleware/validate.js";
import { createHostelSchema } from "../validators/hostel.validator.js";
import { createRoomSchema } from "../validators/room.validator.js";
import { adminCreateAllocationSchema } from "../validators/allocation.validator.js";
import { createAdminSchema } from "../validators/adminCreate.validator.js";
import { updateStudentStatusSchema } from "../validators/admin.validator.js";

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
 *     summary: Create a new admin (super-admin or existing admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]  # name or fullName (one required)
 *             properties:
 *               name: { type: string, description: "Alias for fullName" }
 *               fullName: { type: string, description: "Preferred field; 'name' also accepted" }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Admin created }
 *       403: { description: Forbidden }
 */
// super-admin creates admin
router.post("/admins", protect, permit("super-admin", "admin"), validate(createAdminSchema), createAdminUser);

/**
 * @swagger
 * /api/admin/students:
 *   get:
 *     summary: List students (admin perspective)
 *     description: Returns paginated students with allocation status (pending if no allocation found). Includes createdAt & updatedAt timestamps for activity tracking.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [100,200,300,400,500] }
 *     responses:
 *       200:
 *         description: Paged students list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudentListItem'
 *                 meta: { $ref: '#/components/schemas/PagedMeta' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// students
router.get("/students", protect, permit("admin"), listStudents);
/**
 * @swagger
 * /api/admin/students/unallocated:
 *   get:
 *     summary: List students without an approved allocation
 *     description: Returns students who either have no allocation document or whose latest allocation is not approved. Optional session filter.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: session
 *         schema: { type: string }
 *         description: Filter by academic session label
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [100,200,300,400,500] }
 *     responses:
 *       200:
 *         description: Paged unallocated students list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/StudentListItem'
 *                       - type: object
 *                         properties:
 *                           allocationStatus: { type: string, description: "none | pending | rejected" }
 *                 meta: { $ref: '#/components/schemas/PagedMeta' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/students/unallocated", protect, permit("admin"), listUnallocatedStudents);
/**
 * @swagger
 * /api/admin/students/recent:
 *   get:
 *     summary: List recently active students
 *     description: Students updated within the last N hours (default 24). Limited to 50 by default.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema: { type: integer, minimum: 1, maximum: 720 }
 *         description: Lookback window in hours (default 24, max 720)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *         description: Max number of records (default 50)
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [100,200,300,400,500] }
 *     responses:
 *       200:
 *         description: Recently active students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hours: { type: integer }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/StudentListItem' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/students/recent", protect, permit("admin"), listRecentStudents);
/**
 * @swagger
 * /api/admin/students/{studentId}:
 *   put:
 *     summary: Update a student's allocation status
 *     tags: [Admin]
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
 *             properties:
 *               status: { type: string, enum: [pending, approved, rejected] }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Student not found }
 */
router.put("/students/:studentId", protect, permit("admin"), validate(updateStudentStatusSchema), updateStudentStatus);

/**
 * @swagger
 * /api/admin/hostels:
 *   post:
 *     summary: Create a hostel
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, capacity]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [male, female] }
 *               capacity: { type: integer }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Hostel created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Hostel' }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// hostels & rooms
router.post("/hostels", protect, permit("admin"), validate(createHostelSchema), createHostel);
/**
 * @swagger
 * /api/admin/hostels:
 *   get:
 *     summary: List hostels with occupancy stats
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paged hostels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Hostel'
 *                       - type: object
 *                         properties:
 *                           occupancy:
 *                             type: object
 *                             properties:
 *                               totalRooms: { type: integer }
 *                               occupiedBeds: { type: integer }
 *                               totalBeds: { type: integer }
 *                               availableBeds: { type: integer }
 *                 meta: { $ref: '#/components/schemas/PagedMeta' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/hostels", protect, permit("admin"), listHostels);
/**
 * @swagger
 * /api/admin/hostels/{hostelId}/rooms:
 *   post:
 *     summary: Create a room inside a hostel
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: hostelId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomNumber, type, capacity]
 *             properties:
 *               roomNumber: { type: string }
 *               type: { type: string, enum: [Standard, Premium] }
 *               capacity: { type: integer }
 *     responses:
 *       201: { description: Room created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Hostel not found }
 */
router.post("/hostels/:hostelId/rooms", protect, permit("admin"), validate(createRoomSchema), createRoom);
/**
 * @swagger
 * /api/admin/hostels/{hostelId}/rooms:
 *   get:
 *     summary: List rooms in a hostel
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: hostelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rooms list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Room' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Hostel not found }
 */
router.get("/hostels/:hostelId/rooms", protect, permit("admin"), listRoomsByHostel);

/**
 * @swagger
 * /api/admin/rooms/unallocated:
 *   get:
 *     summary: List rooms with remaining capacity
 *     description: Returns paginated rooms where occupied < capacity. Optional hostel filter.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: hostelId
 *         schema: { type: string }
 *         description: Filter by hostel
 *     responses:
 *       200:
 *         description: Paged list of rooms with availability
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       roomNumber: { type: string }
 *                       type: { type: string }
 *                       capacity: { type: integer }
 *                       occupied: { type: integer }
 *                       remaining: { type: integer }
 *                 meta: { $ref: '#/components/schemas/PagedMeta' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/rooms/unallocated", protect, permit("admin"), listUnallocatedRooms);

/**
 * @swagger
 * /api/admin/allocations:
 *   post:
 *     summary: Create an allocation (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student, room, session]
 *             properties:
 *               student: { type: string }
 *               room: { type: string }
 *               session: { type: string }
 *     responses:
 *       201: { description: Allocation created }
 *       400: { description: Validation / business rule error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// allocations
router.post("/allocations", protect, permit("admin"), validate(adminCreateAllocationSchema), adminCreateAllocation);
/**
 * @swagger
 * /api/admin/allocations:
 *   get:
 *     summary: List allocations
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *       - in: query
 *         name: session
 *         schema: { type: string }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [100,200,300,400,500] }
 *       - in: query
 *         name: allocatedFrom
 *         schema: { type: string, format: date-time }
 *         description: ISO date/time lower bound (allocatedAt >=)
 *       - in: query
 *         name: allocatedTo
 *         schema: { type: string, format: date-time }
 *         description: ISO date/time upper bound (allocatedAt <=)
 *     responses:
 *       200:
 *         description: Paged allocations list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Allocation' }
 *                 meta: { $ref: '#/components/schemas/PagedMeta' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/allocations", protect, permit("admin"), listAllocations);

/**
 * @swagger
 * /api/admin/reports/summary:
 *   get:
 *     summary: Get system summary metrics
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Summary metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStudents: { type: integer }
 *                 totalHostels: { type: integer }
 *                 totalRooms: { type: integer }
 *                 totalAllocations: { type: integer }
 *                 occupancyRate: { type: number }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// reports
router.get("/reports/summary", protect, permit("admin"), getSummary);
/**
 * @swagger
 * /api/admin/reports/export:
 *   get:
 *     summary: Export CSV report (students, rooms, allocations)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [students, rooms, allocations] }
 *     responses:
 *       200:
 *         description: CSV file (text/csv)
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400: { description: Unsupported type }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/reports/export", protect, permit("admin"), exportReport);

export default router;
