// src/routes/roomRoutes.js
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { createRoom, listRoomsByHostel, getRoom, deleteRoom, updateRoom } from "../controllers/roomController.js";
import Room from "../models/Room.js";
import { validate } from "../middleware/validate.js";
import { createRoomSchema, hostelIdParamSchema, roomIdParamSchema, updateRoomSchema } from "../validators/room.validator.js";

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

// Optional: /rooms/:id/availability used by FE helper; returns remaining capacity
router.get("/:id/availability", validate(roomIdParamSchema), async (req, res, next) => {
	try {
		const { id } = req.params;
		const room = await Room.findById(id).lean();
		if (!room) { return res.status(404).json({ message: 'Room not found' }); }
		const remaining = Math.max(0, (room.capacity || 0) - (room.occupied || 0));
		return res.json({ id: room._id.toString(), remaining, capacity: room.capacity, occupied: room.occupied || 0 });
	} catch (err) { return next(err); }
});

// delete room (admin only) - duplicate of admin route for flexibility
router.delete("/:id", protect, permit("admin"), validate(roomIdParamSchema), deleteRoom);
// update room (admin only) - duplicate of admin route for flexibility
router.patch("/:id", protect, permit("admin"), validate(roomIdParamSchema), validate(updateRoomSchema), updateRoom);

export default router;
