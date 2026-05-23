import { useState, useEffect } from "react";
import { FileText, Users, Folder, Shield, UserCog } from "lucide-react";
import { useApp } from "../context/AppContext";

type Activity = {
  id: string;

  message: string;

  time: string;
};

export default function DocumentsPage() {
  const { families, currentUser } = useApp();

  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const selectedFamily =
    families.find((f) => String(f.id) === String(selectedFamilyId)) || null;

  const [nationalId, setNationalId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [documentSearch, setDocumentSearch] = useState("");
  const [activities, setActivities] = useState<Activity[]>(() => {
    const savedActivities = localStorage.getItem("activities");

    return savedActivities ? JSON.parse(savedActivities) : [];
  });

  type UploadedDocument = {
    id: string;
    familyId: string;

    headNationalId: string;

    fileNumber?: string;
    name: string;
    type: string;
    size: number;
    uploadDate: string;
    fileUrl: string;

    status: "قيد المراجعة" | "مقبولة" | "مرفوضة";
  };

  const [documents, setDocuments] = useState<UploadedDocument[]>(() => {
    const savedDocuments = localStorage.getItem("documents");

    return savedDocuments ? JSON.parse(savedDocuments) : [];
  });
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const acceptedDocuments = documents.filter(
    (doc) => doc.status === "مقبولة",
  ).length;

  const pendingDocuments = documents.filter(
    (doc) => doc.status === "قيد المراجعة",
  ).length;

  const rejectedDocuments = documents.filter(
    (doc) => doc.status === "مرفوضة",
  ).length;

  const handleFileRead = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.readAsDataURL(file);
    });
  };
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedFamily) return;

    /* منع الرفع بدون اختيار نوع */

    if (!documentType) {
      alert("يرجى اختيار نوع الوثيقة أولاً");

      return;
    }

    const uploadedFiles = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB

    const largeFile = uploadedFiles.find((file) => file.size > maxSize);

    if (largeFile) {
      alert("حجم الملف يجب ألا يتجاوز 5MB");
      return;
    }
    const duplicateDocument = documents.find(
      (doc) =>
        String(doc.headNationalId) === String(selectedFamily?.headNationalId) &&
        doc.type === documentType &&
        documentType !== "أخرى",
    );

    if (duplicateDocument) {
      alert("هذه الوثيقة مرفوعة مسبقاً لهذه الأسرة");

      return;
    }

    const newDocuments = await Promise.all(
      uploadedFiles.map(async (file) => ({
        id: Date.now().toString() + Math.random(),

        familyId: selectedFamily.id,

        headNationalId: selectedFamily.headNationalId,

        name: file.name,

        type: documentType,

        size: file.size,

        uploadDate: new Date().toISOString(),

        fileUrl: await handleFileRead(file),

        status: "قيد المراجعة" as const,
      })),
    );
    setDocuments((prev) => [...prev, ...newDocuments]);
  };
  const changeDocumentStatus = (
    id: string,
    status: "قيد المراجعة" | "مقبولة" | "مرفوضة",
  ) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status } : doc)),
    );

    setActivities((prev) => [
      {
        id: Date.now().toString(),
        message: `تم تغيير الحالة إلى ${status}`,
        time: new Date().toLocaleTimeString("ar"),
      },
      ...prev,
    ]);
  };
  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const downloadDocument = (doc: UploadedDocument) => {
    const link = document.createElement("a");

    link.href = doc.fileUrl;

    link.download = doc.name;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  const previewDocument = (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  const familyDocuments = documents
    .filter(
      (doc) =>
        String(doc.headNationalId) === String(selectedFamily?.headNationalId),
    )
    .filter(
      (doc) =>
        !documentSearch ||
        doc.name.toLowerCase().includes(documentSearch.toLowerCase()),
    )
    .filter((doc) =>
      statusFilter === "الكل" ? true : doc.status === statusFilter,
    )
    .sort(
      (a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    );
  const totalFamilies = families.length;

  const totalDocuments = documents.length;

  const linkedFamilies = new Set(
    documents.map((doc) => String(doc.headNationalId)),
  );
  const requiredDocuments = 5;

  const completedDocuments = familyDocuments.filter(
    (doc) => doc.status === "مقبولة",
  ).length;

  const progressPercentage = (completedDocuments / requiredDocuments) * 100;
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("activities", JSON.stringify(activities));
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Hero + Stats */}

      <div className="space-y-6 px-2 md:px-3">
        {/* Hero */}

        <div
          className="
relative
overflow-hidden
rounded-3xl
bg-gradient-to-l
from-green-700
via-green-600
to-green-500
px-8
py-7
shadow-lg
border
border-green-500/20
"
        >
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-black/5 rounded-full" />

          <div className="relative flex items-center justify-between gap-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                إدارة الوثائق
              </h1>

              <p className="text-green-100 text-base">
                ربط ملفات الأسر وإدارة الوثائق بصورة احترافية
              </p>

              <div className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur">
                <FileText className="w-5 h-5 text-white" />

                <span className="text-sm text-white">
                  إدارة مركزية لوثائق الأسر والملفات المرتبطة
                </span>
              </div>
            </div>

            <div
              className="
          w-24
          h-24
          rounded-[30px]
          bg-white/20
          backdrop-blur
          flex
          items-center
          justify-center
          shadow-2xl
        "
            >
              <FileText className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* الأسر */}

          <div className="bg-green-50 border border-green-100 rounded-3xl p-5 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">إجمالي الأسر</p>

                <h3 className="text-3xl font-black text-green-600 mt-2">
                  {totalFamilies}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-green-500 shadow-lg flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* الوثائق */}

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">إجمالي الوثائق</p>

                <h3 className="text-3xl font-black text-blue-600 mt-2">
                  {totalDocuments}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-blue-500 shadow-lg flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* المرتبطة */}

          <div className="bg-orange-50 border border-orange-100 rounded-3xl p-5 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">الأسر المرتبطة</p>

                <h3 className="text-3xl font-black text-orange-500 mt-2">
                  {linkedFamilies}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-orange-500 shadow-lg flex items-center justify-center">
                <Folder className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Card */}

      {/* Family Search */}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-black text-gray-800 mb-6">
          اختيار الأسرة
        </h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                setSelectedFamilyId(found.id);

                setNationalId(found.headNationalId);
              } else {
                setSelectedFamilyId("");

                setNationalId("");
              }

              if (found) {
                setSelectedFamilyId(found?.id || "");

                setNationalId(found.headNationalId);
              } else {
                setSelectedFamilyId("");

                setNationalId("");
              }
            }}
            className="
