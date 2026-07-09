export type Permission =
  | "families"
  | "documents"
  | "aid"
  | "reports"
  | "audit"
  | "users";

export type Role = "admin" | "representative" | "employee";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["families", "documents", "aid", "reports", "audit", "users"],

  representative: ["families", "documents", "aid", "reports", "audit"],

  employee: ["families", "documents", "aid"],
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
