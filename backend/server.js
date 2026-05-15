const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// إعداد الاتصال بـ PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test API
app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== Users API Routes ===== */
const usersRouter = require("./routes/users");
app.use("/api/users", usersRouter);

/* ===== Families API Routes ===== */
const familiesRouter = require("./routes/families");
app.use("/api/families", familiesRouter);

/* ===== Family Members API Routes ===== */
const familyMembersRouter = require("./routes/familyMembers");
app.use("/api/family-members", familyMembersRouter);

/* ===== Documents API Routes ===== */
const documentsRouter = require("./routes/documents");
app.use("/api/documents", documentsRouter);

/* ===== Aid Types API Routes ===== */
const aidTypesRouter = require("./routes/aidTypes");
app.use("/api/aid-types", aidTypesRouter);

/* ===== Aid Distributions API Routes ===== */
const aidDistributionsRouter = require("./routes/aidDistributions");
app.use("/api/aid-distributions", aidDistributionsRouter);

/* ===== Audit Logs API Routes ===== */
const auditLogsRouter = require("./routes/auditLogs");
app.use("/api/audit-logs", auditLogsRouter);

// تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
