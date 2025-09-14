// src/routes/studentRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, uploadAvatar, getRoommate } from "../controllers/studentController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // customize for production (cloud + originalname etc.)

router.get("/:studentId/profile", protect, getProfile);
router.put("/:studentId/profile", protect, updateProfile);
router.post("/:studentId/profile/avatar", protect, upload.single("avatar"), uploadAvatar);
router.get("/:studentId/roommate", protect, getRoommate);
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
export default router;
