import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ALERTA_ESPECIAL_TIPOS,
  ALERTA_ESPECIAL_CODIGOS,
  ALERTAS_ESPECIAIS,
  type AlertaEspecialTipo,
  type AlertaNivelRisco,
  ehTipoAlertaEspecial,
  mapearTipoEspecialPorCodigo,
  normalizarNivelRisco,
  obterDescricaoPadrao,
} from "./especiais";
import {
  registrarEntradaProtocoloSuicidio,
} from "@/lib/alertas/protocolo-risco-suicidio";
export {
  mapearTipoEspecialPorCodigo,
  ALERTAS_ESPECIAIS,
} from "./especiais";

export type AlertaEspecialEntrada = {
  tipo: AlertaEspecialTipo;
  descricao?: string | null;
  nivelRisco?: AlertaNivelRisco | null;
};

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

export async function obterAlertasEspeciaisAtivos(
  executor: PrismaExecutor,
  adolescenteId: string
): Promise<AlertaEspecialEntrada[]> {
  const ativos = await executor.alertaAtivo.findMany({
    where: {
      adolescenteId,
      desativadoEm: null,
      tipoAlerta: { in: ALERTA_ESPECIAL_CODIGOS },
    },
  });

  return ativos.reduce<AlertaEspecialEntrada[]>((lista, alerta) => {
    const tipo = mapearTipoEspecialPorCodigo(alerta.tipoAlerta);
    if (!tipo) {
      return lista;
    }
      lista.push({
        tipo,
        descricao: alerta.descricaoAlerta ?? undefined,
        nivelRisco: normalizarNivelRisco(alerta.nivelRisco) ?? undefined,
      });
      return lista;
  }, []);
}

export async function atualizarFlagsAlertasEspeciais(
  executor: PrismaExecutor,
  adolescenteId: string
) {
  const ativos = await executor.alertaAtivo.findMany({
    where: {
      adolescenteId,
      desativadoEm: null,
      tipoAlerta: { in: ALERTA_ESPECIAL_CODIGOS },
    },
  });

  const risco =
    ativos.find(
      (alerta) =>
        alerta.tipoAlerta === ALERTAS_ESPECIAIS.RISCO_SUICIDIO.tipoAlerta
    ) ?? null;
  const perfil =
    ativos.find(
      (alerta) =>
        alerta.tipoAlerta === ALERTAS_ESPECIAIS.PERFIL_MAPEADO.tipoAlerta
    ) ?? null;
  const saude =
    ativos.find(
      (alerta) =>
        alerta.tipoAlerta === ALERTAS_ESPECIAIS.SAUDE_CONFIDENCIAL.tipoAlerta
    ) ?? null;

  await executor.adolescente.update({
    where: { id: adolescenteId },
    data: {
      alertaRiscoSuicidio: Boolean(risco),
      alertaPerfilMapeado: Boolean(perfil),
      alertaSaudeConfidencial: Boolean(saude),
      alertaSaudeDetalhes: saude?.descricaoAlerta ?? null,
    },
  });
}

type OperadorContexto = {
  operadorId?: string | null;
  ipOrigem?: string | null;
  ciOrigemId?: string | null;
  registrarEntradaProtocolo?: boolean;
};

