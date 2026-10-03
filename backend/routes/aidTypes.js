const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const authMiddleware = require("../middleware/authMiddleware");

const authorize = require("../middleware/authorize");

const { mapAidType } = require("../mappers/aidTypeMapper");

const auditLogger = require("../services/auditLogger");
const categoryLabels = {
  food: "غذائية",
  medical: "طبية",
  financial: "مالية",
  clothing: "ملابس",
  household: "منزلية",
};

const getCategoryLabel = (category) => categoryLabels[category] || category;
/*
========================================
GET ALL AID TYPES
========================================
*/

router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT *
        FROM aid_types
        WHERE is_deleted = FALSE
        ORDER BY id DESC
      `);
      const aidTypes = result.rows.map(mapAidType);

      res.json({
        success: true,
        aidTypes,
        data: aidTypes,
      });
    } catch (err) {
      console.error("GET AID TYPES ERROR:", err);
      res.status(500).json({
        success: false,
        message: "تعذر تحميل أنواع المساعدات.",
      });
    }
  },
);

/*
========================================
GET SINGLE AID TYPE
========================================
*/

router.get(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT *
        FROM aid_types
        WHERE id = $1
          AND is_deleted = FALSE
        `,
        [id],
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "Aid type not found",
        });
      }

      res.json({
        success: true,
        aidType: mapAidType(result.rows[0]),
      });
    } catch (err) {
      console.error("GET AID TYPE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "تعذر تحميل نوع المساعدة.",
      });
    }
  },
);
/*
========================================
CREATE AID TYPE
========================================
*/

router.post("/", authMiddleware, authorize(["admin"]), async (req, res) => {
  try {
    const { name, category, unit, description } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        message: "Name, category and unit are required.",
      });
    }

    const exists = await pool.query(
      `
        SELECT id
        FROM aid_types
        WHERE LOWER(name) = LOWER($1)
          AND is_deleted = FALSE
        `,
      [name],
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Aid type already exists.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO aid_types
        (
          name,
          category,
          unit,
          description
        )
        VALUES
        (
          $1,$2,$3,$4
        )
        RETURNING *
        `,
      [name, category, unit, description || null],
    );
    const aidType = result.rows[0];

    const auditDetails = [
      `تم إنشاء نوع مساعدة جديد "${aidType.name}".`,
      `التصنيف: ${getCategoryLabel(category)}.`,
      `الوحدة: ${aidType.unit || "غير محددة"}.`,
      `الوصف: ${aidType.description || "لا يوجد وصف"}.`,
    ].join("\n");

    await auditLogger(
      req.user.id,
      "CREATE_AID_TYPE",
      "أنواع المساعدات",
      aidType.id,
      auditDetails,
    );
    res.status(201).json({
      success: true,
      message: "Aid type created successfully.",
      aidType: mapAidType(aidType),
    });
  } catch (err) {
    console.error("CREATE AID TYPE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "تعذر إنشاء نوع المساعدة.",
    });
  }
});
/*
========================================
UPDATE AID TYPE
========================================
*/

router.put("/:id", authMiddleware, authorize(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { name, category, unit, description } = req.body;
    const existingAidType = await pool.query(
      `
  SELECT *
  FROM aid_types
  WHERE id = $1
    AND is_deleted = FALSE
  `,
      [id],
    );

    if (!existingAidType.rows[0]) {
      return res.status(404).json({
        success: false,
        message: "Aid type not found.",
      });
    }

    const oldAidType = existingAidType.rows[0];

    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        message: "Name, category and unit are required.",
      });
    }

    const exists = await pool.query(
      `
        SELECT id
        FROM aid_types
        WHERE LOWER(name) = LOWER($1)
          AND id <> $2
          AND is_deleted = FALSE
        `,
      [name, id],
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Aid type already exists.",
      });
    }

    const result = await pool.query(
      `
        UPDATE aid_types
        SET
          name = $1,
          category = $2,
          unit = $3,
          description = $4,
          updated_at = NOW()
        WHERE id = $5
          AND is_deleted = FALSE
        RETURNING *
        `,
      [name, category, unit, description || null, id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: "Aid type not found.",
      });
    }
    const aidType = result.rows[0];

    const aidTypeChanges = [];

    const addChange = (label, before, after) => {
      if (String(before ?? "") !== String(after ?? "")) {
        aidTypeChanges.push(
          `${label}\nقبل: ${before ?? "غير محدد"}\nبعد: ${after ?? "غير محدد"}`,
        );
      }
    };

    addChange("اسم نوع المساعدة", oldAidType.name, aidType.name);

    addChange(
      "التصنيف",
      getCategoryLabel(oldAidType.category),
      getCategoryLabel(aidType.category),
    );

    addChange("الوحدة", oldAidType.unit, aidType.unit);

    addChange(
      "الوصف",
      oldAidType.description || "لا يوجد وصف",
      aidType.description || "لا يوجد وصف",
    );

    const auditDetails =
      aidTypeChanges.length > 0
        ? `تم تعديل نوع المساعدة "${aidType.name}".\n\n${aidTypeChanges.join(
            "\n\n",
          )}`
        : `تم حفظ نوع المساعدة "${aidType.name}" بدون تغييرات جوهرية.`;

    await auditLogger(
      req.user.id,
      "UPDATE_AID_TYPE",
      "أنواع المساعدات",
      aidType.id,
      auditDetails,
    );

    res.json({
      success: true,
      message: "Aid type updated successfully.",
      aidType: mapAidType(aidType),
    });
  } catch (err) {
    console.error("UPDATE AID TYPE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "تعذر تحديث نوع المساعدة.",
    });
  }
});
/*
========================================
DELETE AID TYPE (SOFT DELETE)
========================================
*/

router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      /*
      ========================================
      CHECK IF USED IN DISTRIBUTIONS
      ========================================
      */

      const distributionCheck = await pool.query(
        `
        SELECT id
        FROM aid_distributions
        WHERE aid_type_id = $1
  AND is_deleted = FALSE
LIMIT 1
        `,
        [id],
      );

      if (distributionCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "لا يمكن حذف هذا الصنف لأنه مستخدم في سجلات التوزيع.",
        });
      }

      /*
      ========================================
      SOFT DELETE
      ========================================
      */

      const result = await pool.query(
        `
        UPDATE aid_types
        SET
          is_deleted = TRUE,
          updated_at = NOW()
        WHERE id = $1
          AND is_deleted = FALSE
        RETURNING *
        `,
        [id],
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "صنف المساعدة غير موجود.",
        });
      }

      const aidType = result.rows[0];

      /*
      ========================================
      AUDIT DETAILS
      ========================================
      */

      const auditDetails = [
        `تم حذف نوع المساعدة "${aidType.name}".`,
        `التصنيف: ${getCategoryLabel(aidType.category)}.`,
        `الوحدة: ${aidType.unit || "غير محددة"}.`,
        `الوصف: ${aidType.description || "لا يوجد وصف"}.`,
      ].join("\n");
      await auditLogger(
        req.user.id,
        "DELETE_AID_TYPE",
        "أنواع المساعدات",
        aidType.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم حذف الصنف بنجاح.",
      });
    } catch (err) {
      console.error("DELETE AID TYPE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "تعذر حذف نوع المساعدة.",
      });
    }
  },
);
module.exports = router;
