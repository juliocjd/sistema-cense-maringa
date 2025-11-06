import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AlertItem = {
  tipo: string;
  nivel: number;
  mensagem: string;
  adolescente?: {
    id: string;
    nome: string;
    grupo?: string;
  };
};

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const normalizeMedidas = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ensureString(item))
    .filter((item): item is string => item.length > 0);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grupoId } = await params;

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);
    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });
    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const adolescenteId = ensureString(
      (payload as Record<string, unknown>)?.adolescenteId
    );
    const justificativa = ensureString(
      (payload as Record<string, unknown>)?.justificativa
    );
    const medidasAdicionais = normalizeMedidas(
      (payload as Record<string, unknown>)?.medidas_adicionais
    );

    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "adolescenteId e obrigatorio" },
        { status: 400 }
      );
    }

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        casa: true,
        membros: {
          where: { dataSaida: null },
          include: {
            adolescente: {
              include: {
                conflitosA: {
                  where: { status: "ATIVO" },
                  select: { adolescenteBId: true },
                },
                conflitosB: {
                  where: { status: "ATIVO" },
                  select: { adolescenteAId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { erro: "Grupo nao encontrado" },
        { status: 404 }
      );
    }

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        conflitosA: {
          where: { status: "ATIVO" },
          include: { adolescenteB: true },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: { adolescenteA: true },
        },
        gruposMembros: {
          where: { dataSaida: null },
          include: {
            grupo: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    if (adolescente.gruposMembros.length > 0) {
      const grupoAtual = adolescente.gruposMembros[0].grupo;
      return NextResponse.json(
        {
          erro: "Adolescente ja pertence a um grupo ativo",
          grupo_atual: {
            id: grupoAtual.id,
            nome: grupoAtual.nomeGrupo,
            casa: grupoAtual.casa.nome,
          },
        },
        { status: 400 }
      );
    }

    const membroAnterior = await prisma.grupoMembro.findFirst({
      where: {
        grupoId,
        adolescenteId,
      },
    });
    if (membroAnterior && membroAnterior.dataSaida === null) {
      return NextResponse.json(
        { erro: "Adolescente ja e membro ativo deste grupo" },
        { status: 400 }
      );
    }

    const conflitos = [
      ...adolescente.conflitosA.map((conflito) => ({
        id: conflito.id,
        tipo: ensureString(conflito.tipoConflito),
        adversario: conflito.adolescenteB,
      })),
      ...adolescente.conflitosB.map((conflito) => ({
        id: conflito.id,
        tipo: ensureString(conflito.tipoConflito),
        adversario: conflito.adolescenteA,
      })),
    ];

    const alertas: AlertItem[] = [];
    let nivelRiscoMaximo = 0;
    let requerJustificativa = false;

    const membrosAtivos = grupo.membros.map((membro) => membro.adolescente);

    const membrosOutrosGrupos = await prisma.grupoMembro.findMany({
      where: {
        dataSaida: null,
        grupo: {
          casaId: grupo.casaId,
          id: { not: grupo.id },
        },
      },
      include: {
        grupo: { include: { casa: true } },
        adolescente: true,
      },
    });

    const adversariosMesmaCasa = new Map<string, string>();
    for (const membro of membrosOutrosGrupos) {
      adversariosMesmaCasa.set(
        membro.adolescenteId,
        membro.grupo.nomeGrupo
      );
    }

    for (const conflito of conflitos) {
      const adversario = conflito.adversario;
      if (!adversario) {
        continue;
      }

      const estaNoGrupo = membrosAtivos.some(
        (membro) => membro.id === adversario.id
      );

      const conflitoGrupoAtual = estaNoGrupo;
      const conflitoOutrosGrupos = adversariosMesmaCasa.has(adversario.id);

      if (conflitoGrupoAtual) {
        nivelRiscoMaximo = Math.max(nivelRiscoMaximo, 5);
        alertas.push({
          tipo: "CONFLITO_INTERNO",
          nivel: 5,
          mensagem: `Conflito ativo com ${adversario.nomeCompleto} no mesmo grupo`,
          adolescente: {
            id: adversario.id,
            nome: adversario.nomeCompleto,
          },
        });
        requerJustificativa = true;
        continue;
      }

      if (conflitoOutrosGrupos) {
        nivelRiscoMaximo = Math.max(nivelRiscoMaximo, 4);
        alertas.push({
          tipo: "CONFLITO_GRUPO_CASA",
          nivel: 4,
          mensagem: `Conflito ativo com ${adversario.nomeCompleto} em outro grupo da mesma casa`,
          adolescente: {
            id: adversario.id,
            nome: adversario.nomeCompleto,
            grupo: adversariosMesmaCasa.get(adversario.id) ?? "Outro grupo",
          },
        });
        requerJustificativa = true;
        continue;
      }

      if (alertas.length === 0) {
        alertas.push({
          tipo: "CONFLITO_REGISTRADO",
          nivel: 2,
          mensagem: `Conflito registrado com ${adversario.nomeCompleto}`,
          adolescente: {
            id: adversario.id,
            nome: adversario.nomeCompleto,
          },
        });
      }
    }

    if (requerJustificativa && !justificativa) {
      return NextResponse.json(
        {
          status: "REQUER_JUSTIFICATIVA",
          nivel:
            nivelRiscoMaximo === 5 ? "CRITICO" : nivelRiscoMaximo === 4 ? "ALTO" : "MEDIO",
          conflitos: alertas,
          mensagem:
            "Conflitos detectados. Justificativa obrigatoria para continuar.",
        },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const novoMembro = await tx.grupoMembro.create({
        data: {
          grupoId,
          adolescenteId,
          dataEntrada: new Date(),
        },
        include: {
          adolescente: true,
          grupo: {
            include: { casa: true },
          },
        },
      });

      let decisaoId: string | null = null;
      if (requerJustificativa) {
        const decisao = await tx.decisaoOperacional.create({
          data: {
            operadorId,
            tipoOperacao: "GRUPO_ADICIONAR_MEMBRO",
            adolescenteId,
            grupoId,
            nivelAlerta:
              nivelRiscoMaximo === 5
                ? "CRITICO"
                : nivelRiscoMaximo === 4
                ? "ALTO"
                : "MEDIO",
            conflitosDetectados: alertas,
            justificativaOperador: justificativa,
            medidasAdicionais: medidasAdicionais,
            status: "EXECUTADO",
          },
          select: { id: true },
        });
        decisaoId = decisao.id;
      }

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "GRUPO_ADICIONAR_MEMBRO",
          tabelaAfetada: "grupos_membros",
          registroIdAfetado: novoMembro.id,
          detalhesAlteracao: {
            grupo: grupo.nomeGrupo,
            adolescente: adolescente.nomeCompleto,
            conflitos_detectados: alertas.length,
            nivel_risco: nivelRiscoMaximo,
            justificativa: justificativa || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      });

      return { novoMembro, decisaoId };
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Adolescente adicionado ao grupo com sucesso",
        documentado: requerJustificativa,
        membro: {
          id: resultado.novoMembro.id,
          adolescente: {
            id: resultado.novoMembro.adolescente.id,
            nome: resultado.novoMembro.adolescente.nomeCompleto,
          },
          grupo: {
            id: resultado.novoMembro.grupo.id,
            nome: resultado.novoMembro.grupo.nomeGrupo,
            casa: resultado.novoMembro.grupo.casa.nome,
          },
          data_entrada: resultado.novoMembro.dataEntrada,
        },
        decisao_id: resultado.decisaoId,
        alertas_processados: alertas.length,
        nivel_risco:
          nivelRiscoMaximo === 5
            ? "CRITICO"
            : nivelRiscoMaximo === 4
            ? "ALTO"
            : "BAIXO",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao adicionar membro ao grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao adicionar membro ao grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
