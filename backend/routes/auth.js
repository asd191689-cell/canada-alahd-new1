const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

/* =========================
   Register
========================= */

router.post("/register", async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body;

    // التحقق من البيانات
    if (!full_name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // التحقق من وجود المستخدم
    const userExists = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // تشفير الباسورد
    const hashedPassword = await bcrypt.hash(password, 10);

    // إضافة المستخدم
    const result = await pool.query(
      `
     INSERT INTO users (full_name, username, password, role)
VALUES ($1, $2, $3, $4)
RETURNING id, full_name, username, role
      `,
      [full_name, username, hashedPassword, role || "employee"],
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",

      user: {
        id: result.rows[0].id,
        name: result.rows[0].full_name,
        username: result.rows[0].username,
        role: result.rows[0].role,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =========================
   Login
========================= */

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // البحث عن المستخدم
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // مقارنة الباسورد
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // إنشاء JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      success: true,
      token,

      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
