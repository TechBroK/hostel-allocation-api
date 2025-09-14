// src/routes/complaintRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createComplaint, getComplaintsByStudent } from "../controllers/complaintController.js";

const router = express.Router();

// POST /api/complaints/:studentId
router.post("/:studentId", protect, createComplaint);

// GET /api/complaints/:studentId
router.get("/:studentId", protect, getComplaintsByStudent);

export default router;
