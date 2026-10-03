const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const auditLogger = require("../services/auditLogger");
const formatAuditDate = (value) => {
  if (!value) {
    return "غير محدد";
  }

  const rawValue = String(value);

  // إذا كان التاريخ قادمًا من PostgreSQL كـ YYYY-MM-DD
  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
    SELECT
  ad.id,
  ad.family_id AS "familyId",
  ad.aid_type_id AS "aidTypeId",
  ad.quantity,
  ad.distributed_at AS "distributionDate",
  ad.notes,
  ad.supervisor_id AS "supervisorId",

  f.file_number AS "fileNumber",
f.head_name AS "familyName",
f.national_id AS "headNationalId",

u.full_name AS "supervisorName",

at.name AS "aidTypeName",
  at.category,
  at.unit
      FROM aid_distributions ad

JOIN families f
ON ad.family_id=f.id

JOIN aid_types at
ON ad.aid_type_id=at.id

LEFT JOIN users u
ON ad.supervisor_id=u.id
      WHERE ad.is_deleted = FALSE
      ORDER BY ad.distributed_at DESC
    `);

      res.json({
        success: true,
        distributions: result.rows,
        data: result.rows,
      });
    } catch (error) {
      console.error("GET DISTRIBUTIONS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load distributions",
      });
    }
  },
);

router.post(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const {
        family_id,
        aid_type_id,
        quantity,
        distributed_at,
        notes,
        supervisor_id,
      } = req.body;
      if (!family_id || !Number.isInteger(Number(family_id))) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      if (!aid_type_id || !Number.isInteger(Number(aid_type_id))) {
        return res.status(400).json({
          success: false,
          message: "معرّف نوع المساعدة غير صالح.",
        });
      }

      if (!quantity || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "يجب أن تكون الكمية أكبر من صفر.",
        });
      }

      if (!distributed_at) {
        return res.status(400).json({
          success: false,
          message: "تاريخ التوزيع مطلوب.",
        });
      }

      const distributionDate = new Date(`${distributed_at}T00:00:00`);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (
        Number.isNaN(distributionDate.getTime()) ||
        distributionDate > today
      ) {
        return res.status(400).json({
          success: false,
          message: "لا يمكن أن يكون تاريخ التوزيع في المستقبل.",
        });
      }
      const familyCheck = await pool.query(
        `
  SELECT
    id,
    head_name,
    file_number
  FROM families
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [family_id],
      );

      if (familyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "الأسرة غير موجودة أو محذوفة.",
        });
      }
      const aidTypeCheck = await pool.query(
        `
  SELECT
    id,
    name,
    category,
    unit
  FROM aid_types
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [aid_type_id],
      );
      if (aidTypeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "نوع المساعدة غير موجود أو محذوف.",
        });
      }
      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        if (!Number.isInteger(Number(supervisor_id))) {
          return res.status(400).json({
            success: false,
            message: "معرّف المشرف غير صالح.",
          });
        }

        const supervisorCheck = await pool.query(
          `
  SELECT
    id,
    full_name
  FROM users
  WHERE id = $1
  `,
          [supervisor_id],
        );

        if (supervisorCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "المشرف غير موجود.",
          });
        }
      }
      // منع تكرار نفس نوع المساعدة لنفس الأسرة في نفس يوم التوزيع
      const exists = await pool.query(
        `
  SELECT id
  FROM aid_distributions
  WHERE family_id = $1
    AND aid_type_id = $2
    AND distributed_at >= $3::date
    AND distributed_at < ($3::date + INTERVAL '1 day')
    AND is_deleted = FALSE
  `,
        [family_id, aid_type_id, distributed_at],
      );

      if (exists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "لا يمكن تسجيل نفس نوع المساعدة للأسرة أكثر من مرة في نفس يوم التوزيع.",
        });
      }

      const result = await pool.query(
        `
      INSERT INTO aid_distributions
      (
        family_id,
        aid_type_id,
        quantity,
        distributed_at,
        notes,
        supervisor_id
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
        [
          family_id,
          aid_type_id,
          quantity,
          distributed_at,
          notes,
          supervisor_id,
        ],
      );
      const distribution = result.rows[0];
      const family = familyCheck.rows[0];
      const aidType = aidTypeCheck.rows[0];

      let supervisorName = null;

      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        const supervisorCheck = await pool.query(
          `
    SELECT full_name
    FROM users
    WHERE id = $1
    `,
          [supervisor_id],
        );

        supervisorName = supervisorCheck.rows[0]?.full_name || null;
      }

      const auditDetails = [
        `تم توزيع مساعدة "${aidType.name}".`,
        `العائلة: ${family.head_name} (${family.file_number}).`,
        `نوع المساعدة: ${aidType.name}.`,
        `الكمية: ${distribution.quantity}.`,
        `الوحدة: ${aidType.unit || "غير محددة"}.`,
        `تاريخ التوزيع: ${formatAuditDate(distribution.distributed_at)}.`,
        supervisorName ? `المشرف: ${supervisorName}.` : null,
        distribution.notes ? `ملاحظات: ${distribution.notes}.` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await auditLogger(
        req.user.id,
        "CREATE_DISTRIBUTION",
        "توزيع المساعدات",
        distribution.id,
        auditDetails,
      );

      res.status(201).json({
        success: true,
        distribution,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to create distribution",
      });
    }
  },
);

