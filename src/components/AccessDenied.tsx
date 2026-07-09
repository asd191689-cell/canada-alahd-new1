import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  message?: string;
}

export default function AccessDenied({
  title = "غير مخول للوصول",
  message = "ليس لديك صلاحية للوصول إلى هذه الصفحة، يرجى مراجعة مدير النظام.",
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>

        <h2 className="text-2xl font-black text-gray-800 mb-3">{title}</h2>

        <p className="text-gray-500 leading-7">{message}</p>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-bold transition"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    </div>
  );
}
