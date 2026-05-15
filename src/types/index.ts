export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  nationalId: string;
  dateOfBirth: string;
  age: number;
  relation: 'wife' | 'son' | 'daughter' | 'other';
  healthStatus: 'healthy' | 'sick' | 'disabled';
  disability?: string;
  notes?: string;
}

export interface Family {
  id: string;
  fileNumber: string; // CA-0000
  headName: string;
  headNationalId: string;
  headDateOfBirth: string;
  headAge: number;
  headPhone: string;
  headHealthStatus: 'healthy' | 'sick' | 'disabled';
  originGovernorate: string;
  originCity: string;
  currentAddress: string;
  entryDate: string;
  membersCount: number;
  members: FamilyMember[];
  documents: Document[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  registeredBy: string;
  photoUrl?: string;
  notes?: string;
}

export interface Document {
  id: string;
  familyId: string;
  type: 'national_id' | 'displacement_card' | 'birth_certificate' | 'marriage_certificate' | 'medical_report' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type AidCategory = 'food' | 'medical' | 'financial' | 'clothing' | 'household';

export interface AidType {
  id: string;
  name: string;
  category: AidCategory;
  description?: string;
  unit: string;
  createdAt: string;
}

export interface AidDistribution {
  id: string;
  familyId: string;
  familyName: string;
  fileNumber: string;
  aidTypeId: string;
  aidTypeName: string;
  quantity: number;
  unit: string;
  distributionDate: string;
  supervisorId: string;
  supervisorName: string;
  notes?: string;
  createdAt: string;
}

export type AuditAction = 'add' | 'edit' | 'delete' | 'restore' | 'export' | 'login' | 'view';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  target: string;
  targetId?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardStats {
  totalFamilies: number;
  totalIndividuals: number;
  avgFamilySize: number;
  newThisMonth: number;
  totalAidDistributions: number;
  recentFamilies: Family[];
  familiesByGovernorate: { name: string; count: number }[];
  aidByCategory: { name: string; count: number; color: string }[];
  monthlyRegistrations: { month: string; count: number }[];
}
