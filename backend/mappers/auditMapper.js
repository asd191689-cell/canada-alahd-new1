function mapAudit(row) {
  let details = row.details || "";

  if (!row.details) {
    switch (row.action) {
      case "LOGIN":
        details = "قام بتسجيل الدخول إلى النظام";
        break;

      case "LOGOUT":
        details = "قام بتسجيل الخروج من النظام";
        break;

      case "CREATE_USER":
        details = "أنشأ مستخدمًا جديدًا";
        break;

      case "UPDATE_USER":
        details = "عدّل بيانات مستخدم";
        break;

      case "DELETE_USER":
        details = "حذف مستخدمًا";
        break;

      case "CREATE_FAMILY":
        details = "أنشأ عائلة جديدة";
        break;

      case "UPDATE_FAMILY":
        details = "عدّل بيانات عائلة";
        break;

      case "DELETE_FAMILY":
        details = "حذف عائلة";
        break;
      case "PERMANENT_DELETE_FAMILY":
        details = "حذف عائلة نهائيًا";
        break;

      case "RESTORE_FAMILY":
        details = "استعاد عائلة";
        break;

      case "CREATE_MEMBER":
        details = "أضاف عضوًا إلى العائلة";
        break;

      case "UPDATE_MEMBER":
        details = "عدّل بيانات عضو في العائلة";
        break;

      case "DELETE_MEMBER":
        details = "حذف عضوًا من العائلة";
        break;

      case "UPLOAD_DOCUMENT":
        details = "رفع وثيقة";
        break;

      case "UPDATE_DOCUMENT_STATUS":
        details = "عدّل حالة وثيقة";
        break;

      case "DELETE_DOCUMENT":
        details = "حذف وثيقة";
        break;

      case "CREATE_AID_TYPE":
        details = "أنشأ نوع مساعدة";
        break;

      case "UPDATE_AID_TYPE":
        details = "عدّل نوع مساعدة";
        break;

      case "DELETE_AID_TYPE":
        details = "حذف نوع مساعدة";
        break;

      case "CREATE_DISTRIBUTION":
        details = "وزّع مساعدة";
        break;

      case "DELETE_DISTRIBUTION":
        details = "حذف عملية توزيع";
        break;

      default:
        details = row.action;
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.full_name,
    action: row.action,
    target: row.entity,
    details,
    targetId: row.entity_id,
    timestamp: row.timestamp,
  };
}

module.exports = {
  mapAudit,
};
