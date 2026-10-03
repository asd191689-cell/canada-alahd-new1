import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Save, ArrowRight, User, Users } from "lucide-react";
import type { FamilyMember } from "../types";
import { api } from "../api/apiClient";

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

export default function FamilyFormPage() {
  const { families, currentUser } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();

  const familyId = id ? Number(id) : null;

  const isEdit = familyId !== null;

  const existing = isEdit ? families.find((f) => f.id === familyId) : undefined;
  useEffect(() => {
    if (!isEdit || !familyId || existing) return;

    const loadFamily = async () => {
      try {
        const data = await api.get(`/families/${familyId}`);

        const family = data.family;

        if (!family) {
          toast.error("لم يتم العثور على العائلة");
          navigate("/families");
          return;
        }

        setForm((prev) => ({
          ...prev,
          headName: family.headName || "",
          headNationalId: family.headNationalId || "",
          gender: family.gender || "",
          maritalStatus: family.maritalStatus || "",
          isProvider: family.isProvider ?? true,
          headDateOfBirth: family.headDateOfBirth
            ? String(family.headDateOfBirth).split("T")[0]
            : "",
          headPhone: family.headPhone || "",
          alternatePhone: family.alternatePhone || "",
          headHealthStatus: family.headHealthStatus || "",
          originGovernorate: family.originGovernorate || "",
          originCity: family.originCity || "",
          currentAddress: family.currentAddress || "",
          housingType: family.housingType || "خيمة",
          campLocation: family.campLocation || "",
          notes: family.notes || "",
        }));

        setMembers(
          (family.members || []).map((m: FamilyMember) => ({
            name: m.name || "",
            nationalId: m.nationalId || "",
            dateOfBirth: m.dateOfBirth
              ? String(m.dateOfBirth).split("T")[0]
              : "",
            relation: m.relation || "",
            gender: m.gender || "",
            healthStatus: m.healthStatus || "",
            notes: m.notes || "",
          })),
        );
      } catch (error) {
        console.error("LOAD FAMILY ERROR:", error);
        toast.error("تعذر تحميل بيانات العائلة");
        navigate("/families");
      }
    };

    loadFamily();
  }, [isEdit, familyId, existing, navigate]);

  const [form, setForm] = useState({
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

        headDateOfBirth: existing.headDateOfBirth
          ? existing.headDateOfBirth.split("T")[0]
          : "",

        gender: existing.gender || "",
        maritalStatus: existing.maritalStatus || "",
        headHealthStatus: existing.headHealthStatus || "",

        originGovernorate: existing.originGovernorate || "",
        originCity: existing.originCity || "",
        currentAddress: existing.currentAddress || "",
        campLocation: existing.campLocation || "",
        housingType: existing.housingType || "خيمة",

        isProvider: existing.isProvider ?? true,
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
      gender: m.gender || "",
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
    } else if (person.gender === "أنثى") {
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
      if (!m.name.trim()) {
        errs[`member_${i}_name`] = "اسم الفرد مطلوب";
      }

      if (!m.dateOfBirth) {
        errs[`member_${i}_birth`] = "تاريخ الميلاد مطلوب";
      }

      if (m.nationalId && !/^\d{9}$/.test(m.nationalId)) {
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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    const newErrors: Record<string, string> = {};
    // التحقق من رقم هوية رب الأسرة
    if (!/^\d{9}$/.test(form.headNationalId)) {
      newErrors.headNationalId = "يرجى إدخال رقم هوية صحيح مكوّن من 9 أرقام";
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
        f.headNationalId === form.headNationalId &&
        (!isEdit || f.id !== familyId),
    );

    if (duplicateHead) {
      newErrors.headNationalId = "رقم الهوية مستخدم مسبقاً";
    }
    members.forEach((member, index) => {
      const nationalId = (member.nationalId ?? "").trim();

      if (!nationalId) return;

      if (!/^\d{9}$/.test(nationalId)) {
        newErrors[`memberNationalId${index}`] =
          "يرجى إدخال رقم هوية صحيح مكوّن من 9 أرقام";
        return;
      }

      const duplicateMember = families.some((f) =>
        f.members.some(
          (m) =>
            m.nationalId === member.nationalId &&
            (!isEdit || f.id !== familyId),
        ),
      );

      if (duplicateMember) {
        newErrors[`member_${index}_nationalId`] = "رقم الهوية مستخدم مسبقاً";
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();
    const processedMembers = members.map((m) => ({
      ...m,
      dateOfBirth: String(m.dateOfBirth || ""),
      age: calcAge(m.dateOfBirth),
    }));

    try {
      if (isEdit && familyId) {
        await api.put(`/families/${familyId}`, {
          head_name: form.headName,
          national_id: form.headNationalId,

          gender: form.gender,
          marital_status: form.maritalStatus,

          is_provider: form.isProvider,

          date_of_birth: form.headDateOfBirth,
          age: headAge,

          phone: form.headPhone,
          alternatePhone: form.alternatePhone,
          campLocation: form.campLocation,

          health_status: form.headHealthStatus,

          origin_governorate: form.originGovernorate,
          origin_city: form.originCity,

          current_address: form.currentAddress,

          housing_type: form.housingType,

          notes: form.notes,

          members: processedMembers,
        });
      } else {
        await api.post("/families", {
          head_name: form.headName,
          national_id: form.headNationalId,

          gender: form.gender,
          marital_status: form.maritalStatus,

          is_provider: form.isProvider,

          date_of_birth: form.headDateOfBirth,
          age: headAge,

          phone: form.headPhone,
          alternatePhone: form.alternatePhone,
          campLocation: form.campLocation,

          health_status: form.headHealthStatus,

          origin_governorate: form.originGovernorate,
          origin_city: form.originCity,

          current_address: form.currentAddress,

          housing_type: form.housingType,

          entry_date: now,

          notes: form.notes,

          registered_by: currentUser?.id,

          members: processedMembers,
        });
      }

      toast.success(
        isEdit ? "تم تحديث بيانات العائلة بنجاح" : "تم تسجيل العائلة بنجاح",
      );

      navigate("/families");
    } catch (err) {
      console.error("SAVE FAMILY ERROR:", err);

      toast.error(isEdit ? "تعذر تحديث بيانات العائلة" : "تعذر تسجيل العائلة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 fade-in">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h3 className="text-white text-base font-bold">
                    بيانات رب الأسرة
                  </h3>

                  <p className="text-xs text-white/70 mt-0.5">
                    المعلومات الأساسية لرب الأسرة
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                الاسم الكامل لرب الأسرة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.headName}
                onChange={(e) => setForm({ ...form, headName: e.target.value })}
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all focus:outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 ${
                  errors.headName
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                placeholder="الاسم الرباعي"
              />

              {errors.headName && (
                <p className="text-red-500 text-xs mt-1">{errors.headName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.headNationalId
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                placeholder="رقم الهوية"
              />

              {errors.headNationalId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.headNationalId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                تاريخ الميلاد <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.headDateOfBirth?.split("T")[0] || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      headDateOfBirth: e.target.value,
                    })
                  }
                  className={`flex-1 h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                    form.headDateOfBirth ? "text-gray-800" : "text-gray-400"
                  }`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.headPhone
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                placeholder="05xxxxxxxxx"
              />
              {errors.headPhone && (
                <p className="text-red-500 text-xs mt-1">{errors.headPhone}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                رقم الجوال البديل
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
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.alternatePhone
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                placeholder="05xxxxxxxxx"
              />
              {errors.alternatePhone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.alternatePhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                className={`w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                  form.headHealthStatus ? "text-gray-800" : "text-gray-400"
                }`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                الجنس
              </label>

              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value as "ذكر" | "أنثى",
                  })
                }
                className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                  form.gender ? "text-gray-800" : "text-gray-400"
                }`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                  form.maritalStatus ? "text-gray-800" : "text-gray-400"
                }`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                محافظة الأصل <span className="text-red-500">*</span>
              </label>
              <select
                value={form.originGovernorate}
                onChange={(e) =>
                  setForm({ ...form, originGovernorate: e.target.value })
                }
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.originGovernorate
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                } ${form.originGovernorate ? "text-gray-800" : "text-gray-400"}`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                مدينة الأصل
              </label>
              <input
                type="text"
                value={form.originCity}
                onChange={(e) =>
                  setForm({ ...form, originCity: e.target.value })
                }
                className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300"
                placeholder="اسم المدينة "
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                موقعك في المخيم
              </label>

              <select
                value={form.campLocation || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    campLocation: e.target.value,
                  })
                }
                className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                  form.campLocation ? "text-gray-800" : "text-gray-400"
                }`}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.currentAddress}
                onChange={(e) =>
                  setForm({ ...form, currentAddress: e.target.value })
                }
                className={`w-full h-11 border rounded-xl px-4 text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.currentAddress
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                placeholder="مثال: السطر الغربي _ بالقرب من مسجد الكتيبة"
              />
              {errors.currentAddress && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.currentAddress}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ملاحظات
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 placeholder:text-gray-400 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300"
                rows={3}
                placeholder="أي ملاحظات إضافية حول العائلة أو وضعها..."
              />
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                  className="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-gray-50/70 shadow-sm space-y-4 transition-all hover:border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">
                      الفرد {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        الاسم الكامل <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          updateMember(index, "name", e.target.value)
                        }
                        className={`w-full h-11 border rounded-xl px-4 text-sm bg-gray-50 transition-all focus:outline-none focus:ring-2 placeholder:text-gray-400 focus:ring-green-500 hover:border-gray-300 ${
                          errors[`member_${index}_name`]
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                        placeholder="الاسم الكامل"
                      />
                      {errors[`member_${index}_name`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`member_${index}_name`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                        className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300"
                        placeholder="رقم الهوية"
                      />
                      {errors[`member_${index}_nationalId`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors[`member_${index}_nationalId`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
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
                          className={`flex-1 h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                            member.dateOfBirth
                              ? "text-gray-800"
                              : "text-gray-400"
                          }`}
                        />
                        {memberAge > 0 && (
                          <div className="shrink-0 h-11 px-3 flex items-center bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold">
                            {memberAge} سنة
                          </div>
                        )}
                        {errors[`member_${index}_birth`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`member_${index}_birth`]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        صلة القرابة
                      </label>
                      <select
                        value={member.relation}
                        onChange={(e) =>
                          updateMember(index, "relation", e.target.value)
                        }
                        className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                          member.relation ? "text-gray-800" : "text-gray-400"
                        }`}
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
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        الجنس
                      </label>

                      <select
                        value={member.gender}
                        onChange={(e) =>
                          updateMember(index, "gender", e.target.value)
                        }
                        className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                          member.gender ? "text-gray-800" : "text-gray-400"
                        }`}
                      >
                        <option value="" disabled>
                          اختر الجنس
                        </option>

                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        الحالة الصحية
                      </label>
                      <select
                        value={member.healthStatus}
                        onChange={(e) =>
                          updateMember(index, "healthStatus", e.target.value)
                        }
                        className={`w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 ${
                          member.healthStatus
                            ? "text-gray-800"
                            : "text-gray-400"
                        }`}
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
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          تفاصيل الحالة
                        </label>
                        <input
                          type="text"
                          value={member.disability || ""}
                          onChange={(e) =>
                            updateMember(index, "disability", e.target.value)
                          }
                          className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
          {/* العنوان */}
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-bold text-gray-800">
              إحصائيات الأسرة
            </h3>

            <p className="text-xs text-gray-400 mt-1">
              توزيع أفراد الأسرة حسب الجنس والعمر والحالة الاجتماعية
            </p>
          </div>

          {/* ================================
      الإجمالي
  ================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
            {/* إجمالي الذكور */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    عدد الذكور
                  </p>

                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {statistics.malesCount}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">♂</span>
                </div>
              </div>
            </div>

            {/* إجمالي الإناث */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    عدد الإناث
                  </p>

                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {statistics.femalesCount}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 text-lg">♀</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================
      التوزيع العمري
  ================================= */}
          <div className="mb-7">
            {/* عنوان القسم */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-100 flex-1" />

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-gray-700">
                  التوزيع العمري
                </span>

                <span className="text-blue-500 text-sm">♙</span>
              </div>

              <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* بطاقات الأعمار */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 0 - 5 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    0 - 5 سنوات
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male0to5}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female0to5}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6 - 11 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    6 - 11 سنة
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male6to11}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female6to11}
                    </p>
                  </div>
                </div>
              </div>

              {/* 12 - 17 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    12 - 17 سنة
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male12to17}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female12to17}
                    </p>
                  </div>
                </div>
              </div>

              {/* 18 - 24 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    18 - 24 سنة
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male18to24}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female18to24}
                    </p>
                  </div>
                </div>
              </div>

              {/* 25 - 60 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    25 - 60 سنة
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male25to60}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female25to60}
                    </p>
                  </div>
                </div>
              </div>

              {/* +60 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-center mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    +60 سنة
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="text-center">
                    <p className="text-[11px] text-blue-500 font-medium mb-1">
                      ذكور
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {statistics.male60Plus}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] text-purple-500 font-medium mb-1">
                      إناث
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {statistics.female60Plus}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================
      الحالة الاجتماعية
  ================================= */}
          <div>
            {/* عنوان القسم */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-100 flex-1" />

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-gray-700">
                  الحالة الاجتماعية
                </span>

                <span className="text-green-500 text-sm">♙</span>
              </div>

              <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* بطاقات الحالة الاجتماعية */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* المتزوجون */}
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 text-center">
                <p className="text-xs font-medium text-green-700 mb-2">
                  المتزوجون
                </p>

                <p className="text-2xl font-bold text-green-600">
                  {statistics.marriedCount}
                </p>
              </div>

              {/* الأرامل */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                <p className="text-xs font-medium text-amber-700 mb-2">
                  الأرامل
                </p>

                <p className="text-2xl font-bold text-amber-600">
                  {statistics.widowsCount}
                </p>
              </div>

              {/* المطلقون */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 text-center">
                <p className="text-xs font-medium text-orange-700 mb-2">
                  المطلقون
                </p>

                <p className="text-2xl font-bold text-orange-600">
                  {statistics.divorcedCount}
                </p>
              </div>

              {/* ذوو الإعاقة */}
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-center">
                <p className="text-xs font-medium text-red-700 mb-2">
                  ذوو الإعاقة
                </p>

                <p className="text-2xl font-bold text-red-600">
                  {statistics.disabledCount}
                </p>
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
