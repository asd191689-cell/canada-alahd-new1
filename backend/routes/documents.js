const express = require("express");
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
router.get("/family/:familyId", async (req, res) => {
  try {
    const { familyId } = req.params;
    const result = await pool.query(
      "SELECT * FROM documents WHERE family_id=$1",
      [familyId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new document
router.post("/", async (req, res) => {
  try {
    const { family_id, type, name, url, uploaded_by } = req.body;
    const result = await pool.query(
      `INSERT INTO documents (family_id, type, name, url, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [family_id, type, name, url, uploaded_by],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM documents WHERE id=$1", [id]);
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
