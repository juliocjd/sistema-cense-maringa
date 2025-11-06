// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Schema de validação
const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Secret para JWT (em produção, deve vir de variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || "cense-maringa-secret-key-2025";

// POST /api/auth/login - Autenticar operador
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const { email, senha } = loginSchema.parse(body);

    // Buscar operador
    const operador = await prisma.operador.findUnique({
      where: { email },
    });

    if (!operador) {
      // Log de auditoria - tentativa falha
      await prisma.logAuditoria.create({
        data: {
          acao: "LOGIN_FALHA",
          detalhesAlteracao: {
            email,
            motivo: "E-mail não encontrado",
          },
          // ipOrigem: request.ip,
        },
      });

      return NextResponse.json(
        { erro: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Verificar se operador está ativo
    if (operador.status !== "ATIVO") {
      await prisma.logAuditoria.create({
        data: {
          operadorId: operador.id,
          acao: "LOGIN_FALHA",
          detalhesAlteracao: {
            email,
            motivo: "Operador inativo",
          },
        },
      });

      return NextResponse.json(
        { erro: "Operador inativo. Contacte o administrador." },
        { status: 403 }
      );
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, operador.senhaHash);

    if (!senhaValida) {
      await prisma.logAuditoria.create({
        data: {
          operadorId: operador.id,
          acao: "LOGIN_FALHA",
          detalhesAlteracao: {
            email,
            motivo: "Senha incorreta",
          },
        },
      });

      return NextResponse.json(
        { erro: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: operador.id,
        email: operador.email,
        role: operador.funcaoRole,
      },
      JWT_SECRET,
      { expiresIn: "8h" } // Token válido por 8 horas
    );

    // Log de auditoria - sucesso
    await prisma.logAuditoria.create({
      data: {
        operadorId: operador.id,
        acao: "LOGIN_SUCESSO",
        detalhesAlteracao: {
          email,
        },
      },
    });

    // Retornar token e dados do operador
    return NextResponse.json({
      token,
      operador: {
        id: operador.id,
        nome_completo: operador.nomeCompleto,
        email: operador.email,
        role: operador.funcaoRole,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao fazer login:", error);
    return NextResponse.json({ erro: "Erro ao fazer login" }, { status: 500 });
  }
}

// POST /api/auth/register - Cadastrar novo operador (apenas ADMIN)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { erro: "Credenciais de administrador ausentes" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.warn("Falha ao validar token de administrador:", error);
      return NextResponse.json(
        { erro: "Token inválido ou expirado" },
        { status: 401 }
      );
    }

    if (typeof decoded !== "object" || decoded === null) {
      return NextResponse.json(
        { erro: "Token inválido" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN") {
      await prisma.logAuditoria.create({
        data: {
          operadorId: decoded.id ?? null,
          acao: "LOGIN_FALHA",
          detalhesAlteracao: {
            motivo: "Usuário sem permissão para registrar operador",
          },
        },
      });

      return NextResponse.json(
        { erro: "Apenas administradores podem cadastrar operadores" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const registerSchema = z.object({
      nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
      email: z.string().email("E-mail inválido"),
      senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      funcaoRole: z.enum(["ADMIN", "OPERADOR"]),
    });

    const { nomeCompleto, email, senha, funcaoRole } =
      registerSchema.parse(body);

    // Verificar se e-mail já existe
    const operadorExistente = await prisma.operador.findUnique({
      where: { email },
    });

    if (operadorExistente) {
      return NextResponse.json(
        { erro: "E-mail já cadastrado" },
        { status: 409 }
      );
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar operador
    const operador = await prisma.operador.create({
      data: {
        nomeCompleto,
        email,
        senhaHash,
        funcaoRole,
        status: "ATIVO",
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: decoded.id, // ID do admin que criou
        acao: "INSERT",
        tabelaAfetada: "Operadores",
        registroIdAfetado: operador.id,
        detalhesAlteracao: {
          nomeCompleto,
          email,
          funcaoRole,
        },
      },
    });

    return NextResponse.json(
      {
        id: operador.id,
        nome_completo: operador.nomeCompleto,
        email: operador.email,
        role: operador.funcaoRole,
        mensagem: "Operador cadastrado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao cadastrar operador:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar operador" },
      { status: 500 }
    );
  }
}
