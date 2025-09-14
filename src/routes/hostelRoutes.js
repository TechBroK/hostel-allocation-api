// src/routes/hostelRoutes.js
import express from "express";
import { listHostels, getHostelRooms } from "../controllers/hostelController.js";

const router = express.Router();

router.get("/", listHostels); // public listing
router.get("/:hostelId/rooms", getHostelRooms);
router.get("/ping", (req, res) => {
  res.json({ msg: "Routes alive ✅" });
});
export default router;
