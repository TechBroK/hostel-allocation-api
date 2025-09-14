// src/routes/allocationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { permit } from "../middleware/roleMiddleware.js";
import {
  submitAllocation,
  adminCreateAllocation,
  listAllocations,
  getAllocationStatus,
} from "../controllers/allocationController.js";

const router = express.Router();

// student submission (authenticated)
router.post("/", protect, submitAllocation);

// get status for student
router.get("/:studentId/status", protect, getAllocationStatus);

// admin list
router.get("/", protect, permit("admin"), listAllocations);

// admin create (also exposed on /api/admin/allocations)
router.post("/admin", protect, permit("admin"), adminCreateAllocation);

export default router;
