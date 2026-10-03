const express = require("express");
const router = express.Router();

const pool = require("../config/db");

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const { mapAudit } = require("../mappers/auditMapper");

/*
========================================
GET AUDIT LOGS
========================================
*/

router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
    audit_logs.*,
    users.full_name
FROM audit_logs
LEFT JOIN users
ON users.id = audit_logs.user_id
ORDER BY audit_logs.timestamp DESC
      `);

      res.json({
        success: true,
        logs: result.rows.map(mapAudit),
      });
    } catch (err) {
      console.error("GET AUDIT LOGS ERROR:", err);
      res.status(500).json({
        success: false,
        message: "تعذر تحميل سجل التدقيق.",
      });
    }
  },
);

module.exports = router;
