import type { Family, AidType, AidDistribution, AuditLog, User } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'أحمد محمد الإدريسي', username: 'admin', role: 'admin', createdAt: '2024-01-01' },
  { id: 'u2', name: 'فاطمة علي حسن', username: 'staff1', role: 'staff', createdAt: '2024-01-15' },
  { id: 'u3', name: 'محمد خالد عمر', username: 'staff2', role: 'staff', createdAt: '2024-02-01' },
];

export const mockFamilies: Family[] = [
  {
    id: 'f1', fileNumber: 'CA-0001', headName: 'عبدالله حسن النعيمي', headNationalId: '19850512001',
    headDateOfBirth: '1985-05-12', headAge: 39, headPhone: '07701234567',
    headHealthStatus: 'healthy', originGovernorate: 'نينوى', originCity: 'الموصل',
    currentAddress: 'مخيم كندا العهد - القطعة A3', entryDate: '2023-03-15',
    membersCount: 5, members: [
      { id: 'm1', name: 'أم عبدالله - نورة محمود', nationalId: '19890320002', dateOfBirth: '1989-03-20', age: 35, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm2', name: 'يوسف عبدالله', nationalId: '20100615003', dateOfBirth: '2010-06-15', age: 14, relation: 'son', healthStatus: 'healthy' },
      { id: 'm3', name: 'مريم عبدالله', nationalId: '20120901004', dateOfBirth: '2012-09-01', age: 12, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm4', name: 'إبراهيم عبدالله', nationalId: '20150320005', dateOfBirth: '2015-03-20', age: 9, relation: 'son', healthStatus: 'disabled', disability: 'إعاقة سمعية جزئية' },
    ],
    documents: [
      { id: 'd1', familyId: 'f1', type: 'national_id', name: 'بطاقة هوية رب الأسرة', url: '#', uploadedAt: '2023-03-15', uploadedBy: 'u2' }
    ],
    isDeleted: false, createdAt: '2023-03-15T10:30:00', updatedAt: '2024-06-01T09:00:00', registeredBy: 'u2',
    notes: 'عائلة تحتاج متابعة خاصة بسبب الطفل المعاق'
  },
  {
    id: 'f2', fileNumber: 'CA-0002', headName: 'كريم سلمان الجبوري', headNationalId: '19780812006',
    headDateOfBirth: '1978-08-12', headAge: 46, headPhone: '07809876543',
    headHealthStatus: 'sick', originGovernorate: 'الأنبار', originCity: 'الرمادي',
    currentAddress: 'مخيم كندا العهد - القطعة B1', entryDate: '2023-04-02',
    membersCount: 3, members: [
      { id: 'm5', name: 'سميرة يوسف', nationalId: '19820405007', dateOfBirth: '1982-04-05', age: 42, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm6', name: 'علي كريم', nationalId: '20080720008', dateOfBirth: '2008-07-20', age: 16, relation: 'son', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2023-04-02T14:00:00', updatedAt: '2024-05-15T11:00:00',
    registeredBy: 'u3', notes: 'رب الأسرة يعاني من مرض مزمن - يحتاج متابعة طبية'
  },
  {
    id: 'f3', fileNumber: 'CA-0003', headName: 'محمد عبدالرحمن الدليمي', headNationalId: '19920220009',
    headDateOfBirth: '1992-02-20', headAge: 32, headPhone: '07711122334',
    headHealthStatus: 'healthy', originGovernorate: 'صلاح الدين', originCity: 'تكريت',
    currentAddress: 'مخيم كندا العهد - القطعة C2', entryDate: '2023-05-10',
    membersCount: 6, members: [
      { id: 'm7', name: 'هناء صالح', nationalId: '19950601010', dateOfBirth: '1995-06-01', age: 29, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm8', name: 'عمر محمد', nationalId: '20160915011', dateOfBirth: '2016-09-15', age: 8, relation: 'son', healthStatus: 'healthy' },
      { id: 'm9', name: 'زينب محمد', nationalId: '20181201012', dateOfBirth: '2018-12-01', age: 6, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm10', name: 'أحمد محمد', nationalId: '20200505013', dateOfBirth: '2020-05-05', age: 4, relation: 'son', healthStatus: 'healthy' },
      { id: 'm11', name: 'ليلى محمد', nationalId: '20220301014', dateOfBirth: '2022-03-01', age: 2, relation: 'daughter', healthStatus: 'healthy' },
    ],
    documents: [
      { id: 'd2', familyId: 'f3', type: 'displacement_card', name: 'بطاقة النزوح', url: '#', uploadedAt: '2023-05-10', uploadedBy: 'u2' },
      { id: 'd3', familyId: 'f3', type: 'marriage_certificate', name: 'عقد الزواج', url: '#', uploadedAt: '2023-05-10', uploadedBy: 'u2' },
    ],
    isDeleted: false, createdAt: '2023-05-10T09:15:00', updatedAt: '2024-06-10T10:00:00', registeredBy: 'u2'
  },
  {
    id: 'f4', fileNumber: 'CA-0004', headName: 'خالد إبراهيم المشهداني', headNationalId: '19750615015',
    headDateOfBirth: '1975-06-15', headAge: 49, headPhone: '07905544332',
    headHealthStatus: 'disabled', originGovernorate: 'ديالى', originCity: 'بعقوبة',
    currentAddress: 'مخيم كندا العهد - القطعة A1', entryDate: '2023-06-20',
    membersCount: 4, members: [
      { id: 'm12', name: 'إيمان فارس', nationalId: '19800312016', dateOfBirth: '1980-03-12', age: 44, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm13', name: 'حسن خالد', nationalId: '20050810017', dateOfBirth: '2005-08-10', age: 19, relation: 'son', healthStatus: 'healthy' },
      { id: 'm14', name: 'رنا خالد', nationalId: '20090415018', dateOfBirth: '2009-04-15', age: 15, relation: 'daughter', healthStatus: 'healthy' },
    ],
    documents: [
      { id: 'd4', familyId: 'f4', type: 'medical_report', name: 'تقرير طبي - إعاقة حركية', url: '#', uploadedAt: '2023-06-20', uploadedBy: 'u3' }
    ],
    isDeleted: false, createdAt: '2023-06-20T11:00:00', updatedAt: '2024-06-05T14:00:00', registeredBy: 'u3',
    notes: 'رب الأسرة يعاني من إعاقة حركية - يحتاج كرسي متحرك'
  },
  {
    id: 'f5', fileNumber: 'CA-0005', headName: 'سعد طارق العزاوي', headNationalId: '19881122019',
    headDateOfBirth: '1988-11-22', headAge: 36, headPhone: '07801234561',
    headHealthStatus: 'healthy', originGovernorate: 'كركوك', originCity: 'كركوك',
    currentAddress: 'مخيم كندا العهد - القطعة D3', entryDate: '2023-07-05',
    membersCount: 7, members: [
      { id: 'm15', name: 'دينا حمد', nationalId: '19920718020', dateOfBirth: '1992-07-18', age: 32, relation: 'wife', healthStatus: 'sick', disability: 'ضغط دم مرتفع' },
      { id: 'm16', name: 'محمد سعد', nationalId: '20110302021', dateOfBirth: '2011-03-02', age: 13, relation: 'son', healthStatus: 'healthy' },
      { id: 'm17', name: 'سارة سعد', nationalId: '20130601022', dateOfBirth: '2013-06-01', age: 11, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm18', name: 'عبدالله سعد', nationalId: '20160220023', dateOfBirth: '2016-02-20', age: 8, relation: 'son', healthStatus: 'healthy' },
      { id: 'm19', name: 'نور سعد', nationalId: '20181115024', dateOfBirth: '2018-11-15', age: 6, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm20', name: 'أحمد سعد', nationalId: '20210710025', dateOfBirth: '2021-07-10', age: 3, relation: 'son', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2023-07-05T13:30:00', updatedAt: '2024-06-12T09:30:00', registeredBy: 'u2'
  },
  {
    id: 'f6', fileNumber: 'CA-0006', headName: 'علي حسين الموسوي', headNationalId: '19830415026',
    headDateOfBirth: '1983-04-15', headAge: 41, headPhone: '07711223344',
    headHealthStatus: 'healthy', originGovernorate: 'بغداد', originCity: 'أبو غريب',
    currentAddress: 'مخيم كندا العهد - القطعة B4', entryDate: '2023-08-18',
    membersCount: 2, members: [
      { id: 'm21', name: 'زهراء محمد', nationalId: '19870902027', dateOfBirth: '1987-09-02', age: 37, relation: 'wife', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2023-08-18T10:00:00', updatedAt: '2024-05-20T08:00:00', registeredBy: 'u3'
  },
  {
    id: 'f7', fileNumber: 'CA-0007', headName: 'حسام رياض الشمري', headNationalId: '19901230028',
    headDateOfBirth: '1990-12-30', headAge: 34, headPhone: '07906677889',
    headHealthStatus: 'healthy', originGovernorate: 'نينوى', originCity: 'سنجار',
    currentAddress: 'مخيم كندا العهد - القطعة C1', entryDate: '2023-09-01',
    membersCount: 8, members: [
      { id: 'm22', name: 'سلمى أحمد', nationalId: '19931105029', dateOfBirth: '1993-11-05', age: 31, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm23', name: 'ريا حسام', nationalId: '20140701030', dateOfBirth: '2014-07-01', age: 10, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm24', name: 'عمر حسام', nationalId: '20161212031', dateOfBirth: '2016-12-12', age: 8, relation: 'son', healthStatus: 'healthy' },
      { id: 'm25', name: 'يسرى حسام', nationalId: '20190325032', dateOfBirth: '2019-03-25', age: 5, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm26', name: 'كريم حسام', nationalId: '20210808033', dateOfBirth: '2021-08-08', age: 3, relation: 'son', healthStatus: 'healthy' },
      { id: 'm27', name: 'لؤي حسام', nationalId: '20230101034', dateOfBirth: '2023-01-01', age: 1, relation: 'son', healthStatus: 'healthy' },
      { id: 'm28', name: 'هبة الله حسام', nationalId: '20230601035', dateOfBirth: '2023-06-01', age: 1, relation: 'daughter', healthStatus: 'healthy' },
    ],
    documents: [
      { id: 'd5', familyId: 'f7', type: 'national_id', name: 'بطاقة هوية', url: '#', uploadedAt: '2023-09-01', uploadedBy: 'u2' },
      { id: 'd6', familyId: 'f7', type: 'displacement_card', name: 'بطاقة نزوح', url: '#', uploadedAt: '2023-09-01', uploadedBy: 'u2' },
    ],
    isDeleted: false, createdAt: '2023-09-01T15:00:00', updatedAt: '2024-06-08T16:00:00', registeredBy: 'u2'
  },
  {
    id: 'f8', fileNumber: 'CA-0008', headName: 'إسماعيل نجم الحيالي', headNationalId: '19960510036',
    headDateOfBirth: '1996-05-10', headAge: 28, headPhone: '07712233441',
    headHealthStatus: 'healthy', originGovernorate: 'الأنبار', originCity: 'الفلوجة',
    currentAddress: 'مخيم كندا العهد - القطعة A5', entryDate: '2024-01-10',
    membersCount: 3, members: [
      { id: 'm29', name: 'عذراء طارق', nationalId: '19990215037', dateOfBirth: '1999-02-15', age: 25, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm30', name: 'آدم إسماعيل', nationalId: '20220710038', dateOfBirth: '2022-07-10', age: 2, relation: 'son', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2024-01-10T09:00:00', updatedAt: '2024-06-01T09:00:00', registeredBy: 'u3'
  },
  {
    id: 'f9', fileNumber: 'CA-0009', headName: 'وسام جبار الراوي', headNationalId: '19820720039',
    headDateOfBirth: '1982-07-20', headAge: 42, headPhone: '07809988776',
    headHealthStatus: 'sick', originGovernorate: 'بابل', originCity: 'الحلة',
    currentAddress: 'مخيم كندا العهد - القطعة D1', entryDate: '2024-02-20',
    membersCount: 5, members: [
      { id: 'm31', name: 'منى كاظم', nationalId: '19860310040', dateOfBirth: '1986-03-10', age: 38, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm32', name: 'علاء وسام', nationalId: '20091201041', dateOfBirth: '2009-12-01', age: 15, relation: 'son', healthStatus: 'healthy' },
      { id: 'm33', name: 'حوراء وسام', nationalId: '20120501042', dateOfBirth: '2012-05-01', age: 12, relation: 'daughter', healthStatus: 'healthy' },
      { id: 'm34', name: 'بشار وسام', nationalId: '20170820043', dateOfBirth: '2017-08-20', age: 7, relation: 'son', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2024-02-20T11:30:00', updatedAt: '2024-06-15T10:00:00', registeredBy: 'u2'
  },
  {
    id: 'f10', fileNumber: 'CA-0010', headName: 'طارق صادق الجنابي', headNationalId: '19870305044',
    headDateOfBirth: '1987-03-05', headAge: 37, headPhone: '07701234590',
    headHealthStatus: 'healthy', originGovernorate: 'واسط', originCity: 'الكوت',
    currentAddress: 'مخيم كندا العهد - القطعة B2', entryDate: '2024-03-15',
    membersCount: 4, members: [
      { id: 'm35', name: 'نجلاء عادل', nationalId: '19910620045', dateOfBirth: '1991-06-20', age: 33, relation: 'wife', healthStatus: 'healthy' },
      { id: 'm36', name: 'مصطفى طارق', nationalId: '20140910046', dateOfBirth: '2014-09-10', age: 10, relation: 'son', healthStatus: 'healthy' },
      { id: 'm37', name: 'تبارك طارق', nationalId: '20180215047', dateOfBirth: '2018-02-15', age: 6, relation: 'daughter', healthStatus: 'healthy' },
    ],
    documents: [], isDeleted: false, createdAt: '2024-03-15T14:00:00', updatedAt: '2024-06-10T15:00:00', registeredBy: 'u3'
  },
];

export const mockAidTypes: AidType[] = [
  { id: 'at1', name: 'سلة غذائية شهرية', category: 'food', description: 'سلة غذاء أساسية تكفي لأسبوعين', unit: 'سلة', createdAt: '2023-01-01' },
  { id: 'at2', name: 'حصة طحين', category: 'food', description: '25 كيلو طحين', unit: 'كيس 25كغ', createdAt: '2023-01-01' },
  { id: 'at3', name: 'زيت طعام', category: 'food', description: 'زيت نباتي للطهي', unit: 'كرتون (12 لتر)', createdAt: '2023-01-01' },
  { id: 'at4', name: 'دواء مزمن', category: 'medical', description: 'أدوية للأمراض المزمنة', unit: 'جرعة شهرية', createdAt: '2023-02-01' },
  { id: 'at5', name: 'كشفية طبية', category: 'medical', description: 'فحص طبي عام', unit: 'جلسة', createdAt: '2023-02-01' },
  { id: 'at6', name: 'مساعدة مالية طارئة', category: 'financial', description: 'مبلغ مالي للحالات الطارئة', unit: 'دولار', createdAt: '2023-03-01' },
  { id: 'at7', name: 'ملابس شتوية', category: 'clothing', description: 'ملابس شتوية للأطفال والكبار', unit: 'طقم', createdAt: '2023-03-01' },
  { id: 'at8', name: 'بطانيات', category: 'household', description: 'بطانيات دافئة', unit: 'قطعة', createdAt: '2023-03-01' },
];

export const mockAidDistributions: AidDistribution[] = [
  { id: 'ad1', familyId: 'f1', familyName: 'عبدالله حسن النعيمي', fileNumber: 'CA-0001', aidTypeId: 'at1', aidTypeName: 'سلة غذائية شهرية', quantity: 1, unit: 'سلة', distributionDate: '2024-06-01', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-06-01T10:00:00' },
  { id: 'ad2', familyId: 'f1', familyName: 'عبدالله حسن النعيمي', fileNumber: 'CA-0001', aidTypeId: 'at4', aidTypeName: 'دواء مزمن', quantity: 1, unit: 'جرعة شهرية', distributionDate: '2024-06-01', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-06-01T10:30:00' },
  { id: 'ad3', familyId: 'f2', familyName: 'كريم سلمان الجبوري', fileNumber: 'CA-0002', aidTypeId: 'at1', aidTypeName: 'سلة غذائية شهرية', quantity: 1, unit: 'سلة', distributionDate: '2024-06-01', supervisorId: 'u3', supervisorName: 'محمد خالد عمر', createdAt: '2024-06-01T11:00:00' },
  { id: 'ad4', familyId: 'f2', familyName: 'كريم سلمان الجبوري', fileNumber: 'CA-0002', aidTypeId: 'at6', aidTypeName: 'مساعدة مالية طارئة', quantity: 50, unit: 'دولار', distributionDate: '2024-05-15', supervisorId: 'u1', supervisorName: 'أحمد محمد الإدريسي', createdAt: '2024-05-15T14:00:00' },
  { id: 'ad5', familyId: 'f3', familyName: 'محمد عبدالرحمن الدليمي', fileNumber: 'CA-0003', aidTypeId: 'at1', aidTypeName: 'سلة غذائية شهرية', quantity: 2, unit: 'سلة', distributionDate: '2024-06-01', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-06-01T12:00:00' },
  { id: 'ad6', familyId: 'f4', familyName: 'خالد إبراهيم المشهداني', fileNumber: 'CA-0004', aidTypeId: 'at5', aidTypeName: 'كشفية طبية', quantity: 2, unit: 'جلسة', distributionDate: '2024-05-20', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-05-20T09:00:00' },
  { id: 'ad7', familyId: 'f5', familyName: 'سعد طارق العزاوي', fileNumber: 'CA-0005', aidTypeId: 'at7', aidTypeName: 'ملابس شتوية', quantity: 7, unit: 'طقم', distributionDate: '2024-04-01', supervisorId: 'u3', supervisorName: 'محمد خالد عمر', createdAt: '2024-04-01T10:00:00' },
  { id: 'ad8', familyId: 'f7', familyName: 'حسام رياض الشمري', fileNumber: 'CA-0007', aidTypeId: 'at8', aidTypeName: 'بطانيات', quantity: 8, unit: 'قطعة', distributionDate: '2024-03-15', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-03-15T11:00:00' },
  { id: 'ad9', familyId: 'f9', familyName: 'وسام جبار الراوي', fileNumber: 'CA-0009', aidTypeId: 'at4', aidTypeName: 'دواء مزمن', quantity: 1, unit: 'جرعة شهرية', distributionDate: '2024-06-10', supervisorId: 'u3', supervisorName: 'محمد خالد عمر', createdAt: '2024-06-10T13:00:00' },
  { id: 'ad10', familyId: 'f10', familyName: 'طارق صادق الجنابي', fileNumber: 'CA-0010', aidTypeId: 'at2', aidTypeName: 'حصة طحين', quantity: 2, unit: 'كيس 25كغ', distributionDate: '2024-06-05', supervisorId: 'u2', supervisorName: 'فاطمة علي حسن', createdAt: '2024-06-05T10:00:00' },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'al1', userId: 'u1', userName: 'أحمد محمد الإدريسي', action: 'login', target: 'النظام', details: 'تسجيل دخول ناجح', timestamp: '2024-06-15T08:00:00', ipAddress: '192.168.1.1' },
  { id: 'al2', userId: 'u2', userName: 'فاطمة علي حسن', action: 'add', target: 'عائلة', targetId: 'f1', details: 'تسجيل عائلة جديدة: عبدالله حسن النعيمي - CA-0001', timestamp: '2024-06-15T08:30:00', ipAddress: '192.168.1.2' },
  { id: 'al3', userId: 'u2', userName: 'فاطمة علي حسن', action: 'add', target: 'توزيع مساعدات', targetId: 'ad1', details: 'تسجيل توزيع سلة غذائية - CA-0001', timestamp: '2024-06-15T09:00:00', ipAddress: '192.168.1.2' },
  { id: 'al4', userId: 'u1', userName: 'أحمد محمد الإدريسي', action: 'export', target: 'تقرير', details: 'تصدير تقرير العائلات بتنسيق Excel', timestamp: '2024-06-15T10:00:00', ipAddress: '192.168.1.1' },
  { id: 'al5', userId: 'u3', userName: 'محمد خالد عمر', action: 'edit', target: 'عائلة', targetId: 'f2', details: 'تعديل بيانات عائلة: كريم سلمان الجبوري', timestamp: '2024-06-14T14:00:00', ipAddress: '192.168.1.3' },
  { id: 'al6', userId: 'u2', userName: 'فاطمة علي حسن', action: 'add', target: 'وثيقة', targetId: 'd1', details: 'رفع وثيقة: بطاقة هوية - CA-0001', timestamp: '2024-06-14T11:00:00', ipAddress: '192.168.1.2' },
  { id: 'al7', userId: 'u1', userName: 'أحمد محمد الإدريسي', action: 'login', target: 'النظام', details: 'تسجيل دخول ناجح', timestamp: '2024-06-14T08:00:00', ipAddress: '192.168.1.1' },
  { id: 'al8', userId: 'u3', userName: 'محمد خالد عمر', action: 'add', target: 'عائلة', targetId: 'f8', details: 'تسجيل عائلة جديدة: إسماعيل نجم الحيالي - CA-0008', timestamp: '2024-06-13T13:00:00', ipAddress: '192.168.1.3' },
  { id: 'al9', userId: 'u2', userName: 'فاطمة علي حسن', action: 'view', target: 'ملف عائلة', targetId: 'f4', details: 'عرض ملف عائلة: خالد إبراهيم المشهداني', timestamp: '2024-06-13T10:00:00', ipAddress: '192.168.1.2' },
  { id: 'al10', userId: 'u1', userName: 'أحمد محمد الإدريسي', action: 'add', target: 'صنف مساعدة', details: 'إضافة صنف مساعدة جديد: مساعدة مالية طارئة', timestamp: '2024-06-12T09:00:00', ipAddress: '192.168.1.1' },
];
