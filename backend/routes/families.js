const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { mapFamily } = require("../mappers/familyMapper");

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
WHERE f.is_deleted = FALSE
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
        message: err.message,
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
          message: "Family not found",
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

      res.json({
        success: true,

        family: mapFamily(familyResult.rows[0]),

        members: membersResult.rows,
      });
    } catch (err) {
      console.error("GET FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        file_number,
        head_name,
        national_id,
        gender,
        marital_status,
        is_provider,
        date_of_birth,
        age,
        phone,
        health_status,
        origin_governorate,
        origin_city,
        current_address,
        housing_type,
        entry_date,
        notes,
        registered_by,

        members,
      } = req.body;

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
    LOOP MEMBERS
    ========================================
    */

      if (members && members.length > 0) {
        members.forEach((member) => {
          const memberAge = Number(member.age || 0);

          /*
        ========================================
        MALES
        ========================================
        */

          if (member.gender === "ذكر") {
            total_males++;

            if (memberAge <= 5) male_0_5++;
            else if (memberAge <= 11) male_6_11++;
            else if (memberAge <= 17) male_12_17++;
            else if (memberAge <= 24) male_18_24++;
            else if (memberAge <= 60) male_25_60++;
            else male_60_plus++;
          }

          /*
        ========================================
        FEMALES
        ========================================
        */

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

      const total_family_members = total_males + total_females + 1;

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
        $11,$12,$13,$14,$15,$16,$17,

        $18,$19,$20,

        $21,$22,$23,$24,$25,$26,

        $27,$28,$29,$30,$31,$32
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
    notes
)
        VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9
)
          `,
            [
              family.id,
              member.name,
              member.nationalId,
              member.gender,
              member.relation,
              member.dateOfBirth,
              member.age,
              member.healthStatus,
              member.notes,
            ],
          );
        }
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Family created successfully",
        family,
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error("CREATE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;

      const {
        head_name,
        national_id,
        gender,
        marital_status,
        is_provider,
        date_of_birth,
        age,
        phone,
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

      const total_family_members = total_males + total_females + 1;
      /*
========================================
UPDATE FAMILY
========================================
*/

      await client.query(
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
    health_status = $9,
    origin_governorate = $10,
    origin_city = $11,
    current_address = $12,
    housing_type = $13,
    notes = $14,

    total_males = $15,
    total_females = $16,
    total_family_members = $17,

    male_0_5 = $18,
    male_6_11 = $19,
    male_12_17 = $20,
    male_18_24 = $21,
    male_25_60 = $22,
    male_60_plus = $23,

    female_0_5 = $24,
    female_6_11 = $25,
    female_12_17 = $26,
    female_18_24 = $27,
    female_25_60 = $28,
    female_60_plus = $29,

    updated_at = NOW()

  WHERE id = $30
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
    notes
)
     VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9
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

      res.json({
        success: true,
        message: "Family updated successfully",
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error("UPDATE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
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

      await pool.query(
        `
      UPDATE families
      SET is_deleted = TRUE
      WHERE id = $1
      `,
        [id],
      );

      res.json({
        success: true,
        message: "Family deleted successfully",
      });
    } catch (err) {
      console.error("DELETE FAMILY ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

module.exports = router;
