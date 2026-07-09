const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

/* ================================
   Database Connection
================================ */

const pool = require("./config/db");

/* ================================
   Security Middleware
================================ */

// حماية الهيدر
app.use(helmet());

// منع السبام والهجمات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

/* ================================
   General Middleware
================================ */

app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

/* ================================
   Health Check API
================================ */

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Canada Al Ahd Backend Running 🚀",
  });
});

/* ================================
   Test Database API
================================ */

app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      db_time: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ================================
   API Routes
================================ */

app.use("/api/auth", require("./routes/auth"));

app.use("/api/users", require("./routes/users"));

app.use("/api/families", require("./routes/families"));

app.use("/api/family-members", require("./routes/familyMembers"));

app.use("/api/documents", require("./routes/documents"));

app.use("/api/aid-types", require("./routes/aidTypes"));

/* ================================
   404 Handler
================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ================================
   Global Error Handler
================================ */

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* ================================
   Start Server
================================ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
