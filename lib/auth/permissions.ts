export type PermissionCode = string;

export const LEGACY_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  ADMIN: ["*"],
  OPERADOR: [],
  CONSULTA: [],
};

export function mergePermissions(perms: PermissionCode[]): PermissionCode[] {
  const set = new Set(perms.map((p) => p.toUpperCase()));
  return Array.from(set);
}

export function hasPermission(
  userPermissions: PermissionCode[] | undefined,
  required: PermissionCode | PermissionCode[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  const normalized = userPermissions.map((p) => p.toUpperCase());
  if (normalized.includes("*")) {
    return true;
  }
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((perm) =>
    normalized.includes(perm.toUpperCase())
  );
}
