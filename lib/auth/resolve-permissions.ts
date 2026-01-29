import {
  LEGACY_ROLE_PERMISSIONS,
  mergePermissions,
  type PermissionCode,
} from "@/lib/auth/permissions";

type SessionLike = {
  user?: {
    permissions?: string[];
    cargo?: string | null;
    roles?: string[] | null;
  } | null;
} | null;

type OperadorLike = {
  funcaoRole?: string | null;
} | null;

export const resolveUserPermissions = (
  session: SessionLike,
  operador?: OperadorLike
): PermissionCode[] => {
  const sessionPerms = session?.user?.permissions;
  if (Array.isArray(sessionPerms)) {
    return sessionPerms;
  }

  const role =
    (operador?.funcaoRole ?? session?.user?.cargo ?? "OPERADOR").toUpperCase();
  const legacy = LEGACY_ROLE_PERMISSIONS[role] ?? [];
  return mergePermissions(legacy);
};
