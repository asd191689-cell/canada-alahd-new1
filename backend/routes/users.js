const authorize = require("../middleware/authorize");
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const auditLogger = require("../services/auditLogger");
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
      message: "حدث خطأ داخلي في الخادم.",
    });
  }
});

/*
=======================================
UPDATE USER
=======================================
*/

router.put("/:id", authMiddleware, authorize(["admin"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "معرّف المستخدم غير صالح.",
      });
    }
    const { full_name, username, password, role } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      typeof username !== "string" ||
      !username.trim() ||
      typeof role !== "string" ||
      !role.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "الاسم واسم المستخدم والدور مطلوبة.",
      });
    }
    const normalizedFullName = full_name.trim();
    const normalizedUsername = username.trim();
    const normalizedRole = role.trim();
    if (password !== undefined && typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تكون نصًا.",
      });
    }

    const allowedRoles = ["admin", "representative", "employee"];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "دور المستخدم غير صالح.",
      });
    }

    /*
      ========================================
      GET OLD USER
      ========================================
      */

    const oldUserResult = await pool.query(
      `
        SELECT
          id,
          full_name,
          username,
          role
        FROM users
        WHERE id = $1
        `,
      [userId],
    );

    if (oldUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
    }

    const oldUser = oldUserResult.rows[0];

    /*
      ========================================
      CHECK DUPLICATE USERNAME
      ========================================
      */

    const existingUsername = await pool.query(
      `
    SELECT id
    FROM users
    WHERE username = $1
    AND id <> $2
  `,
      [normalizedUsername, userId],
    );
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "اسم المستخدم مستخدم بالفعل.",
      });
    }

    /*
      ========================================
      UPDATE USER
      ========================================
      */

    let updatedUser;

    if (typeof password === "string" && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
          UPDATE users
          SET
            full_name = $1,
            username = $2,
            password = $3,
            role = $4
          WHERE id = $5
          RETURNING
            id,
            full_name AS name,
            username,
            role,
            created_at
          `,
        [
          normalizedFullName,
          normalizedUsername,
          hashedPassword,
          normalizedRole,
          userId,
        ],
      );

      updatedUser = result.rows[0];
    } else {
      const result = await pool.query(
        `
          UPDATE users
          SET
            full_name = $1,
            username = $2,
            role = $3
          WHERE id = $4
          RETURNING
            id,
            full_name AS name,
            username,
            role,
            created_at
          `,
        [normalizedFullName, normalizedUsername, normalizedRole, userId],
      );

      updatedUser = result.rows[0];
    }

    /*
      ========================================
      AUDIT DETAILS
      ========================================
      */

    const roleLabels = {
      admin: "مدير النظام",
      representative: "ممثل",
      employee: "موظف",
    };

    const changes = [];

    if (oldUser.full_name !== updatedUser.name) {
      changes.push(
        `الاسم:\nقبل: ${oldUser.full_name || "غير محدد"}\nبعد: ${
          updatedUser.name || "غير محدد"
        }`,
      );
    }

    if (oldUser.username !== updatedUser.username) {
      changes.push(
        `اسم المستخدم:\nقبل: ${oldUser.username || "غير محدد"}\nبعد: ${
          updatedUser.username || "غير محدد"
        }`,
      );
    }

    if (oldUser.role !== updatedUser.role) {
      changes.push(
        `الدور:\nقبل: ${roleLabels[oldUser.role] || oldUser.role}\nبعد: ${
          roleLabels[updatedUser.role] || updatedUser.role
        }`,
      );
    }

    if (typeof password === "string" && password.trim() !== "") {
      changes.push("كلمة المرور: تم تغيير كلمة المرور.");
    }
    const auditDetails =
      changes.length > 0
        ? `تم تعديل المستخدم "${updatedUser.name}".\n\n${changes.join("\n\n")}`
        : `تم حفظ المستخدم "${updatedUser.name}" بدون تغييرات.`;

    await auditLogger(
      req.user.id,
      "UPDATE_USER",
      "المستخدمون",
      updatedUser.id,
      auditDetails,
    );

    res.json({
      success: true,
      message: "تم تعديل المستخدم بنجاح.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ في الخادم.",
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
      const userId = Number(req.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف المستخدم غير صالح.",
        });
      }

      if (userId === Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "لا يمكنك حذف حسابك الحالي.",
        });
      }

      /*
      ========================================
      GET USER BEFORE DELETE
      ========================================
      */

      const userResult = await pool.query(
        `
        SELECT
          id,
          full_name,
          username,
          role
        FROM users
        WHERE id = $1
        `,
        [userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "المستخدم غير موجود.",
        });
      }

      const deletedUser = userResult.rows[0];

      /*
      ========================================
      DELETE USER
      ========================================
      */

      await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        `,
        [userId],
      );

      /*
      ========================================
      AUDIT DETAILS
      ========================================
      */

      const roleLabels = {
        admin: "مدير النظام",
        representative: "مدير المخيم",
        employee: "موظف",
      };

      const auditDetails = [
        `تم حذف المستخدم "${deletedUser.full_name}".`,
        `اسم المستخدم: ${deletedUser.username}.`,
        `الدور: ${roleLabels[deletedUser.role] || deletedUser.role}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "DELETE_USER",
        "المستخدمون",
        deletedUser.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم حذف المستخدم بنجاح.",
      });
    } catch (error) {
      console.error("DELETE USER ERROR:", error);

      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم.",
      });
    }
  },
);

module.exports = router;
