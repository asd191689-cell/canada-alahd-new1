import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Download, BarChart2, Users, Gift, MapPin,
  TrendingUp, CheckCircle2, AlertCircle, Shield
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#059669', '#0d9488', '#0284c7', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899'];

export default function ReportsPage() {
  const { families, aidDistributions, aidTypes, currentUser, addAuditLog } = useApp();
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const activeFamilies = families.filter(f => !f.isDeleted);
  const totalIndividuals = activeFamilies.reduce((s, f) => s + f.membersCount, 0);
  const avgSize = activeFamilies.length ? (totalIndividuals / activeFamilies.length).toFixed(1) : '0';

  const governorateData = activeFamilies.reduce((acc, f) => {
    acc[f.originGovernorate] = (acc[f.originGovernorate] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const govChartData = Object.entries(governorateData).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

  const aidCatData = aidTypes.map(t => ({
    name: t.name,
    count: aidDistributions.filter(d => d.aidTypeId === t.id).length
  })).filter(d => d.count > 0);

  const healthData = [
    { name: 'بصحة جيدة', count: activeFamilies.filter(f => f.headHealthStatus === 'healthy').length, color: '#16a34a' },
    { name: 'مريض', count: activeFamilies.filter(f => f.headHealthStatus === 'sick').length, color: '#f59e0b' },
    { name: 'إعاقة', count: activeFamilies.filter(f => f.headHealthStatus === 'disabled').length, color: '#dc2626' },
  ];

  const disabledMembers = activeFamilies.reduce((s, f) => s + f.members.filter(m => m.healthStatus === 'disabled').length, 0);
  const childrenUnder12 = activeFamilies.reduce((s, f) => s + f.members.filter(m => m.age < 12).length, 0);

  const handleExport = async (type: string) => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1500));

    // Generate CSV content
    let csvContent = '';
    if (type === 'families') {
      csvContent = 'رقم الملف,اسم رب الأسرة,الرقم الوطني,الهاتف,المحافظة,المدينة,عدد الأفراد,الحالة الصحية,تاريخ الدخول,العنوان\n';
      activeFamilies.forEach(f => {
        const health = f.headHealthStatus === 'healthy' ? 'جيدة' : f.headHealthStatus === 'sick' ? 'مريض' : 'إعاقة';
        csvContent += `${f.fileNumber},"${f.headName}",${f.headNationalId},${f.headPhone},${f.originGovernorate},${f.originCity},${f.membersCount},${health},${f.entryDate},"${f.currentAddress}"\n`;
      });
    } else if (type === 'aid') {
      csvContent = 'العائلة,رقم الملف,صنف المساعدة,الكمية,الوحدة,تاريخ التوزيع,المشرف\n';
      aidDistributions.forEach(d => {
        csvContent += `"${d.familyName}",${d.fileNumber},"${d.aidTypeName}",${d.quantity},${d.unit},${d.distributionDate},"${d.supervisorName}"\n`;
      });
    } else {
      csvContent = 'رقم الملف,اسم رب الأسرة,الاسم,العمر,صلة القرابة,الحالة الصحية\n';
      activeFamilies.forEach(f => {
        f.members.forEach(m => {
          const rel = m.relation === 'wife' ? 'زوجة' : m.relation === 'son' ? 'ابن' : m.relation === 'daughter' ? 'ابنة' : 'أخرى';
          const health = m.healthStatus === 'healthy' ? 'جيدة' : m.healthStatus === 'sick' ? 'مريض' : 'إعاقة';
          csvContent += `${f.fileNumber},"${f.headName}","${m.name}",${m.age},${rel},${health}\n`;
        });
      });
    }

    // Add BOM for Arabic support
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_${type === 'families' ? 'العائلات' : type === 'aid' ? 'المساعدات' : 'الأفراد'}_${new Date().toLocaleDateString('ar-IQ').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addAuditLog({
      userId: currentUser!.id, userName: currentUser!.name,
      action: 'export', target: 'تقرير',
      details: `تصدير تقرير: ${type === 'families' ? 'العائلات' : type === 'aid' ? 'المساعدات' : 'الأفراد'}`,
    });

    setExporting(false);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Export Success Banner */}
      {exportSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-semibold">تم تصدير التقرير بنجاح!</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'إجمالي العائلات', value: activeFamilies.length, color: 'text-green-600', bg: 'bg-green-50', icon: Users },
          { label: 'إجمالي الأفراد', value: totalIndividuals, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
          { label: 'متوسط الأسرة', value: avgSize, color: 'text-purple-600', bg: 'bg-purple-50', icon: TrendingUp },
          { label: 'ذوو الإعاقات', value: disabledMembers, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
          { label: 'أطفال أقل 12', value: childrenUnder12, color: 'text-orange-600', bg: 'bg-orange-50', icon: Users },
          { label: 'توزيعات المساعدات', value: aidDistributions.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Gift },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-3 text-center border border-white shadow-sm`}>
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">تصدير البيانات</h3>
            <p className="text-xs text-gray-400">تصدير قاعدة البيانات كاملة بصيغة CSV تدعم العربية</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: 'families', title: 'تقرير العائلات', description: `${activeFamilies.length} عائلة مسجلة`,
              icon: Users, color: 'from-green-500 to-emerald-600'
            },
            {
              id: 'individuals', title: 'تقرير الأفراد', description: `${totalIndividuals} فرد مسجل`,
              icon: Users, color: 'from-blue-500 to-cyan-600'
            },
            {
              id: 'aid', title: 'تقرير المساعدات', description: `${aidDistributions.length} عملية توزيع`,
              icon: Gift, color: 'from-orange-500 to-amber-600'
            },
          ].map(exp => (
            <button key={exp.id} onClick={() => handleExport(exp.id)} disabled={exporting}
              className="group relative overflow-hidden border border-gray-100 rounded-2xl p-5 text-right hover:shadow-md transition-all disabled:opacity-50">
              <div className={`absolute inset-0 bg-gradient-to-br ${exp.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
              <div className={`w-12 h-12 bg-gradient-to-br ${exp.color} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                <exp.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 mb-1">{exp.title}</h4>
              <p className="text-xs text-gray-400 mb-3">{exp.description}</p>
              <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{exporting ? 'جاري التصدير...' : 'تصدير CSV'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Governorate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">توزيع العائلات حسب المحافظة</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={govChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                formatter={(v) => [`${v} عائلة`, '']} />
              <Bar dataKey="count" fill="#16a34a" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800">الحالة الصحية لأرباب الأسر</h3>
          </div>
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" outerRadius={70} dataKey="count" nameKey="name">
                  {healthData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {healthData.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.color }}></div>
                  <span className="text-xs text-gray-600 flex-1">{h.name}</span>
                  <span className="font-bold text-gray-800 text-sm">{h.count}</span>
                  <span className="text-xs text-gray-400">
                    ({Math.round(h.count / activeFamilies.length * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aid Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Gift className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-800">توزيع المساعدات حسب النوع</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aidCatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fff7ed" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                formatter={(v) => [`${v} توزيع`, '']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {aidCatData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-800">ملخص إحصائي شامل</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'العائلات النشطة', value: activeFamilies.length, unit: 'عائلة' },
              { label: 'العائلات المحذوفة (ناعم)', value: families.filter(f=>f.isDeleted).length, unit: 'عائلة' },
              { label: 'إجمالي الأفراد', value: totalIndividuals, unit: 'فرد' },
              { label: 'متوسط حجم الأسرة', value: avgSize, unit: 'أفراد' },
              { label: 'أكبر عائلة', value: Math.max(...activeFamilies.map(f=>f.membersCount)), unit: 'أفراد' },
              { label: 'أصغر عائلة', value: Math.min(...activeFamilies.map(f=>f.membersCount)), unit: 'أفراد' },
              { label: 'مجموع توزيعات المساعدات', value: aidDistributions.length, unit: 'توزيع' },
              { label: 'أصناف المساعدات', value: aidTypes.length, unit: 'صنف' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="font-bold text-gray-800">{row.value} <span className="text-xs text-gray-400">{row.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
