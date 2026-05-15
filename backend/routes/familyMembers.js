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

// GET members of a family
router.get("/family/:familyId", async (req, res) => {
  try {
    const { familyId } = req.params;
    const result = await pool.query(
      "SELECT * FROM family_members WHERE family_id=$1",
      [familyId],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add member to a family
router.post("/", async (req, res) => {
  try {
    const {
      family_id,
      name,
      national_id,
      date_of_birth,
      age,
      relation,
      health_status,
      disability,
    } = req.body;
    const result = await pool.query(
      `INSERT INTO family_members
      (family_id, name, national_id, date_of_birth, age, relation, health_status, disability)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        family_id,
        name,
        national_id,
        date_of_birth,
        age,
        relation,
        health_status,
        disability,
      ],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update member
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      national_id,
      date_of_birth,
      age,
      relation,
      health_status,
      disability,
    } = req.body;
    const result = await pool.query(
      `UPDATE family_members SET
        name=$1, national_id=$2, date_of_birth=$3, age=$4, relation=$5, health_status=$6, disability=$7
       WHERE id=$8
       RETURNING *`,
      [
        name,
        national_id,
        date_of_birth,
        age,
        relation,
        health_status,
        disability,
        id,
      ],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE member
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM family_members WHERE id=$1", [id]);
    res.json({ message: "Family member deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
