// src/routes/roomRoutes.js
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { createRoom, listRoomsByHostel, getRoom } from "../controllers/roomController.js";
import { validate } from "../middleware/validate.js";
import { createRoomSchema, hostelIdParamSchema, roomIdParamSchema } from "../validators/room.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management
 */

/**
 * @swagger
 * /api/rooms/{hostelId}/rooms:
 *   post:
 *     summary: Create a room inside a hostel
 *     tags: [Rooms]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: hostelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [number, capacity]
 *             properties:
 *               number:
 *                 type: string
 *               capacity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Room created
 */

// create room (admin) - note: admin also has admin route for this; duplicate is OK
router.post("/:hostelId/rooms", protect, permit("admin"), validate(hostelIdParamSchema), validate(createRoomSchema), createRoom);

/**
 * @swagger
 * /api/rooms/hostel/{hostelId}:
 *   get:
 *     summary: List rooms for a hostel
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: hostelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of rooms
 */

// list rooms for a hostel
router.get("/hostel/:hostelId", validate(hostelIdParamSchema), listRoomsByHostel);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get a single room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room object
 *       404:
 *         description: Not found
 */

// get single room
router.get("/:id", validate(roomIdParamSchema), getRoom);

export default router;
