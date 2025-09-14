// src/routes/roomRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import { createRoom, listRoomsByHostel, getRoom } from "../controllers/roomController.js";

const router = express.Router();

// create room (admin) - note: admin also has admin route for this; duplicate is OK
router.post("/:hostelId/rooms", protect, permit("admin"), createRoom);

// list rooms for a hostel
router.get("/hostel/:hostelId", listRoomsByHostel);

// get single room
router.get("/:id", getRoom);

export default router;
