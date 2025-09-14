// src/routes/hostelRoutes.js
import express from "express";

import { listHostels, getHostelRooms } from "../controllers/hostelController.js";
import { validate } from "../middleware/validate.js";
import { hostelIdParamSchema } from "../validators/hostel.validator.js";

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
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
export default router;
