// src/routes/studentRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, uploadAvatar, getRoommate } from "../controllers/studentController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // customize for production (cloud + originalname etc.)

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student profile operations
 */

/**
 * @swagger
 * /api/students/{studentId}/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Students]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Profile returned }
 */

router.get("/:studentId/profile", protect, getProfile);

/**
 * @swagger
 * /api/students/{studentId}/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Students]
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
 *               fullName: { type: string }
 *               phone: { type: string }
 *               level: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put("/:studentId/profile", protect, updateProfile);

/**
 * @swagger
 * /api/students/{studentId}/profile/avatar:
 *   post:
 *     summary: Upload avatar image
 *     tags: [Students]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Avatar uploaded }
 */
router.post("/:studentId/profile/avatar", protect, upload.single("avatar"), uploadAvatar);

/**
 * @swagger
 * /api/students/{studentId}/roommate:
 *   get:
 *     summary: Get roommate info
 *     tags: [Students]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Roommate data }
 */
router.get("/:studentId/roommate", protect, getRoommate);
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
export default router;
