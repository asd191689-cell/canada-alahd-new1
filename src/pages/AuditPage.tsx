import { useState } from "react";
import { createPortal } from "react-dom";

import { useApp } from "../context/AppContext";
import {
  Search,
  Clock,
  User2,
  LogIn,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Gift,
  Users,
  User,
  Package,
  Shield,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { hasPermission } from "../utils/permissions";
import AccessDenied from "../components/AccessDenied";
import { useEffect } from "react";
import { api } from "../api/apiClient";
import type { AuditLog } from "../types";

const actionLabels: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: any;
  }
> = {
  LOGIN: {
    label: "تسجيل دخول",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: LogIn,
  },

  CREATE_USER: {
    label: "إضافة مستخدم",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: Plus,
  },

  DELETE_USER: {
    label: "حذف مستخدم",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },

  CREATE_FAMILY: {
    label: "إضافة عائلة",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: Users,
  },

  UPDATE_FAMILY: {
    label: "تعديل عائلة",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Pencil,
  },

  DELETE_FAMILY: {
    label: "حذف عائلة",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },
  RESTORE_FAMILY: {
    label: "استعادة عائلة",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: Users,
  },

  CREATE_MEMBER: {
    label: "إضافة فرد",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: User,
  },

  UPDATE_MEMBER: {
    label: "تعديل فرد",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Pencil,
  },

  DELETE_MEMBER: {
    label: "حذف فرد",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },

  UPLOAD_DOCUMENT: {
    label: "رفع وثيقة",
    color: "text-purple-700",
    bg: "bg-purple-100",
    icon: FileText,
  },
  UPDATE_DOCUMENT_STATUS: {
    label: "تعديل حالة وثيقة",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Pencil,
  },

  DELETE_DOCUMENT: {
    label: "حذف وثيقة",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },

  CREATE_AID_TYPE: {
    label: "إضافة نوع مساعدة",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: Package,
  },

  UPDATE_AID_TYPE: {
    label: "تعديل نوع مساعدة",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Pencil,
  },

  DELETE_AID_TYPE: {
    label: "حذف نوع مساعدة",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },

  CREATE_DISTRIBUTION: {
    label: "توزيع مساعدة",
    color: "text-cyan-700",
    bg: "bg-cyan-100",
    icon: Gift,
  },

  DELETE_DISTRIBUTION: {
    label: "حذف توزيع",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: Trash2,
  },
  UPDATE_USER: {
    label: "تعديل مستخدم",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Pencil,
  },
  LOGOUT: {
    label: "تسجيل خروج",
    color: "text-slate-700",
    bg: "bg-slate-100",
    icon: LogIn,
  },
};
const actionDescriptions: Record<string, string> = {
  LOGIN: "قام بتسجيل الدخول إلى النظام",
  LOGOUT: "قام بتسجيل الخروج من النظام",

  CREATE_USER: "قام بإضافة مستخدم جديد",
  UPDATE_USER: "قام بتعديل بيانات مستخدم",
  DELETE_USER: "قام بحذف مستخدم",

  CREATE_FAMILY: "قام بتسجيل عائلة جديدة",
  UPDATE_FAMILY: "قام بتعديل بيانات عائلة",
  DELETE_FAMILY: "قام بحذف عائلة",
  RESTORE_FAMILY: "قام باستعادة عائلة",

  UPLOAD_DOCUMENT: "قام برفع وثيقة",
  UPDATE_DOCUMENT_STATUS: "قام بتعديل حالة وثيقة",
  DELETE_DOCUMENT: "قام بحذف وثيقة",

  CREATE_AID_TYPE: "قام بإضافة صنف مساعدة",
  UPDATE_AID_TYPE: "قام بتعديل صنف مساعدة",
  DELETE_AID_TYPE: "قام بحذف صنف مساعدة",

  CREATE_DISTRIBUTION: "قام بتوزيع مساعدات",
  DELETE_DISTRIBUTION: "قام بحذف سجل توزيع",
};
function AuditDetailsContent({ details }: { details?: string | null }) {
  if (!details) {
    return <p className="text-sm text-gray-500">لا توجد تفاصيل إضافية.</p>;
  }

  const isMemberChanges = details.includes("تغييرات أفراد الأسرة:");

  // العمليات العادية: نعرض النص كما هو ولكن نحافظ على الأسطر
  if (!isMemberChanges) {
    return (
      <p className="text-sm text-gray-700 leading-7 whitespace-pre-line">
        {details}
      </p>
    );
  }

  const [familySummary, memberSection = ""] = details.split(
    "تغييرات أفراد الأسرة:",
  );

  const memberBlocks = memberSection
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const renderMemberBlock = (block: string, index: number) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return null;
    }

    const title = lines[0];

    const isAdded = title.startsWith("تمت إضافة فرد:");
    const isDeleted = title.startsWith("تم حذف فرد:");
    const isUpdated = title.startsWith("تم تعديل بيانات الفرد:");

    const titleClass = isAdded
      ? "text-green-700 bg-green-50 border-green-100"
      : isDeleted
        ? "text-red-700 bg-red-50 border-red-100"
        : "text-blue-700 bg-blue-50 border-blue-100";

    const titleText = isAdded
      ? "تمت إضافة فرد"
      : isDeleted
        ? "تم حذف فرد"
        : isUpdated
          ? "تم تعديل بيانات الفرد"
          : "تفاصيل الفرد";

    const personName = title.includes(":")
      ? title.substring(title.indexOf(":") + 1).trim()
      : "";

    const fields = [];
    let currentField: {
      label: string;
      before?: string;
      after?: string;
      value?: string;
    } | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("قبل:")) {
        if (currentField) {
          currentField.before = line.replace(/^قبل:\s*/, "").trim();
        }
        continue;
      }

      if (line.startsWith("بعد:")) {
        if (currentField) {
          currentField.after = line.replace(/^بعد:\s*/, "").trim();

          fields.push(currentField);
          currentField = null;
        }
        continue;
      }

      const separatorIndex = line.indexOf(":");

      if (separatorIndex !== -1) {
        if (currentField) {
          fields.push(currentField);
        }

        currentField = {
          label: line.substring(0, separatorIndex).trim(),
          value: line.substring(separatorIndex + 1).trim(),
        };
      }
    }

    if (currentField) {
      fields.push(currentField);
    }

    return (
      <div
        key={`${title}-${index}`}
        className="border border-gray-100 rounded-xl overflow-hidden bg-white"
      >
        {/* Member action header */}
        <div className={`px-4 py-3 border-b ${titleClass}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-sm">{titleText}</span>

            {personName && (
              <span className="font-bold text-sm">{personName}</span>
            )}
          </div>
        </div>

        {/* Fields */}
        {fields.length > 0 && (
          <div className="p-3 space-y-2">
            {fields.map((field, fieldIndex) => (
              <div
                key={`${field.label}-${fieldIndex}`}
                className="rounded-lg border border-gray-100 bg-gray-50/70 p-3"
              >
                <div className="text-xs font-bold text-gray-500 mb-2">
                  {field.label}
                </div>

                {field.before !== undefined || field.after !== undefined ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-lg bg-red-50 border border-red-100 p-2.5">
                      <div className="text-[11px] font-bold text-red-600 mb-1">
                        قبل
                      </div>
                      <div className="text-sm text-gray-700">
                        {field.before || "غير محدد"}
                      </div>
                    </div>

                    <div className="rounded-lg bg-green-50 border border-green-100 p-2.5">
                      <div className="text-[11px] font-bold text-green-600 mb-1">
                        بعد
                      </div>
                      <div className="text-sm text-gray-700">
                        {field.after || "غير محدد"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-gray-700">
                    {field.value || "غير محدد"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Family summary */}
      {familySummary.trim() && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-sm text-gray-700 leading-7 whitespace-pre-line">
            {familySummary.trim()}
          </p>
        </div>
      )}

      {/* Member changes */}
      {memberBlocks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-green-500" />

            <h4 className="text-sm font-bold text-gray-800">
              تغييرات أفراد الأسرة
            </h4>
          </div>

          {memberBlocks.map(renderMemberBlock)}
        </div>
      )}
    </div>
  );
}
export default function AuditPage() {
  const { currentUser } = useApp();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(
    null,
  );

  const canAccessAudit =
    currentUser &&
    hasPermission(
      currentUser.role as "admin" | "representative" | "employee",
      "audit",
    );
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const data = await api.get("/audit");
        setAuditLogs(data.logs || []);
      } catch (err) {
        console.error("LOAD AUDIT LOGS ERROR:", err);
      }
    };

    loadAuditLogs();
  }, []);

  const filtered = auditLogs.filter((log) => {
    const matchSearch =
      (log.userName ?? "").includes(search) ||
      (log.details ?? "").includes(search) ||
      (log.target ?? "").includes(search);
    const matchAction =
      actionFilter === "all" || (log.action ?? "") === actionFilter;
    const matchDate =
      !dateFilter || (log.timestamp ?? "").startsWith(dateFilter);
    return matchSearch && matchAction && matchDate;
  });

  if (!canAccessAudit) {
    return (
      <AccessDenied
        title="غير مخول للوصول"
        message="لا تمتلك صلاحية للوصول إلى سجل التدقيق."
      />
    );
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "إجمالي السجلات",
            value: auditLogs.length,
            unit: "سجل",
            icon: Shield,
            bg: "bg-gray-50",
            text: "text-gray-700",
            iconBg: "bg-gray-700",
            sub: "جميع العمليات المسجلة",
          },
          {
            title: "عمليات الإضافة",
            value: auditLogs.filter((l) =>
              (l.action ?? "").startsWith("CREATE"),
            ).length,
            unit: "عملية",
            icon: Plus,
            bg: "bg-green-50",
            text: "text-green-700",
            iconBg: "bg-green-500",
            sub: "عمليات إنشاء وإضافة",
          },
          {
            title: "عمليات التعديل",
            value: auditLogs.filter((l) =>
              (l.action ?? "").startsWith("UPDATE"),
            ).length,
            unit: "عملية",
            icon: Pencil,
            bg: "bg-blue-50",
            text: "text-blue-700",
            iconBg: "bg-blue-500",
            sub: "عمليات تحديث البيانات",
          },
          {
            title: "عمليات الحذف",
            value: auditLogs.filter((l) =>
              (l.action ?? "").startsWith("DELETE"),
            ).length,
            unit: "عملية",
            icon: Trash2,
            bg: "bg-red-50",
            text: "text-red-700",
            iconBg: "bg-red-500",
            sub: "عمليات حذف البيانات",
          },
        ].map((card, i) => {
          const Icon = card.icon;

          return (
            <div
              key={i}
              className={`
          group
          ${card.bg}
          rounded-2xl
          p-5
          border border-white
          shadow-sm
          min-h-[160px]
          transition-all duration-200
          hover:-translate-y-0.5
          hover:shadow-md
        `}
            >
              {/* الأيقونة */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`
              w-12 h-12
              rounded-xl
              ${card.iconBg}
              flex items-center justify-center
              shadow-sm
              transition-transform duration-200
              group-hover:scale-105
            `}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* الرقم + الوحدة */}
              <div
                className={`
            flex items-baseline gap-1.5
            ${card.text}
            mb-1
          `}
              >
                <span className="text-3xl font-black leading-none">
                  {card.value}
                </span>

                <span className="text-sm font-semibold opacity-80">
                  {card.unit}
                </span>
              </div>

              {/* العنوان */}
              <p className="text-sm font-semibold text-gray-700">
                {card.title}
              </p>

              {/* الوصف */}
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          {/* البحث */}
          <div className="relative min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

            <input
              type="text"
              placeholder="بحث في السجلات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
          w-full
          h-11
          border border-gray-200
          rounded-xl
          pr-10 pl-4
          text-sm
          text-gray-700
          placeholder:text-gray-500
          bg-gray-50
          transition-all
          focus:outline-none
          focus:bg-white
          focus:border-green-300
          focus:ring-2
          focus:ring-green-100
        "
            />
          </div>

          {/* نوع العملية */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="
        h-11
        min-w-[170px]
        border border-gray-200
        rounded-xl
        px-4
        text-sm
        text-gray-700
        bg-gray-50
        transition-all
        focus:outline-none
        focus:bg-white
        focus:border-green-300
        focus:ring-2
        focus:ring-green-100
      "
          >
            <option value="all">جميع العمليات</option>

            <option value="LOGIN">دخول</option>
            <option value="LOGOUT">خروج</option>

            <option value="CREATE_USER">إضافة مستخدم</option>
            <option value="UPDATE_USER">تعديل مستخدم</option>
            <option value="DELETE_USER">حذف مستخدم</option>

            <option value="CREATE_FAMILY">إضافة عائلة</option>
            <option value="UPDATE_FAMILY">تعديل عائلة</option>
            <option value="DELETE_FAMILY">حذف عائلة</option>
            <option value="RESTORE_FAMILY">استعادة عائلة</option>

            <option value="UPLOAD_DOCUMENT">رفع وثيقة</option>
            <option value="UPDATE_DOCUMENT_STATUS">تعديل حالة وثيقة</option>
            <option value="DELETE_DOCUMENT">حذف وثيقة</option>

            <option value="CREATE_AID_TYPE">إضافة نوع مساعدة</option>
            <option value="UPDATE_AID_TYPE">تعديل نوع مساعدة</option>
            <option value="DELETE_AID_TYPE">حذف نوع مساعدة</option>

            <option value="CREATE_DISTRIBUTION">توزيع مساعدة</option>
            <option value="DELETE_DISTRIBUTION">حذف توزيع</option>
          </select>

          {/* التاريخ */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="
          h-11
          min-w-[170px]
          w-full
          border border-gray-200
          rounded-xl
          px-4
          text-sm
          text-gray-700
          bg-gray-50
          transition-all
          focus:outline-none
          focus:bg-white
          focus:border-green-300
          focus:ring-2
          focus:ring-green-100
        "
            />
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-start gap-3" dir="rtl">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>

            <div className="text-right">
              <h3 className="font-bold text-gray-800">سجل التدقيق والمراقبة</h3>

              <p className="text-xs text-gray-500 mt-0.5">
                عرض {filtered.length} من {auditLogs.length} سجل
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد سجلات</p>
            </div>
          ) : (
            filtered.map((log) => {
              const action = actionLabels[log.action] ?? {
                label: log.action ?? "غير معروف",
                color: "text-gray-700",
                bg: "bg-gray-100",
                icon: Shield,
              };

              const Icon = action.icon;
              return (
                <div
                  key={log.id}
                  className="px-5 py-5 hover:bg-gray-50/70 transition-colors duration-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-4 h-4 ${action.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold ${action.bg} ${action.color}`}
                        >
                          {action.label}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {log.target}
                        </span>
                        {log.targetId && (
                          <span className="text-xs text-gray-500 font-mono">
                            #{log.targetId.toString().slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 font-semibold leading-6 mb-1">
                        {log.details || actionDescriptions[log.action]}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User2 className="w-3.5 h-3.5" />
                          <span>{log.userName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <div className="flex flex-col">
                            <span>
                              {formatDistanceToNow(new Date(log.timestamp), {
                                addSuffix: true,
                                locale: ar,
                              })}
                            </span>

                            <span className="text-[10px] text-gray-500">
                              {new Date(log.timestamp).toLocaleDateString(
                                "ar-IQ",
                              )}{" "}
                              {new Date(log.timestamp).toLocaleTimeString(
                                "ar-IQ",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        {log.ipAddress && (
                          <span className="text-xs text-gray-300 font-mono">
                            {log.ipAddress}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAuditLog(log)}
                        className="
    mt-3
    inline-flex
    items-center
    gap-2
    px-3
    py-2
    rounded-xl
    text-xs
    font-bold
    text-green-700
    bg-green-50
    border border-green-100
    hover:bg-green-100
    transition-colors
  "
                      >
                        <Eye className="w-4 h-4" />
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {selectedAuditLog &&
        createPortal(
          <div
            className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
            onClick={() => setSelectedAuditLog(null)}
          >
            <div
              className="
  w-full
  max-w-lg
  max-h-[90vh]
  bg-white
  rounded-2xl
  shadow-2xl
  overflow-y-auto
  fade-in
"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                    w-10
                    h-10
                    rounded-xl
                    ${actionLabels[selectedAuditLog.action]?.bg ?? "bg-gray-100"}
                    flex
                    items-center
                    justify-center
                  `}
                  >
                    {(() => {
                      const ModalIcon =
                        actionLabels[selectedAuditLog.action]?.icon ?? Shield;

                      return (
                        <ModalIcon
                          className={`
                          w-5
                          h-5
                          ${
                            actionLabels[selectedAuditLog.action]?.color ??
                            "text-gray-700"
                          }
                        `}
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800">تفاصيل العملية</h3>

                    <p className="text-xs text-gray-500 mt-0.5">
                      سجل التدقيق والمراقبة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  className="
                  w-9
                  h-9
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  text-gray-500
                  hover:bg-gray-100
                  hover:text-gray-700
                  transition-colors
                  text-xl
                "
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Operation */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">العملية</p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`
                      text-sm
                      px-2.5
                      py-1
                      rounded-lg
                      font-bold
                      ${
                        actionLabels[selectedAuditLog.action]?.bg ??
                        "bg-gray-100"
                      }
                      ${
                        actionLabels[selectedAuditLog.action]?.color ??
                        "text-gray-700"
                      }
                    `}
                    >
                      {actionLabels[selectedAuditLog.action]?.label ??
                        selectedAuditLog.action ??
                        "غير معروف"}
                    </span>
                  </div>
                </div>

                {/* User */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <User2 className="w-4 h-4" />
                      المستخدم
                    </div>

                    <p className="text-sm font-bold text-gray-800">
                      {selectedAuditLog.userName || "غير معروف"}
                    </p>
                  </div>

                  {/* Target */}
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <FileText className="w-4 h-4" />
                      الهدف
                    </div>

                    <p className="text-sm font-bold text-gray-800">
                      {selectedAuditLog.target || "غير محدد"}
                    </p>
                  </div>
                </div>

                {/* Target ID */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Shield className="w-4 h-4" />
                    رقم السجل المستهدف
                  </div>

                  <p className="text-sm font-mono font-bold text-gray-800">
                    {selectedAuditLog.targetId
                      ? `#${selectedAuditLog.targetId}`
                      : "غير محدد"}
                  </p>
                </div>

                {/* Date */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Clock className="w-4 h-4" />
                    وقت العملية
                  </div>

                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(selectedAuditLog.timestamp).toLocaleDateString(
                      "ar-IQ",
                    )}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(selectedAuditLog.timestamp).toLocaleTimeString(
                      "ar-IQ",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>

                {/* Details */}
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                  <p className="text-xs text-green-700 font-bold mb-3">
                    تفاصيل العملية
                  </p>

                  <AuditDetailsContent
                    details={
                      selectedAuditLog.details ||
                      actionDescriptions[selectedAuditLog.action] ||
                      "لا توجد تفاصيل إضافية."
                    }
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAuditLog(null)}
                  className="
                  px-4
                  py-2.5
                  rounded-xl
                  bg-gray-100
                  text-gray-700
                  text-sm
                  font-bold
                  hover:bg-gray-200
                  transition-colors
                "
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
