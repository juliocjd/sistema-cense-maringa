"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert } from "lucide-react";

import { hasPermission, type PermissionCode } from "@/lib/auth/permissions";

type PermissionGuardProps = {
  children: React.ReactNode;
  required: PermissionCode | PermissionCode[];
  redirectTo?: string;
  mensagem?: string;
};

export default function PermissionGuard({
  children,
  required,
  redirectTo = "/dashboard",
  mensagem = "Acesso restrito para este perfil.",
}: PermissionGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const permitido = useMemo(
    () => status === "authenticated" && hasPermission(session?.user?.permissions, required),
    [required, session, status]
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
          Verificando permissoes...
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
          <p className="text-sm font-semibold">{mensagem}</p>
          <p className="text-xs text-amber-700">
            Voce sera redirecionado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
