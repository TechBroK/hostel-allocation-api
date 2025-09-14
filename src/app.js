import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import allocationRoutes from "./routes/allocationRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import connectDB from "./config/db.js";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/", (req, res) => {
  res.json("Welcome to the node server");
});

app.listen(8080, () => console.log(`Server running on port ${8080}`));
