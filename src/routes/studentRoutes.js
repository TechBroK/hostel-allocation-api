// src/routes/studentRoutes.js
import express from "express";
import multer from "multer";

import { protect } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, uploadAvatar, getRoommate, updatePersonalityTraits, listStudents } from "../controllers/studentController.js";
import { listStudentsQuerySchema } from '../validators/studentList.validator.js';
import { validate } from '../middleware/validate.js';
import { updatePersonalitySchema } from "../validators/personality.validator.js";
import { updateProfileSchema, studentIdParamSchema } from "../validators/student.validator.js";

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
 * /api/students:
 *   get:
 *     summary: List students (admin)
 *     tags: [Students]
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
 *     responses:
 *       200:
 *         description: Paged list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 totalPages: { type: integer }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       fullName: { type: string }
 *                       email: { type: string }
 *                       gender: { type: string }
 */
router.get('/', protect, validate(listStudentsQuerySchema), listStudents);

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

router.get("/:studentId/profile", protect, validate(studentIdParamSchema), getProfile);

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
router.put("/:studentId/profile", protect, validate(studentIdParamSchema), validate(updateProfileSchema), updateProfile);
router.put("/:studentId/personality", protect, validate(studentIdParamSchema), validate(updatePersonalitySchema), updatePersonalityTraits);

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
router.post("/:studentId/profile/avatar", protect, validate(studentIdParamSchema), upload.single("avatar"), uploadAvatar);

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
router.get("/:studentId/roommate", protect, validate(studentIdParamSchema), getRoommate);
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
export default router;
