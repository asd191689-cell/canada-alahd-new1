import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import {
  Gift,
  Package,
  User2,
  Plus,
  HandCoins,
  Boxes,
  UtensilsCrossed,
  HeartPulse,
  WalletCards,
  Trash2,
  Edit3,
  Search,
  Info,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { AidDistribution, AidType } from "../types";
import { api } from "../api/apiClient";

const categoryColors: Record<string, string> = {
  food: "bg-orange-100 text-orange-700",
  medical: "bg-blue-100 text-blue-700",
  financial: "bg-green-100 text-green-700",
  clothing: "bg-purple-100 text-purple-700",
  household: "bg-gray-100 text-gray-700",
};
const categoryLabels: Record<string, string> = {
  food: "غذائية",
  medical: "طبية",
  financial: "مالية",
  clothing: "ملابس",
  household: "منزلية",
};

export default function AidPage() {
  const {
    families,
    aidTypes,
    setAidTypes,
    aidDistributions,
    setAidDistributions,
    users,
    currentUser,
  } = useApp();
  const [activeTab, setActiveTab] = useState<"distributions" | "types">(
    "distributions",
  );
  const [showBulkDist, setShowBulkDist] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
    useState<AidDistribution | null>(null);
  const [editingDistribution, setEditingDistribution] =
    useState<AidDistribution | null>(null);
  const [bulkForm, setBulkForm] = useState({
    aidTypeId: "",
    quantity: "1",
    distributionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [searchDist, setSearchDist] = useState("");
  const [showAddDist, setShowAddDist] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [editingAidType, setEditingAidType] = useState<AidType | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [bulkErrorMessage, setBulkErrorMessage] = useState("");
  const [distErrorMessage, setDistErrorMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "distribution" | "aidType";
    id: number;
  } | null>(null);

  // Distribution form
  const [distForm, setDistForm] = useState({
    familyId: "",
    headNationalId: "",
    aidTypeId: "",
    quantity: "1",
    distributionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // AidType form
  const [typeForm, setTypeForm] = useState({
    name: "",
    category: "food" as AidType["category"],
    description: "",
    unit: "",
  });

  const activeFamilies = families.filter((f) => !f.isDeleted);
  const selectedFamily = families.find(
    (f) => String(f.headNationalId) === String(distForm.headNationalId),
  );

  const filteredDist = [...aidDistributions]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .filter(
      (d) =>
        !searchDist ||
        d.familyName?.toLowerCase().includes(searchDist.toLowerCase()) ||
        d.fileNumber?.toLowerCase().includes(searchDist.toLowerCase()) ||
        d.headNationalId?.includes(searchDist),
    );
  const handleAddDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const family = families.find(
      (f) => String(f.headNationalId) === String(distForm.headNationalId),
    );
    if (!family) {
      setDistErrorMessage("رقم ملف رب الأسرة غير موجود");
      return;
    }
    if (!family) return;
    const aidType = aidTypes.find(
      (at) => at.id === Number(distForm.aidTypeId),
    )!;
    try {
      await api.post("/aid-distributions", {
        family_id: family.id,
        aid_type_id: aidType.id,
        quantity: Number(distForm.quantity),
        distributed_at: distForm.distributionDate,
        notes: distForm.notes,
        supervisor_id: currentUser!.id,
      });

      // إعادة تحميل البيانات من السيرفر
      const data = await api.get("/aid-distributions");
      console.log("AID DISTRIBUTIONS:", data.distributions);

      setAidDistributions(data.distributions || []);

      setSuccessMessage("تم تسجيل التوزيع بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (err: any) {
      setDistErrorMessage(err.message || "حدث خطأ أثناء التسجيل");
      return;
    }

    setDistForm({
      familyId: "",
      headNationalId: "",
      aidTypeId: "",
      quantity: "1",
      distributionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowAddDist(false);
  };

  const handleBulkDistribution = async () => {
    if (!bulkForm.aidTypeId) {
      setBulkErrorMessage("يرجى اختيار صنف المساعدة");
      return;
    }

    if (activeFamilies.length === 0) {
      setBulkErrorMessage("يرجى اختيار أسرة واحدة على الأقل");
      return;
    }

    const quantity = Number(bulkForm.quantity);

    if (!quantity || quantity <= 0) {
      setBulkErrorMessage("يجب أن تكون الكمية أكبر من صفر");
      return;
    }

    try {
      const data = await api.post("/aid-distributions/bulk", {
        family_ids: activeFamilies.map((family) => family.id),
        aid_type_id: Number(bulkForm.aidTypeId),
        quantity,
        distributed_at: bulkForm.distributionDate,
        notes: bulkForm.notes,
        supervisor_id: currentUser?.id,
      });

      const refreshed = await api.get("/aid-distributions");

      setAidDistributions(refreshed.distributions || []);

      setSuccessMessage(
        data.message ||
          `تم تنفيذ التوزيع الجماعي بنجاح على ${data.distributions?.length || 0} أسرة`,
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      setBulkForm({
        aidTypeId: "",
        quantity: "1",
        distributionDate: new Date().toISOString().split("T")[0],
        notes: "",
      });

      setShowBulkDist(false);
    } catch (err: any) {
      console.error("BULK DISTRIBUTION ERROR:", err);

      setBulkErrorMessage(
        err.message || "تعذر تنفيذ التوزيع الجماعي. يرجى المحاولة مرة أخرى.",
      );
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await api.post("/aid-types", {
        name: typeForm.name,
        category: typeForm.category,
        unit: typeForm.unit,
        description: typeForm.description,
      });

      setAidTypes((prev) => [data.aidType, ...prev]);
      setSuccessMessage("تمت إضافة صنف المساعدة بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
      setTypeForm({
        name: "",
        category: "food",
        unit: "",
        description: "",
      });

      setShowAddType(false);
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إضافة صنف المساعدة");
    }
  };
  const handleUpdateType = async () => {
    if (!editingAidType) return;

    try {
      const data = await api.put(`/aid-types/${editingAidType.id}`, {
        name: typeForm.name,
        category: typeForm.category,
        unit: typeForm.unit,
        description: typeForm.description,
      });

      setAidTypes((prev) =>
        prev.map((type) =>
          type.id === editingAidType.id ? data.aidType : type,
        ),
      );

      setSuccessMessage("تم تعديل صنف المساعدة بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);

      setEditingAidType(null);
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء تعديل صنف المساعدة");
    }
  };

  const handleDeleteType = async (id: number) => {
    setDeleteConfirm({
      type: "aidType",
      id,
    });
  };

  const confirmDeleteType = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "aidType") {
      return;
    }

    try {
      await api.delete(`/aid-types/${deleteConfirm.id}`);

      setAidTypes((prev) => prev.filter((t) => t.id !== deleteConfirm.id));

      setAidDistributions((prev) =>
        prev.filter((d) => d.aidTypeId !== deleteConfirm.id),
      );

      setDeleteConfirm(null);

      setSuccessMessage("تم حذف صنف المساعدة بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (err: any) {
      setDeleteConfirm(null);

      setErrorMessage(
        err.message || "تعذر حذف صنف المساعدة. يرجى المحاولة مرة أخرى.",
      );

      setTimeout(() => {
        setErrorMessage("");
      }, 4000);
    }
  };
  const handleDeleteDist = async (id: number) => {
    setDeleteConfirm({
      type: "distribution",
      id,
    });
  };

  const confirmDeleteDist = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "distribution") {
      return;
    }

    try {
      await api.delete(`/aid-distributions/${deleteConfirm.id}`);

      const data = await api.get("/aid-distributions");
      setAidDistributions(data.distributions || []);

      setDeleteConfirm(null);

      setSuccessMessage("تم حذف سجل التوزيع بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (err: any) {
      setDeleteConfirm(null);

      setErrorMessage(
        err.message || "تعذر حذف سجل التوزيع. يرجى المحاولة مرة أخرى.",
      );

      setTimeout(() => {
        setErrorMessage("");
      }, 4000);
    }
  };
  const handleUpdateDistribution = async () => {
    if (!editingDistribution) return;

    try {
      await api.put(`/aid-distributions/${editingDistribution.id}`, {
        family_id: editingDistribution.familyId,
        aid_type_id: editingDistribution.aidTypeId,
        quantity: editingDistribution.quantity,
        distributed_at: editingDistribution.distributionDate,
        notes: editingDistribution.notes,
        supervisor_id: editingDistribution.supervisorId,
      });

      const refreshed = await api.get("/aid-distributions");

      setAidDistributions(refreshed.distributions || []);

      setSuccessMessage("تم تعديل سجل التوزيع بنجاح");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);

      setEditingDistribution(null);
    } catch (err: any) {
      setDistErrorMessage(err.message || "حدث خطأ أثناء تعديل سجل التوزيع");
    }
  };
  const stats = {
    totalDist: aidDistributions.length,

    totalTypes: aidTypes.length,

    food: aidDistributions.filter(
      (d) => aidTypes.find((t) => t.id === d.aidTypeId)?.category === "food",
    ).length,

    medical: aidDistributions.filter(
      (d) => aidTypes.find((t) => t.id === d.aidTypeId)?.category === "medical",
    ).length,

    financial: aidDistributions.filter(
      (d) =>
        aidTypes.find((t) => t.id === d.aidTypeId)?.category === "financial",
    ).length,
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          {
            label: "إجمالي التوزيعات",
            value: stats.totalDist,
            color: "text-green-700",
            iconBg: "bg-green-50",
            borderColor: "border-t-green-600",
            icon: HandCoins,
          },
          {
            label: "أصناف المساعدات",
            value: stats.totalTypes,
            color: "text-blue-700",
            iconBg: "bg-blue-50",
            borderColor: "border-t-blue-600",
            icon: Boxes,
          },
          {
            label: "مساعدات غذائية",
            value: stats.food,
            color: "text-orange-600",
            iconBg: "bg-orange-50",
            borderColor: "border-t-orange-500",
            icon: UtensilsCrossed,
          },
          {
            label: "مساعدات طبية",
            value: stats.medical,
            color: "text-blue-700",
            iconBg: "bg-blue-50",
            borderColor: "border-t-blue-600",
            icon: HeartPulse,
          },
          {
            label: "مساعدات مالية",
            value: stats.financial,
            color: "text-green-700",
            iconBg: "bg-green-50",
            borderColor: "border-t-green-600",
            icon: WalletCards,
          },
        ].map((s, i) => {
          const Icon = s.icon;

          return (
            <div
              key={i}
              className={`
          bg-white
          rounded-2xl
          shadow-sm
          border border-gray-100
          border-t-4
          ${s.borderColor}
          p-4
          min-h-[96px]
          transition-all duration-200
          hover:-translate-y-0.5
          hover:shadow-md
        `}
            >
              <div className="flex items-center gap-3 h-full">
                {/* Icon */}
                <div
                  className={`
              w-11 h-11
              rounded-xl
              ${s.iconBg}
              flex items-center justify-center
              flex-shrink-0
            `}
                >
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>

                {/* Text + Value */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 font-medium mb-1 leading-5">
                    {s.label}
                  </p>

                  <p
                    className={`
                text-2xl
                font-black
                leading-none
                tracking-tight
                ${s.color}
              `}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Toast Notifications */}
      {(successMessage || errorMessage) && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] w-[min(420px,calc(100vw-2rem))]">
          {successMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-white px-4 py-3.5 shadow-xl shadow-green-900/10">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800">
                  تمت العملية بنجاح
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{successMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="shrink-0 text-gray-400 transition hover:text-gray-600"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-white px-4 py-3.5 shadow-xl shadow-red-900/10">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800">
                  تعذر تنفيذ العملية
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{errorMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="shrink-0 text-gray-400 transition hover:text-gray-600"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div
          className="flex items-center justify-start border-b border-gray-100 px-4 overflow-x-auto"
          dir="rtl"
        >
          {[
            {
              id: "distributions",
              label: "سجل التوزيعات",
              icon: Gift,
            },
            {
              id: "types",
              label: "أصناف المساعدات",
              icon: Package,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
          relative
          flex items-center justify-center gap-2
          min-w-[150px]
          px-5 py-4
          text-sm font-semibold
          whitespace-nowrap
          transition-all duration-200
          border-b-2
          ${
            isActive
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }
        `}
              >
                <tab.icon
                  className={`
            w-4 h-4
            transition-colors
            ${isActive ? "text-green-600" : "text-gray-400"}
          `}
                />

                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "distributions" && (
          <div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-white">
              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddDist(true)}
                  className="
  inline-flex items-center justify-center gap-2
  min-w-[145px]
  gradient-green
  text-white
  px-5 py-2.5
  rounded-xl
  font-bold text-sm
  shadow-sm shadow-green-100
  hover:shadow-md hover:shadow-green-100
  hover:-translate-y-0.5
  active:translate-y-0
  transition-all duration-200
  whitespace-nowrap
"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل توزيع</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkDist(true)}
                  className="
        inline-flex items-center justify-center gap-2
        min-w-[150px]
        gradient-green
        text-white
        px-5 py-2.5
        rounded-xl
        font-bold text-sm
        shadow-sm
        hover:shadow-md
        hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-200
        whitespace-nowrap
      "
                >
                  <Users className="w-4 h-4" />
                  <span>توزيع جماعي</span>
                </button>
              </div>

              {/* البحث */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchDist}
                  onChange={(e) => setSearchDist(e.target.value)}
                  className="
  w-full
  h-11
  border border-gray-200
  rounded-xl
  py-2.5
  pr-10
  pl-4
  text-sm
  text-gray-700
  placeholder:text-gray-400
  bg-gray-50/60
  shadow-sm
  focus:outline-none
  focus:ring-2
focus:ring-green-500/15
focus:border-green-500
focus:bg-white
transition-all duration-200
"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      العائلة
                    </th>
                    <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      صنف المساعدة
                    </th>
                    <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      الكمية
                    </th>
                    <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      تاريخ التوزيع
                    </th>
                    <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                      المشرف
                    </th>
                    {(currentUser?.role === "admin" ||
                      currentUser?.role === "representative" ||
                      currentUser?.role === "employee") && (
                      <th className="text-right px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                        الإجراءات
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDist.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-gray-400"
                      >
                        <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>لا توجد سجلات توزيع</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDist.map((dist) => {
                      const aidType = aidTypes.find(
                        (t) => t.id === dist.aidTypeId,
                      );
                      return (
                        <tr
                          key={dist.id}
                          className="border-b border-gray-50 last:border-b-0 hover:bg-green-50/30 transition-colors duration-200"
                        >
                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm font-bold text-gray-800">
                                {dist.familyName}
                              </p>

                              <p className="text-[11px] text-gray-400 font-mono mt-1">
                                {dist.fileNumber} || {dist.headNationalId}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-col items-start gap-1.5">
                              <p className="text-sm font-semibold text-gray-800">
                                {dist.aidTypeName}
                              </p>

                              {aidType && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${categoryColors[aidType.category]}`}
                                >
                                  {categoryLabels[aidType.category]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <div className="inline-flex items-baseline gap-1">
                              <span className="text-sm font-bold text-gray-800">
                                {dist.quantity}
                              </span>

                              <span className="text-xs font-medium text-gray-400">
                                {dist.unit}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle text-gray-600 text-sm whitespace-nowrap">
                            {new Date(dist.distributionDate).toLocaleDateString(
                              "ar-IQ",
                            )}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <User2 className="w-4 h-4 text-green-600" />
                              </div>

                              <span className="text-sm font-semibold text-gray-700">
                                {users.find(
                                  (user) =>
                                    String(user.id) ===
                                    String(dist.supervisorId),
                                )?.name || "غير محدد"}
                              </span>
                            </div>
                          </td>
                          {(currentUser?.role === "admin" ||
                            currentUser?.role === "representative" ||
                            currentUser?.role === "employee") && (
                            <td className="px-4 py-3.5 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedDistribution(dist)}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="عرض التفاصيل"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const family = families.find(
                                      (f) => f.id === dist.familyId,
                                    );

                                    setEditingDistribution({
                                      ...dist,
                                      familyName:
                                        family?.headName || dist.familyName,
                                      fileNumber:
                                        family?.fileNumber || dist.fileNumber,
                                      familyId: dist.familyId,
                                      aidTypeId: dist.aidTypeId,
                                      distributionDate: dist.distributionDate,
                                      supervisorId: dist.supervisorId,
                                    });
                                  }}
                                  className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                  title="تعديل التوزيع"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteDist(dist.id)}
                                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "types" && (
          <div>
            <div className="flex items-center justify-end p-4 border-b border-gray-100">
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => setShowAddType(true)}
                  className="inline-flex items-center gap-2 gradient-green text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة صنف جديد
                </button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aidTypes.map((type) => (
                <div
                  key={type.id}
                  className="group relative overflow-hidden rounded-2xl
           border border-green-50
           bg-gradient-to-br from-white via-white to-green-50/40
           shadow-sm
           transition-all duration-300 ease-out
           hover:-translate-y-1
           hover:border-green-100
           hover:shadow-lg"
                >
                  <div
                    className="pointer-events-none absolute inset-0
             bg-gradient-to-br from-green-50/30
             via-transparent to-transparent
             opacity-0
             transition-opacity duration-300
             group-hover:opacity-100"
                  />
                  <div className="p-5">
                    {/* رأس البطاقة */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      {/* الأيقونة */}
                      <div
                        className="w-11 h-11 rounded-xl bg-green-50
             flex items-center justify-center shrink-0
             transition-all duration-300
             group-hover:scale-105
             group-hover:bg-green-100"
                      >
                        {type.category === "food" ? (
                          <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                        ) : type.category === "medical" ? (
                          <HeartPulse className="w-5 h-5 text-blue-600" />
                        ) : type.category === "financial" ? (
                          <WalletCards className="w-5 h-5 text-green-600" />
                        ) : (
                          <Package className="w-5 h-5 text-green-600" />
                        )}
                      </div>

                      {/* التصنيف + الحذف */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold
            ${categoryColors[type.category]}`}
                        >
                          {categoryLabels[type.category]}
                        </span>
                        {currentUser?.role === "admin" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAidType(type);
                              setTypeForm({
                                name: type.name,
                                category: type.category,
                                unit: type.unit,
                                description: type.description || "",
                              });
                            }}
                            className="w-8 h-8 rounded-lg
    bg-blue-50 text-blue-500
    hover:bg-blue-100 hover:text-blue-600
    flex items-center justify-center
    transition-colors"
                            title="تعديل الصنف"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {currentUser?.role === "admin" && (
                          <button
                            onClick={() => handleDeleteType(type.id)}
                            className="w-8 h-8 rounded-lg
                       bg-red-50 text-red-500
                       hover:bg-red-100 hover:text-red-600
                       flex items-center justify-center
                       transition-colors"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* اسم الصنف */}
                    <div className="mb-5">
                      <h4 className="text-base font-bold text-gray-800 mb-1">
                        {type.name}
                      </h4>

                      {type.description && (
                        <p className="text-xs leading-5 text-gray-400 line-clamp-2">
                          {type.description}
                        </p>
                      )}
                    </div>

                    {/* معلومات الصنف */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* الوحدة */}
                        <div>
                          <p className="text-[11px] text-gray-400 mb-1">
                            الوحدة
                          </p>

                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-gray-400" />

                            <span className="text-xs font-semibold text-gray-700">
                              {type.unit}
                            </span>
                          </div>
                        </div>

                        {/* عدد التوزيعات */}
                        <div>
                          <p className="text-[11px] text-gray-400 mb-1">
                            التوزيعات
                          </p>

                          <span className="text-sm font-bold text-green-600">
                            {
                              aidDistributions.filter(
                                (d) => d.aidTypeId === type.id,
                              ).length
                            }
                          </span>
                        </div>
                      </div>

                      {/* تاريخ الإنشاء */}
                      <div
                        className="mt-4 pt-3 border-t border-gray-50
                   flex items-center justify-between"
                      >
                        <span className="text-[11px] text-gray-400">
                          تاريخ الإضافة
                        </span>

                        <span className="text-[11px] text-gray-500 font-medium">
                          {new Date(type.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Distribution Modal */}
      {showAddDist &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] relative overflow-hidden flex flex-col">
              <div className="gradient-green px-5 py-5 rounded-t-2xl flex items-center justify-between shrink-0 min-h-[72px]">
                <h3 className="text-white font-bold text-base">
                  تسجيل توزيع مساعدة
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    setDistErrorMessage("");
                    setShowAddDist(false);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleAddDistribution}
                className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    العائلة المستفيدة
                  </label>
                  <input
                    type="text"
                    placeholder="أدخل رقم هوية رب الأسرة"
                    value={distForm.headNationalId || ""}
                    onChange={(e) =>
                      setDistForm({
                        ...distForm,
                        headNationalId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5"
                  />
                  {distForm.headNationalId && (
                    <div className="mt-2">
                      {selectedFamily ? (
                        <div className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">
                          {selectedFamily.headName} —{" "}
                          {selectedFamily.fileNumber}
                        </div>
                      ) : (
                        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">
                          لا توجد عائلة بهذا الرقم
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    صنف المساعدة
                  </label>
                  <select
                    value={distForm.aidTypeId}
                    onChange={(e) =>
                      setDistForm({
                        ...distForm,
                        aidTypeId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5"
                  >
                    <option value="">اختر الصنف</option>

                    {aidTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الكمية
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={distForm.quantity}
                      onChange={(e) =>
                        setDistForm({
                          ...distForm,
                          quantity: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      تاريخ التوزيع
                    </label>
                    <input
                      type="date"
                      value={distForm.distributionDate}
                      onChange={(e) =>
                        setDistForm({
                          ...distForm,
                          distributionDate: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ملاحظات
                  </label>
                  <textarea
                    value={distForm.notes}
                    onChange={(e) =>
                      setDistForm({ ...distForm, notes: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                    rows={2}
                    placeholder="ملاحظات اختيارية..."
                  />
                </div>
                {distErrorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <span className="font-bold">⚠️</span>

                    <span className="flex-1 leading-6">{distErrorMessage}</span>

                    <button
                      type="button"
                      onClick={() => setDistErrorMessage("")}
                      className="text-red-400 hover:text-red-600 text-lg leading-none"
                      aria-label="إغلاق"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDistErrorMessage("");
                      setShowAddDist(false);
                    }}
                    className="flex-1 border border-gray-200 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition"
                  >
                    تسجيل التوزيع
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {showBulkDist &&
        createPortal(
          <div
            className="
      fixed inset-0 z-[9999]
bg-black/50
      backdrop-blur-sm
      flex items-center justify-center
      p-4
    "
          >
            <div
              className="
        relative
        w-full max-w-lg
        max-h-[calc(100vh-2rem)]
        bg-white
        rounded-3xl
        shadow-2xl
        overflow-hidden
        flex flex-col
      "
            >
              {/* Header */}
              <div className="gradient-green px-6 py-6 text-white relative shrink-0 min-h-[120px]">
                <button
                  type="button"
                  onClick={() => {
                    setBulkErrorMessage("");
                    setShowBulkDist(false);
                  }}
                  className="
            absolute left-4 top-4
            w-9 h-9
            rounded-xl
            flex items-center justify-center
            text-white/80
            hover:text-white
            hover:bg-white/10
            transition-all
          "
                  aria-label="إغلاق"
                >
                  ×
                </button>

                <div className="text-center px-8 pt-1">
                  <div
                    className="
    mx-auto mb-2
    w-11 h-11
    shrink-0
    rounded-2xl
    bg-white/15
    flex items-center justify-center
  "
                  >
                    <Users className="w-5 h-5" />
                  </div>

                  <h2 className="text-xl font-black">توزيع جماعي للمساعدات</h2>

                  <p className="text-sm text-green-100 mt-1">
                    توزيع نفس المساعدة لجميع الأسر النشطة
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
                {/* Aid Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    صنف المساعدة
                  </label>

                  <select
                    value={bulkForm.aidTypeId}
                    onChange={(e) =>
                      setBulkForm({
                        ...bulkForm,
                        aidTypeId: e.target.value,
                      })
                    }
                    className="
              w-full
              border border-gray-200
              rounded-xl
              px-4 py-3
              text-sm
              bg-gray-50
              text-gray-700
              focus:outline-none
              focus:ring-2
              focus:ring-green-400
              focus:border-green-400
              transition
            "
                  >
                    <option value="">اختر الصنف</option>

                    {aidTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      الكمية لكل أسرة
                    </label>

                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: 1"
                      value={bulkForm.quantity}
                      onChange={(e) =>
                        setBulkForm({
                          ...bulkForm,
                          quantity: e.target.value,
                        })
                      }
                      className="
                w-full
                border border-gray-200
                rounded-xl
                px-4 py-3
                text-sm
                bg-gray-50
                focus:outline-none
                focus:ring-2
                focus:ring-green-400
                focus:border-green-400
                transition
              "
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      تاريخ التوزيع
                    </label>

                    <input
                      type="date"
                      value={bulkForm.distributionDate}
                      onChange={(e) =>
                        setBulkForm({
                          ...bulkForm,
                          distributionDate: e.target.value,
                        })
                      }
                      className="
                w-full
                border border-gray-200
                rounded-xl
                px-4 py-3
                text-sm
                bg-gray-50
                focus:outline-none
                focus:ring-2
                focus:ring-green-400
                focus:border-green-400
                transition
              "
                    />
                  </div>
                </div>

                {/* Beneficiaries */}
                <div
                  className="
            rounded-2xl
            border border-green-100
            bg-green-50
            px-5 py-4
          "
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">
                        عدد الأسر المستفيدة
                      </p>

                      <p className="text-3xl font-black text-green-700 mt-1">
                        {activeFamilies.length}
                      </p>

                      <p className="text-xs text-green-700 mt-1">أسرة نشطة</p>
                    </div>

                    <div
                      className="
                w-12 h-12
                rounded-2xl
                bg-white
                border border-green-100
                flex items-center justify-center
                shadow-sm
              "
                    >
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Notice */}
                <div
                  className="
            rounded-xl
            border border-amber-200
            bg-amber-50
            px-4 py-3
          "
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">⚠️</span>

                    <p className="text-sm leading-6 text-amber-700">
                      سيتم إنشاء سجل توزيع مستقل لكل أسرة نشطة.
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ملاحظات
                  </label>

                  <textarea
                    rows={3}
                    value={bulkForm.notes}
                    onChange={(e) =>
                      setBulkForm({
                        ...bulkForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="أدخل أي ملاحظات مرتبطة بعملية التوزيع..."
                    className="
              w-full
              border border-gray-200
              rounded-xl
              px-4 py-3
              text-sm
              bg-gray-50
              resize-none
              focus:outline-none
              focus:ring-2
              focus:ring-green-400
              focus:border-green-400
              transition
            "
                  />
                </div>
              </div>

              {bulkErrorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="font-bold">⚠️</span>
                  <span className="flex-1 leading-6">{bulkErrorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setBulkErrorMessage("")}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                    aria-label="إغلاق"
                  >
                    ×
                  </button>
                </div>
              )}
              {/* Footer */}
              <div
                className="
          shrink-0
          border-t border-gray-100
          bg-white
          px-5 py-4
          sm:px-6
        "
              >
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkErrorMessage("");
                      setShowBulkDist(false);
                    }}
                    className="
              w-full
              border border-gray-200
              bg-white
              text-gray-700
              rounded-xl
              py-3
              font-bold text-sm
              hover:bg-gray-50
              hover:border-gray-300
              transition-all
            "
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDistribution}
                    className="
              w-full
              gradient-green
              text-white
              rounded-xl
              py-3
              font-bold text-sm
              shadow-sm
              hover:shadow-md
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all
            "
                  >
                    تنفيذ التوزيع
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Add AidType Modal */}
      {showAddType &&
        createPortal(
          <div
            className="
fixed
inset-0
bg-black/40
backdrop-blur-sm
flex
items-center
justify-center
z-[9999]
p-4
animate-fadeIn
"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] relative overflow-hidden flex flex-col">
              <div className="gradient-green px-5 py-4 rounded-t-2xl flex items-center justify-between">
                <h3 className="text-white font-bold">إضافة صنف مساعدة جديد</h3>
                <button
                  onClick={() => setShowAddType(false)}
                  className="text-white/70 hover:text-white"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleAddType}
                className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    اسم الصنف
                  </label>
                  <input
                    type="text"
                    required
                    value={typeForm.name}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, name: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    placeholder="مثال: سلة غذائية شهرية"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      التصنيف
                    </label>
                    <select
                      required
                      value={typeForm.category}
                      onChange={(e) =>
                        setTypeForm({
                          ...typeForm,
                          category: e.target.value as AidType["category"],
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    >
                      <option value="food">غذائية</option>
                      <option value="medical">طبية</option>
                      <option value="financial">مالية</option>
                      <option value="clothing">ملابس</option>
                      <option value="household">منزلية</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      وحدة القياس
                    </label>
                    <input
                      type="text"
                      required
                      value={typeForm.unit}
                      onChange={(e) =>
                        setTypeForm({ ...typeForm, unit: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                      placeholder="مثال: سلة، كيس، دولار"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    الوصف
                  </label>
                  <textarea
                    value={typeForm.description}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, description: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                    rows={2}
                    placeholder="وصف مختصر للصنف..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition"
                  >
                    حفظ الصنف
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddType(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {deleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="bg-gradient-to-l from-red-600 to-red-500 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Trash2 size={22} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">تأكيد الحذف</h3>

                    <p className="text-sm text-white/80 mt-1">
                      يرجى مراجعة العملية قبل المتابعة
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-gray-800 font-semibold leading-7">
                    {deleteConfirm.type === "distribution"
                      ? "هل أنت متأكد من حذف سجل التوزيع؟"
                      : "هل أنت متأكد من حذف صنف المساعدة؟"}
                  </p>

                  <p className="text-sm text-gray-500 mt-2 leading-6">
                    سيتم تنفيذ العملية وتحديث البيانات المعروضة في النظام.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={
                      deleteConfirm.type === "distribution"
                        ? confirmDeleteDist
                        : confirmDeleteType
                    }
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Edit AidType Modal */}
      {editingAidType &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] relative overflow-hidden flex flex-col">
              <div className="gradient-green px-5 py-4 rounded-t-2xl flex items-center justify-between">
                <h3 className="text-white font-bold">تعديل صنف المساعدة</h3>

                <button
                  type="button"
                  onClick={() => setEditingAidType(null)}
                  className="text-white/70 hover:text-white"
                >
                  ×
                </button>
              </div>

              <form className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    اسم الصنف
                  </label>

                  <input
                    type="text"
                    required
                    value={typeForm.name}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      التصنيف
                    </label>

                    <select
                      required
                      value={typeForm.category}
                      onChange={(e) =>
                        setTypeForm({
                          ...typeForm,
                          category: e.target.value as AidType["category"],
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    >
                      <option value="food">غذائية</option>
                      <option value="medical">طبية</option>
                      <option value="financial">مالية</option>
                      <option value="clothing">ملابس</option>
                      <option value="household">منزلية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      وحدة القياس
                    </label>

                    <input
                      type="text"
                      required
                      value={typeForm.unit}
                      onChange={(e) =>
                        setTypeForm({
                          ...typeForm,
                          unit: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    الوصف
                  </label>

                  <textarea
                    value={typeForm.description}
                    onChange={(e) =>
                      setTypeForm({
                        ...typeForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAidType(null)}
                    className="flex-1 border border-gray-200 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateType}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      {editingDistribution &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] relative overflow-hidden flex flex-col">
              {/* Header */}
              <div className="gradient-green px-5 py-5 rounded-t-2xl flex items-center justify-between shrink-0 min-h-[72px]">
                <h3 className="text-white font-bold text-base">
                  تعديل سجل التوزيع
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    setDistErrorMessage("");
                    setEditingDistribution(null);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* الأسرة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    اسم رب الأسرة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-700">
                    {editingDistribution.familyName} -{" "}
                    {editingDistribution.fileNumber}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    رقم هوية رب الأسرة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-700 font-mono">
                    {editingDistribution.headNationalId}
                  </div>
                </div>
                {distErrorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="font-semibold mb-1">تعذر تنفيذ العملية</div>
                    <div>{distErrorMessage}</div>
                  </div>
                )}

                {/* نوع المساعدة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    نوع المساعدة
                  </label>

                  <select
                    value={editingDistribution.aidTypeId}
                    onChange={(e) =>
                      setEditingDistribution({
                        ...editingDistribution,
                        aidTypeId: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                  >
                    <option value="">اختر الصنف</option>

                    {aidTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* الكمية + تاريخ التوزيع */}
                <div className="grid grid-cols-2 gap-3">
                  {/* الكمية */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الكمية
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={editingDistribution.quantity}
                      onChange={(e) =>
                        setEditingDistribution({
                          ...editingDistribution,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    />
                  </div>

                  {/* التاريخ */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      تاريخ التوزيع
                    </label>

                    <input
                      type="date"
                      value={
                        editingDistribution.distributionDate
                          ? (() => {
                              const date = new Date(
                                editingDistribution.distributionDate,
                              );
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1,
                              ).padStart(2, "0");
                              const day = String(date.getDate()).padStart(
                                2,
                                "0",
                              );

                              return `${year}-${month}-${day}`;
                            })()
                          : ""
                      }
                      onChange={(e) =>
                        setEditingDistribution({
                          ...editingDistribution,
                          distributionDate: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    />
                  </div>
                </div>

                {/* الملاحظات */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    الملاحظات
                  </label>

                  <textarea
                    value={editingDistribution.notes || ""}
                    onChange={(e) =>
                      setEditingDistribution({
                        ...editingDistribution,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="ملاحظات اختيارية..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingDistribution(null)}
                    className="w-full border border-gray-200 bg-white text-gray-700 rounded-xl py-3 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateDistribution}
                    className="w-full gradient-green text-white rounded-xl py-3 font-bold text-sm shadow-sm hover:shadow-md transition-all"
                  >
                    حفظ التعديل
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {selectedDistribution &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="gradient-green px-5 py-5 rounded-t-2xl flex items-center justify-between shrink-0 min-h-[72px]">
                <h3 className="text-white font-bold text-base">
                  تفاصيل التوزيع
                </h3>

                <button
                  type="button"
                  onClick={() => setSelectedDistribution(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* العائلة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    اسم رب الأسرة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700">
                    {selectedDistribution.familyName}
                  </div>
                </div>

                {/* رقم الملف */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    رقم ملف رب الأسرة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700 font-mono">
                    {selectedDistribution.fileNumber}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    رقم هوية رب الأسرة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700 font-mono">
                    {selectedDistribution.headNationalId}
                  </div>
                </div>

                {/* نوع المساعدة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    نوع المساعدة
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700">
                    {selectedDistribution.aidTypeName}
                  </div>
                </div>

                {/* الكمية + التاريخ */}
                <div className="grid grid-cols-2 gap-3">
                  {/* الكمية */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الكمية
                    </label>

                    <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700">
                      {selectedDistribution.quantity}{" "}
                      {selectedDistribution.unit}
                    </div>
                  </div>

                  {/* التاريخ */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      تاريخ التوزيع
                    </label>

                    <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700 whitespace-nowrap">
                      {new Date(
                        selectedDistribution.distributionDate,
                      ).toLocaleDateString("ar-IQ")}
                    </div>
                  </div>
                </div>

                {/* المشرف */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    المشرف
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-700">
                    {selectedDistribution.supervisorName || "غير محدد"}
                  </div>
                </div>

                {/* الملاحظات */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    الملاحظات
                  </label>

                  <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-700 min-h-[72px] leading-7">
                    {selectedDistribution.notes || "لا توجد ملاحظات"}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDistribution(null)}
                    className="w-full border border-gray-200 bg-white text-gray-700 rounded-xl py-3 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
