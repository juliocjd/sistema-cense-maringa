// auth.ts
// Configuração central do NextAuth.js v5
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

        // Buscar operador no banco
        const operador = await prisma.operador.findUnique({
          where: { email: credentials.email as string },
        });

        if (!operador) {
          throw new Error("Credenciais inválidas");
        }

        // Verificar se operador está ativo
        if (operador.status !== "ATIVO") {
          throw new Error("Usuário inativo. Contate o administrador.");
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(
          credentials.senha as string,
          operador.senhaHash
        );

        if (!senhaValida) {
          throw new Error("Credenciais inválidas");
        }

        // Retornar dados do operador para a sessão
        return {
          id: operador.id,
          name: operador.nomeCompleto,
          email: operador.email,
          cargo: operador.funcaoRole,
          setor: operador.funcaoRole, // Usando funcaoRole como setor temporariamente
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Quando user existe, é o primeiro login
      if (user) {
        const typedUser = user as typeof user & {
          id?: string;
          cargo?: string;
          setor?: string;
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
      }
      return token;
    },
    async session({ session, token }) {
      // Adicionar informações customizadas à sessão
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.cargo = token.cargo as string;
        session.user.setor = token.setor as string;
      }
      return session;
    },
  },
});
