const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { mapFamily } = require("../mappers/familyMapper");
const auditLogger = require("../services/auditLogger");
const validateId = require("../middleware/validateId");

/*
========================================
GET ALL FAMILIES
========================================
*/

router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT
    f.*,
    COALESCE(
        (
            SELECT json_agg(fm ORDER BY fm.id)
            FROM family_members fm
            WHERE fm.family_id = f.id
        ),
        '[]'
    ) AS members
FROM families f


ORDER BY f.id DESC;
    `);

      res.json({
        success: true,
        families: result.rows.map(mapFamily),
      });
    } catch (err) {
      console.error("GET FAMILIES ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);

/*
========================================
GET SINGLE FAMILY
========================================
*/

router.get(
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

      /*
    ========================================
    GET FAMILY
    ========================================
    */

      const familyResult = await pool.query(
        `
      SELECT *
FROM families
WHERE id = $1
  
      `,
        [id],
      );

      if (!familyResult.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "الأسرة غير موجودة.",
        });
      }

      /*
    ========================================
    GET MEMBERS
    ========================================
    */

      const membersResult = await pool.query(
        `
      SELECT *
      FROM family_members
      WHERE family_id = $1
      ORDER BY id ASC
      `,
        [id],
      );

      const mappedFamily = mapFamily(familyResult.rows[0]);

      res.json({
        success: true,
        family: mappedFamily,
        ...mappedFamily,
        members: membersResult.rows,
      });
    } catch (err) {
      console.error("GET FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);

/*
========================================
CREATE FAMILY
========================================
*/

router.post(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    const {
      head_name,
      national_id,
      gender,
      marital_status,
      is_provider,
      date_of_birth,
      age,
      phone,
      alternatePhone,
      campLocation,
      health_status,
      origin_governorate,
      origin_city,
      current_address,
      housing_type,
      entry_date,
      notes,

      members,
    } = req.body;
    if (
      typeof head_name !== "string" ||
      !head_name.trim() ||
      typeof national_id !== "string" ||
      !national_id.trim() ||
      typeof gender !== "string" ||
      !gender.trim() ||
      typeof marital_status !== "string" ||
      !marital_status.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "الحقول الأساسية للأسرة مطلوبة.",
      });
    }
    if (!/^\d+$/.test(national_id.trim())) {
      return res.status(400).json({
        success: false,
        message: "رقم الهوية يجب أن يحتوي على أرقام فقط.",
      });
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || !/^\d+$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "رقم الهاتف يجب أن يحتوي على أرقام فقط.",
        });
      }
    }
    if (age !== undefined && age !== null && age !== "") {
      if (typeof age !== "number" || !Number.isFinite(age) || age < 0) {
        return res.status(400).json({
          success: false,
          message: "العمر يجب أن يكون رقمًا صحيحًا غير سالب.",
        });
      }
    }
    if (
      date_of_birth !== undefined &&
      date_of_birth !== null &&
      date_of_birth !== ""
    ) {
      if (
        typeof date_of_birth !== "string" ||
        Number.isNaN(new Date(date_of_birth).getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "تاريخ الميلاد غير صالح.",
        });
      }
    }
    if (entry_date !== undefined && entry_date !== null && entry_date !== "") {
      if (
        typeof entry_date !== "string" ||
        Number.isNaN(new Date(entry_date).getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "تاريخ الدخول غير صالح.",
        });
      }
    }
    if (members !== undefined && members !== null) {
      if (!Array.isArray(members)) {
        return res.status(400).json({
          success: false,
          message: "بيانات أفراد الأسرة يجب أن تكون قائمة.",
        });
      }
    }

    /*
  ========================================
  CALCULATE STATISTICS
  ========================================
  */

    let total_males = 0;
    let total_females = 0;

    let male_0_5 = 0;
    let male_6_11 = 0;
    let male_12_17 = 0;
    let male_18_24 = 0;
    let male_25_60 = 0;
    let male_60_plus = 0;

    let female_0_5 = 0;
    let female_6_11 = 0;
    let female_12_17 = 0;
    let female_18_24 = 0;
    let female_25_60 = 0;
    let female_60_plus = 0;

    /*
========================================
CALCULATE HEAD OF FAMILY STATISTICS
========================================
*/

    const headAge = Number(age || 0);

    if (gender === "ذكر") {
      total_males++;

      if (headAge <= 5) male_0_5++;
      else if (headAge <= 11) male_6_11++;
      else if (headAge <= 17) male_12_17++;
      else if (headAge <= 24) male_18_24++;
      else if (headAge <= 60) male_25_60++;
      else male_60_plus++;
    }

    if (gender === "أنثى") {
      total_females++;

      if (headAge <= 5) female_0_5++;
      else if (headAge <= 11) female_6_11++;
      else if (headAge <= 17) female_12_17++;
      else if (headAge <= 24) female_18_24++;
      else if (headAge <= 60) female_25_60++;
      else female_60_plus++;
    }

    /*
========================================
LOOP MEMBERS
========================================
*/

    if (members && members.length > 0) {
      members.forEach((member) => {
        const memberAge = Number(member.age || 0);

        if (member.gender === "ذكر") {
          total_males++;

          if (memberAge <= 5) male_0_5++;
          else if (memberAge <= 11) male_6_11++;
          else if (memberAge <= 17) male_12_17++;
          else if (memberAge <= 24) male_18_24++;
          else if (memberAge <= 60) male_25_60++;
          else male_60_plus++;
        }

        if (member.gender === "أنثى") {
          total_females++;

          if (memberAge <= 5) female_0_5++;
          else if (memberAge <= 11) female_6_11++;
          else if (memberAge <= 17) female_12_17++;
          else if (memberAge <= 24) female_18_24++;
          else if (memberAge <= 60) female_25_60++;
          else female_60_plus++;
        }
      });
    }

    const total_family_members = 1 + (members?.length || 0);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(`
    LOCK TABLE families IN SHARE ROW EXCLUSIVE MODE
  `);

      // جميع أرقام الملفات المستخدمة للعائلات النشطة
      const numbersResult = await client.query(`
