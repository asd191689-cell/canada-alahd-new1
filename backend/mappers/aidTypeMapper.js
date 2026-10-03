function mapAidType(row) {
  return {
    id: row.id,

    name: row.name,

    category: row.category,

    unit: row.unit,

    description: row.description,

    isDeleted: row.is_deleted,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

module.exports = {
  mapAidType,
};
