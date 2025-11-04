// hooks/useAuth.ts
// Hook para acessar dados do usuário autenticado via NextAuth

"use client";

import { useSession, signOut } from "next-auth/react";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  cargo: string;
  setor: string;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const logout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return {
    user: session?.user as User | null,
    loading: status === "loading",
    isAuthenticated: status === "authenticated",
    logout,
  };
}
