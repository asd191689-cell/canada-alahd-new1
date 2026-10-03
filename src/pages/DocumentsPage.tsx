import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, Users, Folder, Shield, UserCog, Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../api/apiClient";
import type { Document } from "../types";

type Activity = {
  id: number;

  message: string;

  time: string;
};

export default function DocumentsPage() {
  const statusUpdateLock = useRef(false);
  const { families, currentUser } = useApp();

  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const selectedFamily =
    families.find((f) => String(f.id) === String(selectedFamilyId)) || null;

  const [nationalId, setNationalId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [documentSearch, setDocumentSearch] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>(() => {
    const savedActivities = localStorage.getItem("activities");

    return savedActivities ? JSON.parse(savedActivities) : [];
  });
  const showNotification = (
    type: "success" | "error",
    title: string,
    message: string,
  ) => {
    setNotification({ type, title, message });

    window.setTimeout(() => {
      setNotification(null);
    }, 4000);
  };
  const documentStatusLabels: Record<Document["status"], string> = {
    pending: "قيد المراجعة",
    approved: "مقبولة",
    rejected: "مرفوضة",
  };

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    number | null
  >(null);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<
    number | null
  >(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );
  const [updatingStatus, setUpdatingStatus] = useState<{
    id: number;
    status: Document["status"];
  } | null>(null);
  useEffect(() => {
    loadDocuments();
  }, []);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const acceptedDocuments = documents.filter(
    (doc) => doc.status === "approved",
  ).length;

  const pendingDocuments = documents.filter(
    (doc) => doc.status === "pending",
  ).length;

  const rejectedDocuments = documents.filter(
    (doc) => doc.status === "rejected",
  ).length;

  const loadDocuments = async () => {
    setDocumentsLoading(true);

    try {
      const data = await api.get("/documents");
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedFamily) return;

    if (!documentType) {
      showNotification(
        "error",
        "نوع الوثيقة مطلوب",
        "يرجى اختيار نوع الوثيقة قبل اختيار الملف.",
      );
      return;
    }
    const uploadedFiles = Array.from(e.target.files);
    console.log("selectedFamily =", selectedFamily);
    console.log("selectedFamily.id =", selectedFamily?.id);

    const maxSize = 5 * 1024 * 1024;

    const largeFile = uploadedFiles.find((file) => file.size > maxSize);

    if (largeFile) {
      showNotification(
        "error",
        "تعذر رفع الملف",
        `الملف "${largeFile.name}" يتجاوز الحد الأقصى المسموح وهو 5 ميجابايت.`,
      );
      return;
    }
    try {
      setUploading(true);

      // نعطي المتصفح فرصة لرسم حالة التحميل قبل بدء طلب الرفع
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      for (const file of uploadedFiles) {
        const formData = new FormData();

        formData.append("document", file);
        formData.append("family_id", String(selectedFamily.id));
        formData.append("head_national_id", selectedFamily.headNationalId);
        formData.append("type", documentType);
        formData.append("uploaded_by", String(currentUser?.id ?? ""));

        await api.post("/documents", formData);
      }

      await loadDocuments();

      showNotification(
        "success",
        "تم رفع الوثيقة بنجاح",
        "تم ربط الوثيقة بملف الأسرة بنجاح.",
      );
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        "تعذر رفع الوثيقة",
        "حدث خطأ أثناء رفع الوثيقة. يرجى التحقق من الملف والمحاولة مرة أخرى.",
      );
    } finally {
      setUploading(false);
    }
  };

  const changeDocumentStatus = async (
    id: number,
    status: Document["status"],
  ) => {
    if (statusUpdateLock.current) return;

    statusUpdateLock.current = true;

    try {
      setUpdatingStatus({ id, status });
      const updateStartTime = Date.now();

      await api.put(`/documents/${id}`, {
        status,
      });

      const elapsed = Date.now() - updateStartTime;
      const minimumLoadingTime = 500;

      if (elapsed < minimumLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumLoadingTime - elapsed),
        );
      }

      await loadDocuments();

      const notificationData =
        status === "approved"
          ? {
              title: "تم اعتماد الوثيقة",
              message: "تم اعتماد الوثيقة بنجاح وتحديث حالتها في النظام.",
            }
          : status === "rejected"
            ? {
                title: "تم رفض الوثيقة",
                message: "تم تحديث حالة الوثيقة إلى مرفوضة.",
              }
            : {
                title: "تم تحديث حالة الوثيقة",
                message: "تم تحويل الوثيقة إلى قيد المراجعة.",
              };
      showNotification(
        "success",
        notificationData.title,
        notificationData.message,
      );

      setActivities((prev) => [
        {
          id: Date.now(),
          message: notificationData.message,
          time: new Date().toLocaleTimeString("ar-IQ"),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        "تعذر تحديث الحالة",
        "حدث خطأ أثناء تحديث حالة الوثيقة. يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setUpdatingStatus(null);
      statusUpdateLock.current = false;
    }
  };
  const deleteDocument = async (id: number) => {
    try {
      setDeletingDocumentId(id);

      await api.delete(`/documents/${id}`);

      await loadDocuments();

      setDeleteConfirm(null);

      showNotification(
        "success",
        "تم حذف الوثيقة",
        "تم حذف الوثيقة من سجل الوثائق بنجاح.",
      );

      setActivities((prev) => [
        {
          id: Date.now(),
          message: "تم حذف وثيقة من سجل الوثائق.",
          time: new Date().toLocaleTimeString("ar-IQ"),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("DELETE DOCUMENT ERROR:", error);

      setDeleteConfirm(null);

      showNotification(
        "error",
        "تعذر حذف الوثيقة",
        "حدث خطأ أثناء حذف الوثيقة. يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      setDownloadingDocumentId(doc.id);
      const startTime = Date.now();
      const blob = await api.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const elapsed = Date.now() - startTime;
      const minimumLoadingTime = 500;

      if (elapsed < minimumLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumLoadingTime - elapsed),
        );
      }

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = doc.name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOWNLOAD DOCUMENT ERROR:", error);

      showNotification(
        "error",
        "تعذر تحميل الوثيقة",
        "ليس لديك صلاحية للوصول إلى هذه الوثيقة أو حدث خطأ أثناء التحميل.",
      );
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const previewDocument = async (doc: Document) => {
    setPreviewingDocumentId(doc.id);

    const startTime = Date.now();

    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      setPreviewingDocumentId(null);
      showNotification(
        "error",
        "تعذر فتح المعاينة",
        "يرجى السماح بفتح النوافذ الجديدة في المتصفح.",
      );
      return;
    }

    previewWindow.document.write(`
    <html>
      <head>
        <title>جاري تحميل الوثيقة...</title>
      </head>
      <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;">
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

      console.error("PREVIEW DOCUMENT ERROR:", error);

      showNotification(
        "error",
        "تعذر معاينة الوثيقة",
        "ليس لديك صلاحية للوصول إلى هذه الوثيقة أو حدث خطأ أثناء المعاينة.",
      );
    } finally {
      setPreviewingDocumentId(null);
    }
  };

  const familyDocuments = documents
    .filter((doc) => String(doc.familyId) === String(selectedFamily?.id))
    .filter(
      (doc) =>
        !documentSearch ||
        doc.name.toLowerCase().includes(documentSearch.toLowerCase()),
    )
    .filter((doc) => {
      if (statusFilter === "الكل") return true;

      const statusMap: Record<string, Document["status"]> = {
        مقبولة: "approved",
        مرفوضة: "rejected",
        "قيد المراجعة": "pending",
      };

      return doc.status === statusMap[statusFilter];
    })
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  const totalFamilies = families.length;

  const totalDocuments = documents.length;

  const linkedFamilies = new Set(documents.map((doc) => doc.headNationalId))
    .size;
  const requiredDocuments = 5;

  const completedDocuments = familyDocuments.filter(
    (doc) => doc.status === "approved",
  ).length;
  const progressPercentage = (completedDocuments / requiredDocuments) * 100;
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("activities", JSON.stringify(activities));
  }, [activities]);

  return (
    <div className="space-y-6 fade-in">
      {notification &&
        createPortal(
          <div className="fixed top-5 right-5 z-[300] w-[360px] max-w-[calc(100vw-2rem)]">
            <div
              className={`rounded-2xl shadow-2xl border bg-white p-4 ${
                notification.type === "success"
                  ? "border-green-100"
                  : "border-red-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black ${
                    notification.type === "success"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {notification.type === "success" ? "✓" : "!"}
                </div>

                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 text-sm">
                    {notification.title}
                  </p>

                  <p className="text-xs text-gray-500 mt-1 leading-5">
                    {notification.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Hero + Stats */}

      <div className="space-y-6 px-2 md:px-3">
        {/* Hero */}

        <div
          className="
    relative
    overflow-hidden
    rounded-2xl
    bg-gradient-to-l
    from-green-700
    via-green-600
    to-green-500
    px-6
    py-6
    md:px-8
    md:py-7
    shadow-sm
    border
    border-green-500/20
  "
        >
          {/* زخارف خلفية بسيطة */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-black/5" />

          <div className="relative flex items-center justify-between gap-6">
            {/* المحتوى */}
            <div className="flex-1 text-right">
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                إدارة الوثائق
              </h1>

              <p className="text-sm md:text-base text-green-100 mt-2">
                ربط ملفات الأسر وإدارة الوثائق بصورة احترافية
              </p>

              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10">
                <FileText className="w-4 h-4 text-white" />

                <span className="text-xs md:text-sm text-white">
                  إدارة مركزية لوثائق الأسر والملفات المرتبطة
                </span>
              </div>
            </div>

            {/* الأيقونة */}
            <div
              className="
        shrink-0
        w-16
        h-16
        md:w-20
        md:h-20
        rounded-2xl
        bg-white/15
        flex
        items-center
        justify-center
        shadow-sm
      "
            >
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* إجمالي الأسر */}
          <div
            className="
      group
      bg-green-50/60
      border
      border-green-100
      rounded-2xl
      p-5
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:shadow-sm
    "
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  إجمالي الأسر
                </p>

                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-3xl font-black text-green-600 leading-none">
                    {totalFamilies}
                  </h3>

                  <span className="text-sm font-medium text-green-600">
                    أسرة
                  </span>
                </div>
              </div>

              <div
                className="
          w-12
          h-12
          shrink-0
          rounded-xl
          bg-green-500
          flex
          items-center
          justify-center
          shadow-sm
          group-hover:scale-105
          transition-transform
        "
              >
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* إجمالي الوثائق */}
          <div
            className="
      group
      bg-blue-50/60
      border
      border-blue-100
      rounded-2xl
      p-5
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:shadow-sm
    "
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  إجمالي الوثائق
                </p>

                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-3xl font-black text-blue-600 leading-none">
                    {totalDocuments}
                  </h3>

                  <span className="text-sm font-medium text-blue-600">
                    وثيقة
                  </span>
                </div>
              </div>

              <div
                className="
          w-12
          h-12
          shrink-0
          rounded-xl
          bg-blue-500
          flex
          items-center
          justify-center
          shadow-sm
          group-hover:scale-105
          transition-transform
        "
              >
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* الأسر المرتبطة */}
          <div
            className="
      group
      bg-orange-50/60
      border
      border-orange-100
      rounded-2xl
      p-5
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:shadow-sm
    "
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  الأسر المرتبطة
                </p>

                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-3xl font-black text-orange-500 leading-none">
                    {linkedFamilies}
                  </h3>

                  <span className="text-sm font-medium text-orange-500">
                    أسرة
                  </span>
                </div>
              </div>

              <div
                className="
          w-12
          h-12
          shrink-0
          rounded-xl
          bg-orange-500
          flex
          items-center
          justify-center
          shadow-sm
          group-hover:scale-105
          transition-transform
        "
              >
                <Folder className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Card */}

      {/* Family Search */}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-5">
          اختيار الأسرة
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            بحث الأسرة
          </label>

          <input
            type="text"
            placeholder="ابحث برقم الملف أو رقم هوية رب الأسرة..."
            value={familySearch}
            onChange={(e) => {
              const value = e.target.value;
              setFamilySearch(value);

              /* إذا الحقل أصبح فارغ */
              if (!value.trim()) {
                setSelectedFamilyId("");

                setNationalId("");

                return;
              }
              const found = families.find(
                (f) =>
                  String(f.headNationalId) === value ||
                  String(f.fileNumber) === value,
              );

              if (found) {
                setSelectedFamilyId(String(found.id));
                setNationalId(found.headNationalId);
              } else {
                setSelectedFamilyId("");
                setNationalId("");
              }
            }}
            className="
w-full
h-12
px-4
rounded-xl
border
border-gray-200
bg-gray-50
text-sm
text-gray-700
placeholder:text-gray-400
focus:outline-none
focus:ring-2
focus:ring-green-500/20
focus:border-green-500
transition-all
"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              رقم الملف
            </label>

            <input
              type="text"
              placeholder="مثال: CA-0001"
              value={
                families.find(
                  (f) =>
                    String(f.headNationalId) ===
                    String(selectedFamily?.headNationalId),
                )?.fileNumber || "-"
              }
              readOnly
              className="
w-full
h-12
px-4
rounded-xl
border
border-gray-200
bg-gray-50
text-sm
text-gray-700
placeholder:text-gray-400
focus:outline-none
focus:ring-2
focus:ring-green-500/20
focus:border-green-500
transition-all
"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              رقم هوية رب الأسرة
            </label>

            <input
              type="text"
              placeholder="مثال:900955755"
              value={nationalId}
              readOnly
              onChange={(e) => {
                const value = e.target.value;
                setNationalId(value);

                const found = families.find((f) => f.headNationalId === value);

                if (found) {
                  setSelectedFamilyId(found ? String(found.id) : "");
                } else {
                  setSelectedFamilyId("");
                }
              }}
              className="
w-full
h-12
px-4
rounded-xl
border
border-gray-200
bg-gray-50
text-sm
text-gray-700
placeholder:text-gray-400
focus:outline-none
focus:ring-2
focus:ring-green-500/20
focus:border-green-500
transition-all
"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          يمكن البحث برقم الملف أو رقم هوية رب الأسرة وسيتم الربط تلقائياً
        </p>
      </div>
      {selectedFamily && (
        <div
          className="
      bg-white
      rounded-2xl
      shadow-sm
      border
      border-gray-100
      p-5
      mt-6
    "
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800">بيانات الأسرة</h2>

            <span className="text-xs font-medium text-gray-400">
              تم العثور على الأسرة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* رقم الملف */}
            <div className="group bg-green-50/60 rounded-2xl p-5 border border-green-100 min-h-[118px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex h-full items-start justify-between gap-4">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    رقم الملف
                  </p>

                  <h3 className="text-xl font-black text-green-600 leading-none">
                    {selectedFamily.fileNumber}
                  </h3>
                </div>

                <div className="w-12 h-12 shrink-0 bg-green-500 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* رقم الهوية */}
            <div className="group bg-blue-50/60 rounded-2xl p-5 border border-blue-100 min-h-[118px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex h-full items-start justify-between gap-4">
                <div className="text-right min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    رقم الهوية
                  </p>

                  <h3 className="text-lg font-black text-blue-600 leading-none truncate">
                    {selectedFamily.headNationalId}
                  </h3>
                </div>

                <div className="w-12 h-12 shrink-0 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* رب الأسرة */}
            <div className="group bg-purple-50/60 rounded-2xl p-5 border border-purple-100 min-h-[118px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex h-full items-start justify-between gap-4">
                <div className="text-right min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    رب الأسرة
                  </p>

                  <h3 className="text-base md:text-lg font-bold text-purple-600 leading-6">
                    {selectedFamily.headName}
                  </h3>
                </div>

                <div className="w-12 h-12 shrink-0 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* عدد الأفراد */}
            <div className="group bg-orange-50/60 rounded-2xl p-5 border border-orange-100 min-h-[118px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex h-full items-start justify-between gap-4">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    عدد الأفراد
                  </p>

                  <div className="flex items-baseline gap-1.5 text-orange-500">
                    <span className="text-2xl font-black leading-none">
                      {selectedFamily.membersCount}
                    </span>

                    <span className="text-sm font-semibold opacity-80">
                      أفراد
                    </span>
                  </div>
                </div>

                <div className="w-12 h-12 shrink-0 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <UserCog className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Upload Documents */}
          <div
            className="
        bg-white
        rounded-3xl
        shadow-sm
        border
        border-gray-100
        p-6
        mt-8
        hover:-translate-y-1
        transition-all
        duration-300
      "
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              {/* إجمالي الوثائق */}
              <div className="group bg-blue-50/60 border border-blue-100 rounded-2xl p-4 md:p-5 min-h-[108px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    إجمالي الوثائق
                  </p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-black text-blue-600 leading-none">
                      {totalDocuments}
                    </span>

                    <span className="text-sm font-medium text-blue-600">
                      وثيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* الوثائق المقبولة */}
              <div className="group bg-green-50/60 border border-green-100 rounded-2xl p-4 md:p-5 min-h-[108px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    مقبولة
                  </p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-black text-green-600 leading-none">
                      {acceptedDocuments}
                    </span>

                    <span className="text-sm font-medium text-green-600">
                      وثيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* الوثائق قيد المراجعة */}
              <div className="group bg-amber-50/60 border border-amber-100 rounded-2xl p-4 md:p-5 min-h-[108px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    قيد المراجعة
                  </p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-black text-amber-600 leading-none">
                      {pendingDocuments}
                    </span>

                    <span className="text-sm font-medium text-amber-600">
                      وثيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* الوثائق المرفوضة */}
              <div className="group bg-red-50/60 border border-red-100 rounded-2xl p-4 md:p-5 min-h-[108px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    مرفوضة
                  </p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl md:text-3xl font-black text-red-600 leading-none">
                      {rejectedDocuments}
                    </span>

                    <span className="text-sm font-medium text-red-600">
                      وثيقة
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800">
                  رفع الوثائق
                </h2>

                <p className="text-xs md:text-sm text-gray-400 mt-1">
                  ارفع ملفات الأسرة وربطها بالملف الحالي
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>

            {/* نوع الوثيقة */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                نوع الوثيقة
              </label>

              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="
            w-full
            h-11
            px-4
            rounded-xl
            border
            border-gray-200
            bg-gray-50
            text-sm
            text-gray-700
            focus:outline-none
            focus:ring-2
            focus:ring-green-500
            transition-all
          "
              >
                <option value="" disabled>
                  اختر نوع الوثيقة
                </option>

                <option value="هوية شخصية">هوية شخصية</option>
                <option value="تقرير طبي">تقرير طبي</option>
                <option value="شهادة ميلاد">شهادة ميلاد</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            {/* رفع الملفات */}
            <label
              className={`
    group
    min-h-[190px]
    border-2
    border-dashed
    rounded-2xl
    px-6
    py-8
    flex
    flex-col
    items-center
    justify-center
    text-center
    transition-all
    duration-200
    ${
      uploading
        ? "cursor-not-allowed border-green-200 bg-green-50/30"
        : "cursor-pointer border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30"
    }
  `}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
                  </div>

                  <h3 className="font-bold text-gray-700 text-base">
                    جاري رفع الوثائق...
                  </h3>

                  <p className="text-xs text-gray-400 mt-1.5">
                    يرجى الانتظار حتى يكتمل رفع الملفات
                  </p>
                </>
              ) : (
                <>
                  <div
                    className="
        w-12
        h-12
        rounded-xl
        bg-green-100
        flex
        items-center
        justify-center
        mb-3
        transition-transform
        duration-200
        group-hover:scale-105
      "
                  >
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>

                  <h3 className="font-bold text-gray-700 text-base">
                    اسحب الملفات هنا
                  </h3>

                  <p className="text-xs text-gray-400 mt-1.5">
                    أو اضغط لاختيار ملفات من الجهاز
                  </p>

                  <p className="text-[11px] text-gray-300 mt-3">
                    PDF • JPG • PNG • DOCX
                  </p>
                </>
              )}
            </label>

            {/* Documents Loading + Content */}
            <div className="relative mt-8 min-h-[120px]">
              {/* Loading Overlay */}
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 transition-opacity duration-300 ease-out ${
                  documentsLoading
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

                  <p className="text-sm font-medium text-gray-500">
                    جاري تحميل الوثائق...
                  </p>
                </div>
              </div>

              {/* Documents Content */}
              <div
                className={`transition-opacity duration-300 ease-out ${
                  documentsLoading ? "opacity-0" : "opacity-100"
                }`}
              >
                {!documentsLoading && documents.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/50 py-14 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-7 w-7 text-gray-400" />
                    </div>

                    <p className="font-bold text-gray-600">
                      لا توجد وثائق مسجلة حاليًا
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      ارفع أول وثيقة لبدء إدارة وثائق الأسرة.
                    </p>
                  </div>
                )}
                {documents.length > 0 && (
                  <div>
                    <h3
                      className="
                  font-bold
                  text-gray-700
                  mb-4
                "
                    >
                      <div className="flex gap-4 mb-6">
                        <input
                          type="text"
                          placeholder="بحث باسم الوثيقة..."
                          value={documentSearch}
                          onChange={(e) => setDocumentSearch(e.target.value)}
                          className="
                      flex-1
                      h-12
                      px-4
                      rounded-2xl
                      border
                      border-gray-200
                      bg-gray-50
                      focus:ring-2
                      focus:ring-green-500
                      outline-none
                      transition-all
                    "
                        />

                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="
                      h-12
                      px-4
                      rounded-2xl
                      border
                      border-gray-200
                      bg-gray-50
                      focus:ring-2
                      focus:ring-green-500
                      outline-none
                      transition-all
                    "
                        >
                          <option>الكل</option>
                          <option>مقبولة</option>
                          <option>مرفوضة</option>
                          <option>قيد المراجعة</option>
                        </select>
                      </div>
                      الملفات المرفوعة
                    </h3>

                    {/* Progress */}
                    <div className="mb-6 bg-gray-50/50 rounded-2xl border border-gray-100 p-4 md:p-5">
                      <h4 className="text-sm font-bold text-gray-700 mb-3">
                        الوثائق المكتملة
                      </h4>

                      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${progressPercentage}%`,
                          }}
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        {completedDocuments} من {requiredDocuments} وثائق (
                        {Math.round(progressPercentage)}%)
                      </p>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-3">
                      {familyDocuments.map((doc, index) => (
                        <div
                          key={`${doc.id}-${index}`}
                          className="
                      bg-white
                      border
                      border-gray-100
                      rounded-2xl
                      p-4
                      md:p-5
                      shadow-sm
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:shadow-md
                    "
                        >
                          {/* معلومات الملف */}
                          <div className="flex items-start justify-between gap-4">
                            {/* اسم الملف + الأيقونة */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className="
                            w-11
                            h-11
                            shrink-0
                            rounded-xl
                            bg-blue-50
                            flex
                            items-center
                            justify-center
                          "
                              >
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>

                              <div className="min-w-0 text-right">
                                <h4
                                  className="
                              text-sm
                              font-bold
                              text-gray-800
                              truncate
                            "
                                >
                                  {doc.name}
                                </h4>

                                <p className="text-xs text-green-600 mt-1">
                                  {doc.type}
                                </p>

                                <p className="text-[11px] text-gray-400 mt-1">
                                  {new Date(doc.uploadedAt).toLocaleString(
                                    "ar-IQ",
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* حالة الوثيقة */}
                            <span
                              className={`
                          shrink-0
                          text-[11px]
                          px-3
                          py-1.5
                          rounded-full
                          font-medium
                          ${
                            doc.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : doc.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }
                        `}
                            >
                              {doc.status === "approved" && "✓ "}
                              {doc.status === "rejected" && "✕ "}
                              {doc.status === "pending" && "⏳ "}

                              {documentStatusLabels[doc.status]}
                            </span>
                          </div>

                          {/* الإجراءات */}
                          <div
                            className="
                        flex
                        flex-wrap
                        items-center
                        justify-between
                        gap-3
                        mt-4
                        pt-4
                        border-t
                        border-gray-100
                      "
                          >
                            {/* المعاينة والتحميل */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => previewDocument(doc)}
                                disabled={previewingDocumentId !== null}
                                className="
    min-w-[90px]
    px-3
    py-2
    rounded-xl
    bg-blue-50
    text-blue-600
    text-xs
    font-medium
    hover:bg-blue-100
    transition-all
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
                              >
                                {previewingDocumentId === doc.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                                    جاري المعاينة...
                                  </span>
                                ) : (
                                  "👁 معاينة"
                                )}
                              </button>

                              <button
                                onClick={() => downloadDocument(doc)}
                                disabled={downloadingDocumentId !== null}
                                className="
    min-w-[90px]
    px-3
    py-2
    rounded-xl
    bg-green-50
    text-green-600
    text-xs
    font-medium
    hover:bg-green-100
    transition-all
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
                              >
                                {downloadingDocumentId === doc.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />
                                    جاري التحميل...
                                  </span>
                                ) : (
                                  "⬇ تحميل"
                                )}
                              </button>
                            </div>

                            {/* إجراءات المدير */}
                            {(currentUser?.role === "admin" ||
                              currentUser?.role === "representative") && (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() =>
                                    changeDocumentStatus(doc.id, "approved")
                                  }
                                  disabled={updatingStatus !== null}
                                  className="
    min-w-[90px]
    px-3
    py-2
    rounded-xl
    bg-green-100
    text-green-700
    text-xs
    font-medium
    hover:bg-green-200
    transition-all
    disabled:cursor-not-allowed
    disabled:opacity-40
  "
                                >
                                  {updatingStatus?.id === doc.id &&
                                  updatingStatus.status === "approved" ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />
                                      جاري التحديث...
                                    </span>
                                  ) : (
                                    "✓ قبول"
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    changeDocumentStatus(doc.id, "rejected")
                                  }
                                  disabled={updatingStatus !== null}
                                  className="
    min-w-[90px]
    px-3
    py-2
    rounded-xl
    bg-red-100
    text-red-700
    text-xs
    font-medium
    hover:bg-red-200
    transition-all
    disabled:cursor-not-allowed
    disabled:opacity-40
  "
                                >
                                  {updatingStatus?.id === doc.id &&
                                  updatingStatus.status === "rejected" ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-700" />
                                      جاري التحديث...
                                    </span>
                                  ) : (
                                    "✕ رفض"
                                  )}
                                </button>

                                <button
                                  onClick={() =>
                                    changeDocumentStatus(doc.id, "pending")
                                  }
                                  disabled={updatingStatus !== null}
                                  className="
    min-w-[90px]
    px-3
    py-2
    rounded-xl
    bg-amber-100
    text-amber-700
    text-xs
    font-medium
    hover:bg-amber-200
    transition-all
    disabled:cursor-not-allowed
    disabled:opacity-40
  "
                                >
                                  {updatingStatus?.id === doc.id &&
                                  updatingStatus.status === "pending" ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-amber-700" />
                                      جاري التحديث...
                                    </span>
                                  ) : (
                                    "⏳ مراجعة"
                                  )}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(doc.id)}
                                  className="
                              px-3
                              py-2
                              rounded-xl
                              bg-gray-100
                              text-red-600
                              text-xs
                              font-medium
                              hover:bg-red-100
                              hover:text-red-700
                              transition-all
                            "
                                >
                                  🗑 حذف
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!documentsLoading &&
                  documents.length > 0 &&
                  familyDocuments.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/50 py-14 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                        <Search className="h-7 w-7 text-gray-400" />
                      </div>

                      <p className="font-bold text-gray-600">
                        لا توجد وثائق مطابقة
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        جرّب تغيير الأسرة أو البحث أو فلتر الحالة.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
      {previewFile && (
        <div
          className="
fixed
inset-0
bg-black/50
flex
items-center
justify-center
z-50
"
        >
          <div
            className="
bg-white
rounded-3xl
w-[90%]
h-[90%]
p-4
relative
"
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="
absolute
top-4
left-4
text-red-500
font-bold
"
            >
              ✕ إغلاق
            </button>

            <iframe
              src={URL.createObjectURL(previewFile)}
              className="w-full h-full rounded-xl"
            />
          </div>
        </div>
      )}
      <div
        className="
    bg-white
    rounded-3xl
    p-6
    shadow-sm
    border
    border-gray-100
    mt-8
  "
      >
        <h3
          className="
      font-bold
      text-lg
      mb-6
      text-gray-900
    "
        >
          آخر النشاطات
        </h3>

        <div className="relative pr-6">
          {/* الخط الزمني */}
          <div
            className="
        absolute
        right-2
        top-2
        bottom-2
        w-px
        bg-gray-200
      "
          />

          <div className="space-y-6">
            {activities.slice(0, 5).map((activity, index) => {
              const isRejected = activity.message.includes("مرفوضة");
              const isApproved = activity.message.includes("اعتماد");
              const isReview = activity.message.includes("المراجعة");

              const dotClass = isRejected
                ? "bg-red-500 ring-red-100"
                : isApproved
                  ? "bg-green-500 ring-green-100"
                  : isReview
                    ? "bg-orange-500 ring-orange-100"
                    : "bg-blue-500 ring-blue-100";

              return (
                <div
                  key={`${activity.id}-${index}`}
                  className="
              relative
              min-h-[52px]
            "
                >
                  {/* نقطة النشاط */}
                  <div
                    className={`
                absolute
                right-[-1px]
                top-1
                w-3
                h-3
                rounded-full
                ring-4
                ${dotClass}
              `}
                  />

                  {/* محتوى النشاط */}
                  <div className="pr-6">
                    <p
                      className="
                  text-sm
                  font-medium
                  text-gray-800
                  leading-6
                "
                    >
                      {activity.message}
                    </p>

                    <span
                      className="
                  mt-1
                  block
                  text-xs
                  text-gray-400
                "
                    >
                      {activity.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {deleteConfirm !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <span className="text-3xl">🗑</span>
                </div>

                <h3 className="mb-2 text-lg font-black text-gray-900">
                  تأكيد حذف الوثيقة
                </h3>

                <p className="mb-6 text-sm leading-6 text-gray-500">
                  هل أنت متأكد من حذف هذه الوثيقة؟
                  <br />
                  سيتم حذفها من سجل الوثائق ولا يمكن التراجع عن هذه العملية.
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deletingDocumentId !== null}
                    className="rounded-xl border border-gray-200 px-6 py-2.5 font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteDocument(deleteConfirm)}
                    disabled={deletingDocumentId !== null}
                    className="rounded-xl bg-red-500 px-6 py-2.5 font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {deletingDocumentId === deleteConfirm ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-white" />
                        جاري حذف الوثيقة...
                      </span>
                    ) : (
                      "حذف الوثيقة"
                    )}
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
