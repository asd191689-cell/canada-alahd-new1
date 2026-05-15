import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Save, ArrowRight, User, Users } from 'lucide-react';
import type { FamilyMember } from '../types';

const governorates = ['نينوى', 'الأنبار', 'صلاح الدين', 'ديالى', 'كركوك', 'بغداد', 'بابل', 'واسط', 'ميسان', 'ذي قار', 'المثنى', 'القادسية', 'النجف', 'كربلاء', 'البصرة', 'المثنى'];

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function generateFileNumber(count: number): string {
  return `CA-${String(count).padStart(4, '0')}`;
}

export default function FamilyFormPage() {
  const { families, setFamilies, currentUser, addAuditLog } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const existing = isEdit ? families.find(f => f.id === id) : undefined;

  const [form, setForm] = useState({
    headName: existing?.headName || '',
    headNationalId: existing?.headNationalId || '',
    headDateOfBirth: existing?.headDateOfBirth || '',
    headPhone: existing?.headPhone || '',
    headHealthStatus: existing?.headHealthStatus || 'healthy' as 'healthy' | 'sick' | 'disabled',
    originGovernorate: existing?.originGovernorate || '',
    originCity: existing?.originCity || '',
    currentAddress: existing?.currentAddress || '',
    entryDate: existing?.entryDate || new Date().toISOString().split('T')[0],
    notes: existing?.notes || '',
  });

  const [members, setMembers] = useState<Omit<FamilyMember, 'id' | 'age'>[]>(
    existing?.members.map(m => ({
      name: m.name, nationalId: m.nationalId, dateOfBirth: m.dateOfBirth,
      relation: m.relation, healthStatus: m.healthStatus, disability: m.disability, notes: m.notes
    })) || []
  );

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const headAge = calcAge(form.headDateOfBirth);
  const totalMembers = 1 + members.length;

  const addMember = () => {
    setMembers(prev => [...prev, {
      name: '', nationalId: '', dateOfBirth: '',
      relation: 'son', healthStatus: 'healthy', disability: '', notes: ''
    }]);
  };

  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: string, value: string) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.headName.trim()) errs.headName = 'اسم رب الأسرة مطلوب';
    if (!form.headNationalId.trim()) errs.headNationalId = 'الرقم الوطني مطلوب';
    if (!form.headDateOfBirth) errs.headDateOfBirth = 'تاريخ الميلاد مطلوب';
    if (!form.headPhone.trim()) errs.headPhone = 'رقم الهاتف مطلوب';
    if (!form.originGovernorate) errs.originGovernorate = 'المحافظة مطلوبة';
    if (!form.currentAddress.trim()) errs.currentAddress = 'العنوان الحالي مطلوب';
    members.forEach((m, i) => {
      if (!m.name.trim()) errs[`member_${i}_name`] = 'الاسم مطلوب';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));

    const now = new Date().toISOString();
    const processedMembers: FamilyMember[] = members.map((m, i) => ({
      ...m, id: `m_${Date.now()}_${i}`, age: calcAge(m.dateOfBirth)
    }));

    if (isEdit && existing) {
      setFamilies(prev => prev.map(f => f.id === id ? {
        ...f, ...form, headAge, members: processedMembers,
        membersCount: totalMembers, updatedAt: now
      } : f));
      addAuditLog({
        userId: currentUser!.id, userName: currentUser!.name,
        action: 'edit', target: 'عائلة', targetId: id,
        details: `تعديل بيانات عائلة: ${form.headName} - ${existing.fileNumber}`,
      });
    } else {
      const fileNumber = generateFileNumber(families.length + 1);
      const newFamily = {
        id: `f_${Date.now()}`,
        fileNumber,
        ...form,
        headAge,
        members: processedMembers,
        membersCount: totalMembers,
        documents: [],
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        registeredBy: currentUser!.id,
      };
      setFamilies(prev => [...prev, newFamily]);
      addAuditLog({
        userId: currentUser!.id, userName: currentUser!.name,
        action: 'add', target: 'عائلة', targetId: newFamily.id,
        details: `تسجيل عائلة جديدة: ${form.headName} - ${fileNumber}`,
      });
    }

    setSaving(false);
    navigate('/families');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/families')}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-all">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {isEdit ? 'تعديل بيانات العائلة' : 'تسجيل عائلة جديدة'}
          </h2>
          {isEdit && existing && (
            <p className="text-sm text-gray-500">ملف رقم: {existing.fileNumber}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Head of Family */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="gradient-green px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-bold">بيانات رب الأسرة</h3>
              {!isEdit && (
                <span className="mr-auto bg-white/20 text-white text-xs px-2 py-1 rounded-lg font-mono">
                  {generateFileNumber(families.length + 1)}
                </span>
              )}
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                الاسم الكامل لرب الأسرة <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.headName} onChange={e => setForm({...form, headName: e.target.value})}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                placeholder="الاسم الرباعي" />
              {errors.headName && <p className="text-red-500 text-xs mt-1">{errors.headName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                الرقم الوطني <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.headNationalId} onChange={e => setForm({...form, headNationalId: e.target.value})}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headNationalId ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                placeholder="الرقم الوطني" />
              {errors.headNationalId && <p className="text-red-500 text-xs mt-1">{errors.headNationalId}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                تاريخ الميلاد <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input type="date" value={form.headDateOfBirth} onChange={e => setForm({...form, headDateOfBirth: e.target.value})}
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headDateOfBirth ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                {headAge > 0 && (
                  <div className="px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-bold whitespace-nowrap">
                    {headAge} سنة
                  </div>
                )}
              </div>
              {errors.headDateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.headDateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <input type="tel" value={form.headPhone} onChange={e => setForm({...form, headPhone: e.target.value})}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.headPhone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                placeholder="07xxxxxxxxx" />
              {errors.headPhone && <p className="text-red-500 text-xs mt-1">{errors.headPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">الحالة الصحية</label>
              <select value={form.headHealthStatus} onChange={e => setForm({...form, headHealthStatus: e.target.value as typeof form.headHealthStatus})}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50">
                <option value="healthy">بصحة جيدة</option>
                <option value="sick">مريض</option>
                <option value="disabled">يعاني من إعاقة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                محافظة الأصل <span className="text-red-500">*</span>
              </label>
              <select value={form.originGovernorate} onChange={e => setForm({...form, originGovernorate: e.target.value})}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.originGovernorate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <option value="">اختر المحافظة</option>
                {governorates.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.originGovernorate && <p className="text-red-500 text-xs mt-1">{errors.originGovernorate}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المدينة / القضاء</label>
              <input type="text" value={form.originCity} onChange={e => setForm({...form, originCity: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                placeholder="اسم المدينة أو القضاء" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">تاريخ الدخول للمخيم</label>
              <input type="date" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                العنوان الحالي في المخيم <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.currentAddress} onChange={e => setForm({...form, currentAddress: e.target.value})}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${errors.currentAddress ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                placeholder="مثال: مخيم كندا العهد - القطعة A3 - الخيمة 12" />
              {errors.currentAddress && <p className="text-red-500 text-xs mt-1">{errors.currentAddress}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 resize-none"
                rows={3} placeholder="أي ملاحظات إضافية حول العائلة أو وضعها..." />
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">أفراد الأسرة</h3>
                <p className="text-xs text-gray-400">
                  {totalMembers} فرد (رب الأسرة + {members.length} أفراد آخرون)
                </p>
              </div>
            </div>
            <button type="button" onClick={addMember}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4" />
              إضافة فرد
            </button>
          </div>

          <div className="p-5 space-y-4">
            {members.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">لم يتم إضافة أفراد بعد (غير رب الأسرة)</p>
                <button type="button" onClick={addMember}
                  className="mt-3 text-blue-600 text-sm font-semibold hover:underline">
                  إضافة أول فرد
                </button>
              </div>
            )}

            {members.map((member, index) => (
              <div key={index} className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">الفرد {index + 1}</span>
                  <button type="button" onClick={() => removeMember(index)}
                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={member.name}
                      onChange={e => updateMember(index, 'name', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors[`member_${index}_name`] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
                      placeholder="الاسم الكامل" />
                    {errors[`member_${index}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`member_${index}_name`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">الرقم الوطني</label>
                    <input type="text" value={member.nationalId}
                      onChange={e => updateMember(index, 'nationalId', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="الرقم الوطني" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">تاريخ الميلاد</label>
                    <div className="flex gap-2">
                      <input type="date" value={member.dateOfBirth}
                        onChange={e => updateMember(index, 'dateOfBirth', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      {member.dateOfBirth && (
                        <span className="px-2 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs font-bold whitespace-nowrap">
                          {calcAge(member.dateOfBirth)} سنة
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">صلة القرابة</label>
                    <select value={member.relation} onChange={e => updateMember(index, 'relation', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      <option value="wife">زوجة</option>
                      <option value="son">ابن</option>
                      <option value="daughter">ابنة</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">الحالة الصحية</label>
                    <select value={member.healthStatus} onChange={e => updateMember(index, 'healthStatus', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      <option value="healthy">بصحة جيدة</option>
                      <option value="sick">مريض</option>
                      <option value="disabled">إعاقة</option>
                    </select>
                  </div>
                  {(member.healthStatus === 'disabled' || member.healthStatus === 'sick') && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">تفاصيل الحالة</label>
                      <input type="text" value={member.disability || ''}
                        onChange={e => updateMember(index, 'disability', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder="وصف الحالة الصحية أو الإعاقة" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button type="button" onClick={() => navigate('/families')}
            className="px-6 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 gradient-green text-white px-8 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-green-200 disabled:opacity-50">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'حفظ التعديلات' : 'تسجيل العائلة'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
