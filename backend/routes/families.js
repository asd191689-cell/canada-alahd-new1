const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/*
========================================
GET ALL FAMILIES
========================================
*/

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM families
      WHERE is_deleted = FALSE
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      families: result.rows,
    });
  } catch (err) {
    console.error("GET FAMILIES ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
========================================
GET SINGLE FAMILY
========================================
*/

router.get("/:id", async (req, res) => {
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

      family: familyResult.rows[0],

      members: membersResult.rows,
    });
  } catch (err) {
    console.error("GET FAMILY ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
========================================
CREATE FAMILY
========================================
*/

router.post("/", async (req, res) => {
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
            marital_status,
            date_of_birth,
            age,
            health_status,
            educational_status,
            is_working,
            notes
          )

          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
          )
          `,
          [
            family.id,
            member.full_name,
            member.national_id,
            member.gender,
            member.relationship,
            member.marital_status,
            member.date_of_birth,
            member.age,
            member.health_status,
            member.educational_status,
            member.is_working,
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
});

/*
========================================
DELETE FAMILY
========================================
*/

router.delete("/:id", async (req, res) => {
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
});

module.exports = router;
