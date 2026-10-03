import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/apiClient";
import { useApp } from "../../context/AppContext";
import {
  LayoutDashboard,
  Users,
  Gift,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  UserCog,
  X,
  Tent,
} from "lucide-react";

const navItems = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/families", label: "إدارة العائلات", icon: Users },
  { path: "/documents", label: "إدارة الوثائق", icon: FileText },
  { path: "/aid", label: "المساعدات", icon: Gift },
  { path: "/reports", label: "التقارير والتصدير", icon: FileText },
  { path: "/audit", label: "سجل التدقيق", icon: Shield },
  { path: "/users", label: "إدارة المستخدمين", icon: UserCog },
];
export default function Sidebar() {
  const { currentUser, setCurrentUser, sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (err) {
      console.error(err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setCurrentUser(null);
  };
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed top-0 right-0 h-screen z-30 transition-all duration-300
        ${sidebarOpen ? "w-64" : "w-0 lg:w-16"} overflow-hidden
        flex flex-col shadow-2xl
      `}
        style={{
          background:
            "linear-gradient(180deg, #052e16 0%, #14532d 60%, #166534 100%)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-green-800">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Tent className="w-6 h-6 text-green-700" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-white font-black text-sm leading-tight">
                مخيم كندا العهد
              </h1>
              <p className="text-green-300 text-xs opacity-80">
                الإدارة الرقمية
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="إغلاق القائمة الجانبية"
            className="mr-auto p-3 text-green-300 hover:text-white transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${
                    isActive
                      ? "bg-green-500 text-white shadow-lg shadow-green-900/50"
                      : "text-green-200 hover:bg-green-800/50 hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="font-semibold text-sm">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 mr-auto rotate-180" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-green-800 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {(currentUser?.name || currentUser?.username)?.charAt(0) || "؟"}
              </span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {currentUser?.name || currentUser?.username}{" "}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    currentUser?.role === "admin"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {currentUser?.role === "admin"
                    ? "مدير النظام"
                    : currentUser?.role === "representative"
                      ? "مدير المخيم"
                      : "موظف"}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-3 flex items-center gap-2 w-full px-3 py-3 rounded-xl text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all text-sm ${sidebarOpen ? "" : "justify-center"}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
