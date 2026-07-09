export type UserRole = "admin" | "representative" | "employee";

export interface User {
  id: string;
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

  headNationalId: string;

  fileNumber?: string;

  type:
    | "national_id"
    | "displacement_card"
    | "birth_certificate"
    | "marriage_certificate"
    | "medical_report"
    | "other";

  name: string;

  url: string;

  uploadedAt: string;

  uploadedBy: string;
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

export type AuditAction =
  | "add"
  | "edit"
  | "delete"
  | "restore"
  | "export"
  | "login"
  | "view";

export interface AuditLog {
  id: number;

  userId: string;

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
