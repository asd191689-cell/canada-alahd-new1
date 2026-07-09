import { api } from "../api/apiClient";
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  Users,
  FileText,
  MapPin,
  Phone,
  Heart,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import type { Family, Document } from "../types";

const healthLabel = {
  healthy: {
    label: "جيدة",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  sick: {
    label: "مريض",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertCircle,
  },
  disabled: {
    label: "إعاقة",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

export default function FamiliesPage() {
  const { families, setFamilies, currentUser, addAuditLog } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "deleted">("active");
  const [healthFilter, setHealthFilter] = useState<
    "all" | "healthy" | "sick" | "disabled"
  >("all");
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const loadFamilies = async () => {
    try {
      const data = await api.get("/families");

      setFamilies(data.families || []);
    } catch (error) {
      console.error("LOAD FAMILIES ERROR:", error);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  const filtered = families.filter((f) => {
    const matchSearch =
      f.headName.toLowerCase().includes(search.toLowerCase()) ||
      f.fileNumber.toLowerCase().includes(search.toLowerCase()) ||
      f.headNationalId.includes(search) ||
      f.originGovernorate.includes(search);
    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? !f.isDeleted
          : f.isDeleted;
    const matchHealth =
      healthFilter === "all" ? true : f.headHealthStatus === healthFilter;
    return matchSearch && matchFilter && matchHealth;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedFamilies = filtered.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm("هل تريد حذف العائلة؟")) return;

    try {
      await api.delete(`/families/${id}`);

      await loadFamilies();

      alert("تم حذف الأسرة بنجاح");
    } catch (error) {
      console.error(error);

      alert("فشل حذف الأسرة");
    }
  };
  const handleSoftDelete = async (id: number) => {
    setFamilies((prev) => {
      const activeFamilies = prev.filter((f) => !f.isDeleted && f.id !== id);

      const deletedFamily = prev.find((f) => f.id === id);

      const updatedFamilies = [
        ...activeFamilies.map((f, index) => ({
          ...f,
          fileNumber: `CA-${String(index + 1).padStart(4, "0")}`,
        })),

        {
          ...deletedFamily!,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        },
      ];

      return updatedFamilies;
    });

    const family = families.find((f) => f.id === id);

    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "delete",
      target: "عائلة",
      targetId: id,
      details: `حذف ناعم لعائلة: ${family?.headName} - ${family?.fileNumber}`,
    });

    setShowDeleteConfirm(null);
  };
  const handleRestore = async (id: number) => {
    setFamilies((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, isDeleted: false, deletedAt: undefined } : f,
      ),
    );
    const family = families.find((f) => f.id === id)!;
    addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      action: "restore",
      target: "عائلة",
      targetId: id,
      details: `استعادة عائلة: ${family.headName} - ${family.fileNumber}`,
    });
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            إدارة العائلات والأفراد
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            إجمالي: {families.filter((f) => !f.isDeleted).length} عائلة نشطة
          </p>
        </div>
        <Link
          to="/families/new"
          className="flex items-center gap-2 gradient-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-green-200"
        >
          <Plus className="w-4 h-4" />
          تسجيل عائلة جديدة
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، رقم الملف، رقم الهوية، المحافظة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            {(["active", "all", "deleted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f
                    ? "bg-white shadow text-green-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "active" ? "النشطة" : f === "all" ? "الكل" : "المحذوفة"}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={healthFilter}
              onChange={(e) =>
                setHealthFilter(e.target.value as typeof healthFilter)
              }
              className="appearance-none border border-gray-200 rounded-xl py-2.5 px-4 pr-4 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 text-gray-700"
            >
              <option value="all">جميع الحالات</option>
              <option value="healthy">بصحة جيدة</option>
              <option value="sick">مريض</option>
              <option value="disabled">إعاقة</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "إجمالي العائلات",
            value: families.filter((f) => !f.isDeleted).length,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "إجمالي الأفراد",
            value: families
              .filter((f) => !f.isDeleted)
              .reduce((s, f) => s + Number(f.membersCount || 1), 0),
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "ذوو الإعاقات",
            value:
              families.filter(
                (f) => !f.isDeleted && f.headHealthStatus === "disabled",
              ).length +
              families
                .filter((f) => !f.isDeleted)
                .reduce(
                  (s, f) =>
                    s +
                    (f.members ?? []).filter(
                      (m) => m.healthStatus === "disabled",
                    ).length,
                  0,
                ),
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "الأطفال (أقل 12)",
            value: families
              .filter((f) => !f.isDeleted)
              .reduce(
                (s, f) =>
                  s + (f.members || []).filter((m) => m.age < 12).length,
                0,
              ),
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.bg} rounded-xl p-3 text-center border border-white`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  رقم الملف
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  رب الأسرة
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  عدد الأفراد
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  المحافظة
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  الحالة الصحية
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  تاريخ الدخول
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  الحالة
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">لا توجد نتائج</p>
                  </td>
                </tr>
              ) : (
                paginatedFamilies.map((family) => {
                  console.log("Family object:", family);
                  console.log("headHealthStatus:", family.headHealthStatus);
                  console.log("healthLabel:", healthLabel);
                  const health =
                    healthLabel[
                      family.headHealthStatus as keyof typeof healthLabel
                    ] ?? healthLabel.healthy;

                  const HealthIcon = health.icon;
                  return (
                    <tr
                      key={family.id}
                      className={`table-row-hover ${family.isDeleted ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg text-xs">
                          {family.fileNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="
    w-12 h-12
    rounded-full
    overflow-hidden
    flex items-center justify-center
    bg-gradient-to-br from-green-500 to-emerald-700
    shadow-md
    border-2 border-white
    ring-2 ring-green-100
    transition-all duration-300
    hover:scale-105
  "
                          >
                            {family.photoUrl ? (
                              <img
                                src={family.photoUrl}
                                alt={family.headName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-xs">
                                {family.headName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {family.headName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {family.headNationalId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-700">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold">
                            {family.membersCount ?? family.members?.length ?? 1}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {family.originGovernorate}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${health.color}`}
                        >
                          <HealthIcon className="w-3 h-3" />
                          {health.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(family.entryDate).toLocaleDateString("ar-IQ")}
                      </td>
                      <td className="px-4 py-3">
                        {family.isDeleted ? (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold">
                            محذوف
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                            نشط
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedFamily(family);
                              setShowModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!family.isDeleted && (
                            <>
                              <Link
                                to={`/families/edit/${family.id}`}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              {currentUser?.role === "admin" && (
                                <button
                                  onClick={() =>
                                    setShowDeleteConfirm(family.id)
                                  }
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {family.isDeleted && (
                            <button
                              onClick={() => handleRestore(family.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="استعادة"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-center gap-3 py-6 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`
      px-5 py-2.5 rounded-xl font-medium transition-all duration-300
      ${
        currentPage === 1
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-300 shadow-sm"
      }
    `}
            >
              السابق
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`
          w-10 h-10 rounded-xl font-semibold transition-all duration-300
          ${
            currentPage === i + 1
              ? "bg-green-600 text-white shadow-md scale-105"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600"
          }
        `}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`
      px-5 py-2.5 rounded-xl font-medium transition-all duration-300
      ${
        currentPage === totalPages
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-300 shadow-sm"
      }
    `}
            >
              التالي
            </button>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>
            عرض {filtered.length} من {families.length} سجل
          </span>
          <span>آخر تحديث: {new Date().toLocaleTimeString("ar-IQ")}</span>
        </div>
      </div>

      {/* Family Detail Modal */}
      {showModal && selectedFamily && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gradient-green p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black text-lg">
                    {selectedFamily.headName}
                  </h3>
                  <p className="text-green-200 text-sm">
                    {selectedFamily.fileNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "رقم الهوية",
                    value: selectedFamily.headNationalId,
                    icon: FileText,
                  },
                  {
                    label: "الهاتف",
                    value: selectedFamily.headPhone,
                    icon: Phone,
                  },
                  {
                    label: "المحافظة",
                    value: `${selectedFamily.originGovernorate} - ${selectedFamily.originCity}`,
                    icon: MapPin,
                  },
                  {
                    label: "العنوان الحالي",
                    value: selectedFamily.currentAddress,
                    icon: MapPin,
                  },
                  {
                    label: "تاريخ الدخول",
                    value: new Date(
                      selectedFamily.entryDate,
                    ).toLocaleDateString("ar-IQ"),
                    icon: FileText,
                  },
                  {
                    label: "عدد الأفراد",
                    value: `${selectedFamily.membersCount ?? selectedFamily.members?.length ?? 1} أفراد`,
                    icon: Users,
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {selectedFamily.members.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    أفراد الأسرة
                  </h4>
                  <div className="space-y-2">
                    {selectedFamily.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Heart className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-800">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {member.relation === "wife"
                              ? "زوجة"
                              : member.relation === "son"
                                ? "ابن"
                                : member.relation === "daughter"
                                  ? "ابنة"
                                  : "أخرى"}
                            {" • "}
                            {member.age} سنة
                            {member.disability && ` • ${member.disability}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                            member.healthStatus === "healthy"
                              ? "bg-green-100 text-green-700"
                              : member.healthStatus === "sick"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {member.healthStatus === "healthy"
                            ? "جيدة"
                            : member.healthStatus === "sick"
                              ? "مريض"
                              : "إعاقة"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">
                  المستندات
                </h3>

                {selectedFamily.documents?.length ? (
                  <div className="space-y-2">
                    {selectedFamily.documents.map((doc: Document) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50"
                      >
                        <span className="text-sm">📄 {doc.name}</span>

                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-600 text-sm"
                        >
                          عرض
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">لا توجد مستندات</p>
                )}
              </div>
              {selectedFamily.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-600 font-semibold mb-1">
                    ملاحظات:
                  </p>
                  <p className="text-sm text-yellow-800">
                    {selectedFamily.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                تأكيد الحذف
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                سيتم حذف العائلة بشكل ناعم مع الحفاظ على السجل التاريخي. يمكن
                استعادتها لاحقاً.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleSoftDelete(showDeleteConfirm)}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  حذف مؤقت
                </button>
                <button
                  onClick={() => handlePermanentDelete(showDeleteConfirm)}
                  className="px-6 py-2.5 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