export async function aplicarAlertasEspeciais(
  executor: PrismaExecutor,
  adolescenteId: string,
  alertas: AlertaEspecialEntrada[],
  contexto?: OperadorContexto
) {
  const ativos = await executor.alertaAtivo.findMany({
    where: {
      adolescenteId,
      desativadoEm: null,
      tipoAlerta: { in: ALERTA_ESPECIAL_CODIGOS },
    },
  });

  for (const tipo of ALERTA_ESPECIAL_TIPOS) {
    const meta = ALERTAS_ESPECIAIS[tipo];
    const existente = ativos.find(
      (alerta) => alerta.tipoAlerta === meta.tipoAlerta
    );
    const desejado = alertas.find((alerta) => alerta.tipo === tipo);

    if (desejado) {
      const descricao = obterDescricaoPadrao(tipo, desejado.descricao);
      const nivelRiscoFinal =
        desejado.nivelRisco ??
        meta.nivelPadrao ??
        existente?.nivelRisco ??
        null;
      const ciOrigemId =
        typeof contexto?.ciOrigemId === "string"
          ? contexto.ciOrigemId
          : undefined;

      if (existente) {
        await executor.alertaAtivo.update({
          where: { id: existente.id },
          data: {
            descricaoAlerta: descricao,
            nivelRisco: nivelRiscoFinal,
            desativadoEm: null,
            ...(ciOrigemId ? { ciOrigemId } : {}),
          },
        });

        if (tipo === "RISCO_SUICIDIO" && contexto?.registrarEntradaProtocolo) {
          await registrarEntradaProtocoloSuicidio(executor, {
            adolescenteId,
            alertaId: existente.id,
            descricao,
            operadorId: contexto?.operadorId ?? null,
          });
        }
      } else {
        const alertaCriado = await executor.alertaAtivo.create({
          data: {
            adolescenteId,
            tipoAlerta: meta.tipoAlerta,
            descricaoAlerta: descricao,
            nivelRisco: nivelRiscoFinal,
            ...(ciOrigemId ? { ciOrigemId } : {}),
          },
        });

        if (tipo === "RISCO_SUICIDIO") {
          await registrarEntradaProtocoloSuicidio(executor, {
            adolescenteId,
            alertaId: alertaCriado.id,
            descricao,
            operadorId: contexto?.operadorId ?? null,
            registradoEm: alertaCriado.criadoEm ?? undefined,
          });
        }

        if (contexto?.operadorId) {
          await executor.logAuditoria.create({
            data: {
              operadorId: contexto.operadorId,
              acao: "INSERT",
              tabelaAfetada: "alertas_ativos",
              registroIdAfetado: alertaCriado.id,
              detalhesAlteracao: {
                tipoAlerta: meta.tipoAlerta,
                nivelRisco: nivelRiscoFinal,
              },
              ipOrigem: contexto.ipOrigem ?? "unknown",
            },
          });
        }
      }
    } else if (existente) {
      await executor.alertaAtivo.update({
        where: { id: existente.id },
        data: { desativadoEm: new Date() },
      });
    }
  }

  await atualizarFlagsAlertasEspeciais(executor, adolescenteId);
}

export function mapearAlertasEspeciaisDoPayload(
  payload: AlertaEspecialEntrada[] | undefined,
  fallback: {
    riscoSuicidio?: {
      ativo: boolean;
      descricao?: string | null;
      nivelRisco?: AlertaNivelRisco | null;
    };
    perfilMapeado?: {
      ativo: boolean;
      descricao?: string | null;
      nivelRisco?: AlertaNivelRisco | null;
    };
    saudeConfidencial?: {
      ativo: boolean;
      descricao?: string | null;
      nivelRisco?: AlertaNivelRisco | null;
    };
  }
): AlertaEspecialEntrada[] {
  const mapa = new Map<AlertaEspecialTipo, AlertaEspecialEntrada>();

  payload?.forEach((alerta) => {
    if (ALERTA_ESPECIAL_TIPOS.includes(alerta.tipo)) {
      mapa.set(alerta.tipo, {
        tipo: alerta.tipo,
        descricao: alerta.descricao ?? undefined,
        nivelRisco: alerta.nivelRisco ?? undefined,
      });
    }
  });

  if (fallback.riscoSuicidio?.ativo && !mapa.has("RISCO_SUICIDIO")) {
    mapa.set("RISCO_SUICIDIO", {
      tipo: "RISCO_SUICIDIO",
      descricao: fallback.riscoSuicidio.descricao ?? undefined,
      nivelRisco: fallback.riscoSuicidio.nivelRisco ?? undefined,
    });
  }

  if (fallback.perfilMapeado?.ativo && !mapa.has("PERFIL_MAPEADO")) {
    mapa.set("PERFIL_MAPEADO", {
      tipo: "PERFIL_MAPEADO",
      descricao: fallback.perfilMapeado.descricao ?? undefined,
      nivelRisco: fallback.perfilMapeado.nivelRisco ?? undefined,
    });
  }

  if (fallback.saudeConfidencial?.ativo && !mapa.has("SAUDE_CONFIDENCIAL")) {
    mapa.set("SAUDE_CONFIDENCIAL", {
      tipo: "SAUDE_CONFIDENCIAL",
      descricao: fallback.saudeConfidencial.descricao ?? undefined,
      nivelRisco: fallback.saudeConfidencial.nivelRisco ?? undefined,
    });
  }

  return Array.from(mapa.values());
}

export function ehAlertaEspecial(tipo?: string | null) {
  return ehTipoAlertaEspecial(tipo);
}