SELECT
  CAST(REPLACE(file_number, 'CA-', '') AS INTEGER) AS number
FROM families
WHERE is_deleted = FALSE
ORDER BY number
`);

      let nextNumber = 1;

      for (const row of numbersResult.rows) {
        if (row.number === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }

      const file_number = `CA-${String(nextNumber).padStart(4, "0")}`;
      /*
    ========================================
    INSERT FAMILY
    ========================================
    */

      const familyResult = await client.query(
        `
      INSERT INTO families (
        file_number,
        head_name,
        national_id,
        gender,
        marital_status,
        is_provider,
        date_of_birth,
        age,
        phone,
        alternate_phone,
camp_location,
        health_status,
        origin_governorate,
        origin_city,
        current_address,
        housing_type,
        entry_date,
        notes,
        registered_by,
        

        total_males,
        total_females,
        total_family_members,

        male_0_5,
        male_6_11,
        male_12_17,
        male_18_24,
        male_25_60,
        male_60_plus,

        female_0_5,
        female_6_11,
        female_12_17,
        female_18_24,
        female_25_60,
        female_60_plus
      )

     VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
  $11,$12,$13,$14,$15,$16,$17,$18,$19,

  $20,$21,$22,

  $23,$24,$25,$26,$27,$28,

  $29,$30,$31,$32,$33,$34
)
      RETURNING *
      `,
        [
          file_number,
          head_name,
          national_id,
          gender,
          marital_status,
          is_provider,
          date_of_birth,
          age,
          phone,

          alternatePhone,
          campLocation,

          health_status,
          origin_governorate,
          origin_city,
          current_address,
          housing_type,
          entry_date,
          notes,
          req.user.id,

          total_males,
          total_females,
          total_family_members,

          male_0_5,
          male_6_11,
          male_12_17,
          male_18_24,
          male_25_60,
          male_60_plus,

          female_0_5,
          female_6_11,
          female_12_17,
          female_18_24,
          female_25_60,
          female_60_plus,
        ],
      );

      const family = familyResult.rows[0];

      /*
    ========================================
    INSERT MEMBERS
    ========================================
    */

      if (members && members.length > 0) {
        for (const member of members) {
          const fullName = (member.name || member.full_name || "").trim();
          const nationalId =
            (member.nationalId || member.national_id || "").trim() || null;
          const gender = member.gender || null;
          const relationship = member.relation || member.relationship || null;
          const dateOfBirth =
            (member.dateOfBirth || member.date_of_birth || "").trim() || null;

          const age =
            member.age !== undefined && member.age !== null && member.age !== ""
              ? Number(member.age)
              : null;

          const healthStatus =
            member.healthStatus || member.health_status || null;

          const disability = member.disability ?? null;
          const notes = member.notes || null;

          await client.query(
            `
      INSERT INTO family_members (
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
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      `,
            [
              family.id,
              fullName,
              nationalId,
              gender,
              relationship,
              dateOfBirth,
              age,
              healthStatus,
              disability,
              notes,
            ],
          );
        }
      }
      await client.query("COMMIT");

      const healthStatusLabels = {
        healthy: "جيد",
        sick: "مريض",
        needs_follow_up: "يحتاج متابعة",
      };

      const familyHealthStatus =
        healthStatusLabels[
          String(family.health_status || "")
            .trim()
            .toLowerCase()
        ] ||
        family.health_status ||
        "غير محدد";

      const auditDetails = [
        `تم إنشاء العائلة "${family.head_name}".`,
        `رقم الملف: ${family.file_number}.`,
        `عدد أفراد الأسرة: ${family.total_family_members}.`,
        `الحالة الصحية: ${familyHealthStatus}.`,
        `موقع المخيم: ${family.camp_location || "غير محدد"}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "CREATE_FAMILY",
        "العائلات",
        family.id,
        auditDetails,
      );
      res.status(201).json({
        success: true,
        message: "تم إنشاء الأسرة بنجاح.",
        family,
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error("CREATE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    } finally {
      client.release();
    }
  },
);

