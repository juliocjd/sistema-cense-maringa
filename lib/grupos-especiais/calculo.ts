"use server";

import type {
  Adolescente,
  Ala,
  ConflitoResumo,
  Casa,
  Alojamento,
} from "@/types";
import {
  classificarProximidade,
  type Proximidade,
  type SlotInfo,
} from "@/lib/riscos/proximidade";

export type GrupoEspecialAdolescente = Pick<
  Adolescente,
  | "id"
  | "nomeCompleto"
  | "bairroOrigemId"
  | "faccaoGrupoId"
  | "alertaRiscoSuicidio"
> & {
  alojamentoAtual?: {
    id: string;
    numeroAlojamento?: string | null;
    ala?: string | null;
    casa?: Pick<Casa, "id" | "nome" | "numero" | "isolada"> | null;
  } | null;
  conflitosAtivos?: ConflitoResumo[];
};

const construirSlot = (adolescente?: GrupoEspecialAdolescente | null): SlotInfo => {
  const ala = adolescente?.alojamentoAtual?.ala;
  return {
    alojamento: {
      id: adolescente?.alojamentoAtual?.id ?? "",
      casaId: adolescente?.alojamentoAtual?.casa?.id ?? "",
      numeroAlojamento: adolescente?.alojamentoAtual?.numeroAlojamento ?? "",
      ala: asa(ala),
      alojamentoFrontalId: adolescente?.alojamentoAtual?.id ?? undefined,
    },
    casa: adolescente?.alojamentoAtual?.casa
      ? {
          id: adolescente.alojamentoAtual.casa.id,
          numero: adolescente.alojamentoAtual.casa.numero ?? 0,
        }
      : null,
  };
};

const asa = (valor?: string | null): Ala => {
  if (!valor) {
    return null;
  }
  const trimmed = valor.trim().toUpperCase();
  if (trimmed === "A" || trimmed === "B") {
    return trimmed;
  }
  return null;
};
 
export type AlertaEspecial = {
  nivel: number;
  tipo: "CONFLITO_INTERNO" | "CONFLITO_TERRITORIAL" | "CONFLITO_FACCAO";
  mensagem: string;
  proximidade?: Proximidade;
  adversarioId: string;
};

export type ResultadoEspecial = {
  nivel: number;
  categorias: string[];
  alertas: AlertaEspecial[];
};

const classificarNivel = (mensagens: string[]): number => {
  if (mensagens.some((item) => item.includes("CRÍTICO"))) return 5;
  if (mensagens.some((item) => item.includes("ALTO"))) return 4;
  if (mensagens.some((item) => item.includes("ATENÇÃO"))) return 3;
  if (mensagens.some((item) => item.includes("MONITORAR"))) return 2;
  return 1;
};

export async function calcularAlertasParaColecao(
  adolescentes: GrupoEspecialAdolescente[],
  contexto: string
): Promise<ResultadoEspecial> {
  const alertas: AlertaEspecial[] = [];
  const mensagens: string[] = [];

  const porId = new Map(adolescentes.map((item) => [item.id, item]));

  for (const adolescente of adolescentes) {
    const conflitos = adolescente.conflitosAtivos ?? [];
    for (const conflito of conflitos) {
      const adversarioId =
        conflito.adolescenteAId === adolescente.id
          ? conflito.adolescenteBId
          : conflito.adolescenteAId;
      if (!adversarioId) continue;

      const adversario = porId.get(adversarioId);
      const mesmoGrupo =
        adolescentes.some(
          (item) => item.id === adversarioId && item.bairroOrigemId && item.bairroOrigemId === adolescente.bairroOrigemId
        );

      const conflitosInternos = mesmoGrupo;
      const tipo = conflitosInternos
        ? "CONFLITO_INTERNO"
        : adolescente.faccaoGrupoId &&
          adversario?.faccaoGrupoId &&
          adolescente.faccaoGrupoId === adversario.faccaoGrupoId
        ? "CONFLITO_FACCAO"
        : "CONFLITO_TERRITORIAL";

      const mensagem = `${adolescente.nomeCompleto} x ${
        adversario?.nomeCompleto ?? "Desconhecido"
      }: ${tipo}`;
      const proximidade = classificarProximidade(
        construirSlot(adolescente),
        construirSlot(adversario)
      );
      mensagens.push(mensagem);
      alertas.push({
        nivel: tipo === "CONFLITO_INTERNO" ? 5 : tipo === "CONFLITO_FACCAO" ? 4 : 3,
        tipo,
        mensagem,
        proximidade,
        adversarioId,
      });
    }
  }

  const nivel = classificarNivel(mensagens);
  return {
    nivel,
    categorias: alertas.map((item) => item.tipo),
    alertas,
  };
}
