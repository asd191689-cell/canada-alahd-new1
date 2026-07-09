const authorize = require("../middleware/authorize");
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

/*
=======================================
GET ALL USERS
=======================================
*/
router.get("/", authMiddleware, authorize(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        full_name AS name,
        username,
        role,
        created_at
      FROM users
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

/*
=======================================
CREATE USER
=======================================
*/
router.post("/", authMiddleware, authorize(["admin"]), async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body;

    if (!full_name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check existing username
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await pool.query(
      `
      INSERT INTO users
      (full_name, username, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING 
id,
full_name AS name,
username,
role,
created_at
      `,
      [full_name, username, hashedPassword, role],
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

/*
=======================================
DELETE USER
=======================================
*/
router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query("DELETE FROM users WHERE id = $1", [id]);

      res.json({
        success: true,
        message: "User deleted",
      });
    } catch (error) {
      console.error("DELETE USER ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

module.exports = router;
