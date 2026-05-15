import { useApp } from '../../context/AppContext';
import { Menu, Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'لوحة التحكم الرئيسية',
  '/families': 'إدارة العائلات والأفراد',
  '/families/new': 'تسجيل عائلة جديدة',
  '/aid': 'نظام تتبع المساعدات',
  '/reports': 'التقارير وتصدير البيانات',
  '/audit': 'سجل التدقيق والمراقبة',
  '/users': 'إدارة المستخدمين والصلاحيات',
};

export default function Header() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();

  const title = Object.entries(pageTitles).find(([path]) =>
    path === location.pathname || (path !== '/' && location.pathname.startsWith(path))
  )?.[1] || 'نظام مخيم كندا العهد';

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <h2 className="font-bold text-gray-800 text-base">{title}</h2>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث سريع..."
          className="bg-transparent text-sm text-gray-600 outline-none w-40 placeholder-gray-400"
        />
      </div>

      <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-all">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
      </button>
    </header>
  );
}
