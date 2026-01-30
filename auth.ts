// auth.ts
// Configuração central do NextAuth.js v5 com suporte a papéis e permissões

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  LEGACY_ROLE_PERMISSIONS,
  mergePermissions,
} from "@/lib/auth/permissions";

export const runtime = "nodejs";

const operadorInclude = {
  papeis: {
    include: {
      papel: {
        include: { permissoes: { include: { permissao: true } } },
      },
    },
  },
} as const;

const mapOperadorPermissions = (operador: {
  funcaoRole: string;
  papeis?:
    | Array<{
        papel: {
          nome: string;
          permissoes: Array<{
            permissao: { codigo: string };
          }>;
        };
      }>
    | undefined;
}) => {
  const papeisBanco = operador.papeis ?? [];
  const rolesFromDb = papeisBanco.map((ligacao) =>
    ligacao.papel.nome.toUpperCase()
  );
  const permissoesFromDb = papeisBanco.flatMap((ligacao) =>
    ligacao.papel.permissoes.map((rel) =>
      rel.permissao.codigo.toUpperCase()
    )
  );

  const legacyRole = (operador.funcaoRole ?? "OPERADOR").toUpperCase();
  const hasDbRoles = rolesFromDb.length > 0;
  const roles = hasDbRoles ? rolesFromDb : [legacyRole];

  const fallbackPerms = LEGACY_ROLE_PERMISSIONS[legacyRole] ?? [];
  const permissions = mergePermissions(
    hasDbRoles ? permissoesFromDb : fallbackPerms
  );
  if (roles.includes("ADMIN") && !permissions.includes("*") && !permissions.includes("FULL_ACCESS")) {
    permissions.push("FULL_ACCESS");
  }

  return { roles, permissions };
};

const carregarOperadorPorEmail = async (email: string) => {
  try {
    return await prisma.operador.findUnique({
      where: { email },
      include: operadorInclude,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn(
        "[auth] Tabela de papeis/permissoes ausente. Aplicando fallback legacy."
      );
      return prisma.operador.findUnique({
        where: { email },
      });
    }
    throw error;
  }
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error("Email e senha são obrigatórios");
        }

        const operador = await carregarOperadorPorEmail(
          credentials.email as string
        );

        if (!operador) {
          throw new Error("Credenciais inválidas");
        }

        if (operador.status !== "ATIVO") {
          throw new Error("Usuário inativo. Contate o administrador.");
        }

        const senhaValida = await bcrypt.compare(
          credentials.senha as string,
          operador.senhaHash
        );

        if (!senhaValida) {
          throw new Error("Credenciais inválidas");
        }

        const { roles, permissions } = mapOperadorPermissions(operador);

        return {
          id: operador.id,
          name: operador.nomeCompleto,
          email: operador.email,
          cargo: operador.funcaoRole,
          setor: operador.funcaoRole,
          roles,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as typeof user & {
          id?: string;
          cargo?: string;
          setor?: string;
          roles?: string[];
          permissions?: string[];
        };

        if (typedUser.id) {
          token.id = typedUser.id;
        }
        if (typedUser.cargo) {
          token.cargo = typedUser.cargo;
        }
        if (typedUser.setor) {
          token.setor = typedUser.setor;
        }
        if (typedUser.roles) {
          token.roles = typedUser.roles;
        }
        if (typedUser.permissions) {
          token.permissions = typedUser.permissions;
        }
      }

      if (!token.roles) {
        token.roles = [];
      }
      if (!token.permissions) {
        token.permissions = [];
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.cargo = (token.cargo as string) ?? "";
        session.user.setor = (token.setor as string) ?? "";
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
});
