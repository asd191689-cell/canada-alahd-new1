import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Search, Clock, User2 } from 'lucide-react';

const actionLabels: Record<string, { label: string; color: string; bg: string }> = {
  add: { label: 'إضافة', color: 'text-green-700', bg: 'bg-green-100' },
  edit: { label: 'تعديل', color: 'text-blue-700', bg: 'bg-blue-100' },
  delete: { label: 'حذف', color: 'text-red-700', bg: 'bg-red-100' },
  restore: { label: 'استعادة', color: 'text-orange-700', bg: 'bg-orange-100' },
  export: { label: 'تصدير', color: 'text-purple-700', bg: 'bg-purple-100' },
  login: { label: 'دخول', color: 'text-gray-700', bg: 'bg-gray-100' },
  view: { label: 'عرض', color: 'text-cyan-700', bg: 'bg-cyan-100' },
};

export default function AuditPage() {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filtered = auditLogs.filter(log => {
    const matchSearch = log.userName.includes(search) || log.details.includes(search) || log.target.includes(search);
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const matchDate = !dateFilter || log.timestamp.startsWith(dateFilter);
    return matchSearch && matchAction && matchDate;
  });

  return (
    <div className="space-y-5 fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي السجلات', value: auditLogs.length, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'عمليات الإضافة', value: auditLogs.filter(l => l.action === 'add').length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'عمليات التعديل', value: auditLogs.filter(l => l.action === 'edit').length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'عمليات الحذف', value: auditLogs.filter(l => l.action === 'delete').length, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-3 text-center border border-white shadow-sm`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="بحث في السجلات..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
            <option value="all">جميع العمليات</option>
            <option value="add">إضافة</option>
            <option value="edit">تعديل</option>
            <option value="delete">حذف</option>
            <option value="restore">استعادة</option>
            <option value="export">تصدير</option>
            <option value="login">دخول</option>
            <option value="view">عرض</option>
          </select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">سجل التدقيق والمراقبة</h3>
            <p className="text-xs text-gray-400">عرض {filtered.length} من {auditLogs.length} سجل</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد سجلات</p>
            </div>
          ) : filtered.map(log => {
            const action = actionLabels[log.action] || actionLabels.view;
            return (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 ${action.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Shield className={`w-4 h-4 ${action.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${action.bg} ${action.color}`}>
                        {action.label}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{log.target}</span>
                      {log.targetId && (
                        <span className="text-xs text-gray-400 font-mono">#{log.targetId.slice(0, 8)}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{log.details}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <User2 className="w-3.5 h-3.5" />
                        <span>{log.userName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(log.timestamp).toLocaleDateString('ar-IQ')} - {new Date(log.timestamp).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.ipAddress && (
                        <span className="text-xs text-gray-300 font-mono">{log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
