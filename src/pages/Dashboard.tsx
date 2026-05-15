import { useApp } from '../context/AppContext';
import { Users, UserCheck, TrendingUp, Gift, FileText, Activity, MapPin, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#059669', '#0d9488', '#0284c7', '#7c3aed', '#dc2626'];

const monthlyData = [
  { month: 'يناير', count: 2 },
  { month: 'فبراير', count: 3 },
  { month: 'مارس', count: 4 },
  { month: 'أبريل', count: 2 },
  { month: 'مايو', count: 5 },
  { month: 'يونيو', count: 3 },
];

export default function Dashboard() {
  const { families, aidDistributions, currentUser } = useApp();

  const activeFamilies = families.filter(f => !f.isDeleted);
  const totalIndividuals = activeFamilies.reduce((sum, f) => sum + f.membersCount, 0);
  const avgFamilySize = activeFamilies.length ? (totalIndividuals / activeFamilies.length).toFixed(1) : '0';

  const governorateData = activeFamilies.reduce((acc, f) => {
    acc[f.originGovernorate] = (acc[f.originGovernorate] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const governorateChartData = Object.entries(governorateData)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const aidCategoryData = aidDistributions.reduce((acc, d) => {
    const type = d.aidTypeName;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const aidPieData = Object.entries(aidCategoryData).map(([name, count]) => ({ name, count }));

  const recentFamilies = [...activeFamilies].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const healthStats = {
    healthy: activeFamilies.filter(f => f.headHealthStatus === 'healthy').length,
    sick: activeFamilies.filter(f => f.headHealthStatus === 'sick').length,
    disabled: activeFamilies.filter(f => f.headHealthStatus === 'disabled').length,
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome Banner */}
      <div className="gradient-green rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full translate-x-1/2 translate-y-1/2"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1">
            مرحباً، {currentUser?.name.split(' ')[0]} 👋
          </h2>
          <p className="text-green-100 text-sm">
            نظام مخيم كندا العهد - آخر تحديث: {new Date().toLocaleDateString('ar-IQ')}
          </p>
          <div className="mt-4 flex gap-4 flex-wrap">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black">{activeFamilies.length}</p>
              <p className="text-green-100 text-xs">إجمالي العائلات</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black">{totalIndividuals}</p>
              <p className="text-green-100 text-xs">إجمالي الأفراد</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black">{aidDistributions.length}</p>
              <p className="text-green-100 text-xs">توزيعات المساعدات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'إجمالي العائلات', value: activeFamilies.length, icon: Users, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700', sub: 'عائلة نازحة مسجلة' },
          { title: 'إجمالي الأفراد', value: totalIndividuals, icon: UserCheck, color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', sub: 'فرد في المخيم' },
          { title: 'متوسط حجم الأسرة', value: `${avgFamilySize} أفراد`, icon: TrendingUp, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-700', sub: 'في المتوسط' },
          { title: 'توزيعات المساعدات', value: aidDistributions.length, icon: Gift, color: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', text: 'text-orange-700', sub: 'عملية توزيع' },
        ].map((card, i) => (
          <div key={i} className={`card-hover ${card.bg} rounded-2xl p-5 border border-white shadow-sm`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <Activity className="w-4 h-4 text-gray-300" />
            </div>
            <p className={`text-3xl font-black ${card.text} mb-1`}>{card.value}</p>
            <p className="text-sm font-semibold text-gray-700">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">التسجيلات الشهرية</h3>
              <p className="text-xs text-gray-400">عدد العائلات المسجلة شهرياً</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #dcfce7', fontSize: '12px' }}
                formatter={(value) => [`${value} عائلة`, 'التسجيلات']}
              />
              <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aid Distribution Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Gift className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">أنواع المساعدات</h3>
              <p className="text-xs text-gray-400">توزيع حسب النوع</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={aidPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="count" nameKey="name">
                {aidPieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governorate Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">العائلات حسب المحافظة</h3>
          </div>
          <div className="space-y-3">
            {governorateChartData.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20 text-right flex-shrink-0">{g.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${(g.count / activeFamilies.length) * 100}%`,
                      backgroundColor: COLORS[i % COLORS.length]
                    }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-800 w-8 text-center flex-shrink-0">{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-800">أحدث التسجيلات</h3>
          </div>
          <div className="space-y-3">
            {recentFamilies.map(family => (
              <div key={family.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 gradient-green rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{family.headName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{family.headName}</p>
                  <p className="text-xs text-gray-400">{family.fileNumber} • {family.membersCount} أفراد</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg font-medium flex-shrink-0">
                  {new Date(family.createdAt).toLocaleDateString('ar-IQ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">الحالة الصحية لأرباب الأسر</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-3xl font-black text-green-600">{healthStats.healthy}</p>
            <p className="text-sm text-green-700 font-semibold mt-1">بصحة جيدة</p>
            <p className="text-xs text-gray-400">{Math.round(healthStats.healthy / activeFamilies.length * 100)}%</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
            <p className="text-3xl font-black text-yellow-600">{healthStats.sick}</p>
            <p className="text-sm text-yellow-700 font-semibold mt-1">مرضى</p>
            <p className="text-xs text-gray-400">{Math.round(healthStats.sick / activeFamilies.length * 100)}%</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-3xl font-black text-red-600">{healthStats.disabled}</p>
            <p className="text-sm text-red-700 font-semibold mt-1">إعاقة</p>
            <p className="text-xs text-gray-400">{Math.round(healthStats.disabled / activeFamilies.length * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
