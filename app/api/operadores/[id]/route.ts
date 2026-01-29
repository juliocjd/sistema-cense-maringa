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

const updateOperadorSchema = z.object({
  nomeCompleto: z.string().min(3).optional(),
  email: z.string().email().optional(),
  status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]).optional(),
  funcaoRole: z.enum(["ADMIN", "OPERADOR"]).optional(),
  senha: z.string().min(6).optional(),
});

/**
 * PATCH /api/operadores/[id]
 * Atualiza dados do operador (nome, email, status, funcaoRole, senha)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const dados = updateOperadorSchema.parse(payload ?? {});

    if (Object.keys(dados).length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma alteracao informada" },
        { status: 400 }
      );
    }

    const operadorAlvo = await prisma.operador.findUnique({
      where: { id },
      include: OPERADOR_INCLUDE,
    });

    if (!operadorAlvo) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 404 }
      );
    }

    if (dados.email && dados.email !== operadorAlvo.email) {
      const existente = await prisma.operador.findUnique({
        where: { email: dados.email },
      });
      if (existente && existente.id !== operadorAlvo.id) {
        return NextResponse.json(
          { erro: "Email ja cadastrado" },
          { status: 409 }
        );
      }
    }

    const atualizacao: Record<string, unknown> = {};
    if (dados.nomeCompleto !== undefined) {
      atualizacao.nomeCompleto = dados.nomeCompleto.trim();
    }
    if (dados.email !== undefined) {
      atualizacao.email = dados.email.trim().toLowerCase();
    }
    if (dados.status !== undefined) {
      atualizacao.status = dados.status;
    }
    if (dados.funcaoRole !== undefined) {
      atualizacao.funcaoRole = dados.funcaoRole;
    }
    if (dados.senha) {
      atualizacao.senhaHash = await bcrypt.hash(dados.senha, 10);
    }

    const atualizado = await prisma.operador.update({
      where: { id },
      data: atualizacao,
      include: OPERADOR_INCLUDE,
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "UPDATE",
        tabelaAfetada: "operadores",
        registroIdAfetado: id,
        detalhesAlteracao: {
          camposAtualizados: Object.keys(atualizacao),
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({ operador: mapOperador(atualizado) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Erro ao atualizar operador:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar operador" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/operadores/[id]
 * Remove operador (se nao houver vinculacoes impeditivas).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (id === operadorId) {
      return NextResponse.json(
        { erro: "Nao e possivel excluir o proprio usuario" },
        { status: 400 }
      );
    }

    const operadorAlvo = await prisma.operador.findUnique({
      where: { id },
      select: { id: true, nomeCompleto: true, email: true },
    });

    if (!operadorAlvo) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 404 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.operadorPapel.deleteMany({ where: { operadorId: id } });
        await tx.operador.delete({ where: { id } });
        await tx.logAuditoria.create({
          data: {
            operadorId,
            acao: "DELETE",
            tabelaAfetada: "operadores",
            registroIdAfetado: id,
            detalhesAlteracao: {
              nomeCompleto: operadorAlvo.nomeCompleto,
              email: operadorAlvo.email,
            },
            ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
          },
        });
      });
    } catch (error: any) {
      if (error?.code === "P2003") {
        return NextResponse.json(
          {
            erro:
              "Operador possui registros vinculados e nao pode ser excluido. Considere inativar.",
          },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ mensagem: "Operador removido com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir operador:", error);
    return NextResponse.json(
      { erro: "Erro ao excluir operador" },
      { status: 500 }
    );
  }
}
