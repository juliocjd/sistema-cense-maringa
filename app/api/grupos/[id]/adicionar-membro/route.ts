import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
} from "@/lib/conflitos";
import { notificarTecnicosSobreConflito } from "@/lib/notificacoes/tecnico";

type AlertItem = {
  tipo: string;
  nivel: number;
  mensagem: string;
  origem?: string;
  tipo_conflito?: string;
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
                bairroOrigem: true,
                faccao: true,
                tecnicoReferencia: true,
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
          include: {
            adolescenteB: {
              include: {
                alojamentoAtual: true,
                bairroOrigem: true,
                faccao: true,
                tecnicoReferencia: true,
              },
            },
          },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: {
            adolescenteA: {
              include: {
                alojamentoAtual: true,
                bairroOrigem: true,
                faccao: true,
                tecnicoReferencia: true,
              },
            },
          },
        },
        bairroOrigem: true,
        faccao: true,
        tecnicoReferencia: true,
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

    const conflitosTerritoriais = await montarMapaBairrosConflitantes(
      adolescente.bairroOrigemId
    );
    const conflitosFaccionais = await montarMapaFaccoesConflitantes(
      adolescente.faccaoGrupoId
    );

    const alertas: AlertItem[] = [];
    const alertasAdicionais = new Set<string>();
    let nivelRiscoMaximo = 0;
    let requerJustificativa = false;
    const conflitosInternosIds = new Set<string>();

    const registrarConflitoExtra = (
      ocupante: any,
      tipo: "bairro" | "faccao",
      contexto: string,
      nivelPadrao: number
    ) => {
      const mapa = tipo === "bairro" ? conflitosTerritoriais : conflitosFaccionais;
      const chave =
        tipo === "bairro" ? ocupante.bairroOrigemId : ocupante.faccaoGrupoId;
      if (!chave || !mapa.has(chave)) {
        return false;
      }
      const conflito = mapa.get(chave);
      if (!conflito) {
        return false;
      }
      const identificador = `${ocupante.id}:${tipo}`;
      if (alertasAdicionais.has(identificador)) {
        return false;
      }
      alertasAdicionais.add(identificador);
      const mensagem =
        tipo === "bairro"
          ? `Conflito territorial (${conflito.origem.nome} × ${conflito.destino.nome}) detectado durante ${contexto} com ${ocupante.nomeCompleto}.`
          : `Conflito entre facções (${conflito.origem.nome} × ${conflito.destino.nome}) detectado durante ${contexto} com ${ocupante.nomeCompleto}.`;
      alertas.push({
        tipo: tipo === "bairro" ? "CONFLITO_TERRITORIAL" : "CONFLITO_FACCAO",
        nivel: nivelPadrao,
        mensagem,
        origem: tipo === "bairro" ? "TERRITORIAL" : "FACCAO",
        tipo_conflito: tipo === "bairro" ? "BAIRRO" : "FACCAO",
        adolescente: {
          id: ocupante.id,
          nome: ocupante.nomeCompleto,
          grupo: contexto,
        },
      });
      nivelRiscoMaximo = Math.max(nivelRiscoMaximo, nivelPadrao);
      requerJustificativa = true;
      void notificarTecnicosSobreConflito({
        contexto: "GRUPO",
        adolescente: {
          id: adolescente.id,
          nomeCompleto: adolescente.nomeCompleto,
          tecnico: adolescente.tecnicoReferencia
            ? {
                nome: adolescente.tecnicoReferencia.nome,
                email: adolescente.tecnicoReferencia.email,
              }
            : undefined,
        },
        adversario: {
          id: ocupante.id,
          nomeCompleto: ocupante.nomeCompleto,
          tecnico: ocupante.tecnicoReferencia
            ? {
                nome: ocupante.tecnicoReferencia.nome,
                email: ocupante.tecnicoReferencia.email,
              }
            : undefined,
        },
        mensagem,
      });
      return true;
    };

    const membrosAtivos = grupo.membros.map((membro) => membro.adolescente);
    for (const membro of membrosAtivos) {
      // PRIORIDADE DE FACÇÃO: Se mesma facção, são aliados (ignora bairro)
      const mesmaFaccao =
        adolescente.faccaoGrupoId &&
        membro.faccaoGrupoId &&
        adolescente.faccaoGrupoId === membro.faccaoGrupoId;

      if (mesmaFaccao) {
        continue; // Mesma facção = aliados, não há conflito
      }

      // Só verifica conflito de bairro se AMBOS não têm facção
      if (!adolescente.faccaoGrupoId && !membro.faccaoGrupoId) {
        registrarConflitoExtra(
          membro,
          "bairro",
          `mesmo grupo ${grupo.nomeGrupo}`,
          3
        );
      }

      // Sempre verifica conflito de facção (se houver)
      registrarConflitoExtra(
        membro,
        "faccao",
        `mesmo grupo ${grupo.nomeGrupo}`,
        4
      );
    }

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
        adolescente: {
          include: {
            alojamentoAtual: true,
            bairroOrigem: true,
            faccao: true,
            tecnicoReferencia: true,
          },
        },
      },
    });

    const adversariosMesmaCasa = new Map<string, string>();
    for (const membro of membrosOutrosGrupos) {
      adversariosMesmaCasa.set(
        membro.adolescenteId,
        membro.grupo.nomeGrupo
      );

      // PRIORIDADE DE FACÇÃO: Se mesma facção, são aliados (ignora bairro)
      const mesmaFaccao =
        adolescente.faccaoGrupoId &&
        membro.adolescente.faccaoGrupoId &&
        adolescente.faccaoGrupoId === membro.adolescente.faccaoGrupoId;

      if (mesmaFaccao) {
        continue; // Mesma facção = aliados, não há conflito
      }

      // Só verifica conflito de bairro se AMBOS não têm facção
      if (!adolescente.faccaoGrupoId && !membro.adolescente.faccaoGrupoId) {
        registrarConflitoExtra(
          membro.adolescente,
          "bairro",
          `grupo ${membro.grupo.nomeGrupo}`,
          3
        );
      }

      // Sempre verifica conflito de facção (se houver)
      registrarConflitoExtra(
        membro.adolescente,
        "faccao",
        `grupo ${membro.grupo.nomeGrupo}`,
        4
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
        conflitosInternosIds.add(conflito.id);
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
      registrarConflitoExtra(adversario, "bairro", "grupo atual", 3);
      registrarConflitoExtra(adversario, "faccao", "grupo atual", 4);
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

      if (conflitosInternosIds.size > 0) {
        const conflictModel = (tx as any)?.conflito ?? prisma.conflito;
        if (conflictModel?.updateMany) {
          await conflictModel.updateMany({
            where: { id: { in: Array.from(conflitosInternosIds) } },
            data: { registroGrupoId: grupoId },
          });
        }
      }

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

