import { api } from "../api/apiClient";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  Users,
  UserRound,
  Baby,
  FileText,
  MapPin,
  Phone,
  Heart,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
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
  const { families, setFamilies, currentUser } = useApp();
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
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<
    number | null
  >(null);
  const loadFamilies = async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const data = await api.get("/families");

      setFamilies(data.families || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("LOAD FAMILIES ERROR:", error);

      setLoadError(true);
      toast.error("تعذر تحميل بيانات العائلات");
    } finally {
      setLoading(false);
    }
  };

  const previewFamilyDocument = async (doc: Document) => {
    setPreviewingDocumentId(doc.id);

    const startTime = Date.now();

    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      setPreviewingDocumentId(null);

      toast.error("يرجى السماح بفتح النوافذ الجديدة في المتصفح.");
      return;
    }

    // نعرض للمستخدم أن المعاينة قيد التحميل
    previewWindow.document.write(`
    <html>
      <head>
        <title>جاري تحميل الوثيقة...</title>
      </head>

      <body style="
        margin:0;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        font-family:Arial,sans-serif;
      ">
        <div style="text-align:center;">
          <div style="font-size:18px;margin-bottom:12px;">
            جاري تحميل الوثيقة...
          </div>

          <div style="font-size:14px;color:#666;">
            يرجى الانتظار
          </div>
        </div>
      </body>
    </html>
  `);

    previewWindow.document.close();

    try {
      const blob = await api.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });

      // لا نخلي الزر يومض بسرعة إذا كان الملف صغير
      const elapsed = Date.now() - startTime;
      const minimumLoadingTime = 500;

      if (elapsed < minimumLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumLoadingTime - elapsed),
        );
      }

      const url = window.URL.createObjectURL(blob);

      previewWindow.location.href = url;

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      previewWindow.close();

      console.error("PREVIEW FAMILY DOCUMENT ERROR:", error);

      toast.error("تعذر معاينة الوثيقة.");
    } finally {
      setPreviewingDocumentId(null);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  const filtered = families.filter((f) => {
    const matchSearch =
      (f.headName || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.fileNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.headNationalId || "").includes(search) ||
      (f.originGovernorate || "").includes(search);
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

  const itemsPerPage = 5;

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedFamilies = filtered.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  const handleSoftDelete = async (id: number) => {
    try {
      await api.delete(`/families/${id}`);

      await loadFamilies();

      setShowDeleteConfirm(null);

      toast.success("تم حذف العائلة بنجاح");
    } catch (error) {
      console.error("DELETE FAMILY ERROR:", error);

      toast.error("تعذر حذف العائلة");
    }
  };
  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/families/${id}/restore`);

      await loadFamilies();

      toast.success("تم استعادة العائلة بنجاح");
    } catch (error) {
      console.error("RESTORE FAMILY ERROR:", error);

      toast.error("تعذر استعادة العائلة");
    }
  };
  const handlePermanentDelete = async (id: number) => {
    try {
      await api.delete(`/families/${id}/permanent`);

      await loadFamilies();

      setShowPermanentDeleteConfirm(null);

      toast.success("تم حذف العائلة نهائيًا");
    } catch (error) {
      console.error("PERMANENT DELETE FAMILY ERROR:", error);

      const message =
        error instanceof Error ? error.message : "تعذر حذف العائلة نهائيًا.";

      toast.error(message);

      setShowPermanentDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* ================================
        Page Header
    ================================= */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            إدارة العائلات والأفراد
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            إدارة بيانات العائلات والأفراد المسجلين في النظام
          </p>
        </div>

        <Link
          to="/families/new"
          className="
          inline-flex items-center justify-center gap-2
          gradient-green
          text-white
          px-5 py-3
          rounded-xl
          font-bold text-sm
          shadow-md shadow-green-200
          hover:shadow-lg hover:shadow-green-200
          hover:-translate-y-0.5
          active:translate-y-0
          transition-all duration-200
        "
        >
          <Plus className="w-4 h-4" />
          تسجيل عائلة جديدة
        </Link>
      </div>

      {/* ================================
  Filters & Search
================================= */}
      <div
        className="
    bg-white
    rounded-2xl
    border border-gray-100
    shadow-sm
    overflow-hidden
  "
      >
        <div
          className="
      flex flex-col
      lg:flex-row
      lg:items-center
      gap-3
      p-4
    "
        >
          {/* Search */}
          <div className="relative flex-1 min-w-0 order-1">
            <Search
              className="
          absolute right-3 top-1/2
          -translate-y-1/2
          w-4 h-4
          text-gray-400
          pointer-events-none
        "
            />

            <input
              type="text"
              placeholder="بحث بالاسم، رقم الملف، رقم الهوية، المحافظة..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="
          w-full
          h-11
          border border-gray-200
          rounded-xl
          bg-gray-50
          py-2.5
          pr-10
          pl-4
          text-sm
          text-gray-800
          placeholder:text-gray-400
          transition-all duration-200
          focus:outline-none
          focus:bg-white
          focus:border-green-400
          focus:ring-2
          focus:ring-green-100
          hover:border-gray-300
        "
            />
          </div>

          {/* Status Tabs */}
          <div
            className="
        flex items-center
        gap-1
        border border-gray-100
        bg-gray-50
        rounded-xl
        p-1
        shrink-0
        order-2
      "
          >
            {(["active", "all", "deleted"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f);
                  setCurrentPage(1);
                }}
                className={`
            relative
            min-w-[72px]
            px-4
            py-2
            rounded-lg
            text-xs
            font-bold
            whitespace-nowrap
            transition-all duration-200

            ${
              filter === f
                ? `
                  bg-white
                  text-green-700
                  shadow-sm
                `
                : `
                  text-gray-500
                  hover:text-gray-700
                  hover:bg-white/70
                `
            }
          `}
              >
                {f === "active" ? "النشطة" : f === "all" ? "الكل" : "المحذوفة"}
              </button>
            ))}
          </div>

          {/* Health Filter */}
          <div className="relative shrink-0 order-3">
            <select
              value={healthFilter}
              onChange={(e) => {
                setHealthFilter(e.target.value as typeof healthFilter);
                setCurrentPage(1);
              }}
              className="
          appearance-none
          w-full
          lg:w-44
          h-11
          border border-gray-200
          rounded-xl
          bg-gray-50
          py-2.5
          pr-4
          pl-9
          text-sm
          text-gray-700
          cursor-pointer
          transition-all duration-200
          focus:outline-none
          focus:bg-white
          focus:border-green-400
          focus:ring-2
          focus:ring-green-100
          hover:border-gray-300
        "
            >
              <option value="all">جميع الحالات</option>
              <option value="healthy">بصحة جيدة</option>
              <option value="sick">مريض</option>
              <option value="disabled">إعاقة</option>
            </select>

            <ChevronDown
              className="
          absolute left-3 top-1/2
          -translate-y-1/2
          w-4 h-4
          text-gray-400
          pointer-events-none
        "
            />
          </div>
        </div>
      </div>

      {/* ================================
  Statistics
================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي العائلات",
            value: families.filter((f) => !f.isDeleted).length,
            icon: Users,
            color: "text-green-600",
            iconBg: "bg-green-50",
            border: "border-t-green-600",
          },
          {
            label: "إجمالي الأفراد",
            value: families
              .filter((f) => !f.isDeleted)
              .reduce(
                (total, f) => total + Number(f.totalFamilyMembers || 1),
                0,
              ),
            icon: UserRound,
            color: "text-blue-600",
            iconBg: "bg-blue-50",
            border: "border-t-blue-600",
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
                  (total, f) =>
                    total +
                    (f.members ?? []).filter(
                      (m) => m.healthStatus === "disabled",
                    ).length,
                  0,
                ),
            icon: AlertCircle,
            color: "text-red-600",
            iconBg: "bg-red-50",
            border: "border-t-red-600",
          },
          {
            label: "الأطفال (أقل 12)",
            value: families
              .filter((f) => !f.isDeleted)
              .reduce(
                (total, f) =>
                  total + (f.members || []).filter((m) => m.age < 12).length,
                0,
              ),
            icon: Baby,
            color: "text-purple-600",
            iconBg: "bg-purple-50",
            border: "border-t-purple-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className={`
          bg-white
          rounded-2xl
          border border-gray-100
          border-t-[3px]
          ${stat.border}
          px-4 py-4
          min-h-[96px]
          shadow-sm
          flex items-center
          gap-4
          transition-all duration-200
          hover:-translate-y-0.5
          hover:shadow-md
        `}
            >
              {/* Icon */}
              <div
                className={`
            w-11 h-11
            shrink-0
            rounded-xl
            ${stat.iconBg}
            flex items-center justify-center
          `}
              >
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium leading-5">
                  {stat.label}
                </p>

                <p
                  className={`
              mt-1
              text-2xl
              leading-none
              font-black
              ${stat.color}
            `}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table / Loading / Error */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 space-y-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 border-b border-gray-100"
              >
                <div className="w-20 h-8 bg-gray-200 rounded-lg" />

                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />

                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                    <div className="h-2.5 w-24 bg-gray-200 rounded" />
                  </div>
                </div>

                <div className="hidden md:block w-16 h-8 bg-gray-200 rounded-lg" />
                <div className="hidden md:block w-20 h-8 bg-gray-200 rounded-lg" />
                <div className="hidden md:block w-20 h-8 bg-gray-200 rounded-lg" />
                <div className="w-20 h-8 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>

            <h3 className="font-bold text-gray-800 mb-1">
              تعذر تحميل بيانات العائلات
            </h3>

            <p className="text-sm text-gray-500 mb-5">
              حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة مرة أخرى.
            </p>

            <button
              type="button"
              onClick={loadFamilies}
              className="
          inline-flex items-center gap-2
          px-5 py-2.5
          rounded-xl
          bg-green-600
          text-white
          font-bold text-sm
          hover:bg-green-700
          active:scale-95
          transition-all
        "
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : (
        <div
          className="
      bg-white
      rounded-2xl
      border border-gray-100
      shadow-sm
      overflow-hidden
    "
        >
          {/* Table */}
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="w-full py-16 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <Search className="w-7 h-7 text-gray-300" />
                  </div>

                  <p className="font-bold text-gray-600">لا توجد نتائج</p>

                  <p className="text-xs text-gray-400 mt-1">
                    جرّب تغيير البحث أو الفلاتر
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      رقم الملف
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      رب الأسرة
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      عدد الأفراد
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      المحافظة
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      الحالة الصحية
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      تاريخ الدخول
                    </th>

                    <th className="px-4 py-3.5 text-right font-bold text-gray-700 text-xs whitespace-nowrap">
                      الحالة
                    </th>

                    <th className="px-5 py-4 text-center font-bold text-gray-700 whitespace-nowrap">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {paginatedFamilies.map((family) => {
                    const health =
                      healthLabel[
                        family.headHealthStatus as keyof typeof healthLabel
                      ] ?? healthLabel.healthy;

                    const HealthIcon = health.icon;

                    return (
                      <tr
                        key={family.id}
                        className={`
  group
  transition-colors duration-200
  hover:bg-gray-50/60
  ${family.isDeleted ? "bg-red-50/20 opacity-70" : ""}
`}
                      >
                        {/* File Number */}
                        <td className="px-4 py-4">
                          <span
                            className="
      inline-flex items-center justify-center
      min-w-[68px]
      h-8
      px-2.5
      rounded-lg
      bg-green-50
      text-green-700
      font-mono
      font-bold
      text-xs
      border border-green-100
      whitespace-nowrap
      direction-ltr
    "
                          >
                            {family.fileNumber || "—"}
                          </span>
                        </td>

                        {/* Family Head */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 min-w-[190px]">
                            <div
                              className="
                          w-11 h-11
                          rounded-full
                          overflow-hidden
                          flex-shrink-0
                          flex items-center justify-center
                          bg-gradient-to-br
                          from-green-500
                          to-emerald-700
                          shadow-sm
                          border-2 border-white
                          ring-1 ring-green-100
                          transition-transform duration-200
                          group-hover:scale-105
                        "
                            >
                              {family.photoUrl ? (
                                <img
                                  src={family.photoUrl}
                                  alt={family.headName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-black text-sm">
                                  {family.headName.charAt(0)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 truncate max-w-[180px]">
                                {family.headName}
                              </p>

                              <p className="text-xs text-gray-400 mt-0.5">
                                {family.headNationalId}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Members */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            <Users className="w-4 h-4 text-gray-400" />

                            <span className="font-bold">
                              {family.membersCount ??
                                family.members?.length ??
                                1}
                            </span>

                            <span className="text-xs text-gray-400">أفراد</span>
                          </span>
                        </td>

                        {/* Governorate */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 text-gray-600 whitespace-nowrap">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {family.originGovernorate || "—"}
                          </span>
                        </td>

                        {/* Health */}
                        <td className="px-4 py-4">
                          <span
                            className={`
                        inline-flex items-center gap-1.5
                        px-2.5 py-1.5
                        rounded-lg
                        text-xs
                        font-bold
                        ${health.color}
                      `}
                          >
                            <HealthIcon className="w-3.5 h-3.5" />
                            {health.label}
                          </span>
                        </td>

                        {/* Entry Date */}
                        <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">
                          {family.entryDate
                            ? new Date(family.entryDate).toLocaleDateString(
                                "ar-IQ",
                              )
                            : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {family.isDeleted ? (
                            <span
                              className="
                          inline-flex
                          px-2.5 py-1.5
                          rounded-lg
                          bg-red-50
                          text-red-600
                          border border-red-100
                          text-xs
                          font-bold
                        "
                            >
                              محذوف
                            </span>
                          ) : (
                            <span
                              className="
                          inline-flex
                          px-2.5 py-1.5
                          rounded-lg
                          bg-green-50
                          text-green-700
                          border border-green-100
                          text-xs
                          font-bold
                        "
                            >
                              نشط
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const data = await api.get(
                                    `/documents?family_id=${family.id}`,
                                  );

                                  setSelectedFamily({
                                    ...family,
                                    documents: data.documents || [],
                                  });

                                  setShowModal(true);
                                } catch (error) {
                                  console.error(
                                    "LOAD FAMILY DOCUMENTS ERROR:",
                                    error,
                                  );

                                  setSelectedFamily({
                                    ...family,
                                    documents: [],
                                  });

                                  setShowModal(true);

                                  toast.error("تعذر تحميل مستندات العائلة");
                                }
                              }}
                              className="
                          w-11 h-11 sm:w-9 sm:h-9
                          inline-flex items-center justify-center
                          rounded-lg
                          text-blue-600
                          hover:bg-blue-50
                          hover:text-blue-700
                          transition-all
                        "
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit + Delete */}
                            {!family.isDeleted && (
                              <>
                                <Link
                                  to={`/families/edit/${family.id}`}
                                  className="
                             w-11 h-11 sm:w-9 sm:h-9
                              inline-flex items-center justify-center
                              rounded-lg
                              text-green-600
                              hover:bg-green-50
                              hover:text-green-700
                              transition-all
                            "
                                  title="تعديل"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Link>

                                {(currentUser?.role === "admin" ||
                                  currentUser?.role === "representative" ||
                                  currentUser?.role === "employee") && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowDeleteConfirm(family.id)
                                    }
                                    className="
                                w-11 h-11 sm:w-9 sm:h-9
                                inline-flex items-center justify-center
                                rounded-lg
                                text-red-500
                                hover:bg-red-50
                                hover:text-red-600
                                transition-all
                              "
                                    title="حذف"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}

                            {/* Restore */}
                            {family.isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleRestore(family.id)}
                                className="
      w-9 h-9
      inline-flex items-center justify-center
      rounded-lg
      text-orange-600
      hover:bg-orange-50
      hover:text-orange-700
      transition-all
    "
                                title="استعادة"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Permanent Delete */}
                            {family.isDeleted &&
                              (currentUser?.role === "admin" ||
                                currentUser?.role === "representative") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowPermanentDeleteConfirm(family.id)
                                  }
                                  className="
      w-9 h-9
      inline-flex items-center justify-center
      rounded-lg
      text-red-600
      hover:bg-red-50
      hover:text-red-700
      transition-all
    "
                                  title="حذف نهائي"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 py-5 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`
  h-10
  px-4
  rounded-xl
  text-sm
  font-bold
  transition-all duration-200
  ${
    currentPage === 1
      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
      : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 shadow-sm"
  }
`}
            >
              السابق
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`
  w-10 h-10
  rounded-xl
  text-sm
  font-bold
  transition-all duration-200
  ${
    currentPage === i + 1
      ? "bg-green-600 text-white shadow-sm shadow-green-100"
      : "bg-white border border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
  }
`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`
  h-10
  px-4
  rounded-xl
  text-sm
  font-bold
  transition-all duration-200
  ${
    currentPage === totalPages
      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
      : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 shadow-sm"
  }
`}
            >
              التالي
            </button>
          </div>

          {/* Footer */}
          <div
            className="
    px-5 py-3
    border-t border-gray-100
    bg-gray-50/40
    flex flex-wrap
    items-center
    justify-between
    gap-2
    text-xs text-gray-400
  "
          >
            <span>
              عرض{" "}
              <span className="font-bold text-gray-600">{filtered.length}</span>{" "}
              من{" "}
              <span className="font-bold text-gray-600">{families.length}</span>{" "}
              سجل
            </span>

            <span>آخر تحديث: {new Date().toLocaleTimeString("ar-IQ")}</span>
          </div>
        </div>
      )}

      {/* Family Detail Modal */}
      {showModal &&
        selectedFamily &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="gradient-green relative px-6 py-4.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                        <Users className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black text-white">
                          {selectedFamily.headName}
                        </h3>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm text-green-100">
                            رقم الملف
                          </span>

                          <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold text-white">
                            {selectedFamily.fileNumber || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white transition-all duration-200 hover:bg-white/20"
                    aria-label="إغلاق"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="max-h-[72vh] overflow-y-auto bg-white p-5 sm:p-6">
                <div className="space-y-6">
                  {/* Family Information */}
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                        <FileText className="h-4 w-4 text-green-700" />
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900">
                          بيانات الأسرة
                        </h4>

                        <p className="text-xs text-gray-400">
                          المعلومات الأساسية لرب الأسرة
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: "رقم الهوية",
                          value: selectedFamily.headNationalId || "—",
                          icon: FileText,
                        },
                        {
                          label: "الهاتف",
                          value: selectedFamily.headPhone || "—",
                          icon: Phone,
                        },
                        {
                          label: "المحافظة",
                          value: selectedFamily.originGovernorate || "—",
                          icon: MapPin,
                        },
                        {
                          label: "مدينة الأصل",
                          value: selectedFamily.originCity || "—",
                          icon: MapPin,
                        },
                        {
                          label: "العنوان الحالي",
                          value: selectedFamily.currentAddress || "—",
                          icon: MapPin,
                        },
                        {
                          label: "تاريخ الدخول",
                          value: selectedFamily.entryDate
                            ? new Date(
                                selectedFamily.entryDate,
                              ).toLocaleDateString("ar-IQ")
                            : "—",
                          icon: FileText,
                        },
                      ].map((item, i) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={i}
                            className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all duration-200 hover:border-green-100 hover:bg-green-50/30"
                          >
                            <div className="mb-1.5 flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-gray-400" />

                              <p className="text-xs font-medium text-gray-400">
                                {item.label}
                              </p>
                            </div>

                            <p className="break-words text-sm font-bold text-gray-900">
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Family Members */}
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-900">
                            أفراد الأسرة
                          </h4>

                          <p className="text-xs text-gray-400">
                            {selectedFamily.members?.length || 0} أفراد مسجلين
                          </p>
                        </div>
                      </div>

                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {selectedFamily.members?.length || 0}
                      </span>
                    </div>

                    {selectedFamily.members?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedFamily.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 transition-colors duration-200 hover:bg-gray-50"
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                              <Heart className="h-4 w-4 text-blue-600" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-800">
                                {member.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {member.relation === "wife"
                                  ? "زوجة"
                                  : member.relation === "son"
                                    ? "ابن"
                                    : member.relation === "daughter"
                                      ? "ابنة"
                                      : "أخرى"}
                                {" • "}
                                {member.age ?? "—"} سنة
                                {" • "}
                                {member.gender === "ذكر"
                                  ? "ذكر"
                                  : member.gender === "أنثى"
                                    ? "أنثى"
                                    : "غير محدد"}
                                {member.disability && ` • ${member.disability}`}
                              </p>
                              {member.nationalId && (
                                <p className="mt-1 text-xs text-gray-400">
                                  رقم الهوية: {member.nationalId}
                                </p>
                              )}
                              {member.dateOfBirth && (
                                <p className="mt-1 text-xs text-gray-400">
                                  تاريخ الميلاد: {member.dateOfBirth}
                                </p>
                              )}
                            </div>

                            <span
                              className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
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
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                        <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />

                        <p className="text-sm font-medium text-gray-500">
                          لا يوجد أفراد مسجلون
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Documents */}
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900">المستندات</h4>

                        <p className="text-xs text-gray-400">
                          المستندات المرتبطة بالعائلة
                        </p>
                      </div>
                    </div>

                    {selectedFamily.documents?.length ? (
                      <div className="space-y-2">
                        {selectedFamily.documents.map((doc: Document) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 transition-colors duration-200 hover:bg-gray-50"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                                <FileText className="h-4 w-4 text-purple-600" />
                              </div>

                              <span className="truncate text-sm font-semibold text-gray-700">
                                {doc.name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => previewFamilyDocument(doc)}
                              disabled={previewingDocumentId === doc.id}
                              className="flex-shrink-0 rounded-lg bg-green-50 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {previewingDocumentId === doc.id ? (
                                <>
                                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                                  جاري المعاينة...
                                </>
                              ) : (
                                "عرض"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                        <FileText className="mx-auto mb-2 h-7 w-7 text-gray-300" />

                        <p className="text-sm text-gray-500">لا توجد مستندات</p>
                      </div>
                    )}
                  </section>

                  {/* Notes */}
                  {selectedFamily.notes && (
                    <section>
                      <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />

                          <p className="text-xs font-bold text-yellow-700">
                            ملاحظات
                          </p>
                        </div>

                        <p className="break-words text-sm leading-6 text-yellow-800">
                          {selectedFamily.notes}
                        </p>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 sm:px-6">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Delete Confirm Modal */}
      {showDeleteConfirm !== null &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-6 pt-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-8 w-8 text-red-500" />
                  </div>

                  <h3 className="text-lg font-black text-gray-900">
                    تأكيد حذف العائلة
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    هل أنت متأكد من رغبتك في حذف هذه العائلة؟
                  </p>
                </div>
              </div>

              {/* Family Info */}
              <div className="px-6 py-4">
                {(() => {
                  const familyToDelete = families.find(
                    (family) => family.id === showDeleteConfirm,
                  );

                  if (!familyToDelete) return null;

                  return (
                    <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-400">
                            رب الأسرة
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-gray-800">
                            {familyToDelete.headName}
                          </p>
                        </div>

                        <div className="flex-shrink-0 text-left">
                          <p className="text-xs font-medium text-gray-400">
                            رقم الملف
                          </p>

                          <span className="mt-1 inline-flex rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-green-700 shadow-sm">
                            {familyToDelete.fileNumber || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Warning */}
              <div className="px-6 pb-5">
                <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />

                    <p className="text-xs leading-5 text-yellow-800">
                      سيتم إخفاء العائلة من قائمة العائلات النشطة مع الاحتفاظ
                      ببياناتها وسجلها. يمكنك استعادتها لاحقًا من قسم
                      <span className="font-bold"> المحذوفة</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => handleSoftDelete(showDeleteConfirm)}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف مؤقت
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Permanent Delete Modal */}
      {showPermanentDeleteConfirm !== null &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      حذف العائلة نهائيًا
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      هذا الإجراء لا يمكن التراجع عنه
                    </p>
                  </div>
                </div>
              </div>

              {/* Family Info */}
              <div className="px-6 py-5">
                {(() => {
                  const familyToDelete = families.find(
                    (family) => family.id === showPermanentDeleteConfirm,
                  );

                  if (!familyToDelete) return null;

                  return (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-400">
                            رب الأسرة
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-gray-800">
                            {familyToDelete.headName}
                          </p>
                        </div>

                        <div className="flex-shrink-0 text-left">
                          <p className="text-xs font-medium text-gray-400">
                            رقم الملف السابق
                          </p>

                          <span className="mt-1 inline-flex rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-600 shadow-sm">
                            {familyToDelete.fileNumber || "غير موجود"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Warning */}
              <div className="px-6 pb-5">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold leading-6 text-red-800">
                    تحذير: سيتم حذف العائلة نهائيًا من قاعدة البيانات.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-red-700">
                    سيتم أيضًا حذف أفراد الأسرة والوثائق المرتبطة بها تلقائيًا.
                    لا يمكن استعادة هذه البيانات بعد تنفيذ الحذف النهائي.
                  </p>

                  <p className="mt-2 text-xs font-bold leading-5 text-red-700">
                    إذا كانت العائلة مرتبطة بسجلات مساعدات موزعة، فلن يسمح
                    النظام بالحذف النهائي.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowPermanentDeleteConfirm(null)}
                  className="
            rounded-xl
            border border-gray-200
            bg-white
            px-5 py-2.5
            text-sm font-bold
            text-gray-600
            transition
            hover:bg-gray-100
          "
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePermanentDelete(showPermanentDeleteConfirm)
                  }
                  className="
            flex items-center gap-2
            rounded-xl
            bg-red-600
            px-5 py-2.5
            text-sm font-bold
            text-white
            shadow-sm
            transition
            hover:bg-red-700
            active:scale-[0.98]
          "
                >
                  <Trash2 className="h-4 w-4" />
                  نعم، حذف نهائي
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
