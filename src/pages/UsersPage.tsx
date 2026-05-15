import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockUsers } from '../data/mockData';
import { Plus, Shield, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { User } from '../types';

export default function UsersPage() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' as 'admin' | 'staff' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">غير مصرح لك بالوصول لهذه الصفحة</p>
          <p className="text-sm text-gray-400 mt-1">هذه الصفحة للمدير فقط</p>
        </div>
      </div>
    );
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `u_${Date.now()}`,
      name: form.name,
      username: form.username,
      role: form.role,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    setForm({ name: '', username: '', password: '', role: 'staff' });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">إدارة المستخدمين والصلاحيات</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} مستخدمين مسجلين</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 gradient-green text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-green-200">
          <Plus className="w-4 h-4" />
          إضافة مستخدم
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
          <p className="text-3xl font-black text-yellow-600">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-sm text-yellow-700 font-semibold mt-1">مدراء النظام</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <p className="text-3xl font-black text-blue-600">{users.filter(u => u.role === 'staff').length}</p>
          <p className="text-sm text-blue-700 font-semibold mt-1">موظفون</p>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg ${
                  user.role === 'admin' ? 'gradient-green' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                }`}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                </div>
              </div>
              {user.id !== currentUser?.id && (
                <button onClick={() => setDeleteConfirm(user.id)}
                  className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">الدور</span>
                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                  user.role === 'admin'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {user.role === 'admin' ? '👑 مدير النظام' : '👤 موظف'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">تاريخ الإنشاء</span>
                <span className="text-xs font-semibold text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('ar-IQ')}
                </span>
              </div>
              {user.id === currentUser?.id && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full pulse-green"></div>
                  <span className="text-xs text-green-700 font-semibold">متصل الآن</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-0.5">الصلاحيات</p>
                  <p className="font-bold text-xs text-gray-700">
                    {user.role === 'admin' ? 'كاملة' : 'محدودة'}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-0.5">الحالة</p>
                  <p className="font-bold text-xs text-green-600">نشط</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-600" />
            مقارنة الصلاحيات
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right px-4 py-3 font-bold text-gray-700">الصلاحية</th>
                <th className="text-center px-4 py-3 font-bold text-yellow-600">مدير النظام</th>
                <th className="text-center px-4 py-3 font-bold text-blue-600">موظف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { perm: 'عرض بيانات العائلات', admin: true, staff: true },
                { perm: 'تسجيل عائلة جديدة', admin: true, staff: true },
                { perm: 'تعديل بيانات العائلات', admin: true, staff: true },
                { perm: 'حذف العائلات (ناعم)', admin: true, staff: false },
                { perm: 'إدارة المساعدات وأصنافها', admin: true, staff: true },
                { perm: 'تسجيل توزيعات المساعدات', admin: true, staff: true },
                { perm: 'حذف سجلات التوزيع', admin: true, staff: false },
                { perm: 'تصدير التقارير', admin: true, staff: false },
                { perm: 'عرض سجل التدقيق', admin: true, staff: false },
                { perm: 'إدارة المستخدمين', admin: true, staff: false },
                { perm: 'إضافة أصناف مساعدات جديدة', admin: true, staff: false },
              ].map((row, i) => (
                <tr key={i} className="table-row-hover">
                  <td className="px-4 py-3 font-medium text-gray-700">{row.perm}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={row.admin ? 'text-green-500 text-lg' : 'text-red-300 text-lg'}>
                      {row.admin ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={row.staff ? 'text-green-500 text-lg' : 'text-red-300 text-lg'}>
                      {row.staff ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full fade-in">
            <div className="gradient-green px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">إضافة مستخدم جديد</h3>
              <button onClick={() => setShowAdd(false)} className="text-white/70 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم الكامل</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                  placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المستخدم</label>
                <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                  placeholder="username" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                    placeholder="كلمة المرور" dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الدور</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value as 'admin' | 'staff'})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
                  <option value="staff">موظف</option>
                  <option value="admin">مدير النظام</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                  إلغاء
                </button>
                <button type="submit"
                  className="flex-1 gradient-green text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition-all text-sm">
                  إضافة المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 fade-in text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-black text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-500 text-sm mb-5">هل تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                إلغاء
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
