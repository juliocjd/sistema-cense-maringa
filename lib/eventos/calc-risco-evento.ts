import { prisma } from "@/lib/prisma";

type ConflitoBruto = {
  id: string;
  tipo?: string | null;
  outroId: string;
  outroNome: string;
};

export type ParticipanteEvento = {
  id: string;
  nome: string;
  grupoId: string | null;
  grupoNome: string | null;
  casaId: string | null;
  casaNome: string | null;
  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;
  conflitos: ConflitoBruto[];
};

export type EventoContexto = {
  participantes: Map<string, ParticipanteEvento>;
  gruposResumo: Array<{
    id: string;
    nome: string;
    casaId: string | null;
    casaNome: string | null;
  }>;
};

const ensureUnique = (values: string[]) => Array.from(new Set(values));

export async function coletarContextoEvento(
  grupoIds: string[],
  adolescenteIds: string[],
): Promise<{
  contexto: EventoContexto;
  gruposNaoEncontrados: string[];
  adolescentesNaoEncontrados: string[];
}> {
  const gruposUnicos = ensureUnique(grupoIds);
  const participantes = new Map<string, ParticipanteEvento>();

  const grupos = gruposUnicos.length
    ? await prisma.grupo.findMany({
        where: { id: { in: gruposUnicos } },
        include: {
          casa: true,
          membros: {
            where: { dataSaida: null },
            include: {
              adolescente: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  statusUnidade: true,
                  alertaRiscoSuicidio: true,
                  alertaPerfilMapeado: true,
                  alertaSaudeConfidencial: true,
                  conflitosA: {
                    where: { status: "ATIVO" },
                    select: {
                      id: true,
                      tipoConflito: true,
                      adolescenteBId: true,
                      adolescenteB: {
                        select: { id: true, nomeCompleto: true },
                      },
                    },
                  },
                  conflitosB: {
                    where: { status: "ATIVO" },
                    select: {
                      id: true,
                      tipoConflito: true,
                      adolescenteAId: true,
                      adolescenteA: {
                        select: { id: true, nomeCompleto: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  for (const grupo of grupos) {
    for (const membro of grupo.membros) {
      const adolescente = membro.adolescente;
      if (!adolescente) continue;

      const conflitos: ConflitoBruto[] = [];

      for (const conflito of adolescente.conflitosA) {
        conflitos.push({
          id: conflito.id,
          tipo: conflito.tipoConflito ?? null,
          outroId: conflito.adolescenteBId,
          outroNome: conflito.adolescenteB?.nomeCompleto ?? "Desconhecido",
        });
      }

      for (const conflito of adolescente.conflitosB) {
        conflitos.push({
          id: conflito.id,
          tipo: conflito.tipoConflito ?? null,
          outroId: conflito.adolescenteAId,
          outroNome: conflito.adolescenteA?.nomeCompleto ?? "Desconhecido",
        });
      }

      participantes.set(adolescente.id, {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        grupoId: grupo.id,
        grupoNome: grupo.nomeGrupo,
        casaId: grupo.casa?.id ?? null,
        casaNome: grupo.casa?.nome ?? null,
        alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
        alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
        alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,
        conflitos,
      });
    }
  }

  const extras = ensureUnique(
    adolescenteIds.filter((id) => !participantes.has(id)),
  );

  const extrasData = extras.length
    ? await prisma.adolescente.findMany({
        where: { id: { in: extras } },
        select: {
          id: true,
          nomeCompleto: true,
          statusUnidade: true,
          alertaRiscoSuicidio: true,
          alertaPerfilMapeado: true,
          alertaSaudeConfidencial: true,
          conflitosA: {
            where: { status: "ATIVO" },
            select: {
              id: true,
              tipoConflito: true,
              adolescenteBId: true,
              adolescenteB: { select: { id: true, nomeCompleto: true } },
            },
          },
          conflitosB: {
            where: { status: "ATIVO" },
            select: {
              id: true,
              tipoConflito: true,
              adolescenteAId: true,
              adolescenteA: { select: { id: true, nomeCompleto: true } },
            },
          },
          gruposMembros: {
            where: { dataSaida: null },
            take: 1,
            include: {
              grupo: {
                include: { casa: true },
              },
            },
          },
        },
      })
    : [];

  for (const adolescente of extrasData) {
    const conflitos: ConflitoBruto[] = [];

    for (const conflito of adolescente.conflitosA) {
      conflitos.push({
        id: conflito.id,
        tipo: conflito.tipoConflito ?? null,
        outroId: conflito.adolescenteBId,
        outroNome: conflito.adolescenteB?.nomeCompleto ?? "Desconhecido",
      });
    }

    for (const conflito of adolescente.conflitosB) {
      conflitos.push({
        id: conflito.id,
        tipo: conflito.tipoConflito ?? null,
        outroId: conflito.adolescenteAId,
        outroNome: conflito.adolescenteA?.nomeCompleto ?? "Desconhecido",
      });
    }

    const grupoAtual = adolescente.gruposMembros[0]?.grupo;

    participantes.set(adolescente.id, {
      id: adolescente.id,
      nome: adolescente.nomeCompleto,
      grupoId: grupoAtual?.id ?? null,
      grupoNome: grupoAtual?.nomeGrupo ?? null,
      casaId: grupoAtual?.casa?.id ?? null,
      casaNome: grupoAtual?.casa?.nome ?? null,
      alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
      alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
      alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,
      conflitos,
    });
  }

  const gruposEncontradosIds = grupos.map((grupo) => grupo.id);
  const gruposNaoEncontrados = gruposUnicos.filter(
    (id) => !gruposEncontradosIds.includes(id),
  );

  const extrasEncontradosIds = extrasData.map((item) => item.id);
  const adolescentesNaoEncontrados = extras.filter(
    (id) => !extrasEncontradosIds.includes(id),
  );

  const gruposResumo = grupos.map((grupo) => ({
    id: grupo.id,
    nome: grupo.nomeGrupo,
    casaId: grupo.casa?.id ?? null,
    casaNome: grupo.casa?.nome ?? null,
  }));

  return {
    contexto: {
      participantes,
      gruposResumo,
    },
    gruposNaoEncontrados,
    adolescentesNaoEncontrados,
  };
}

type AvaliacaoConflito = {
  nivel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  peso: number;
};

const avaliarConflito = (
  a: ParticipanteEvento,
  b: ParticipanteEvento,
  tipo?: string | null,
): AvaliacaoConflito => {
  const tipoUpper = (tipo ?? "").toUpperCase();
  const mesmoGrupo = a.grupoId && b.grupoId && a.grupoId === b.grupoId;
  const mesmaCasa = a.casaId && b.casaId && a.casaId === b.casaId;

  let nivel: AvaliacaoConflito["nivel"] = "MEDIO";
  let peso = 30;

  if (mesmoGrupo) {
    nivel = "CRITICO";
    peso = 85;
  } else if (mesmaCasa) {
    nivel = "ALTO";
    peso = 55;
  }

  if (
    tipoUpper.includes("FAC") ||
    tipoUpper.includes("HOMIC") ||
    tipoUpper.includes("ARM") ||
    tipoUpper.includes("FUGA")
  ) {
    if (nivel === "MEDIO") {
      nivel = "ALTO";
      peso = 60;
    } else if (nivel === "ALTO") {
      peso = 75;
    } else if (nivel === "CRITICO") {
      peso = 95;
    }
  }

  if (a.alertaPerfilMapeado || b.alertaPerfilMapeado) {
    peso += 10;
  }

  if (a.alertaSaudeConfidencial || b.alertaSaudeConfidencial) {
    peso += 5;
  }

  if (a.alertaRiscoSuicidio || b.alertaRiscoSuicidio) {
    peso += 8;
  }

  if (peso < 15) {
    peso = 15;
  }

  return { nivel, peso };
};

export type RiscoEventoResumo = {
  score_risco_combinado: number;
  nivel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  conflitos_criticos: number;
  conflitos_detalhados: Array<{
    conflito_id: string;
    nivel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
    tipo: string | null;
    adolescente_A: {
      id: string;
      nome: string;
      grupo?: string | null;
    };
    adolescente_B: {
      id: string;
      nome: string;
      grupo?: string | null;
    };
  }>;
  recomendacoes: string[];
  participantes_avaliados: number;
};

export function calcularRiscoEvento(
  participantes: Map<string, ParticipanteEvento>,
): RiscoEventoResumo {
  const conflitosVistos = new Set<string>();
  let score = 0;
  let conflitosCriticos = 0;
  const conflitosDetalhados: RiscoEventoResumo["conflitos_detalhados"] = [];

  for (const participante of participantes.values()) {
    for (const conflito of participante.conflitos) {
      if (conflitosVistos.has(conflito.id)) continue;
      const outro = participantes.get(conflito.outroId);
      if (!outro) continue;

      conflitosVistos.add(conflito.id);

      const avaliacao = avaliarConflito(
        participante,
        outro,
        conflito.tipo ?? null,
      );
      score += avaliacao.peso;
      if (avaliacao.nivel === "CRITICO") {
        conflitosCriticos += 1;
      }

      conflitosDetalhados.push({
        conflito_id: conflito.id,
        nivel: avaliacao.nivel,
        tipo: conflito.tipo ?? "Conflito ativo",
        adolescente_A: {
          id: participante.id,
          nome: participante.nome,
          grupo: participante.grupoNome,
        },
        adolescente_B: {
          id: outro.id,
          nome: outro.nome,
          grupo: outro.grupoNome,
        },
      });
    }
  }

  let nivel: RiscoEventoResumo["nivel"] = "BAIXO";

  if (score >= 200 || conflitosCriticos >= 3) {
    nivel = "CRITICO";
  } else if (score >= 120 || conflitosCriticos >= 1) {
    nivel = "ALTO";
  } else if (score >= 70) {
    nivel = "MEDIO";
  }

  const participantesArray = Array.from(participantes.values());

  const recomendacoes: string[] = [];
  if (conflitosCriticos > 0) {
    recomendacoes.push(
      "Separar participantes com conflito critico em horarios distintos.",
    );
  }

  if (score >= 150) {
    recomendacoes.push("Reforcar equipe de vigilancia durante o evento.");
  }

  if (participantesArray.some((p) => p.alertaRiscoSuicidio)) {
    recomendacoes.push(
      "Garantir acompanhamento especializado para participantes com alerta de risco de suicídio.",
    );
  }

  if (participantesArray.some((p) => p.alertaPerfilMapeado)) {
    recomendacoes.push(
      "Designar monitoramento dedicado para participantes com alerta de perfil mapeado.",
    );
  }

  if (participantesArray.some((p) => p.alertaSaudeConfidencial)) {
    recomendacoes.push(
      "Notificar equipe de saude para acompanhar participantes com alerta confidencial.",
    );
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push(
      "Manter vigilancia padrao com equipe completa e monitoramento constante.",
    );
  }

  return {
    score_risco_combinado: score,
    nivel,
    conflitos_criticos: conflitosCriticos,
    conflitos_detalhados: conflitosDetalhados,
    recomendacoes,
    participantes_avaliados: participantes.size,
  };
}
