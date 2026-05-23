import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Shield, Eye, EyeOff, Lock, User } from "lucide-react";

export default function LoginPage() {
  const { setCurrentUser, addAuditLog } = useApp();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.token);

        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // حفظ JWT Token
      localStorage.setItem("token", data.token);

      // حفظ المستخدم داخل التطبيق
      setCurrentUser(data.user);
      // Audit Log
      addAuditLog({
        userId: data.user.id,
        userName: data.user.username,
        action: "login",
        target: "النظام",
        details: "تسجيل دخول ناجح",
        ipAddress: "127.0.0.1",
      });
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #15803d 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-400 rounded-full opacity-10 blur-3xl"></div>

        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-300 rounded-full opacity-10 blur-3xl"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500 rounded-full opacity-5 blur-3xl"></div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4 pulse-green">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Flag_of_Canada_%28Pantone%29.svg/640px-Flag_of_Canada_%28Pantone%29.svg.png"
              alt="كندا"
              className="w-12 h-8 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <h1 className="text-3xl font-black text-white mb-1">
            مخيم كندا العهد
          </h1>

          <p className="text-green-200 text-sm font-medium">
            نظام الإدارة الرقمية المتكاملة
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-8 h-px bg-green-400 opacity-60"></div>

            <Shield className="w-4 h-4 text-green-300" />

            <div className="w-8 h-px bg-green-400 opacity-60"></div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="gradient-green px-6 py-4">
            <h2 className="text-white font-bold text-lg text-center">
              تسجيل الدخول
            </h2>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2 fade-in">
                <Shield className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اسم المستخدم
              </label>

              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 bg-gray-50 transition-all"
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                كلمة المرور
              </label>

              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 pl-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 bg-gray-50 transition-all"
                  placeholder="أدخل كلمة المرور"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-green text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري التحقق...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  دخول إلى النظام
                </>
              )}
            </button>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-800">
              <p className="font-bold mb-1">بيانات الدخول:</p>

              <p>
                • اسم المستخدم:
                <span className="font-mono bg-white px-1 rounded mx-1">
                  admin
                </span>
              </p>

              <p>
                • كلمة المرور:
                <span className="font-mono bg-white px-1 rounded mx-1">
                  admin123
                </span>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-green-300 text-xs mt-6 opacity-70">
          جميع البيانات محمية ومشفرة • نظام إدارة مخيم كندا العهد © 2026
        </p>
      </div>
    </div>
  );
}
