// components/providers/session-provider.tsx
// Provider para sessão do NextAuth

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

import { useEffect, useState, useRef } from "react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [retrying, setRetrying] = useState(false);
  const alreadyReloaded = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        const target = args[0];
        const url =
          typeof target === "string"
            ? target
            : (target as Request)?.url ?? "";

        if (
          url.includes("/api/auth/session") &&
          !alreadyReloaded.current &&
          !retrying
        ) {
          alreadyReloaded.current = true;
          setRetrying(true);
          setTimeout(() => {
            window.location.reload();
          }, 2200);
        }

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [retrying]);

  return (
    <>
      {retrying && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
          <div className="w-full max-w-3xl rounded-b-2xl bg-amber-600 text-white shadow-2xl border border-amber-500 text-center px-4 py-3 font-semibold tracking-wide">
            Detectamos instabilidade na sessão. Recarregando em instantes…
          </div>
        </div>
      )}
      <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
    </>
  );
}
