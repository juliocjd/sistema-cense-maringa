// types/next-auth.d.ts
// Extensão de tipos do NextAuth para incluir campos customizados

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      cargo: string;
      setor: string;
      roles: string[];
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    cargo: string;
    setor: string;
    roles: string[];
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    cargo: string;
    setor: string;
    roles: string[];
    permissions: string[];
  }
}
