function mapDocument(row) {
  return {
    id: row.id,

    familyId: row.family_id,

    headNationalId: row.head_national_id,

    fileNumber: row.file_number,

    type: row.type,

    name: row.name,

    url: row.file_url,

    uploadedAt: row.uploaded_at,

    uploadedBy: row.uploaded_by,

    status: row.status,
  };
}

module.exports = {
  mapDocument,
};
