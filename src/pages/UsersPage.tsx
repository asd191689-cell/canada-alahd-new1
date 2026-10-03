import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCog,
  UserRound,
  Check,
  X,
} from "lucide-react";
import AccessDenied from "../components/AccessDenied";
import { hasPermission } from "../utils/permissions";
import { api } from "../api/apiClient";
import { toast } from "sonner";

interface User {
  id: number;
  name: string;
  username: string;
  role: "admin" | "representative" | "employee";
  created_at: string;
}

export default function UsersPage() {
  const { currentUser } = useApp();
  const canAccessUsers =
    currentUser &&
    hasPermission(
      currentUser.role as "admin" | "representative" | "employee",
      "users",
    );
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "employee" as "admin" | "representative" | "employee",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "employee" as "admin" | "representative" | "employee",
  });

  if (!canAccessUsers) {
    return (
      <AccessDenied
        title="غير مخول للوصول"
        message="هذه الصفحة متاحة فقط لمدير النظام."
      />
    );
  }

  /*
  =======================================
  LOAD USERS
  =======================================
  */

  const fetchUsers = async () => {
    try {
      const data = await api.get("/users");

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("LOAD USERS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /*
  =======================================
  ADD USER
  =======================================
  */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      await api.post("/auth/register", {
        full_name: form.name,
        username: form.username,
        password: form.password,
        role: form.role,
      });

      await fetchUsers();

      setForm({
        name: "",
        username: "",
        password: "",
        role: "employee",
      });

      setShowAdd(false);
      setShowPassword(false);

      toast.success("تمت إضافة المستخدم بنجاح", {
        description: "تم إنشاء حساب المستخدم وإضافته إلى النظام.",
      });
    } catch (error) {
      console.error("ADD USER ERROR:", error);

      toast.error("تعذر إضافة المستخدم", {
        description: "تأكد من البيانات المدخلة ثم حاول مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };
  /*
=======================================
OPEN EDIT USER
=======================================
*/

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);

    setEditForm({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role,
    });

    setShowEditPassword(false);
    setShowEdit(true);
  };
  /*
=======================================
UPDATE USER
=======================================
*/

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || saving) return;

    if (editForm.password && editForm.password.length < 6) {
      toast.error("كلمة المرور قصيرة", {
        description: "يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.",
      });
      return;
    }

    setSaving(true);

    try {
      await api.put(`/users/${selectedUser.id}`, {
        full_name: editForm.name,
        username: editForm.username,
        role: editForm.role,
        password: editForm.password,
      });

      await fetchUsers();

      setShowEdit(false);
      setSelectedUser(null);
      setShowEditPassword(false);

      setEditForm({
        name: "",
        username: "",
        password: "",
        role: "employee",
      });

      toast.success("تم تعديل المستخدم بنجاح", {
        description: "تم حفظ بيانات المستخدم والتغييرات الجديدة.",
      });
    } catch (error) {
      console.error("UPDATE USER ERROR:", error);

      toast.error("تعذر تعديل المستخدم", {
        description: "تأكد من البيانات المدخلة ثم حاول مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };
  /*
=======================================
VIEW USER DETAILS
=======================================
*/

  const handleOpenDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  /*
  =======================================
  DELETE USER
  =======================================
  */

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);

      setUsers((prev) => prev.filter((u) => u.id !== id));

      setDeleteConfirm(null);

      toast.success("تم حذف المستخدم بنجاح", {
        description: "تمت إزالة المستخدم من النظام.",
      });
    } catch (error) {
      console.error("DELETE USER ERROR:", error);

      toast.error("تعذر حذف المستخدم", {
        description: "حدث خطأ أثناء الحذف. حاول مرة أخرى.",
      });
    }
  };

  /*
  =======================================
  ACCESS CONTROL
  =======================================
  */

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold">
        جاري تحميل المستخدمين...
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900 leading-tight">
            إدارة المستخدمين والصلاحيات
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            {users.length} مستخدمين مسجلين
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 gradient-green text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة مستخدم
        </button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* مدير النظام */}
        <div className="relative overflow-hidden rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-yellow-200">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-yellow-400" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-yellow-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-yellow-600" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-gray-500">مدير النظام</p>
              <p className="text-2xl font-black text-yellow-600 leading-none mt-1">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </div>
        </div>

        {/* مدير المخيم */}
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-200">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-blue-500" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-blue-600" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-gray-500">مدير المخيم</p>
              <p className="text-2xl font-black text-blue-600 leading-none mt-1">
                {users.filter((u) => u.role === "representative").length}
              </p>
            </div>
          </div>
        </div>

        {/* الموظفون */}
        <div className="relative overflow-hidden rounded-xl border border-green-100 bg-green-50 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-green-200">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-green-500" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-green-100 flex items-center justify-center">
              <UserRound className="w-5 h-5 text-green-600" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-gray-500">موظف</p>
              <p className="text-2xl font-black text-green-600 leading-none mt-1">
                {users.filter((u) => u.role === "employee").length}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Users */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((user) => {
          const isAdmin = user.role === "admin";
          const isRepresentative = user.role === "representative";

          const roleStyles = isAdmin
            ? {
                accent: "bg-yellow-400",
                hoverBorder: "hover:border-yellow-200",
                avatar: "bg-gradient-to-br from-green-500 to-emerald-700",
                roleBadge: "bg-yellow-100 text-yellow-700",
              }
            : isRepresentative
              ? {
                  accent: "bg-cyan-500",
                  hoverBorder: "hover:border-cyan-200",
                  avatar: "bg-gradient-to-br from-cyan-500 to-sky-700",
                  roleBadge: "bg-cyan-100 text-cyan-700",
                }
              : {
                  accent: "bg-green-500",
                  hoverBorder: "hover:border-green-200",
                  avatar: "bg-gradient-to-br from-blue-500 to-indigo-700",
                  roleBadge: "bg-green-100 text-green-700",
                };

          return (
            <div
              key={user.id}
              className={`
          group
          relative overflow-hidden
          bg-white
          rounded-2xl
          border border-gray-100
          p-5
          shadow-sm

          transition-all duration-200 ease-out

          hover:-translate-y-1
          hover:shadow-lg

          ${roleStyles.hoverBorder}
        `}
            >
              {/* Role Accent */}
              <div
                className={`
            absolute top-0 inset-x-0
            h-0.5
            ${roleStyles.accent}
            transition-all duration-200
            group-hover:h-1
          `}
              />

              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className={`
                w-12 h-12
                shrink-0
                rounded-xl
                flex items-center justify-center

                font-black text-xl text-white
                shadow-sm

                transition-all duration-200
                group-hover:scale-105
                group-hover:shadow-md

                ${roleStyles.avatar}
              `}
                  >
                    {(user.name || user.username)
                      ?.trim()
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {user.name}
                    </p>

                    <p className="text-xs text-gray-400 font-mono mt-1 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>

                {/* User Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* View */}
                  <button
                    onClick={() => handleOpenDetails(user)}
                    className="
      text-gray-300
      hover:text-blue-500
      hover:bg-blue-50
      p-1.5
      rounded-lg
      transition-all duration-200
    "
                    title="عرض تفاصيل المستخدم"
                    aria-label="عرض تفاصيل المستخدم"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="
      text-gray-300
      hover:text-green-500
      hover:bg-green-50
      p-1.5
      rounded-lg
      transition-all duration-200
    "
                    title="تعديل المستخدم"
                    aria-label="تعديل المستخدم"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  {user.id !== Number(currentUser?.id) && (
                    <button
                      onClick={() => setDeleteConfirm(user.id)}
                      className="
        text-gray-300
        hover:text-red-500
        hover:bg-red-50
        p-1.5
        rounded-lg
        transition-all duration-200
      "
                      title="حذف المستخدم"
                      aria-label="حذف المستخدم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400">الدور</span>

                <span
                  className={`
              text-xs
              px-2.5 py-1
              rounded-lg
              font-bold
              transition-colors
              ${roleStyles.roleBadge}
            `}
                >
                  {isAdmin
                    ? "👑 مدير النظام"
                    : isRepresentative
                      ? "👤 مدير المخيم"
                      : "👤 موظف"}
                </span>
              </div>

              {/* Created Date */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">تاريخ الإنشاء</span>

                <span className="text-xs font-semibold text-gray-600">
                  {new Date(user.created_at).toLocaleDateString("ar-IQ")}
                </span>
              </div>

              {/* Current User */}
              {user.id === Number(currentUser?.id) && (
                <div
                  className="
              mt-3
              bg-green-50
              border border-green-100
              rounded-xl
              px-3 py-2
              flex items-center gap-2
            "
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full pulse-green" />

                  <span className="text-xs text-green-700 font-semibold">
                    متصل الآن
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  {/* Permissions */}
                  <div
                    className="
                bg-gray-50
                rounded-xl
                px-3 py-2.5
                text-center
                transition-colors duration-200
                group-hover:bg-gray-50/80
              "
                  >
                    <p className="text-xs text-gray-400 mb-1">الصلاحيات</p>

                    <p className="font-bold text-xs text-gray-700">
                      {isAdmin ? "كاملة" : "محدودة"}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className="
                bg-gray-50
                rounded-xl
                px-3 py-2.5
                text-center
                transition-colors duration-200
                group-hover:bg-green-50/60
              "
                  >
                    <p className="text-xs text-gray-400 mb-1">الحالة</p>

                    <p className="font-bold text-xs text-green-600">نشط</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Permissions Table */}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              مقارنة الصلاحيات
            </h3>

            <p className="text-xs text-gray-400 mt-1">
              مقارنة صلاحيات الأدوار داخل النظام
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70">
                <th className="p-4 text-right font-bold text-gray-700">
                  الصلاحية
                </th>

                <th className="p-4 text-center font-bold text-gray-700">
                  👑 مدير النظام
                </th>

                <th className="p-4 text-center font-bold text-gray-700">
                  👤 مدير المخيم
                </th>

                <th className="p-4 text-center font-bold text-gray-700">
                  👤 موظف
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* إدارة العائلات */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-semibold text-gray-800">
                  إدارة العائلات
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Eye className="w-4 h-4 text-gray-400 mx-auto" />
                </td>
              </tr>

              {/* توزيع المساعدات */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-semibold text-gray-800">
                  توزيع المساعدات
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>
              </tr>

              {/* إدارة الوثائق */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-semibold text-gray-800">
                  إدارة الوثائق
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Eye className="w-4 h-4 text-gray-400 mx-auto" />
                </td>
              </tr>

              {/* التقارير */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-semibold text-gray-800">التقارير</td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Eye className="w-4 h-4 text-gray-400 mx-auto" />
                </td>
              </tr>

              {/* إدارة المستخدمين */}
              <tr className="bg-red-50/40 hover:bg-red-50/70 transition-colors">
                <td className="p-4 font-semibold text-gray-800">
                  إدارة المستخدمين
                </td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <X className="w-4 h-4 text-red-400 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <X className="w-4 h-4 text-red-400 mx-auto" />
                </td>
              </tr>

              {/* سجل التدقيق */}
              <tr className="bg-red-50/40 hover:bg-red-50/70 transition-colors">
                <td className="p-4 font-semibold text-gray-800">سجل التدقيق</td>

                <td className="p-4 text-center">
                  <Check className="w-4 h-4 text-green-500 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <Eye className="w-4 h-4 text-gray-400 mx-auto" />
                </td>

                <td className="p-4 text-center">
                  <X className="w-4 h-4 text-red-400 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* User Details Modal */}

      {showDetails &&
        selectedUser &&
        createPortal(
          <div
            className="
        fixed inset-0
        z-[100]
        flex items-center justify-center
        p-4
        bg-black/45
        backdrop-blur-[3px]
      "
            dir="rtl"
          >
            <div
              className="
          w-full max-w-md
          bg-white
          rounded-2xl
          shadow-2xl
          overflow-hidden
          fade-in
        "
            >
              {/* Header */}
              <div className="gradient-green px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black text-lg">
                    تفاصيل المستخدم
                  </h3>

                  <p className="text-white/75 text-xs mt-1">
                    معلومات حساب المستخدم
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedUser(null);
                  }}
                  className="
              w-9 h-9
              rounded-xl
              flex items-center justify-center
              text-white/80
              hover:text-white
              hover:bg-white/15
              transition-all
            "
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {/* Name */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">الاسم الكامل</p>

                  <p className="text-sm font-bold text-gray-800">
                    {selectedUser.name}
                  </p>
                </div>

                {/* Username */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">اسم المستخدم</p>

                  <p className="text-sm font-bold text-gray-800" dir="ltr">
                    @{selectedUser.username}
                  </p>
                </div>

                {/* Role */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">الدور</p>

                  <p className="text-sm font-bold text-gray-800">
                    {selectedUser.role === "admin"
                      ? "👑 مدير النظام"
                      : selectedUser.role === "representative"
                        ? "👤 مدير المخيم"
                        : "👤 موظف"}
                  </p>
                </div>

                {/* Created Date */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">تاريخ الإنشاء</p>

                  <p className="text-sm font-bold text-gray-800">
                    {new Date(selectedUser.created_at).toLocaleDateString(
                      "ar-IQ",
                    )}
                  </p>
                </div>

                {/* Password */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-500 mb-1">كلمة المرور</p>

                  <p className="text-sm font-bold text-blue-700">
                    لا يمكن عرض كلمة المرور الحالية
                  </p>

                  <p className="text-xs text-blue-500 mt-1">
                    يمكن تعيين كلمة مرور جديدة من خلال التعديل.
                  </p>
                </div>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedUser(null);
                  }}
                  className="
              w-full
              h-11
              rounded-xl
              border border-gray-200
              bg-white
              text-gray-600
              font-bold
              text-sm
              hover:bg-gray-50
              hover:border-gray-300
              transition-all
            "
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Edit User Modal */}

      {showEdit &&
        selectedUser &&
        createPortal(
          <div
            className="
        fixed inset-0
        z-[100]
        flex items-center justify-center
        p-4
        bg-black/45
        backdrop-blur-[3px]
      "
            dir="rtl"
          >
            <div
              className="
          w-full max-w-md
          max-h-[90vh]
          overflow-y-auto
          bg-white
          rounded-2xl
          shadow-2xl
          overflow-hidden
          fade-in
        "
            >
              {/* Header */}
              <div className="gradient-green px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black text-lg">
                    تعديل المستخدم
                  </h3>

                  <p className="text-white/75 text-xs mt-1">
                    تعديل بيانات وصلاحيات المستخدم
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    setSelectedUser(null);
                    setShowEditPassword(false);
                  }}
                  className="
              w-9 h-9
              rounded-xl
              flex items-center justify-center
              text-white/80
              hover:text-white
              hover:bg-white/15
              transition-all
            "
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdate} className="p-6 space-y-5">
                {/* الاسم */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    الاسم الكامل
                  </label>

                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="أدخل الاسم الكامل"
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                placeholder:text-gray-400
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  />
                </div>

                {/* اسم المستخدم */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    اسم المستخدم
                  </label>

                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        username: e.target.value,
                      })
                    }
                    placeholder="أدخل اسم المستخدم"
                    dir="ltr"
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                placeholder:text-gray-400
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  />
                </div>

                {/* كلمة المرور الجديدة */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    كلمة المرور الجديدة
                  </label>

                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          password: e.target.value,
                        })
                      }
                      placeholder="اتركها فارغة إذا لم ترد تغييرها"
                      dir="ltr"
                      className="
                  w-full h-11
                  border border-gray-200
                  rounded-xl
                  px-4 pl-11
                  text-sm
                  text-gray-800
                  bg-gray-50
                  placeholder:text-gray-400
                  transition-all
                  focus:outline-none
                  focus:bg-white
                  focus:border-green-500
                  focus:ring-2
                  focus:ring-green-100
                "
                    />

                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  w-7 h-7
                  rounded-lg
                  flex items-center justify-center
                  text-gray-400
                  hover:text-gray-700
                  hover:bg-gray-100
                  transition-all
                "
                      aria-label={
                        showEditPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                    >
                      {showEditPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2">
                    إذا تركت الحقل فارغًا، لن يتم تغيير كلمة المرور الحالية.
                  </p>
                </div>

                {/* الدور */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    الدور
                  </label>

                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as
                          | "admin"
                          | "representative"
                          | "employee",
                      })
                    }
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  >
                    <option value="employee">موظف</option>
                    <option value="representative">مدير المخيم</option>
                    <option value="admin">مدير النظام</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setSelectedUser(null);
                      setShowEditPassword(false);
                    }}
                    className="
                flex-1
                h-11
                rounded-xl
                border border-gray-200
                bg-white
                text-gray-600
                font-bold
                text-sm
                hover:bg-gray-50
                hover:border-gray-300
                transition-all
              "
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="
                flex-1
                h-11
                rounded-xl
                gradient-green
                text-white
                font-bold
                text-sm
                shadow-sm
                hover:opacity-90
                hover:shadow-md
                transition-all
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
                  >
                    {saving ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Add User Modal */}

      {showAdd &&
        createPortal(
          <div
            className="
        fixed inset-0
        z-[100]
        flex items-center justify-center
        p-4
        bg-black/45
        backdrop-blur-[3px]
      "
            dir="rtl"
          >
            <div
              className="
          w-full max-w-md
          max-h-[90vh]
          overflow-y-auto
          bg-white
          rounded-2xl
          shadow-2xl
          overflow-hidden
          fade-in
        "
            >
              {/* Header */}
              <div className="gradient-green px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black text-lg">
                    إضافة مستخدم جديد
                  </h3>

                  <p className="text-white/75 text-xs mt-1">
                    إضافة مستخدم وتحديد دوره في النظام
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="
              w-9 h-9
              rounded-xl
              flex items-center justify-center
              text-white/80
              hover:text-white
              hover:bg-white/15
              transition-all
            "
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAdd} className="p-6 space-y-5">
                {/* الاسم الكامل */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    الاسم الكامل
                  </label>

                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    placeholder="أدخل الاسم الكامل"
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                placeholder:text-gray-400
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  />
                </div>

                {/* اسم المستخدم */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    اسم المستخدم
                  </label>

                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        username: e.target.value,
                      })
                    }
                    placeholder="أدخل اسم المستخدم"
                    dir="ltr"
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                placeholder:text-gray-400
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  />
                </div>

                {/* كلمة المرور */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    كلمة المرور
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      placeholder="أدخل كلمة المرور"
                      dir="ltr"
                      className="
                  w-full h-11
                  border border-gray-200
                  rounded-xl
                  px-4 pl-11
                  text-sm
                  text-gray-800
                  bg-gray-50
                  placeholder:text-gray-400
                  transition-all
                  focus:outline-none
                  focus:bg-white
                  focus:border-green-500
                  focus:ring-2
                  focus:ring-green-100
                "
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  w-7 h-7
                  rounded-lg
                  flex items-center justify-center
                  text-gray-400
                  hover:text-gray-700
                  hover:bg-gray-100
                  transition-all
                "
                      aria-label={
                        showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* الدور */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    الدور
                  </label>

                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value as
                          | "admin"
                          | "representative"
                          | "employee",
                      })
                    }
                    className="
                w-full h-11
                border border-gray-200
                rounded-xl
                px-4
                text-sm
                text-gray-800
                bg-gray-50
                transition-all
                focus:outline-none
                focus:bg-white
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
                  >
                    <option value="employee">موظف</option>

                    <option value="representative">مدير المخيم</option>

                    <option value="admin">مدير النظام</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="
                flex-1
                h-11
                rounded-xl
                border border-gray-200
                bg-white
                text-gray-600
                font-bold
                text-sm
                hover:bg-gray-50
                hover:border-gray-300
                transition-all
              "
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="
    flex-1
    h-11
    rounded-xl
    gradient-green
    text-white
    font-bold
    text-sm
    shadow-sm
    hover:opacity-90
    hover:shadow-md
    transition-all
    disabled:opacity-60
    disabled:cursor-not-allowed
  "
                  >
                    {saving ? "جارٍ إضافة المستخدم..." : "إضافة المستخدم"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      {/* Delete Confirm */}

      {deleteConfirm &&
        createPortal(
          <div
            className="
        fixed inset-0
        z-[100]
        flex items-center justify-center
        p-4
        bg-black/45
        backdrop-blur-[3px]
      "
            dir="rtl"
          >
            <div
              className="
          w-full max-w-sm
          bg-white
          rounded-2xl
          shadow-2xl
          overflow-hidden
          fade-in
        "
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 text-center">
                <div
                  className="
              w-14 h-14
              mx-auto
              mb-4
              rounded-2xl
              bg-red-50
              flex items-center justify-center
            "
                >
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>

                <h3 className="font-black text-gray-900 text-lg">
                  تأكيد الحذف
                </h3>

                <p className="text-gray-500 text-sm mt-2 leading-6">
                  هل تريد حذف هذا المستخدم؟
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="
              flex-1
              h-11
              rounded-xl
              border border-gray-200
              bg-white
              text-gray-600
              font-bold
              text-sm
              hover:bg-gray-50
              hover:border-gray-300
              transition-all
            "
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="
              flex-1
              h-11
              rounded-xl
              bg-red-500
              text-white
              font-bold
              text-sm
              shadow-sm
              hover:bg-red-600
              hover:shadow-md
              transition-all
            "
                >
                  حذف المستخدم
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
