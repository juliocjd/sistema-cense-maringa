import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

const paramsSchema = z.object({
  id: z.string().uuid("Id do ato infracional invalido"),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id do ato infracional invalido" },
        { status: 400 },
      );
    }

    const atoId = parsedParams.data.id;
    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 },
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true, funcaoRole: true },
    });

    if (!operador) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 },
      );
    }

    const permissoes = resolveUserPermissions(session, operador);
    if (!hasPermission(permissoes, PERMISSIONS.ADOLESCENTES_CREATE)) {
      return NextResponse.json(
        { erro: "Sem permissao para excluir ato infracional" },
        { status: 403 },
      );
    }

    const ato = await prisma.atoInfracionalCatalogo.findUnique({
      where: { id: atoId },
      select: {
        id: true,
        nome: true,
        gravidade: true,
        violenciaOuGraveAmeaca: true,
        casoTipificacoes: {
          select: {
            caso: {
              select: {
                adolescente: {
                  select: {
                    id: true,
                    nomeCompleto: true,
                    statusUnidade: true,
                  },
                },
              },
            },
          },
        },
        historicos: {
          select: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                statusUnidade: true,
              },
            },
          },
        },
      },
    });

    if (!ato) {
      return NextResponse.json(
        { erro: "Ato infracional nao encontrado" },
        { status: 404 },
      );
    }

    const adolescentesMap = new Map<
      string,
      { id: string; nomeCompleto: string; statusUnidade: string | null }
    >();

    ato.casoTipificacoes.forEach((tipificacao) => {
      const adolescente = tipificacao.caso?.adolescente;
      if (!adolescente) return;
      adolescentesMap.set(adolescente.id, adolescente);
    });

    ato.historicos.forEach((historico) => {
      const adolescente = historico.adolescente;
      if (!adolescente) return;
      adolescentesMap.set(adolescente.id, adolescente);
    });

    const adolescentes = Array.from(adolescentesMap.values()).sort((a, b) =>
      a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR"),
    );

    if (adolescentes.length > 0) {
      return NextResponse.json(
        {
          erro:
            "Nao e possivel excluir o ato infracional porque ele esta cadastrado em adolescentes",
          totalAdolescentes: adolescentes.length,
          adolescentes,
        },
        { status: 409 },
      );
    }

    await prisma.atoInfracionalCatalogo.delete({
      where: { id: atoId },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "ATO_INFRACIONAL_EXCLUIR",
        tabelaAfetada: "atos_infracionais_catalogo",
        registroIdAfetado: atoId,
        detalhesAlteracao: {
          nome: ato.nome,
          gravidade: ato.gravidade,
          violenciaOuGraveAmeaca: ato.violenciaOuGraveAmeaca ?? false,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Ato infracional removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover ato infracional:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover ato infracional",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