/*
========================================
BULK CREATE DISTRIBUTIONS
========================================
*/

router.post(
  "/bulk",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        family_ids,
        aid_type_id,
        quantity,
        distributed_at,
        notes,
        supervisor_id,
      } = req.body;

      if (!Array.isArray(family_ids) || family_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "يرجى اختيار أسرة واحدة على الأقل.",
        });
      }
      if (family_ids.some((familyId) => !Number.isInteger(Number(familyId)))) {
        return res.status(400).json({
          success: false,
          message: "يوجد معرّف أسرة غير صالح.",
        });
      }

      if (!aid_type_id || !Number.isInteger(Number(aid_type_id))) {
        return res.status(400).json({
          success: false,
          message: "معرّف نوع المساعدة غير صالح.",
        });
      }

      if (!quantity || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "يجب أن تكون الكمية أكبر من صفر.",
        });
      }
      if (!distributed_at) {
        return res.status(400).json({
          success: false,
          message: "تاريخ التوزيع مطلوب.",
        });
      }

      const distributionDate = new Date(`${distributed_at}T00:00:00`);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (
        Number.isNaN(distributionDate.getTime()) ||
        distributionDate > today
      ) {
        return res.status(400).json({
          success: false,
          message: "لا يمكن أن يكون تاريخ التوزيع في المستقبل.",
        });
      }

      await client.query("BEGIN");

      const invalidFamilyIds = [];

      for (const familyId of family_ids) {
        const familyCheck = await client.query(
          `
    SELECT id
    FROM families
    WHERE id = $1
      AND is_deleted = FALSE
    `,
          [familyId],
        );

        if (familyCheck.rows.length === 0) {
          invalidFamilyIds.push(Number(familyId));
        }
      }

      if (invalidFamilyIds.length > 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "بعض الأسر غير موجودة أو محذوفة.",
          invalidFamilyIds,
        });
      }
      const aidTypeCheck = await client.query(
        `
  SELECT id
  FROM aid_types
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [aid_type_id],
      );

      if (aidTypeCheck.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "نوع المساعدة غير موجود أو محذوف.",
        });
      }
      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        if (!Number.isInteger(Number(supervisor_id))) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: "معرّف المشرف غير صالح.",
          });
        }

        const supervisorCheck = await client.query(
          `
    SELECT id
    FROM users
    WHERE id = $1
    `,
          [supervisor_id],
        );

        if (supervisorCheck.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(404).json({
            success: false,
            message: "المشرف غير موجود.",
          });
        }
      }

      const created = [];

      for (const familyId of family_ids) {
        const exists = await client.query(
          `
    SELECT id
    FROM aid_distributions
    WHERE family_id = $1
      AND aid_type_id = $2
      AND distributed_at >= $3::date
      AND distributed_at < ($3::date + INTERVAL '1 day')
      AND is_deleted = FALSE
    `,
          [familyId, aid_type_id, distributed_at],
        );

        if (exists.rows.length > 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message:
              "لا يمكن تنفيذ التوزيع الجماعي: توجد أسرة لديها نفس نوع المساعدة في نفس يوم التوزيع.",
          });
        }

        const result = await client.query(
          `
    INSERT INTO aid_distributions
    (
      family_id,
      aid_type_id,
      quantity,
      distributed_at,
      notes,
      supervisor_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
          [
            familyId,
            aid_type_id,
            quantity,
            distributed_at,
            notes,
            supervisor_id,
          ],
        );

        created.push(result.rows[0]);
      }
      await client.query("COMMIT");

      // جلب بيانات نوع المساعدة مرة واحدة
      const aidTypeResult = await pool.query(
        `
  SELECT name, unit
  FROM aid_types
  WHERE id = $1
  `,
        [aid_type_id],
      );

      const aidType = aidTypeResult.rows[0];

      let supervisorName = null;

      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        const supervisorResult = await pool.query(
          `
    SELECT full_name
    FROM users
    WHERE id = $1
    `,
          [supervisor_id],
        );

        supervisorName = supervisorResult.rows[0]?.full_name || null;
      }

      for (const distribution of created) {
        const familyResult = await pool.query(
          `
    SELECT head_name, file_number
    FROM families
    WHERE id = $1
    `,
          [distribution.family_id],
        );

        const family = familyResult.rows[0];

        const auditDetails = [
          `تم توزيع مساعدة "${aidType?.name || "غير محددة"}".`,
          `العائلة: ${family?.head_name || "غير محددة"} (${family?.file_number || "غير محدد"}).`,
          `نوع المساعدة: ${aidType?.name || "غير محدد"}.`,
          `الكمية: ${distribution.quantity}.`,
          `الوحدة: ${aidType?.unit || "غير محددة"}.`,
          `تاريخ التوزيع: ${formatAuditDate(distribution.distributed_at)}.`,
          supervisorName ? `المشرف: ${supervisorName}.` : null,
          distribution.notes ? `ملاحظات: ${distribution.notes}.` : null,
        ]
          .filter(Boolean)
          .join("\n");

        await auditLogger(
          req.user.id,
          "CREATE_DISTRIBUTION",
          "توزيع المساعدات",
          distribution.id,
          auditDetails,
        );
      }
      res.status(201).json({
        success: true,
        message: "تم تنفيذ التوزيع الجماعي بنجاح.",
        distributions: created,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("BULK DISTRIBUTION ERROR:", error);

      res.status(500).json({
        success: false,
        message: "تعذر تنفيذ التوزيع الجماعي.",
      });
    } finally {
      client.release();
    }
  },
);
router.put(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const {
        family_id,
        aid_type_id,
        quantity,
        distributed_at,
        notes,
        supervisor_id,
      } = req.body;

      // التحقق من معرّف الأسرة
      if (!family_id || !Number.isInteger(Number(family_id))) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      // التحقق من نوع المساعدة
      if (!aid_type_id || !Number.isInteger(Number(aid_type_id))) {
        return res.status(400).json({
          success: false,
          message: "معرّف نوع المساعدة غير صالح.",
        });
      }

      // التحقق من الكمية
      if (!quantity || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "يجب أن تكون الكمية أكبر من صفر.",
        });
      }

      // التحقق من التاريخ
      if (!distributed_at) {
        return res.status(400).json({
          success: false,
          message: "تاريخ التوزيع مطلوب.",
        });
      }

      // التأكد أن سجل التوزيع موجود وغير محذوف
      const existingDistribution = await pool.query(
        `
        SELECT id
        FROM aid_distributions
        WHERE id = $1
          AND is_deleted = FALSE
        `,
        [req.params.id],
      );

      if (existingDistribution.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "سجل التوزيع غير موجود.",
        });
      }

      // التأكد أن الأسرة موجودة وفعالة
      const familyCheck = await pool.query(
        `
        SELECT
          id,
          head_name,
          file_number
        FROM families
        WHERE id = $1
          AND is_deleted = FALSE
        `,
        [family_id],
      );

      if (familyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "الأسرة غير موجودة أو محذوفة.",
        });
      }

      // التأكد أن نوع المساعدة موجود وفعال
      const aidTypeCheck = await pool.query(
        `
        SELECT
          id,
          name,
          category,
          unit
        FROM aid_types
        WHERE id = $1
          AND is_deleted = FALSE
        `,
        [aid_type_id],
      );

      if (aidTypeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "نوع المساعدة غير موجود أو محذوف.",
        });
      }

      // التحقق من المشرف
      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        if (!Number.isInteger(Number(supervisor_id))) {
          return res.status(400).json({
            success: false,
            message: "معرّف المشرف غير صالح.",
          });
        }

        const supervisorCheck = await pool.query(
          `
          SELECT id, full_name
          FROM users
          WHERE id = $1
          `,
          [supervisor_id],
        );

        if (supervisorCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "المشرف غير موجود.",
          });
        }
      }

      // منع تكرار نفس نوع المساعدة للأسرة في نفس اليوم
      // مع استثناء السجل الحالي أثناء التعديل
      const duplicateCheck = await pool.query(
        `
        SELECT id
        FROM aid_distributions
        WHERE family_id = $1
          AND aid_type_id = $2
          AND distributed_at >= $3::date
          AND distributed_at < ($3::date + INTERVAL '1 day')
          AND is_deleted = FALSE
          AND id <> $4
        `,
        [family_id, aid_type_id, distributed_at, req.params.id],
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "لا يمكن تعديل التوزيع: توجد مساعدة من نفس النوع للأسرة في نفس يوم التوزيع.",
        });
      }

      // جلب البيانات القديمة قبل التعديل من أجل Audit
      const oldDataResult = await pool.query(
        `
        SELECT
          ad.id,
          ad.family_id,
          ad.aid_type_id,
          ad.quantity,
          ad.distributed_at,
          ad.notes,
          ad.supervisor_id,
          f.head_name,
          f.file_number,
          at.name AS aid_type_name,
          at.unit
        FROM aid_distributions ad
        JOIN families f
          ON ad.family_id = f.id
        JOIN aid_types at
          ON ad.aid_type_id = at.id
        WHERE ad.id = $1
          AND ad.is_deleted = FALSE
        `,
        [req.params.id],
      );

      const oldData = oldDataResult.rows[0];

      // تنفيذ التعديل
      const result = await pool.query(
        `
        UPDATE aid_distributions
        SET
          family_id = $1,
          aid_type_id = $2,
          quantity = $3,
          distributed_at = $4,
          notes = $5,
          supervisor_id = $6
        WHERE id = $7
          AND is_deleted = FALSE
        RETURNING *
        `,
        [
          family_id,
          aid_type_id,
          quantity,
          distributed_at,
          notes,
          supervisor_id,
          req.params.id,
        ],
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "تعذر العثور على سجل التوزيع.",
        });
      }

      const updatedDistribution = result.rows[0];
      const family = familyCheck.rows[0];
      const aidType = aidTypeCheck.rows[0];

      let supervisorName = null;

      if (
        supervisor_id !== undefined &&
        supervisor_id !== null &&
        supervisor_id !== ""
      ) {
        const supervisorResult = await pool.query(
          `
          SELECT full_name
          FROM users
          WHERE id = $1
          `,
          [supervisor_id],
        );

        supervisorName = supervisorResult.rows[0]?.full_name || null;
      }

      const auditDetails = [
        `تم تعديل سجل توزيع المساعدة "${aidType.name}".`,
        `العائلة: ${family.head_name} (${family.file_number}).`,
        `نوع المساعدة: ${aidType.name}.`,
        `الكمية الجديدة: ${updatedDistribution.quantity}.`,
        `الوحدة: ${aidType.unit || "غير محددة"}.`,
        `تاريخ التوزيع الجديد: ${formatAuditDate(updatedDistribution.distributed_at)}.`,
        supervisorName ? `المشرف: ${supervisorName}.` : null,
        updatedDistribution.notes
          ? `الملاحظات الجديدة: ${updatedDistribution.notes}.`
          : null,
        `البيانات السابقة: الكمية ${oldData.quantity}، التاريخ ${formatAuditDate(oldData.distributed_at)}.`,
      ]
        .filter(Boolean)
        .join("\n");

      await auditLogger(
        req.user.id,
        "UPDATE_DISTRIBUTION",
        "توزيع المساعدات",
        updatedDistribution.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم تعديل سجل التوزيع بنجاح.",
        distribution: updatedDistribution,
      });
    } catch (error) {
      console.error("UPDATE DISTRIBUTION ERROR:", error);

      res.status(500).json({
        success: false,
        message: "تعذر تعديل سجل التوزيع.",
      });
    }
  },
);

