import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching FRONTEND_URL
      if (!origin || origin === env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(null, true); // Alternatively allow in development: callback(null, true)
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Standard parsers
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base route
app.get("/", (req, res) => {
  res.status(200).json({
    name: "ROS Error Monitoring API",
    version: "1.0.0",
    status: "running",
  });
});

// Mount all modular versioned routes (e.g. /v1/...)
app.use(routes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
