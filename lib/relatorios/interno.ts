import { prisma } from "@/lib/prisma";
import {
  TIPO_PROTOCOLO_ALTA,
  TIPO_PROTOCOLO_ATIVADO,
} from "@/lib/alertas/protocolo-risco-suicidio";

const selecionarAlojamento = {
  numeroAlojamento: true,
  ala: true,
  casa: {
    select: {
      nome: true,
      numero: true,
    },
  },
} as const;

const selecionarAdolescenteResumo = {
  id: true,
  nomeCompleto: true,
  numeroSms: true,
  statusUnidade: true,
  faccao: {
    select: {
      id: true,
      nomeFaccao: true,
    },
  },
  alojamentoAtual: {
    select: selecionarAlojamento,
  },
} as const;

const formatarAlojamento = (
  registro?:
    | {
        numeroAlojamento: string | null;
        ala: string | null;
        casa: { nome: string | null; numero: number | null } | null;
      }
    | null
) => {
  if (!registro) return null;
  const partes: string[] = [];
  if (registro.casa?.nome) {
    partes.push(registro.casa.nome);
  } else if (registro.casa?.numero) {
    partes.push(`Casa ${registro.casa.numero}`);
  }
  if (registro.numeroAlojamento) {
    partes.push(`Aloj. ${registro.numeroAlojamento}`);
  }
  if (registro.ala) {
    partes.push(`Ala ${registro.ala}`);
  }
  return partes.length > 0 ? partes.join(" - ") : null;
};

export async function carregarRelatorioInternoBase(adolescenteId: string) {
  const adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    select: {
      id: true,
      nomeCompleto: true,
      numeroSms: true,
      statusUnidade: true,
      faccao: {
        select: { id: true, nomeFaccao: true },
      },
      bairroOrigem: {
        select: { nomeBairro: true, cidade: true },
      },
      alojamentoAtual: {
        select: selecionarAlojamento,
      },
    },
  });

  if (!adolescente) {
    return null;
  }

  const conflitos = await prisma.conflito.findMany({
    where: {
      OR: [{ adolescenteAId: adolescenteId }, { adolescenteBId: adolescenteId }],
    },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      adolescenteAId: true,
      adolescenteBId: true,
      tipoConflito: true,
      status: true,
      descricao: true,
      criadoEm: true,
      resolvidoEm: true,
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
        },
      },
      adolescenteA: {
        select: selecionarAdolescenteResumo,
      },
      adolescenteB: {
        select: selecionarAdolescenteResumo,
      },
    },
  });

  const alertas = await prisma.alertaAtivo.findMany({
    where: { adolescenteId },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      tipoAlerta: true,
      descricaoAlerta: true,
      nivelRisco: true,
      criadoEm: true,
      desativadoEm: true,
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
        },
      },
    },
  });

  const historicoSuicidio = await prisma.historicoMovimentacao.findMany({
    where: {
      adolescenteId,
      tipo: {
        in: [TIPO_PROTOCOLO_ATIVADO, TIPO_PROTOCOLO_ALTA],
      },
    },
    orderBy: [
      { registradoEm: "desc" },
      { criadoEm: "desc" },
    ],
    take: 10,
  });

  const alertaSuicidioAtivo = alertas.find(
    (alerta) =>
      alerta.tipoAlerta === "RISCO_SUICIDIO" && alerta.desativadoEm === null
  );
  const ultimaEntrada = historicoSuicidio.find(
    (item) => item.tipo === TIPO_PROTOCOLO_ATIVADO
  );
  const ultimaAlta = historicoSuicidio.find(
    (item) => item.tipo === TIPO_PROTOCOLO_ALTA
  );

  const protocoloRiscoSuicidio = {
    ativo: Boolean(alertaSuicidioAtivo),
    nivelAtual: alertaSuicidioAtivo?.nivelRisco ?? null,
    ultimaEntrada: ultimaEntrada
      ? {
          data: (
            ultimaEntrada.registradoEm ?? ultimaEntrada.criadoEm
          ).toISOString(),
          descricao: ultimaEntrada.descricao ?? null,
        }
      : null,
    ultimaAlta: ultimaAlta
      ? {
          data: (
            ultimaAlta.registradoEm ?? ultimaAlta.criadoEm
          ).toISOString(),
          descricao: ultimaAlta.descricao ?? null,
        }
      : null,
  };

  return {
    adolescente: {
      id: adolescente.id,
      nome: adolescente.nomeCompleto,
      numeroSms: adolescente.numeroSms ?? null,
      status: adolescente.statusUnidade,
      faccao: adolescente.faccao?.nomeFaccao ?? null,
      faccaoId: adolescente.faccao?.id ?? null,
      bairro: adolescente.bairroOrigem
        ? `${adolescente.bairroOrigem.nomeBairro} - ${adolescente.bairroOrigem.cidade}`
        : null,
      alojamento: formatarAlojamento(adolescente.alojamentoAtual),
    },
    conflitos: conflitos.map((conflito) => {
      const souLadoA = conflito.adolescenteAId === adolescenteId;
      const adversario = souLadoA ? conflito.adolescenteB : conflito.adolescenteA;
      return {
        id: conflito.id,
        tipo: conflito.tipoConflito ?? null,
        status: conflito.status,
        descricao: conflito.descricao ?? null,
        criadoEm: conflito.criadoEm.toISOString(),
        resolvidoEm: conflito.resolvidoEm?.toISOString() ?? null,
        origem: conflito.ciOrigem
          ? {
              id: conflito.ciOrigem.id,
              numero: conflito.ciOrigem.numero,
              ano: conflito.ciOrigem.ano,
            }
          : null,
        lado: souLadoA ? "LADO_1" : "LADO_2",
        adversario: adversario
          ? {
              id: adversario.id,
              nome: adversario.nomeCompleto,
              numeroSms: adversario.numeroSms ?? null,
              status: adversario.statusUnidade ?? null,
              faccao: adversario.faccao?.nomeFaccao ?? null,
              faccaoId: adversario.faccao?.id ?? null,
              alojamento: formatarAlojamento(adversario.alojamentoAtual),
            }
          : null,
      };
    }),
    alertas: alertas.map((alerta) => ({
      id: alerta.id,
      tipo: alerta.tipoAlerta ?? null,
      descricao: alerta.descricaoAlerta,
      nivelRisco: alerta.nivelRisco ?? null,
      criadoEm: alerta.criadoEm.toISOString(),
      desativadoEm: alerta.desativadoEm?.toISOString() ?? null,
      origem: alerta.ciOrigem
        ? {
            id: alerta.ciOrigem.id,
            numero: alerta.ciOrigem.numero,
            ano: alerta.ciOrigem.ano,
          }
        : null,
    })),
    protocoloRiscoSuicidio,
  };
}
