const pool = require("../config/db");

async function auditLogger(
  userId,
  action,
  entity,
  entityId = null,
  details = null,
) {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (
        user_id,
        action,
        entity,
        entity_id,
        details
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [userId, action, entity, entityId, details],
    );

    return true;
  } catch (error) {
    console.error("AUDIT LOGGER ERROR:", {
      userId,
      action,
      entity,
      entityId,
      message: error.message,
      stack: error.stack,
    });

    return false;
  }
}

module.exports = auditLogger;
