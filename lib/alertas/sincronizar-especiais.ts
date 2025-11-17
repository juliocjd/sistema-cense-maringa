import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ALERTA_ESPECIAL_TIPOS,
  ALERTA_ESPECIAL_CODIGOS,
  ALERTAS_ESPECIAIS,
  type AlertaEspecialTipo,
  ehTipoAlertaEspecial,
  mapearTipoEspecialPorCodigo,
  obterDescricaoPadrao,
} from "./especiais";
export { mapearTipoEspecialPorCodigo, ALERTAS_ESPECIAIS } from "./especiais";

export type AlertaEspecialEntrada = {
  tipo: AlertaEspecialTipo;
  descricao?: string | null;
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

export async function aplicarAlertasEspeciais(
  executor: PrismaExecutor,
  adolescenteId: string,
  alertas: AlertaEspecialEntrada[]
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

      if (existente) {
        await executor.alertaAtivo.update({
          where: { id: existente.id },
          data: {
            descricaoAlerta: descricao,
            nivelRisco: meta.nivelPadrao ?? existente.nivelRisco ?? null,
            desativadoEm: null,
          },
        });
      } else {
        await executor.alertaAtivo.create({
          data: {
            adolescenteId,
            tipoAlerta: meta.tipoAlerta,
            descricaoAlerta: descricao,
            nivelRisco: meta.nivelPadrao ?? null,
          },
        });
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
    riscoSuicidio?: { ativo: boolean; descricao?: string | null };
    perfilMapeado?: { ativo: boolean; descricao?: string | null };
    saudeConfidencial?: { ativo: boolean; descricao?: string | null };
  }
): AlertaEspecialEntrada[] {
  const mapa = new Map<AlertaEspecialTipo, AlertaEspecialEntrada>();

  payload?.forEach((alerta) => {
    if (ALERTA_ESPECIAL_TIPOS.includes(alerta.tipo)) {
      mapa.set(alerta.tipo, {
        tipo: alerta.tipo,
        descricao: alerta.descricao ?? undefined,
      });
    }
  });

  if (fallback.riscoSuicidio?.ativo && !mapa.has("RISCO_SUICIDIO")) {
    mapa.set("RISCO_SUICIDIO", {
      tipo: "RISCO_SUICIDIO",
      descricao: fallback.riscoSuicidio.descricao ?? undefined,
    });
  }

  if (fallback.perfilMapeado?.ativo && !mapa.has("PERFIL_MAPEADO")) {
    mapa.set("PERFIL_MAPEADO", {
      tipo: "PERFIL_MAPEADO",
      descricao: fallback.perfilMapeado.descricao ?? undefined,
    });
  }

  if (fallback.saudeConfidencial?.ativo && !mapa.has("SAUDE_CONFIDENCIAL")) {
    mapa.set("SAUDE_CONFIDENCIAL", {
      tipo: "SAUDE_CONFIDENCIAL",
      descricao: fallback.saudeConfidencial.descricao ?? undefined,
    });
  }

  return Array.from(mapa.values());
}

export function ehAlertaEspecial(tipo?: string | null) {
  return ehTipoAlertaEspecial(tipo);
}