/*
========================================
UPDATE FAMILY
========================================
*/

router.put(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    const { id } = req.params;
    if (!validateId(id)) {
      return res.status(400).json({
        success: false,
        message: "معرّف الأسرة غير صالح.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const familyBeforeResult = await client.query(
        `
  SELECT *
  FROM families
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [id],
      );

      if (familyBeforeResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "الأسرة غير موجودة أو محذوفة.",
        });
      }

      const familyBefore = familyBeforeResult.rows[0];

      const membersBeforeResult = await client.query(
        `
  SELECT *
  FROM family_members
  WHERE family_id = $1
  ORDER BY id ASC
  `,
        [id],
      );

      const membersBefore = membersBeforeResult.rows;

      const {
        head_name,
        national_id,
        gender,
        marital_status,
        is_provider,
        date_of_birth,
        age,
        phone,
        alternatePhone,
        campLocation,
        health_status,
        origin_governorate,
        origin_city,
        current_address,
        housing_type,
        notes,
        members,
      } = req.body;

      let total_males = 0;
      let total_females = 0;

      let male_0_5 = 0;
      let male_6_11 = 0;
      let male_12_17 = 0;
      let male_18_24 = 0;
      let male_25_60 = 0;
      let male_60_plus = 0;

      let female_0_5 = 0;
      let female_6_11 = 0;
      let female_12_17 = 0;
      let female_18_24 = 0;
      let female_25_60 = 0;
      let female_60_plus = 0;

      const headAge = Number(age || 0);

      if (gender === "ذكر") {
        total_males++;

        if (headAge <= 5) male_0_5++;
        else if (headAge <= 11) male_6_11++;
        else if (headAge <= 17) male_12_17++;
        else if (headAge <= 24) male_18_24++;
        else if (headAge <= 60) male_25_60++;
        else male_60_plus++;
      }

      if (gender === "أنثى") {
        total_females++;

        if (headAge <= 5) female_0_5++;
        else if (headAge <= 11) female_6_11++;
        else if (headAge <= 17) female_12_17++;
        else if (headAge <= 24) female_18_24++;
        else if (headAge <= 60) female_25_60++;
        else female_60_plus++;
      }

      /*
========================================
LOOP MEMBERS STATISTICS
========================================
*/

      if (members && members.length > 0) {
        members.forEach((member) => {
          const memberAge = Number(member.age || 0);

          if (member.gender === "ذكر") {
            total_males++;

            if (memberAge <= 5) male_0_5++;
            else if (memberAge <= 11) male_6_11++;
            else if (memberAge <= 17) male_12_17++;
            else if (memberAge <= 24) male_18_24++;
            else if (memberAge <= 60) male_25_60++;
            else male_60_plus++;
          }

          if (member.gender === "أنثى") {
            total_females++;

            if (memberAge <= 5) female_0_5++;
            else if (memberAge <= 11) female_6_11++;
            else if (memberAge <= 17) female_12_17++;
            else if (memberAge <= 24) female_18_24++;
            else if (memberAge <= 60) female_25_60++;
            else female_60_plus++;
          }
        });
      }

      const total_family_members = 1 + (members?.length || 0);
      /*
========================================
UPDATE FAMILY
========================================
*/

      const familyAfterResult = await client.query(
        `
  UPDATE families
  SET
    head_name = $1,
    national_id = $2,
    gender = $3,
    marital_status = $4,
    is_provider = $5,
    date_of_birth = $6,
    age = $7,
   phone = $8,
alternate_phone = $9,
camp_location = $10,
health_status = $11,
origin_governorate = $12,
origin_city = $13,
current_address = $14,
housing_type = $15,
notes = $16,

total_males = $17,
total_females = $18,
total_family_members = $19,

male_0_5 = $20,
male_6_11 = $21,
male_12_17 = $22,
male_18_24 = $23,
male_25_60 = $24,
male_60_plus = $25,

female_0_5 = $26,
female_6_11 = $27,
female_12_17 = $28,
female_18_24 = $29,
female_25_60 = $30,
female_60_plus = $31,

updated_at = NOW()

WHERE id = $32
RETURNING *
  `,
        [
          head_name,
          national_id,
          gender,
          marital_status,
          is_provider,
          date_of_birth,
          age,
          phone,
          alternatePhone,
          campLocation,
          health_status,
          origin_governorate,
          origin_city,
          current_address,
          housing_type,
          notes,

          total_males,
          total_females,
          total_family_members,

          male_0_5,
          male_6_11,
          male_12_17,
          male_18_24,
          male_25_60,
          male_60_plus,

          female_0_5,
          female_6_11,
          female_12_17,
          female_18_24,
          female_25_60,
          female_60_plus,

          id,
        ],
      );
      const familyAfter = familyAfterResult.rows[0];
      const familyChanges = [];

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

      const addChange = (label, before, after) => {
        if (String(before ?? "") !== String(after ?? "")) {
          familyChanges.push(
            `${label}\nقبل: ${before ?? "غير محدد"}\nبعد: ${after ?? "غير محدد"}`,
          );
        }
      };
      addChange("اسم رب الأسرة", familyBefore.head_name, familyAfter.head_name);

      addChange(
        "رقم الهوية",
        familyBefore.national_id,
        familyAfter.national_id,
      );

      addChange("الجنس", familyBefore.gender, familyAfter.gender);

      addChange(
        "الحالة الاجتماعية",
        familyBefore.marital_status,
        familyAfter.marital_status,
      );

      addChange("رقم الهاتف", familyBefore.phone, familyAfter.phone);

      addChange(
        "الهاتف البديل",
        familyBefore.alternate_phone,
        familyAfter.alternate_phone,
      );

      addChange(
        "موقع المخيم",
        familyBefore.camp_location,
        familyAfter.camp_location,
      );

      addChange(
        "الحالة الصحية",
        formatHealthStatus(familyBefore.health_status),
        formatHealthStatus(familyAfter.health_status),
      );

      addChange(
        "المحافظة الأصلية",
        familyBefore.origin_governorate,
        familyAfter.origin_governorate,
      );

      addChange(
        "المدينة الأصلية",
        familyBefore.origin_city,
        familyAfter.origin_city,
      );

      addChange(
        "العنوان الحالي",
        familyBefore.current_address,
        familyAfter.current_address,
      );

      addChange(
        "نوع السكن",
        familyBefore.housing_type,
        familyAfter.housing_type,
      );

      addChange(
        "عدد أفراد الأسرة",
        familyBefore.total_family_members,
        familyAfter.total_family_members,
      );

      if (membersBefore.length !== (members?.length || 0)) {
        familyChanges.push(
          `عدد أعضاء الأسرة\nقبل: ${membersBefore.length}\nبعد: ${
            members?.length || 0
          }`,
        );
      }
      /*
========================================
AUDIT MEMBER CHANGES
========================================
*/

      const memberChanges = [];

      const incomingMembers = Array.isArray(members) ? members : [];

      const normalizeMemberValue = (value) =>
        String(value ?? "")
          .trim()
          .toLowerCase();
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

      const formatMemberRelation = (value) => {
        if (!value) {
          return "غير محددة";
        }

        const normalizedValue = normalizeMemberValue(value);

        return relationLabels[normalizedValue] || value;
      };
      const formatMemberDate = (value) => {
        if (!value) {
          return "غير محدد";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return value;
        }

        return date.toLocaleDateString("ar-EG");
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

      const matchedMemberIds = new Set();

      /*
========================================
ADDED / UPDATED MEMBERS
========================================
*/

      for (const member of incomingMembers) {
        let oldMember = null;

        if (member.nationalId) {
          oldMember =
            membersBefore.find(
              (old) =>
                normalizeMemberValue(old.national_id) ===
                normalizeMemberValue(member.nationalId),
            ) || null;
        }

        /*
  إذا لم نجد العضو برقم الهوية،
  نحاول مطابقته بالاسم + تاريخ الميلاد
  */
        if (!oldMember) {
          oldMember =
            membersBefore.find(
              (old) =>
                normalizeMemberValue(old.full_name) ===
                  normalizeMemberValue(member.name) &&
                normalizeMemberValue(old.date_of_birth) ===
                  normalizeMemberValue(member.dateOfBirth),
            ) || null;
        }

        /*
  عضو جديد
  */
        if (!oldMember) {
          memberChanges.push(
            [
              `تمت إضافة فرد: ${member.name || "غير محدد"}`,

              `العمر: ${member.age ?? "غير محدد"}`,
              `صلة القرابة: ${formatMemberRelation(member.relation)}`,
              `تاريخ الميلاد: ${formatMemberDate(member.dateOfBirth)}`,
              `الحالة الصحية: ${formatHealthStatus(member.healthStatus)}`,
              `الإعاقة: ${formatDisability(member.disability)}`,
            ].join("\n"),
          );

          continue;
        }

        matchedMemberIds.add(oldMember.id);

        const changes = [];

        const addMemberChange = (label, before, after) => {
          if (normalizeMemberValue(before) !== normalizeMemberValue(after)) {
            changes.push(
              `${label}\nقبل: ${before ?? "غير محدد"}\nبعد: ${
                after ?? "غير محدد"
              }`,
            );
          }
        };

        addMemberChange("اسم الفرد", oldMember.full_name, member.name);

        addMemberChange(
          "تاريخ الميلاد",
          formatMemberDate(oldMember.date_of_birth),
          formatMemberDate(member.dateOfBirth),
        );
        addMemberChange("العمر", oldMember.age, member.age);

        addMemberChange("الجنس", oldMember.gender, member.gender);

        addMemberChange(
          "صلة القرابة",
          formatMemberRelation(oldMember.relationship),
          formatMemberRelation(member.relation),
        );

        addMemberChange(
          "الحالة الصحية",
          formatHealthStatus(oldMember.health_status),
          formatHealthStatus(member.healthStatus),
        );

        addMemberChange(
          "الإعاقة",
          formatDisability(oldMember.disability),
          formatDisability(member.disability),
        );

        addMemberChange("الملاحظات", oldMember.notes, member.notes);

        if (changes.length > 0) {
          memberChanges.push(
            [
              `تم تعديل بيانات الفرد: ${
                member.name || oldMember.full_name || "غير محدد"
              }`,
              "",
              ...changes,
            ].join("\n"),
          );
        }
      }

      /*
========================================
DELETED MEMBERS
========================================
*/

      for (const oldMember of membersBefore) {
        if (!matchedMemberIds.has(oldMember.id)) {
          memberChanges.push(
            [
              `تم حذف فرد: ${oldMember.full_name || "غير محدد"}`,

              `العمر: ${oldMember.age ?? "غير محدد"}`,
              `صلة القرابة: ${formatMemberRelation(oldMember.relationship)}`,
              `الحالة الصحية: ${formatHealthStatus(oldMember.health_status)}`,
              `الإعاقة: ${formatDisability(oldMember.disability)}`,
            ].join("\n"),
          );
        }
      }

      /*
========================================
ADD MEMBER CHANGES TO FAMILY AUDIT
========================================
*/

      if (memberChanges.length > 0) {
        familyChanges.push(
          `تغييرات أفراد الأسرة:\n\n${memberChanges.join("\n\n")}`,
        );
      }

      /*
========================================
DELETE OLD MEMBERS
========================================
*/

      await client.query(
        `
  DELETE FROM family_members
  WHERE family_id = $1
  `,
        [id],
      );
      /*
========================================
INSERT NEW MEMBERS
========================================
*/

      if (members && members.length > 0) {
        for (const member of members) {
          await client.query(
            `
      
      INSERT INTO family_members (
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
VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
)
      `,
            [
              id,
              member.name,
              member.nationalId,
              member.gender,
              member.relation,
              member.dateOfBirth,
              member.age,
              member.healthStatus,
              member.disability,
              member.notes,
            ],
          );
        }
      }

      /*
========================================
FINISH
========================================
*/

      await client.query("COMMIT");

      const auditDetails =
        familyChanges.length > 0
          ? `تم تعديل بيانات العائلة ${familyAfter.head_name} (${familyAfter.file_number}).\n\n${familyChanges.join(
              "\n\n",
            )}`
          : `تم حفظ بيانات العائلة ${familyAfter.head_name} (${familyAfter.file_number}) بدون تغييرات جوهرية.`;

      await auditLogger(
        req.user.id,
        "UPDATE_FAMILY",
        "العائلات",
        id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم تحديث بيانات الأسرة بنجاح.",
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error("UPDATE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    } finally {
      client.release();
    }
  },
);

/*
========================================
DELETE FAMILY
========================================
*/

router.delete(
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
      const familyResult = await pool.query(
        `
  SELECT head_name, file_number
  FROM families
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [id],
      );
      const family = familyResult.rows[0];
      if (!family) {
        return res.status(404).json({
          success: false,
          message: "الأسرة غير موجودة.",
        });
      }

      await pool.query(
        `
UPDATE families
SET
    is_deleted = TRUE,
    file_number = NULL
WHERE id = $1
`,
        [id],
      );
      const auditDetails =
        `تم حذف العائلة "${family.head_name}".\n` +
        `رقم الملف: ${family.file_number}.`;

      await auditLogger(
        req.user.id,
        "DELETE_FAMILY",
        "العائلات",
        id,
        auditDetails,
      );
      res.json({
        success: true,
        message: "تم حذف الأسرة بنجاح.",
      });
    } catch (err) {
      console.error("DELETE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);
/*
========================================
RESTORE FAMILY
========================================
*/

router.patch(
  "/:id/restore",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      if (!validateId(id)) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      await client.query("BEGIN");

      /*
      ========================================
      GET DELETED FAMILY
      ========================================
      */

      const familyResult = await client.query(
        `
        SELECT id, head_name
        FROM families
        WHERE id = $1
          AND is_deleted = TRUE
        FOR UPDATE
        `,
        [id],
      );

      if (familyResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "العائلة غير موجودة في المحذوفات.",
        });
      }

      const family = familyResult.rows[0];

      /*
      ========================================
      LOCK FAMILIES TABLE
      ========================================
      */

      await client.query(`
        LOCK TABLE families IN SHARE ROW EXCLUSIVE MODE
      `);

      /*
      ========================================
      FIND FIRST AVAILABLE FILE NUMBER
      ========================================
      */

      const numbersResult = await client.query(`
        SELECT
          CAST(REPLACE(file_number, 'CA-', '') AS INTEGER) AS number
        FROM families
        WHERE is_deleted = FALSE
          AND file_number IS NOT NULL
        ORDER BY number
      `);

      let nextNumber = 1;

      for (const row of numbersResult.rows) {
        if (row.number === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }

      const file_number = `CA-${String(nextNumber).padStart(4, "0")}`;

      /*
      ========================================
      RESTORE FAMILY
      ========================================
      */

      const restoredResult = await client.query(
        `
        UPDATE families
        SET
          is_deleted = FALSE,
          file_number = $1,
          updated_at = NOW()
        WHERE id = $2
          AND is_deleted = TRUE
        RETURNING *
        `,
        [file_number, id],
      );

      if (restoredResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message: "تعذر استعادة العائلة.",
        });
      }

      const restoredFamily = restoredResult.rows[0];

      await client.query("COMMIT");

      /*
      ========================================
      AUDIT
      ========================================
      */

      const auditDetails = [
        `تم استعادة العائلة "${restoredFamily.head_name}".`,
        `رقم الملف الجديد: ${restoredFamily.file_number}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "RESTORE_FAMILY",
        "العائلات",
        restoredFamily.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم استعادة العائلة بنجاح.",
        family: restoredFamily,
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("RESTORE FAMILY ROLLBACK ERROR:", rollbackError);
      }

      console.error("RESTORE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر استعادة العائلة.",
      });
    } finally {
      client.release();
    }
  },
);

/*
========================================
PERMANENT DELETE FAMILY
========================================
*/

router.delete(
  "/:id/permanent",
  authMiddleware,
  authorize(["admin", "representative"]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      if (!validateId(id)) {
        return res.status(400).json({
          success: false,
          message: "معرّف الأسرة غير صالح.",
        });
      }

      await client.query("BEGIN");

      /*
      ========================================
      GET DELETED FAMILY
      ========================================
      */

      const familyResult = await client.query(
        `
        SELECT id, head_name, file_number
        FROM families
        WHERE id = $1
          AND is_deleted = TRUE
        FOR UPDATE
        `,
        [id],
      );

      if (familyResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "العائلة غير موجودة في المحذوفات.",
        });
      }

      const family = familyResult.rows[0];

      /*
      ========================================
      GET DOCUMENT FILES
      ========================================
      */

      const documentsResult = await client.query(
        `
        SELECT id, file_url
        FROM documents
        WHERE family_id = $1
        `,
        [id],
      );

      /*
      ========================================
      DELETE AID DISTRIBUTIONS
      ========================================
      */

      await client.query(
        `
        DELETE FROM aid_distributions
        WHERE family_id = $1
        `,
        [id],
      );

      /*
      ========================================
      DELETE FAMILY
      ========================================
      */

      await client.query(
        `
        DELETE FROM families
        WHERE id = $1
          AND is_deleted = TRUE
        `,
        [id],
      );

      await client.query("COMMIT");

      /*
      ========================================
      DELETE PHYSICAL DOCUMENT FILES
      ========================================
      */

      for (const document of documentsResult.rows) {
        if (!document.file_url) {
          continue;
        }

        try {
          const fileName = path.basename(document.file_url);

          if (!fileName) {
            continue;
          }

          const filePath = path.join(__dirname, "../uploads", fileName);

          await fs.unlink(filePath);
        } catch (fileError) {
          /*
          لا نفشل الحذف من قاعدة البيانات
          إذا كان الملف غير موجود فعليًا.
          */
          if (fileError.code !== "ENOENT") {
            console.error("PERMANENT DELETE DOCUMENT FILE ERROR:", {
              familyId: family.id,
              fileUrl: document.file_url,
              message: fileError.message,
            });
          }
        }
      }

      /*
      ========================================
      AUDIT LOG
      ========================================
      */

      const auditDetails = [
        `تم حذف العائلة نهائيًا "${family.head_name}".`,
        `رقم الملف السابق: ${family.file_number || "غير موجود"}.`,
        "تم حذف أفراد الأسرة والوثائق وسجلات المساعدات المرتبطة بالعائلة.",
      ].join("\n");

      await auditLogger(
        req.user.id,
        "PERMANENT_DELETE_FAMILY",
        "العائلات",
        family.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم حذف العائلة نهائيًا مع جميع البيانات المرتبطة بها.",
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("PERMANENT DELETE FAMILY ROLLBACK ERROR:", rollbackError);
      }

      console.error("PERMANENT DELETE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: "تعذر حذف العائلة نهائيًا.",
      });
    } finally {
      client.release();
    }
  },
);
module.exports = router;
