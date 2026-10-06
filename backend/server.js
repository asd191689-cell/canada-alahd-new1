const auditRoutes = require("./routes/audit");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// التطبيق يعمل خلف Vercel / Reverse Proxy
app.set("trust proxy", 1);

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
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

/* ================================
   General Middleware
================================ */

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://canada-alahd-frontend.vercel.app",
      "http://localhost:5173",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    console.log("Using pool:", pool);
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      db_time: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ داخلي في الخادم.",
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
app.use("/api/aid-distributions", require("./routes/aidDistributions"));
app.use("/api/audit", auditRoutes);

/* ================================
   404 Handler
================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "المسار المطلوب غير موجود.",
  });
});

/* ================================
   Global Error Handler
================================ */

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "بيانات JSON المرسلة غير صالحة.",
    });
  }
  console.error("❌ Server Error:", err.stack);

  res.status(500).json({
    success: false,
    message: "حدث خطأ داخلي في الخادم.",
  });
});

/* ================================
   Start Server
================================ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
