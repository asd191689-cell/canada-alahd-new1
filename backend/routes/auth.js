const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const auditLogger = require("../services/auditLogger");

const router = express.Router();

/* =========================
   Register
========================= */

router.post(
  "/register",
  authMiddleware,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { full_name, username, password, role } = req.body;

      // التحقق من البيانات
      if (
        typeof full_name !== "string" ||
        !full_name.trim() ||
        typeof username !== "string" ||
        !username.trim() ||
        typeof password !== "string" ||
        !password.trim() ||
        typeof role !== "string" ||
        !role.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "جميع الحقول مطلوبة.",
        });
      }
      const normalizedFullName = full_name.trim();
      const normalizedUsername = username.trim();
      const normalizedRole = role.trim();
      const allowedRoles = ["admin", "representative", "employee"];

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: "دور المستخدم غير صالح.",
        });
      }

      // التحقق من وجود المستخدم
      const userExists = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [normalizedUsername],
      );

      if (userExists.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "اسم المستخدم موجود مسبقًا.",
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
        [
          normalizedFullName,
          normalizedUsername,
          hashedPassword,
          normalizedRole,
        ],
      );
      await auditLogger(
        req.user.id,
        "CREATE_USER",
        "المستخدمون",
        result.rows[0].id,
        `تم إنشاء المستخدم ${result.rows[0].full_name}`,
      );

      res.status(201).json({
        success: true,
        message: "تم إنشاء المستخدم بنجاح.",

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
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);

/* =========================
   Login
========================= */

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "اسم المستخدم وكلمة المرور مطلوبان.",
      });
    }

    // البحث عن المستخدم
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username.trim(),
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "اسم المستخدم أو كلمة المرور غير صحيحة.",
      });
    }

    // مقارنة الباسورد
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "اسم المستخدم أو كلمة المرور غير صحيحة.",
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

    await auditLogger(
      user.id,
      "LOGIN",
      "النظام",
      null,
      `قام ${user.full_name} بتسجيل الدخول إلى النظام`,
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
      message: "حدث خطأ داخلي في الخادم.",
    });
  }
});
/*
=========================
Logout
=========================
*/

router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name
      FROM users
      WHERE id = $1
      `,
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
    }

    const user = userResult.rows[0];

    await auditLogger(
      user.id,
      "LOGOUT",
      "النظام",
      null,
      `قام ${user.full_name} بتسجيل الخروج من النظام`,
    );

    res.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح.",
    });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "حدث خطأ داخلي في الخادم.",
    });
  }
});

module.exports = router;
