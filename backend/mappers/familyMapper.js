function mapFamily(row) {
  return {
    id: row.id,

    fileNumber: row.file_number,

    headName: row.head_name,
    headNationalId: row.national_id,
    headDateOfBirth: row.date_of_birth,
    headAge: row.age,
    headPhone: row.phone,
    alternatePhone: row.alternate_phone,

    headHealthStatus: row.health_status,

    gender: row.gender,
    maritalStatus: row.marital_status,
    isProvider: row.is_provider,

    originGovernorate: row.origin_governorate,
    originCity: row.origin_city,

    currentAddress: row.current_address,
    housingType: row.housing_type,
    campLocation: row.camp_location,

    entryDate: row.entry_date,

    membersCount: row.total_family_members,

    malesCount: row.total_males,
    femalesCount: row.total_females,

    male0to5: row.male_0_5,
    male6to11: row.male_6_11,
    male12to17: row.male_12_17,
    male18to24: row.male_18_24,
    male25to60: row.male_25_60,
    male60Plus: row.male_60_plus,

    female0to5: row.female_0_5,
    female6to11: row.female_6_11,
    female12to17: row.female_12_17,
    female18to24: row.female_18_24,
    female25to60: row.female_25_60,
    female60Plus: row.female_60_plus,

    members: row.members || [],

    notes: row.notes,

    isDeleted: row.is_deleted,

    registeredBy: row.registered_by,

    createdAt: row.created_at,
    members: (row.members || []).map((m) => ({
      id: m.id,
      name: m.full_name,
      nationalId: m.national_id,
      gender: m.gender,
      relation: m.relationship,
      dateOfBirth: m.date_of_birth,
      age: m.age,
      healthStatus: m.health_status,
      disability: m.disability,
      notes: m.notes,
    })),
    updatedAt: row.updated_at,
  };
}

module.exports = {
  mapFamily,
};
