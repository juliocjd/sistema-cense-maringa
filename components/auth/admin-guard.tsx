"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert } from "lucide-react";

type AdminGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const isAdminSession = (
  session:
    | {
        user?: {
          cargo?: string | null;
          roles?: string[] | null;
        };
      }
    | null
    | undefined,
) => {
  const cargo = session?.user?.cargo ?? "";
  const roles = session?.user?.roles ?? [];
  const rolesUpper = roles.map((role) => role.toUpperCase());
  return cargo.toUpperCase() === "ADMIN" || rolesUpper.includes("ADMIN");
};

export default function AdminGuard({
  children,
  redirectTo = "/dashboard",
}: AdminGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const permitido = useMemo(
    () => status === "authenticated" && isAdminSession(session),
    [session, status],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !permitido) {
      router.replace(redirectTo);
    }
  }, [permitido, redirectTo, router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 size={20} className="animate-spin text-indigo-600" />
          Verificando permissões...
        </div>
      </div>
    );
  }

  if (!permitido) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-6 text-center text-amber-800">
        <div className="max-w-md space-y-3">
          <div className="flex justify-center">
            <ShieldAlert size={28} className="text-amber-600" />
          </div>
          <p className="text-sm font-semibold">
            Acesso restrito a administradores.
          </p>
          <p className="text-xs text-amber-700">
            Você será redirecionado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