w-full
h-14
px-5
rounded-xl
border
border-gray-200
bg-gray-50
focus:outline-none
focus:ring-2
focus:ring-green-500
"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              className="w-full h-14 px-5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  setSelectedFamilyId(found?.id || "");
                } else {
                  setSelectedFamilyId("");
                }
              }}
              className="w-full h-14 px-5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
      rounded-3xl
      shadow-sm
      border
      border-gray-100
      p-5
      mt-8
      hover:-translate-y-1
      hover:shadow-lg
      transition-all
      duration-300
    "
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800">بيانات الأسرة</h2>

            <span className="text-xs text-gray-400">تم العثور على الأسرة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* رقم الملف */}

            <div className="bg-green-50 rounded-2xl p-4 border border-green-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">رقم الملف</p>

                  <h3 className="text-xl font-extrabold text-green-600">
                    {selectedFamily.fileNumber}
                  </h3>
                </div>

                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* رقم الهوية */}

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">رقم الهوية</p>

                  <h3 className="text-lg font-bold text-blue-600 truncate">
                    {selectedFamily.headNationalId}
                  </h3>
                </div>

                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* رب الأسرة */}

            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">رب الأسرة</p>

                  <h3 className="text-lg font-bold text-purple-600 leading-normal">
                    {selectedFamily.headName}
                  </h3>
                </div>

                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* عدد الأفراد */}

            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">عدد الأفراد</p>

                  <h3 className="text-xl font-bold text-orange-500">
                    {selectedFamily.membersCount}
                  </h3>
                </div>

                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <UserCog className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Upload Documents */}

          {selectedFamily && (
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-xs text-gray-500 mb-2">إجمالي الوثائق</p>

                  <h3 className="text-2xl font-bold text-blue-600">
                    {totalDocuments}
                  </h3>
                </div>

                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-xs text-gray-500 mb-2">مقبولة</p>

                  <h3 className="text-2xl font-bold text-green-600">
                    {acceptedDocuments}
                  </h3>
                </div>

                <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                  <p className="text-xs text-gray-500 mb-2">قيد المراجعة</p>

                  <h3 className="text-2xl font-bold text-yellow-600">
                    {pendingDocuments}
                  </h3>
                </div>

                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-xs text-gray-500 mb-2">مرفوضة</p>

                  <h3 className="text-2xl font-bold text-red-600">
                    {rejectedDocuments}
                  </h3>
                </div>
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">
                    رفع الوثائق
                  </h2>

                  <p className="text-sm text-gray-400 mt-1">
                    ارفع ملفات الأسرة وربطها بالملف الحالي
                  </p>
                </div>

                <div
                  className="
w-12 h-12
rounded-2xl
bg-green-100
flex items-center justify-center
shadow-sm
"
                >
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>

              {/* نوع الوثيقة */}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  نوع الوثيقة
                </label>

                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="
w-full
h-12
px-4
rounded-2xl
border
border-gray-200
bg-gray-50
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

              <label
                className="
group
border-2
border-dashed
border-gray-200
rounded-3xl
py-10
px-6
flex
flex-col
items-center
justify-center
cursor-pointer
transition-all
duration-300
hover:border-green-400
hover:bg-green-50/40
"
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />

                <div
                  className="
w-16
h-16
rounded-2xl
bg-green-100
flex
items-center
justify-center
mb-4
group-hover:scale-110
transition-all
duration-300
"
                >
                  <FileText
                    className="
w-8
h-8
text-green-600
"
                  />
                </div>

                <h3
                  className="
font-bold
text-gray-700
text-lg
"
                >
                  اسحب الملفات هنا
                </h3>

                <p
                  className="
text-sm
text-gray-400
mt-2
"
                >
                  أو اضغط لاختيار ملفات من الجهاز
                </p>

                <p
                  className="
text-xs
text-gray-300
mt-4
"
                >
                  PDF • JPG • PNG • DOCX
                </p>
              </label>

              {documents.length > 0 && (
                <div className="mt-8">
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

                  <div className="mb-6 bg-white rounded-2xl border p-5">
                    <h4 className="font-bold text-gray-700 mb-3">
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

                    <p className="text-sm text-gray-500 mt-2">
                      {completedDocuments} من {requiredDocuments} وثائق (
                      {Math.round(progressPercentage)}%)
                    </p>
                  </div>

                  <div className="space-y-3">
                    {familyDocuments.map((doc, index) => (
                      <div key={`${doc.id}-${index}`}>
                        {/* أعلى البطاقة */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="
w-12
h-12
rounded-2xl
bg-blue-50
flex
items-center
justify-center
"
                            >
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>

                            <div>
                              <h4
                                className="
text-sm
font-semibold
text-gray-800
truncate
max-w-[180px]
"
                              >
                                {doc.name}
                              </h4>

                              <p
                                className="
text-xs
text-green-600
mt-1
"
                              >
                                {doc.type}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`
text-xs
px-3
py-1
rounded-full
font-medium

${
  doc.status === "مقبولة"
    ? "bg-green-100 text-green-700"
    : doc.status === "مرفوضة"
      ? "bg-red-100 text-red-700"
      : "bg-orange-100 text-orange-700"
}
`}
                          >
                            {doc.status === "مقبولة" && "✅ "}
                            {doc.status === "مرفوضة" && "❌ "}
                            {doc.status === "قيد المراجعة" && "⏳ "}

                            {doc.status}
                          </span>
                        </div>
                        {/* معلومات الملف */}
                        <div
                          className="
flex
justify-between
text-xs
text-gray-500
mb-4
"
                        >
                          <span>{(doc.size / 1024).toFixed(0)} KB</span>

                          <span>{doc.uploadDate}</span>
                        </div>
                        {/* الأزرار */}
                        <div
                          className="
flex
items-center
justify-between
border-t
pt-3
"
                        >
                          <button
                            onClick={() => previewDocument(doc.fileUrl)}
                            className="
text-blue-600
text-sm
hover:text-blue-700
transition-all
"
                          >
                            👁 معاينة
                          </button>

                          <button
                            onClick={() => downloadDocument(doc)}
                            className="
text-green-600
hover:text-green-700
transition-all
"
                          >
                            ⬇ تحميل
                          </button>

                          {currentUser?.role === "admin" && (
                            <div className="flex gap-2 mt-4 flex-wrap">
                              <button
                                onClick={() =>
                                  changeDocumentStatus(doc.id, "مقبولة")
                                }
                                className="
px-3 py-2
rounded-xl
bg-green-100
text-green-700
hover:bg-green-200
transition-all
text-sm
"
                              >
                                ✓ قبول
                              </button>

                              <button
                                onClick={() =>
                                  changeDocumentStatus(doc.id, "مرفوضة")
                                }
                                className="
px-3 py-2
rounded-xl
bg-red-100
text-red-700
hover:bg-red-200
transition-all
text-sm
"
                              >
                                ✗ رفض
                              </button>

                              <button
                                onClick={() =>
                                  changeDocumentStatus(doc.id, "قيد المراجعة")
                                }
                                className="
px-3 py-2
rounded-xl
bg-orange-100
text-orange-700
hover:bg-orange-200
transition-all
text-sm
"
                              >
                                ⏳ مراجعة
                              </button>

                              <button
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    "هل تريد حذف الوثيقة؟",
                                  );

                                  if (confirmed) {
                                    deleteDocument(doc.id);
                                  }
                                }}
                                className="
px-3 py-2
rounded-xl
bg-gray-100
text-red-600
hover:bg-red-100
hover:text-red-700
transition-all
text-sm
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
            </div>
          )}
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
mb-4
"
        >
          آخر النشاطات
        </h3>

        <div className="space-y-3">
          {activities.slice(0, 5).map((activity, index) => (
            <div
              key={`${activity.id}-${index}`}
              className="
p-3
rounded-2xl
bg-gray-50
hover:bg-gray-100
transition-all
"
            >
              <p className="text-sm">{activity.message}</p>

              <span
                className="
text-xs
text-gray-400
"
              >
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
