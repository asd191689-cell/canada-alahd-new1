export type UserRole = "admin" | "representative" | "employee";

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface FamilyMember {
  id: number;

  gender?: "" | "ذكر" | "أنثى";

  name: string;

  nationalId: string;

  dateOfBirth: string;

  age: number;

  relation: "" | "wife" | "son" | "daughter" | "other";

  healthStatus: "" | "healthy" | "sick" | "disabled";

  disability?: string;

  notes?: string;
}
export interface Family {
  id: number;

  fileNumber: string;

  headName: string;

  headNationalId: string;

  headDateOfBirth: string;

  headAge: number;

  headPhone: string;
  alternatePhone?: string;

  headHealthStatus: "healthy" | "sick" | "disabled";

  originGovernorate: string;

  originCity: string;

  currentAddress: string;
  entryDate: string;
  campLocation: string;

  /*
  ==========================
  الحقول الجديدة
  ==========================
  */

  gender?: "ذكر" | "أنثى";

  maritalStatus?: string;

  isProvider?: boolean;

  housingType?: string;

  malesCount?: number;

  femalesCount?: number;

  /*
  ==========================
  الذكور حسب الفئات
  ==========================
  */

  male0to5?: number;

  male6to11?: number;

  male12to17?: number;

  male18to24?: number;

  male25to60?: number;

  male60Plus?: number;

  /*
  ==========================
  الإناث حسب الفئات
  ==========================
  */

  female0to5?: number;

  female6to11?: number;

  female12to17?: number;

  female18to24?: number;

  female25to60?: number;

  female60Plus?: number;

  /*
  ==========================
  بيانات الأسرة
  ==========================
  */

  membersCount: number;
  totalFamilyMembers?: number;

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
  id: number;
  familyId: number;
  headNationalId: string | null;
  fileNumber?: string | null;
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: number;
  status: "pending" | "approved" | "rejected";
}

export type AidCategory =
  | "food"
  | "medical"
  | "financial"
  | "clothing"
  | "household";

export interface AidType {
  id: number;

  name: string;

  category: AidCategory;

  description?: string;

  unit: string;

  createdAt: string;
}

export interface AidDistribution {
  id: number;

  familyId: number;
  headNationalId: string;

  familyName: string;

  fileNumber: string;

  aidTypeId: number;

  aidTypeName: string;

  quantity: number;

  unit: string;

  distributionDate: string;

  supervisorId: number;

  supervisorName: string;

  notes?: string;

  createdAt: string;
}

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_FAMILY"
  | "UPDATE_FAMILY"
  | "DELETE_FAMILY"
  | "UPLOAD_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "CREATE_AID_TYPE"
  | "UPDATE_AID_TYPE"
  | "DELETE_AID_TYPE"
  | "DISTRIBUTE_AID"
  | "DELETE_DISTRIBUTION";
export interface AuditLog {
  id: number;

  userId: number;

  userName: string;

  action: AuditAction;

  target: string;

  targetId?: number;

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

  familiesByGovernorate: {
    name: string;
    count: number;
  }[];

  aidByCategory: {
    name: string;
    count: number;
    color: string;
  }[];

  monthlyRegistrations: {
    month: string;
    count: number;
  }[];
}
