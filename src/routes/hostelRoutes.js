// src/routes/hostelRoutes.js
import express from "express";

import { listHostels, getHostelRooms, deleteHostel, updateHostel } from "../controllers/hostelController.js";
import Room from "../models/Room.js";
import { validate } from "../middleware/validate.js";
import { hostelIdParamSchema, updateHostelSchema } from "../validators/hostel.validator.js";
import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Hostels
 *   description: Hostel CRUD
 */

/**
 * @swagger
 * /api/hostels:
 *   post:
 *     summary: Create a hostel
 *     tags: [Hostels]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, capacity]
 *             properties:
 *               name: { type: string }
 *               capacity: { type: number }
 *     responses:
 *       201: { description: Created }
 */

router.get("/", listHostels); // public listing

/**
 * @swagger
 * /api/hostels:
 *   get:
 *     summary: List hostels
 *     tags: [Hostels]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of hostels
 */
router.get("/:hostelId/rooms", validate(hostelIdParamSchema), getHostelRooms);
// Additional convenience endpoint used by FE: /hostels/:hostelId/rooms/availability
router.get("/:hostelId/rooms/availability", validate(hostelIdParamSchema), async (req, res, next) => {
  try {
    const { hostelId } = req.params;
    const rooms = await Room.find({ hostel: hostelId }).lean();
    const mapped = rooms.map(r => ({ id: r._id.toString(), number: r.roomNumber, type: r.type, capacity: r.capacity, occupied: r.occupied || 0 }));
    return res.json({ data: mapped });
  } catch (err) { return next(err); }
});
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
// delete hostel (admin only) - duplicate of admin route for flexibility
router.delete("/:hostelId", protect, permit("admin"), validate(hostelIdParamSchema), deleteHostel);
// update hostel (admin only)
router.patch("/:hostelId", protect, permit("admin"), validate(hostelIdParamSchema), validate(updateHostelSchema), updateHostel);
export default router;
