const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const auditLogger = require("../services/auditLogger");
const validateId = require("../middleware/validateId");
// GET members of a family
router.get(
  "/family/:familyId",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { familyId } = req.params;
      if (!validateId(familyId)) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }
      const result = await pool.query(
        "SELECT * FROM family_members WHERE family_id=$1",
        [familyId],
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET FAMILY MEMBERS ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر تحميل أفراد الأسرة.",
      });
    }
  },
);

// POST add member to a family
router.post(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
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
      if (!family_id) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة مطلوب.",
        });
      }
      if (!validateId(family_id)) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      const familyCheck = await pool.query(
        `
  SELECT id, head_name, file_number
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
      const cleanDob = (date_of_birth || "").trim() || null;
      const cleanNatId = (national_id || "").trim() || null;

      let cleanAge = null;

      if (age !== undefined && age !== null && age !== "") {
        const parsedAge = Number(age);

        if (
          !Number.isFinite(parsedAge) ||
          !Number.isInteger(parsedAge) ||
          parsedAge < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "العمر يجب أن يكون رقمًا صحيحًا غير سالب.",
          });
        }

        cleanAge = parsedAge;
      }
      const result = await pool.query(
        `
  INSERT INTO family_members
  (
    family_id,
    full_name,
    national_id,
    gender,
    relationship,
    date_of_birth,
    age,
    health_status,
    disability,
    notes
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  RETURNING *
  `,
        [
          family_id,
          name,
          cleanNatId,
          req.body.gender,
          relation,
          cleanDob,
          cleanAge,
          health_status,
          disability,
          req.body.notes,
        ],
      );
      const member = result.rows[0];

      const healthStatusLabels = {
        healthy: "جيد",
        sick: "مريض",
        needs_follow_up: "يحتاج متابعة",
      };

      const formatHealthStatus = (value) => {
        if (!value) {
          return "غير محدد";
        }

        const normalizedValue = String(value).trim().toLowerCase();

        return healthStatusLabels[normalizedValue] || value;
      };

      const disabilityValue = String(member.disability ?? "")
        .trim()
        .toLowerCase();

      const disabilityLabel =
        disabilityValue === "true" || disabilityValue === "yes"
          ? "يوجد"
          : disabilityValue === "false" || disabilityValue === "no"
            ? "لا يوجد"
            : member.disability || "غير محدد";
      const auditDetails = [
        `تم إضافة الفرد "${member.full_name}".`,
        `العائلة: ${familyCheck.rows[0].head_name} (${familyCheck.rows[0].file_number}).`,
        `العمر: ${member.age ?? "غير محدد"}.`,
        `صلة القرابة: ${member.relationship || "غير محددة"}.`,
        `الحالة الصحية: ${formatHealthStatus(member.health_status)}.`,
        `الإعاقة: ${disabilityLabel}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "CREATE_MEMBER",
        "أفراد العائلة",
        member.id,
        auditDetails,
      );
      res.json({
        success: true,
        member,
      });
    } catch (err) {
      console.error("CREATE MEMBER ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر إضافة عضو الأسرة.",
      });
    }
  },
);
// PUT update member
router.put(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!validateId(id)) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      const {
        name,
        full_name,
        national_id,
        nationalId,
        gender,
        date_of_birth,
        dateOfBirth,
        age,
        relation,
        relationship,
        health_status,
        healthStatus,
        disability,
        notes,
      } = req.body;

      const memberName = (name || full_name || "").trim();

      if (!memberName) {
        return res.status(400).json({
          success: false,
          message: "اسم فرد الأسرة مطلوب.",
        });
      }

      const cleanNatId = (national_id || nationalId || "").trim() || null;

      const cleanDob = (date_of_birth || dateOfBirth || "").trim() || null;

      let cleanAge = null;

      if (age !== undefined && age !== null && age !== "") {
        const parsedAge = Number(age);

        if (
          !Number.isFinite(parsedAge) ||
          !Number.isInteger(parsedAge) ||
          parsedAge < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "العمر يجب أن يكون رقمًا صحيحًا غير سالب.",
          });
        }

        cleanAge = parsedAge;
      }

      const cleanRelation = relation || relationship || null;

      const cleanHealth = health_status || healthStatus || null;
      // Get the member before update
      const existingMemberResult = await pool.query(
        `
        SELECT *
        FROM family_members
        WHERE id = $1
        `,
        [id],
      );

      if (!existingMemberResult.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "عضو الأسرة غير موجود.",
        });
      }

      const oldMember = existingMemberResult.rows[0];

      // Update member
      const result = await pool.query(
        `
        UPDATE family_members
        SET
          full_name = $1,
          national_id = $2,
          gender = $3,
          date_of_birth = $4,
          age = $5,
          relationship = $6,
          health_status = $7,
          disability = $8,
          notes = $9
        WHERE id = $10
        RETURNING *
        `,
        [
          memberName,
          cleanNatId,
          gender || null,
          cleanDob,
          cleanAge,
          cleanRelation,
          cleanHealth,
          disability ?? null,
          notes || null,
          id,
        ],
      );

      const member = result.rows[0];

      const memberChanges = [];

      const addChange = (label, before, after) => {
        if (String(before ?? "") !== String(after ?? "")) {
          memberChanges.push(
            `${label}\nقبل: ${before ?? "غير محدد"}\nبعد: ${
              after ?? "غير محدد"
            }`,
          );
        }
      };

      addChange("اسم الفرد", oldMember.full_name, member.full_name);
      addChange("رقم الهوية", oldMember.national_id, member.national_id);
      addChange("الجنس", oldMember.gender, member.gender);
      addChange("تاريخ الميلاد", oldMember.date_of_birth, member.date_of_birth);
      addChange("العمر", oldMember.age, member.age);
      addChange("صلة القرابة", oldMember.relationship, member.relationship);
      addChange("الحالة الصحية", oldMember.health_status, member.health_status);
      addChange("الإعاقة", oldMember.disability, member.disability);
      addChange("الملاحظات", oldMember.notes, member.notes);

      const auditDetails =
        memberChanges.length > 0
          ? `تم تعديل بيانات الفرد "${member.full_name}".\n\n${memberChanges.join(
              "\n\n",
            )}`
          : `تم حفظ بيانات الفرد "${member.full_name}" بدون تغييرات جوهرية.`;

      await auditLogger(
        req.user.id,
        "UPDATE_MEMBER",
        "أفراد العائلة",
        member.id,
        auditDetails,
      );

      res.json({
        success: true,
        member,
      });
    } catch (err) {
      console.error("UPDATE MEMBER ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر تحديث بيانات عضو الأسرة.",
      });
    }
  },
);
// DELETE member
router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const memberId = Number(id);

      if (!Number.isInteger(memberId) || memberId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف عضو الأسرة غير صالح.",
        });
      }
      const result = await pool.query(
        `
  DELETE FROM family_members
  WHERE id = $1
  RETURNING *
  `,
        [memberId],
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "عضو الأسرة غير موجود.",
        });
      }

      const member = result.rows[0];

      const familyResult = await pool.query(
        `
  SELECT head_name, file_number
  FROM families
  WHERE id = $1
  `,
        [member.family_id],
      );

      const family = familyResult.rows[0];

      const healthStatusLabels = {
        healthy: "جيد",
        sick: "مريض",
        needs_follow_up: "يحتاج متابعة",
      };

      const formatHealthStatus = (value) => {
        if (!value) {
          return "غير محدد";
        }

        const normalizedValue = String(value).trim().toLowerCase();

        return healthStatusLabels[normalizedValue] || value;
      };

      const relationLabels = {
        son: "ابن",
        daughter: "ابنة",
        wife: "زوجة",
        husband: "زوج",
        father: "أب",
        mother: "أم",
        brother: "أخ",
        sister: "أخت",
        grandfather: "جد",
        grandmother: "جدة",
        other: "أخرى",
      };

      const formatRelation = (value) => {
        if (!value) {
          return "غير محددة";
        }

        const normalizedValue = String(value).trim().toLowerCase();

        return relationLabels[normalizedValue] || value;
      };

      const formatDisability = (value) => {
        if (value === true) {
          return "يوجد";
        }

        if (value === false) {
          return "لا يوجد";
        }

        return value || "غير محدد";
      };

      const auditDetails = [
        `تم حذف الفرد "${member.full_name || "غير محدد"}".`,
        `العائلة: ${
          family ? `${family.head_name} (${family.file_number})` : "غير محددة"
        }.`,
        `العمر: ${member.age ?? "غير محدد"}.`,
        `صلة القرابة: ${formatRelation(member.relationship)}.`,
        `الحالة الصحية: ${formatHealthStatus(member.health_status)}.`,
        `الإعاقة: ${formatDisability(member.disability)}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "DELETE_MEMBER",
        "أفراد العائلة",
        member.id,
        auditDetails,
      );
      res.json({
        success: true,
        message: "تم حذف عضو الأسرة بنجاح.",
      });
    } catch (err) {
      console.error("DELETE MEMBER ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر حذف عضو الأسرة.",
      });
    }
  },
);

module.exports = router;
