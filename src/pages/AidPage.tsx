import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Gift, Package, User2, Trash2, Search, Info } from "lucide-react";
import type { AidDistribution, AidType } from "../types";

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
    currentUser,
    addAuditLog,
  } = useApp();
  const [activeTab, setActiveTab] = useState<"distributions" | "types">(
    "distributions",
  );
  const [showBulkDist, setShowBulkDist] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
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
  const [successMessage, setSuccessMessage] = useState("");

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
  const handleAddDistribution = (e: React.FormEvent) => {
    e.preventDefault();
    const family = families.find(
      (f) => String(f.headNationalId) === String(distForm.headNationalId),
    );
    if (!family) {
      alert("رقم هوية رب الأسرة غير موجود");
      return;
    }

    if (!family) return;
    const aidType = aidTypes.find((at) => at.id === distForm.aidTypeId)!;
    const newDist: AidDistribution = {
      id: `ad_${Date.now()}`,
      familyId: family.id,
      headNationalId: family.headNationalId,
      familyName: family.headName,
      fileNumber: family.fileNumber,
      aidTypeId: aidType.id,
      aidTypeName: aidType.name,
      quantity: Number(distForm.quantity),
      unit: aidType.unit,
      distributionDate: distForm.distributionDate,
      supervisorId: currentUser!.id,
      supervisorName: currentUser!.name,
      notes: distForm.notes,
      createdAt: new Date().toISOString(),
    };
    setAidDistributions((prev) => [newDist, ...prev]);
    setSuccessMessage("تم تسجيل التوزيع بنجاح");

    setTimeout(() => {
      setSuccessMessage("");
    }, 2500);
    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "add",
      target: "توزيع مساعدات",
      targetId: newDist.id,
      details: `تسجيل توزيع: ${aidType.name} لعائلة ${family.headName} - ${family.fileNumber}`,
    });
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

  const handleBulkDistribution = () => {
    if (!bulkForm.aidTypeId) {
      alert("يرجى اختيار صنف المساعدة");
      return;
    }

    const aidType = aidTypes.find((at) => at.id === bulkForm.aidTypeId);

    if (!aidType) return;

    const today = new Date().toISOString();

    const newDistributions: AidDistribution[] = activeFamilies.map(
      (family) => ({
        id: `ad_${Date.now()}_${family.id}`,

        familyId: family.id,

        headNationalId: family.headNationalId,

        familyName: family.headName,

        fileNumber: family.fileNumber,

        aidTypeId: aidType.id,

        aidTypeName: aidType.name,

        quantity: Number(bulkForm.quantity),

        unit: aidType.unit,

        distributionDate: bulkForm.distributionDate,

        supervisorId: currentUser!.id,

        supervisorName: currentUser!.name,

        notes: bulkForm.notes,

        createdAt: today,
      }),
    );

    setAidDistributions((prev) => [...newDistributions, ...prev]);
    setSuccessMessage(
      `تم توزيع ${aidType.name} على ${activeFamilies.length} أسرة`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 2500);

    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "add",
      target: "توزيع جماعي",
      targetId: `bulk_${Date.now()}`,
      details: `تم توزيع ${aidType.name} على ${activeFamilies.length} أسرة`,
    });

    setBulkForm({
      aidTypeId: "",
      quantity: "1",
      distributionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });

    setShowBulkDist(false);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    const newType: AidType = {
      id: `at_${Date.now()}`,
      ...typeForm,
      createdAt: new Date().toISOString(),
    };
    setAidTypes((prev) => [...prev, newType]);
    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "add",
      target: "صنف مساعدة",
      details: `إضافة صنف مساعدة: ${typeForm.name}`,
    });
    setTypeForm({ name: "", category: "food", description: "", unit: "" });
    setShowAddType(false);
  };
  const handleDeleteType = (typeId: string) => {
    if (!window.confirm("هل تريد حذف الصنف وكل التوزيعات المرتبطة به؟")) {
      return;
    }

    // حذف الصنف
    setAidTypes((prev) => prev.filter((t) => t.id !== typeId));

    // حذف جميع التوزيعات التابعة له
    setAidDistributions((prev) => prev.filter((d) => d.aidTypeId !== typeId));

    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "delete",
      target: "صنف مساعدة",
      targetId: typeId,
      details: "تم حذف الصنف وجميع التوزيعات التابعة له",
    });
  };

  const handleDeleteDist = (id: string) => {
    const dist = aidDistributions.find((d) => d.id === id)!;
    setAidDistributions((prev) => prev.filter((d) => d.id !== id));
    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "delete",
      target: "توزيع مساعدات",
      targetId: id,
      details: `حذف سجل توزيع: ${dist.aidTypeName} - ${dist.fileNumber}`,
    });
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "إجمالي التوزيعات",
            value: stats.totalDist,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "أصناف المساعدات",
            value: stats.totalTypes,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "مساعدات غذائية",
            value: stats.food,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "مساعدات طبية",
            value: stats.medical,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "مساعدات مالية",
            value: stats.financial,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.bg} rounded-xl p-3 text-center border border-white shadow-sm`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center border-b border-gray-100 px-4">
          {[
            { id: "distributions", label: "سجل التوزيعات", icon: Gift },
            { id: "types", label: "أصناف المساعدات", icon: Package },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-4 border-b-2 font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? "border-green-500 text-green-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "distributions" && (
          <div>
            {successMessage && (
              <div className="mx-4 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 font-medium">
                ✅ {successMessage}
              </div>
            )}
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchDist}
                  onChange={(e) => setSearchDist(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddDist(true)}
                  className="flex items-center gap-2 gradient-green text-white px-4 py-2.5 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  تسجيل توزيع
                </button>

                <button
                  onClick={() => setShowBulkDist(true)}
                  className="
flex
items-center
gap-2
bg-green-700
hover:bg-green-800
text-white
px-5
py-2.5
rounded-xl
font-semibold
shadow-sm
hover:shadow-md
transition-all
duration-300
"
                >
                  <span className="text-sm">👪</span>

                  <span>توزيع جماعي</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right px-4 py-3 font-bold text-gray-700">
                      العائلة
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">
                      صنف المساعدة
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">
                      الكمية
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">
                      تاريخ التوزيع
                    </th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">
                      المشرف
                    </th>
                    {currentUser?.role === "admin" && (
                      <th className="text-right px-4 py-3 font-bold text-gray-700">
                        حذف
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
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
                        <tr key={dist.id} className="table-row-hover">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800">
                              {dist.familyName}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {dist.fileNumber}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-700">
                                {dist.aidTypeName}
                              </p>
                              {aidType && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${categoryColors[aidType.category]}`}
                                >
                                  {categoryLabels[aidType.category]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-800">
                              {dist.quantity}
                            </span>
                            <span className="text-gray-400 text-xs mr-1">
                              {dist.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {new Date(dist.distributionDate).toLocaleDateString(
                              "ar-IQ",
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <User2 className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="text-xs text-gray-600">
                                {dist.supervisorName}
                              </span>
                            </div>
                          </td>
                          {currentUser?.role === "admin" && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedDistribution(dist)}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="عرض التفاصيل"
                                >
                                  <Info className="w-4 h-4" />
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
            <div className="flex items-center justify-end p-4 border-b border-gray-50">
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => setShowAddType(true)}
                  className="flex items-center gap-2 gradient-green text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-green-200"
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
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Gift className="w-5 h-5 text-green-600" />
                    </div>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="
    w-8 h-8
    rounded-lg
    bg-red-50
    text-red-500
    hover:bg-red-100
    hover:text-red-700
    flex items-center justify-center
    transition-all
  "
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span
                      className={`text-xs px-2 py-1 rounded-lg font-semibold ${categoryColors[type.category]}`}
                    >
                      {categoryLabels[type.category]}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-800 mb-1">{type.name}</h4>
                  {type.description && (
                    <p className="text-xs text-gray-500 mb-2">
                      {type.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Package className="w-3.5 h-3.5" />
                    <span>
                      الوحدة:{" "}
                      <span className="font-semibold text-gray-600">
                        {type.unit}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                    <span>
                      التوزيعات:{" "}
                      {
                        aidDistributions.filter((d) => d.aidTypeId === type.id)
                          .length
                      }
                    </span>
                    <span>
                      {new Date(type.createdAt).toLocaleDateString("ar-IQ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Distribution Modal */}
      {showAddDist && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full fade-in">
            <div className="gradient-green px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">تسجيل توزيع مساعدة</h3>
              <button
                onClick={() => setShowAddDist(false)}
                className="text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddDistribution} className="p-5 space-y-4">
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
                        {selectedFamily.headName} — {selectedFamily.fileNumber}
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
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDist(false)}
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
        </div>
      )}
      {showBulkDist && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative mx-auto my-10 w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 text-white relative">
              <button
                onClick={() => setShowBulkDist(false)}
                className="absolute left-5 top-5 text-white hover:opacity-80 text-xl"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-center">
                توزيع جماعي للمساعدات
              </h2>

              <p className="text-center text-green-100 text-sm mt-1">
                توزيع نفس المساعدة لجميع الأسر النشطة
              </p>
            </div>

            {/* Body */}

            <div className="p-4 space-y-5">
              {/* Aid Type */}

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-green-500"
                >
                  <option value="">اختر الصنف</option>

                  {aidTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  الكمية لكل أسرة
                </label>

                <input
                  type="number"
                  placeholder="مثال : 1"
                  value={bulkForm.quantity}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      quantity: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Date */}

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Families */}

              <div className="rounded-xl border border-green-100 bg-green-50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">عدد الأسر المستفيدة</p>

                    <p className="text-3xl font-bold text-green-700 mt-1">
                      {activeFamilies.length}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">
                    👨‍👩‍👧
                  </div>
                </div>
              </div>

              {/* Alert */}

              <div className="rounded-xl border border-amber-200 bg-amber-50 py-3 px-4">
                <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
                  <span>⚠️</span>

                  <span>سيتم إنشاء سجل توزيع مستقل لكل أسرة</span>
                </div>
              </div>
            </div>

            {/* Footer */}

            <div className="px-6 pb-6">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الجهة المانحة / ملاحظات
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
                  placeholder="مثال: اكتب تفاصيل عملية التوزيع.."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleBulkDistribution}
                  className="bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-bold transition"
                >
                  تنفيذ التوزيع الجماعي
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkDist(false)}
                  className="border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add AidType Modal */}
      {showAddType && (
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full fade-in">
            <div className="gradient-green px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">إضافة صنف مساعدة جديد</h3>
              <button
                onClick={() => setShowAddType(false)}
                className="text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddType} className="p-5 space-y-4">
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  placeholder="اكتب اسم الجهة المانحة أو أي ملاحظة..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 resize-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkDist(false)}
                  className="..."
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition"
                >
                  تنفيذ التوزيع الجماعي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDistribution && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">تفاصيل التوزيع</h2>

              <button
                onClick={() => setSelectedDistribution(null)}
                className="text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">العائلة</span>
                <span className="font-semibold">
                  {selectedDistribution.familyName}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">رقم الملف</span>
                <span className="font-semibold">
                  {selectedDistribution.fileNumber}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">نوع المساعدة</span>
                <span className="font-semibold">
                  {selectedDistribution.aidTypeName}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">الكمية</span>
                <span className="font-semibold">
                  {selectedDistribution.quantity} {selectedDistribution.unit}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">تاريخ التوزيع</span>
                <span className="font-semibold">
                  {selectedDistribution.distributionDate}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">المشرف</span>
                <span className="font-semibold">
                  {selectedDistribution.supervisorName}
                </span>
              </div>

              <div>
                <div className="text-gray-500 mb-2">الملاحظات</div>

                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-gray-700 leading-7">
                  {selectedDistribution.notes || "لا توجد ملاحظات"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
