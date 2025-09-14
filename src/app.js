import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import allocationRoutes from "./routes/allocationRoutes.js";
import autoAllocationRoutes from "./routes/autoAllocationRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import connectDB from "./config/db.js";
import swaggerSpec from "./config/swagger.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import loggerModule from "./utils/logger.js";

const { logInfo } = loggerModule;

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/allocations", autoAllocationRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/", (req, res) => {
  res.json("Welcome to the node server");
});

// Health check
app.get('/healthz', async (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const states = ['disconnected','connected','connecting','disconnecting'];
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: states[dbState] || 'unknown'
  });
});

// Fallback & error handling (must be after routes)
app.use(notFound);
app.use(errorHandler);

app.listen(8080, () => logInfo('server.start', { message: 'Server running on port 8080' }));
