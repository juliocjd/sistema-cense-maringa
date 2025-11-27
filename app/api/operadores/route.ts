import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const OPERADOR_INCLUDE = {
  papeis: {
    include: {
      papel: {
        include: {
          permissoes: {
            include: {
              permissao: true,
            },
          },
        },
      },
    },
  },
} as const;

const isAdmin = (
  operador:
    | (Awaited<ReturnType<typeof prisma.operador.findUnique>> & {
        papeis: Array<{
          papel: {
            nome: string;
          };
        }>;
      })
    | null
) => {
  if (!operador) {
    return false;
  }
  if ((operador.funcaoRole ?? "").toUpperCase() === "ADMIN") {
    return true;
  }
  return operador.papeis.some(
    (papelRelacao) => papelRelacao.papel.nome.toUpperCase() === "ADMIN"
  );
};

const mapOperador = (operador: {
  id: string;
  nomeCompleto: string;
  email: string;
  status: string;
  funcaoRole: string;
  papeis: Array<{
    papel: {
      nome: string;
      descricao: string | null;
      permissoes: Array<{
        permissao: {
          codigo: string;
        };
      }>;
    };
  }>;
}) => {
  const papeis = operador.papeis.map((relacao) => relacao.papel.nome);
  const permissoes = new Set<string>();
  operador.papeis.forEach((relacao) =>
    relacao.papel.permissoes.forEach((permissao) =>
      permissoes.add(permissao.permissao.codigo)
    )
  );

  return {
    id: operador.id,
    nomeCompleto: operador.nomeCompleto,
    email: operador.email,
    status: operador.status,
    funcaoRole: operador.funcaoRole,
    papeis,
    permissoes: Array.from(permissoes),
  };
};

const updatePapeisSchema = z.object({
  operadorId: z.string().uuid(),
  papeis: z.array(z.string().min(1)).optional().default([]),
});

const createOperadorSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres"),
  email: z.string().email("E-mail invalido"),
  senha: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
  funcaoRole: z.enum(["ADMIN", "OPERADOR"]).default("OPERADOR"),
  papeis: z.array(z.string().min(1)).optional().default([]),
});

const atualizarPapeisOperador = async (
  operadorId: string,
  nomesPapeis: string[]
) => {
  if (!nomesPapeis || nomesPapeis.length === 0) {
    await prisma.operadorPapel.deleteMany({ where: { operadorId } });
    return;
  }

  const papeisRegistros = await prisma.papel.findMany({
    where: { nome: { in: nomesPapeis } },
  });

  if (papeisRegistros.length === 0) {
    throw new Error("Nenhum dos papeis informados foi localizado");
  }

  const papeisValidos = papeisRegistros.map((papel) => papel.id);

  await prisma.$transaction(async (tx) => {
    await tx.operadorPapel.deleteMany({
      where: {
        operadorId,
        NOT: { papelId: { in: papeisValidos } },
      },
    });

    const existentes = await tx.operadorPapel.findMany({
      where: { operadorId },
    });
    const existentesSet = new Set(existentes.map((item) => item.papelId));
    const pendentes = papeisValidos.filter(
      (papelId) => !existentesSet.has(papelId)
    );

    if (pendentes.length > 0) {
      await tx.operadorPapel.createMany({
        data: pendentes.map((papelId) => ({
          operadorId,
          papelId,
        })),
        skipDuplicates: true,
      });
    }
  });
};

export async function GET() {
  try {
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorAtual = await prisma.operador.findUnique({
      where: { id: operadorId },
      include: OPERADOR_INCLUDE,
    });

    if (!isAdmin(operadorAtual)) {
      return NextResponse.json(
        { erro: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const [operadores, papeis] = await Promise.all([
      prisma.operador.findMany({
        orderBy: { nomeCompleto: "asc" },
        include: OPERADOR_INCLUDE,
      }),
      prisma.papel.findMany({
        orderBy: { nome: "asc" },
        include: {
          permissoes: {
            include: { permissao: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      operadores: operadores.map(mapOperador),
      papeis: papeis.map((papel) => ({
        id: papel.id,
        nome: papel.nome,
        descricao: papel.descricao,
        permissoes: papel.permissoes.map((relacao) => relacao.permissao.codigo),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar operadores:", error);
    return NextResponse.json(
      { erro: "Erro ao listar operadores" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorAtual = await prisma.operador.findUnique({
      where: { id: operadorId },
      include: OPERADOR_INCLUDE,
    });

    if (!isAdmin(operadorAtual)) {
      return NextResponse.json(
        { erro: "Apenas administradores podem atualizar papéis" },
        { status: 403 }
      );
    }

    const payload = await request.json().catch(() => null);
    const { operadorId: alvoId, papeis } = updatePapeisSchema.parse(payload);

    const operadorAlvo = await prisma.operador.findUnique({
      where: { id: alvoId },
      include: OPERADOR_INCLUDE,
    });

    if (!operadorAlvo) {
      return NextResponse.json(
        { erro: "Operador informado nao foi encontrado" },
        { status: 404 }
      );
    }

    await atualizarPapeisOperador(alvoId, papeis);

    const atualizado = await prisma.operador.findUnique({
      where: { id: alvoId },
      include: OPERADOR_INCLUDE,
    });

    if (!atualizado) {
      throw new Error("Falha ao recarregar operador apos atualizacao");
    }

    return NextResponse.json({
      operador: mapOperador(atualizado),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Erro ao atualizar papeis:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar papeis do operador" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorAtual = await prisma.operador.findUnique({
      where: { id: operadorId },
      include: OPERADOR_INCLUDE,
    });

    if (!isAdmin(operadorAtual)) {
      return NextResponse.json(
        { erro: "Apenas administradores podem criar operadores" },
        { status: 403 }
      );
    }

    const payload = await request.json().catch(() => null);
    const { nomeCompleto, email, senha, funcaoRole, papeis } =
      createOperadorSchema.parse(payload);

    const operadorExistente = await prisma.operador.findUnique({
      where: { email },
    });

    if (operadorExistente) {
      return NextResponse.json(
        { erro: "Email ja cadastrado" },
        { status: 409 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const criado = await prisma.operador.create({
      data: {
        nomeCompleto,
        email,
        senhaHash,
        funcaoRole,
        status: "ATIVO",
      },
    });

    await atualizarPapeisOperador(criado.id, papeis);

    const operadorCompleto = await prisma.operador.findUnique({
      where: { id: criado.id },
      include: OPERADOR_INCLUDE,
    });

    if (!operadorCompleto) {
      throw new Error("Falha ao carregar operador apos criacao");
    }

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "INSERT",
        tabelaAfetada: "operadores",
        registroIdAfetado: criado.id,
        detalhesAlteracao: {
          nomeCompleto,
          email,
          funcaoRole,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json(
      {
        mensagem: "Operador criado com sucesso",
        operador: mapOperador(operadorCompleto),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Erro ao criar operador:", error);
    return NextResponse.json(
      { erro: "Erro ao criar operador" },
      { status: 500 }
    );
  }
}
