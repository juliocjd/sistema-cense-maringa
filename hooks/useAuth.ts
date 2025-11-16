// hooks/useAuth.ts
// Hook para acessar dados do usuário autenticado via NextAuth

"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  cargo: string;
  setor: string;
}

export function useAuth() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.replace("/login");
  }, [router]);

  return {
    user: session?.user as User | null,
    loading: status === "loading",
    isAuthenticated: status === "authenticated",
    logout,
  };
}