router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const existingDistribution = await pool.query(
        `
        SELECT
          ad.id,
          ad.quantity,
          ad.distributed_at,
          ad.notes,
          f.head_name,
          f.file_number,
          at.name AS aid_type_name,
          at.unit
        FROM aid_distributions ad
        JOIN families f
          ON ad.family_id = f.id
        JOIN aid_types at
          ON ad.aid_type_id = at.id
        WHERE ad.id = $1
          AND ad.is_deleted = FALSE
        `,
        [req.params.id],
      );

      if (!existingDistribution.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "سجل التوزيع غير موجود.",
        });
      }

      const distribution = existingDistribution.rows[0];

      const result = await pool.query(
        `
  DELETE FROM aid_distributions
  WHERE id = $1
    AND is_deleted = FALSE
  RETURNING id
  `,
        [req.params.id],
      );
      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "سجل التوزيع غير موجود.",
        });
      }

      const auditDetails = [
        `تم حذف سجل توزيع المساعدة "${distribution.aid_type_name}".`,
        `العائلة: ${distribution.head_name} (${distribution.file_number}).`,
        `نوع المساعدة: ${distribution.aid_type_name}.`,
        `الكمية: ${distribution.quantity}.`,
        `الوحدة: ${distribution.unit || "غير محددة"}.`,
        `تاريخ التوزيع: ${formatAuditDate(distribution.distributed_at)}.`,
        distribution.notes ? `ملاحظات: ${distribution.notes}.` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await auditLogger(
        req.user.id,
        "DELETE_DISTRIBUTION",
        "توزيع المساعدات",
        distribution.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم حذف سجل التوزيع.",
      });
    } catch (error) {
      console.error("DELETE DISTRIBUTION ERROR:", error);

      res.status(500).json({
        success: false,
        message: "تعذر حذف سجل التوزيع.",
      });
    }
  },
);
module.exports = router;
