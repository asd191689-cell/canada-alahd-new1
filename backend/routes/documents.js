const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const express = require("express");
const upload = require("../middleware/upload");
const router = express.Router();
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// GET all documents for a family
router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT *
        FROM documents
        ORDER BY uploaded_at DESC
      `);

      res.json({
        success: true,
        documents: result.rows,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);
// POST create new document
router.post(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  upload.single("document"),

  async (req, res) => {
    try {
      const { family_id, type, uploaded_by, head_national_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "يرجى اختيار ملف",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO documents
        (
          family_id,
          head_national_id,
          type,
          name,
          file_url,
          uploaded_by
        )
        VALUES
        ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [
          family_id,
          head_national_id,
          type,
          req.file.originalname,
          `/uploads/${req.file.filename}`,
          uploaded_by,
        ],
      );

      res.status(201).json({
        success: true,
        document: result.rows[0],
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);
// UPDATE DOCUMENT STATUS
router.put(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await pool.query(
        `
        UPDATE documents
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [status, id],
      );

      res.json({
        success: true,
        document: result.rows[0],
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// DELETE document
router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM documents WHERE id=$1", [id]);
      res.json({ message: "Document deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

module.exports = router;
