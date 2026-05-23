import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Save, ArrowRight, User, Users } from "lucide-react";
import type { Family, FamilyMember } from "../types";

const governorates = ["شمال غزة", "غزة", "دير البلح", "خانيونس", "رفح"];

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function generateFileNumber(families: Family[]): string {
  if (families.length === 0) {
    return "CA-0001";
  }

  const lastNumber = Math.max(
    ...families.map((f) => parseInt(f.fileNumber.replace("CA-", ""))),
  );

  return `CA-${String(lastNumber + 1).padStart(4, "0")}`;
}

export default function FamilyFormPage() {
  const { families, setFamilies, currentUser, addAuditLog } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const existing = isEdit ? families.find((f) => f.id === id) : undefined;

  const [form, setForm] = useState({
    fileNumber: generateFileNumber(families),

    /*
  ==========================
  بيانات رب الأسرة
  ==========================
  */

    headName: existing?.headName || "",

    headNationalId: existing?.headNationalId || "",

    gender: existing?.gender || "",

    maritalStatus: existing?.maritalStatus || "",

    isProvider: existing?.isProvider ?? true,

    headDateOfBirth: existing?.headDateOfBirth || "",
    headPhone: existing?.headPhone || "",

    alternatePhone: existing?.alternatePhone || "",
    headHealthStatus: existing?.headHealthStatus || "",

    /*
  ==========================
  بيانات السكن
  ==========================
  */

    originGovernorate: existing?.originGovernorate || "",

    originCity: existing?.originCity || "",

    currentAddress: existing?.currentAddress || "",

    housingType: existing?.housingType || "خيمة",

    campLocation: existing?.campLocation || "",

    /*
  ==========================
  الإحصائيات
  ==========================
  */

    malesCount: 0,

    femalesCount: 0,

    male0to5: 0,

    male6to11: 0,

    male12to17: 0,

    male18to24: 0,

    male25to60: 0,

    male60plus: 0,

    female0to5: 0,

    female6to11: 0,

    female12to17: 0,

    female18to24: 0,

    female25to60: 0,

    female60plus: 0,

    /*
  ==========================
  ملاحظات
  ==========================
  */

    notes: existing?.notes || "",
  });

  const [members, setMembers] = useState<Omit<FamilyMember, "id" | "age">[]>(
    existing?.members.map((m) => ({
      name: m.name,
      nationalId: m.nationalId,
      dateOfBirth: m.dateOfBirth || "",
      relation: m.relation || "",
      gender: m.gender || "",
      healthStatus: m.healthStatus || "",

      notes: m.notes || "",
    })) || [],
  );
  useEffect(() => {
    if (existing) {
      setForm((prev) => ({
        ...prev,

        headName: existing.headName || "",
        headNationalId: existing.headNationalId || "",
        headPhone: existing.headPhone || "",
        alternatePhone: existing.alternatePhone || "",

        headDateOfBirth: existing.headDateOfBirth || "",

        gender: existing.gender || "",
        maritalStatus: existing.maritalStatus || "",
        headHealthStatus: existing.headHealthStatus || "",

        originGovernorate: existing.originGovernorate || "",
        originCity: existing.originCity || "",
        currentAddress: existing.currentAddress || "",
        campLocation: existing.campLocation || "",
        notes: existing.notes || "",
      }));

      setMembers(
        existing.members?.map((m) => ({
          ...m,
          dateOfBirth: m.dateOfBirth || "",
        })) || [],
      );
    }
  }, [existing]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const headAge = calcAge(form.headDateOfBirth);

  const allPeople = [
    {
      gender: form.gender,
      age: headAge,
      maritalStatus: form.maritalStatus,
      healthStatus: form.headHealthStatus,
    },

    ...members.map((m) => ({
      gender: m.gender || "ذكر",
      age: calcAge(m.dateOfBirth),

      healthStatus: m.healthStatus,
    })),
  ];

  const statistics = {
    malesCount: 0,
    femalesCount: 0,

    male0to5: 0,
    female0to5: 0,

    male6to11: 0,
    female6to11: 0,

    male12to17: 0,
    female12to17: 0,

    male18to24: 0,
    female18to24: 0,

    male25to60: 0,
    female25to60: 0,

    male60Plus: 0,
    female60Plus: 0,
    marriedCount: 0,

    widowsCount: 0,

    divorcedCount: 0,

    disabledCount: 0,
  };

  allPeople.forEach((person) => {
    if (person.gender === "ذكر") {
      statistics.malesCount++;

      if (person.age <= 5) statistics.male0to5++;
      else if (person.age <= 11) statistics.male6to11++;
      else if (person.age <= 17) statistics.male12to17++;
      else if (person.age <= 24) statistics.male18to24++;
      else if (person.age <= 60) statistics.male25to60++;
      else statistics.male60Plus++;
    } else {
      statistics.femalesCount++;

      if (person.age <= 5) statistics.female0to5++;
      else if (person.age <= 11) statistics.female6to11++;
      else if (person.age <= 17) statistics.female12to17++;
      else if (person.age <= 24) statistics.female18to24++;
      else if (person.age <= 60) statistics.female25to60++;
      else statistics.female60Plus++;
    }
    if (person.healthStatus === "disabled") {
      statistics.disabledCount++;
    }
  });
  // نحسب الحالة الاجتماعية من رب الأسرة فقط
  if (form.maritalStatus === "متزوج/ة") {
    statistics.marriedCount = 1;
  }

  if (form.maritalStatus === "أرمل/ة") {
    statistics.widowsCount = 1;
  }

  if (form.maritalStatus === "مطلق/ة") {
    statistics.divorcedCount = 1;
  }
  const totalMembers = 1 + members.length;

  const addMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),

        name: "",

        nationalId: "",

        dateOfBirth: "",

        age: 0,

        relation: "",

        gender: "",

        healthStatus: "",

        hasDisability: false,

        disabilityType: "",

        notes: "",
      },
    ]);
  };
  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMember = (
    index: number,
    field: keyof FamilyMember,
    value: string | boolean,
  ) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.headName.trim()) errs.headName = "اسم رب الأسرة مطلوب";
    if (!form.headNationalId.trim()) errs.headNationalId = "رقم الهوية مطلوب";
    if (!form.headDateOfBirth) errs.headDateOfBirth = "تاريخ الميلاد مطلوب";
    if (!form.headPhone.trim()) errs.headPhone = "رقم الهاتف مطلوب";
    if (!form.originGovernorate) errs.originGovernorate = "المحافظة مطلوبة";
    if (!form.currentAddress.trim()) errs.currentAddress = " العنوان بالتفصيل";
    members.forEach((m, i) => {
      // التحقق من هوية أفراد الأسرة
      if (!/^\d{9}$/.test(m.nationalId)) {
        errs[`member_${i}_nationalId`] = "رقم الهوية يجب أن يتكون من 9 أرقام";
      }

      if (!m.gender) {
        errs[`member_${i}_gender`] = "اختر الجنس";
      }

      if (!m.relation) {
        errs[`member_${i}_relation`] = "اختر صلة القرابة";
      }

      if (!m.healthStatus) {
        errs[`member_${i}_health`] = "اختر الحالة الصحية";
      }
    });
    members.forEach((m, i) => {
      if (!m.name.trim()) errs[`member_${i}_name`] = "الاسم مطلوب";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const newErrors: Record<string, string> = {};
    // التحقق من رقم هوية رب الأسرة
    if (!/^\d{9}$/.test(form.headNationalId)) {
      newErrors.headNationalId = "رقم الهوية يجب أن يتكون من 9 أرقام";
    }

    // التحقق من جوال رب الأسرة
    if (!/^05\d{8}$/.test(form.headPhone)) {
      newErrors.headPhone = "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام";
    }

    // التحقق من الجوال البديل (إذا موجود)
    if (form.alternatePhone && !/^05\d{8}$/.test(form.alternatePhone)) {
      newErrors.alternatePhone = "رقم الجوال البديل غير صحيح";
    }

    if (!form.headName.trim()) {
      newErrors.headName = "الاسم مطلوب";
    }

    if (!form.headNationalId.trim()) {
      newErrors.headNationalId = "رقم الهوية مطلوب";
    }

    if (!form.headDateOfBirth) {
      newErrors.headDateOfBirth = "تاريخ الميلاد مطلوب";
    }

    if (!form.headPhone.trim()) {
      newErrors.headPhone = "رقم الجوال مطلوب";
    }

    if (!form.currentAddress.trim()) {
      newErrors.currentAddress = "العنوان مطلوب";
    }
    // منع تكرار رقم هوية رب الأسرة
    const duplicateHead = families.find(
      (f) =>
        f.headNationalId === form.headNationalId && (!isEdit || f.id !== id),
    );

    if (duplicateHead) {
      newErrors.headNationalId = "رقم الهوية مستخدم مسبقاً";
    }
    members.forEach((member, index) => {
      if (!member.nationalId.trim()) return;

      const duplicateMember = families.some((f) =>
        f.members.some(
          (m) => m.nationalId === member.nationalId && (!isEdit || f.id !== id),
        ),
      );

      if (duplicateMember) {
        newErrors[`memberNationalId${index}`] = "رقم الهوية مستخدم مسبقاً";
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // التحقق من أفراد الأسرة
    const memberErrors: Record<string, string> = {};

    members.forEach((member, index) => {
      if (!member.name.trim()) {
        memberErrors[`memberName${index}`] = "اسم الفرد مطلوب";
      }

      if (!member.dateOfBirth) {
        memberErrors[`memberBirth${index}`] = "تاريخ الميلاد مطلوب";
      }
    });

    setErrors((prev) => ({
      ...prev,
      ...memberErrors,
    }));

    if (Object.keys(memberErrors).length > 0) {
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date().toISOString();
    const processedMembers: FamilyMember[] = members.map((m, i) => ({
      ...m,
      id: `m_${Date.now()}_${i}`,
      dateOfBirth: String(m.dateOfBirth || ""),
      age: calcAge(m.dateOfBirth),
    }));

    if (isEdit && existing) {
      setFamilies((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                ...(form as Partial<Family>),
                headAge,
                members: processedMembers,
                membersCount: totalMembers,
                updatedAt: now,
              }
            : f,
        ),
      );
      addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        action: "edit",
        target: "عائلة",
        targetId: id,
        details: `تعديل بيانات عائلة: ${form.headName} - ${existing.fileNumber}`,
      });
    } else {
      const fileNumber = generateFileNumber(families);
      const newFamily: Family = {
        id: `f_${Date.now()}`,

        entryDate: now,

        fileNumber,

        headName: form.headName,

        headNationalId: form.headNationalId,

        headDateOfBirth: String(form.headDateOfBirth),

        headAge: headAge,

        headPhone: form.headPhone,
        alternatePhone: form.alternatePhone,

        headHealthStatus: form.headHealthStatus as
          | "healthy"
          | "sick"
          | "disabled",

        originGovernorate: form.originGovernorate,

        originCity: form.originCity,

        currentAddress: form.currentAddress,

        campLocation: form.campLocation,

        gender: form.gender as "ذكر" | "أنثى",
        maritalStatus: form.maritalStatus,

        membersCount: totalMembers,

        members: processedMembers,

        documents: [],
        isDeleted: false,

        createdAt: now,

        updatedAt: now,

        registeredBy: currentUser?.id || "system",

        notes: form.notes || "",
      };
      setFamilies((prev) => [...prev, newFamily]);

      addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        action: "add",
        target: "عائلة",
        targetId: newFamily.id,
        details: `تسجيل عائلة جديدة: ${form.headName} - ${fileNumber}`,
      });
    }

    setSaving(false);
    navigate("/families");
  };

  console.log("FIELD VALUE:", form.headDateOfBirth);
  return (
    <div className="max-w-4xl mx-auto space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/families")}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {isEdit ? "تعديل بيانات العائلة" : "تسجيل عائلة جديدة"}
          </h2>
          {isEdit && existing && (
            <p className="text-sm text-gray-500">
              ملف رقم: {existing.fileNumber}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Head of Family */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="gradient-green px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-bold">بيانات رب الأسرة</h3>
              {!isEdit && (
                <span className="mr-auto bg-white/20 text-white text-xs px-2 py-1 rounded-lg font-mono">
                  {generateFileNumber(families)}
                </span>
              )}
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                الاسم الكامل لرب الأسرة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.headName}
                onChange={(e) => setForm({ ...form, headName: e.target.value })}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headName ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="الاسم الرباعي"
              />

              {errors.headName && (
                <p className="text-red-500 text-xs mt-1">{errors.headName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                رقم الهوية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.headNationalId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    headNationalId: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 9),
                  })
                }
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headNationalId ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="رقم الهوية"
              />

              {errors.headNationalId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.headNationalId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                تاريخ الميلاد <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.headDateOfBirth || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      headDateOfBirth: e.target.value,
                    })
                  }
                  className="flex-1 border rounded-xl px-4 py-2.5"
                />

                {headAge > 0 && (
                  <div className="shrink-0 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    {headAge} سنة
                  </div>
                )}
              </div>
              {errors.headDateOfBirth && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.headDateOfBirth}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                رقم الجوال <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.headPhone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    headPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headPhone ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="05xxxxxxxxx"
              />
              {errors.headPhone && (
                <p className="text-red-500 text-xs mt-1">{errors.headPhone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                رقم الجوال البديل<span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.alternatePhone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    alternatePhone: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  })
                }
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headPhone ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="05xxxxxxxxx"
              />
              {errors.alternatePhone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.alternatePhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                الحالة الصحية
              </label>
              <select
                value={form.headHealthStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    headHealthStatus: e.target.value as
                      | "healthy"
                      | "sick"
                      | "disabled",
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
              >
                <option value="" disabled>
                  اختر الحالة الصحية
                </option>

                <option value="healthy">بصحة جيدة</option>
                <option value="sick">مريض</option>
                <option value="disabled">إعاقة</option>
              </select>
            </div>

            {/* الجنس */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">الجنس</label>

              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value as "ذكر" | "أنثى",
                  })
                }
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="" disabled>
                  اختر الجنس
                </option>

                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            {/* الحالة الاجتماعية */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                الحالة الاجتماعية
              </label>

              <select
                value={form.maritalStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maritalStatus: e.target.value as
                      | "متزوج/ة"
                      | "مطلق/ة"
                      | "أرمل/ة"
                      | "مهجور/ة",
                  })
                }
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="" disabled>
                  اختر الحالة الاجتماعية
                </option>

                <option value="متزوج/ة">متزوج/ة</option>
                <option value="مطلق/ة">مطلق/ة</option>
                <option value="أرمل/ة">أرمل/ة</option>
                <option value="مهجور/ة">مهجور/ة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                محافظة الأصل <span className="text-red-500">*</span>
              </label>
              <select
                value={form.originGovernorate}
                onChange={(e) =>
                  setForm({ ...form, originGovernorate: e.target.value })
                }
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.originGovernorate ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
              >
                <option value="">اختر المحافظة</option>
                {governorates.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.originGovernorate && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.originGovernorate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                مدينة الأصل
              </label>
              <input
                type="text"
                value={form.originCity}
                onChange={(e) =>
                  setForm({ ...form, originCity: e.target.value })
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                placeholder="اسم المدينة "
              />
            </div>

            <div>
              <label className="block text-sm mb-1">موقعك في المخيم</label>

              <select
                value={form.campLocation || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    campLocation: e.target.value,
                  })
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-700"
              >
                <option value="">اختر الموقع</option>
                <option value="الجهة الغربية">الجهة الغربية</option>
                <option value="الجهة الشرقية">الجهة الشرقية</option>
                <option value="الجهة الشمالية (الجورة)">
                  الجهة الشمالية (الجورة)
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.currentAddress}
                onChange={(e) =>
                  setForm({ ...form, currentAddress: e.target.value })
                }
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.currentAddress ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="مثال: السطر الغربي _ بالقرب من مسجد الكتيبة"
              />
              {errors.currentAddress && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.currentAddress}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ملاحظات
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                rows={3}
                placeholder="أي ملاحظات إضافية حول العائلة أو وضعها..."
              />
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">أفراد الأسرة</h3>
                <p className="text-xs text-gray-400">
                  {totalMembers} فرد (رب الأسرة + {members.length} أفراد آخرون)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة فرد
            </button>
          </div>

          <div className="p-5 space-y-4">
            {members.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  لم يتم إضافة أفراد بعد (غير رب الأسرة)
                </p>
                <button
                  type="button"
                  onClick={addMember}
                  className="mt-3 text-blue-600 text-sm font-semibold hover:underline"
                >
                  إضافة أول فرد
                </button>
              </div>
            )}
            {members.map((member, index) => {
              const memberAge = calcAge(member.dateOfBirth);

              return (
                <div
                  key={index}
                  className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">
                      الفرد {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateMember(index, "name", e.target.value)
                        }
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors[`member_${index}_name`] ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
                        placeholder="الاسم الكامل"
                      />
                      {errors[`member_${index}_name`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`member_${index}_name`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        رقم الهوية
                      </label>
                      <input
                        type="text"
                        value={member.nationalId}
                        onChange={(e) =>
                          updateMember(
                            index,
                            "nationalId",
                            e.target.value.replace(/\D/g, "").slice(0, 9),
                          )
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder="رقم الهوية"
                      />
                      {errors[`memberNationalId${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`memberNationalId${index}`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        تاريخ الميلاد
                      </label>

                      <div className="flex gap-2 items-center">
                        <input
                          type="date"
                          value={
                            member.dateOfBirth ? String(member.dateOfBirth) : ""
                          }
                          onChange={(e) =>
                            updateMember(index, "dateOfBirth", e.target.value)
                          }
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
                        />
                        {memberAge > 0 && (
                          <div className="shrink-0 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                            {memberAge} سنة
                          </div>
                        )}
                        {errors[`memberBirth${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`memberBirth${index}`]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        صلة القرابة
                      </label>
                      <select
                        value={member.relation}
                        onChange={(e) =>
                          updateMember(index, "relation", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="" disabled>
                          اختر صلة القرابة
                        </option>

                        <option value="wife">زوجة</option>
                        <option value="son">ابن</option>
                        <option value="daughter">ابنة</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        الجنس
                      </label>

                      <select
                        value={member.gender}
                        onChange={(e) =>
                          updateMember(index, "gender", e.target.value)
                        }
                        className="w-full
border
border-gray-200
rounded-lg
px-3
py-2
text-sm
focus:outline-none
focus:ring-2
focus:ring-blue-400
bg-white"
                      >
                        <option value="" disabled>
                          اختر الجنس
                        </option>

                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        الحالة الصحية
                      </label>
                      <select
                        value={member.healthStatus}
                        onChange={(e) =>
                          updateMember(index, "healthStatus", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="">اختر الحالة الصحية</option>
                        <option value="healthy">بصحة جيدة</option>
                        <option value="sick">مريض</option>
                        <option value="disabled">يعاني من إعاقة</option>
                      </select>
                    </div>

                    {(member.healthStatus === "disabled" ||
                      member.healthStatus === "sick") && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          تفاصيل الحالة
                        </label>
                        <input
                          type="text"
                          value={member.disability || ""}
                          onChange={(e) =>
                            updateMember(index, "disability", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          placeholder="وصف الحالة الصحية أو الإعاقة"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* إحصائيات الأسرة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">إحصائيات الأسرة</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">عدد الذكور</p>
              <p className="font-bold text-lg">{statistics.malesCount}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">عدد الإناث</p>
              <p className="font-bold text-lg">{statistics.femalesCount}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (0-5)</p>
              <p className="font-bold text-lg">{statistics.male0to5}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (0-5)</p>
              <p className="font-bold text-lg">{statistics.female0to5}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (6-11)</p>
              <p className="font-bold text-lg">{statistics.male6to11}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (6-11)</p>
              <p className="font-bold text-lg">{statistics.female6to11}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (12-17)</p>
              <p className="font-bold text-lg">{statistics.male12to17}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (12-17)</p>
              <p className="font-bold text-lg">{statistics.female12to17}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (18-24)</p>
              <p className="font-bold text-lg">{statistics.male18to24}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (18-24)</p>
              <p className="font-bold text-lg">{statistics.female18to24}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (25-60)</p>
              <p className="font-bold text-lg">{statistics.male25to60}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (25-60)</p>
              <p className="font-bold text-lg">{statistics.female25to60}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">ذكور (+60)</p>
              <p className="font-bold text-lg">{statistics.male60Plus}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">إناث (+60)</p>
              <p className="font-bold text-lg">{statistics.female60Plus}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">المتزوجون</p>

              <div className="text-2xl font-bold">
                {statistics.marriedCount}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">الأرامل</p>

              <div className="text-2xl font-bold">{statistics.widowsCount}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">المطلقون</p>

              <div className="text-2xl font-bold">
                {statistics.divorcedCount}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">ذوو الإعاقة</p>

              <div className="text-2xl font-bold">
                {statistics.disabledCount}
              </div>
            </div>
          </div>
        </div>
        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate("/families")}
            className="px-6 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 gradient-green text-white px-8 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-green-200 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "حفظ التعديلات" : "تسجيل العائلة"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
