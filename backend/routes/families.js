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

// GET all families
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM families WHERE is_deleted = FALSE ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a single family by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM families WHERE id=$1", [id]);
    if (!result.rows[0])
      return res.status(404).json({ error: "Family not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new family
router.post("/", async (req, res) => {
  try {
    const {
      file_number,
      head_name,
      head_national_id,
      head_date_of_birth,
      head_age,
      head_phone,
      head_health_status,
      origin_governorate,
      origin_city,
      current_address,
      entry_date,
      members_count,
      notes,
      registered_by,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO families
      (file_number, head_name, head_national_id, head_date_of_birth, head_age, head_phone,
       head_health_status, origin_governorate, origin_city, current_address,
       entry_date, members_count, notes, registered_by)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        file_number,
        head_name,
        head_national_id,
        head_date_of_birth,
        head_age,
        head_phone,
        head_health_status,
        origin_governorate,
        origin_city,
        current_address,
        entry_date,
        members_count,
        notes,
        registered_by,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update existing family
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      file_number,
      head_name,
      head_national_id,
      head_date_of_birth,
      head_age,
      head_phone,
      head_health_status,
      origin_governorate,
      origin_city,
      current_address,
      entry_date,
      members_count,
      notes,
      registered_by,
    } = req.body;

    const result = await pool.query(
      `UPDATE families SET
        file_number=$1, head_name=$2, head_national_id=$3, head_date_of_birth=$4, head_age=$5,
        head_phone=$6, head_health_status=$7, origin_governorate=$8, origin_city=$9,
        current_address=$10, entry_date=$11, members_count=$12, notes=$13, registered_by=$14,
        updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [
        file_number,
        head_name,
        head_national_id,
        head_date_of_birth,
        head_age,
        head_phone,
        head_health_status,
        origin_governorate,
        origin_city,
        current_address,
        entry_date,
        members_count,
        notes,
        registered_by,
        id,
      ],
    );

    if (!result.rows[0])
      return res.status(404).json({ error: "Family not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE family (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE families SET is_deleted=TRUE WHERE id=$1 RETURNING *",
      [id],
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Family not found" });
    res.json({ message: "Family deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
