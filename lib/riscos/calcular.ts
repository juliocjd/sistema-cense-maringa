import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import type { Adolescente, Alojamento, Casa } from "@/types";
import {
  classificarProximidade,
  type Proximidade,
} from "@/lib/riscos/proximidade";

export type NivelRiscoBasico = 0 | 1 | 2 | 3 | 4 | 5;

export const NIVEL_RISCO_CATALOGO: Record<
  NivelRiscoBasico,
  {
    nivel: NivelRiscoBasico;
    categoria:
      | "SEGURO"
      | "MONITORAR"
      | "ATENCAO"
      | "ALTO"
      | "CRITICO"
      | "LIVRE"
      | "INTERDITADO";
    rotulo: string;
    descricao: string;
  }
> = {
  0: {
    nivel: 0,
    categoria: "LIVRE",
    rotulo: "Nivel 0 - Livre",
    descricao: "Disponivel para alocacao (sem morador).",
  },
  1: {
    nivel: 1,
    categoria: "SEGURO",
    rotulo: "Nivel 1 - Seguro",
    descricao: "Sem alertas diretos detectados.",
  },
  2: {
    nivel: 2,
    categoria: "MONITORAR",
    rotulo: "Nivel 2 - Monitorar",
    descricao: "Alertas leves ou contexto aliado distante.",
  },
  3: {
    nivel: 3,
    categoria: "ATENCAO",
    rotulo: "Nivel 3 - Atencao",
    descricao: "Conflitos moderados ou rivais na mesma casa.",
  },
  4: {
    nivel: 4,
    categoria: "ALTO",
    rotulo: "Nivel 4 - Elevado",
    descricao: "Aliados de rivais ou contato direto na mesma ala.",
  },
  5: {
    nivel: 5,
    categoria: "CRITICO",
    rotulo: "Nivel 5 - Critico",
    descricao: "Conflito frontal ou rival externo de alto risco.",
  },
};

export type ConflitoRisco = {
  id: string;
  status?: string | null;
  tipoConflito?: string | null;
  adolescenteAId?: string | null;
  adolescenteBId?: string | null;
  adversario?: {
    id: string;
    nomeCompleto?: string | null;
    bairroOrigemId?: string | null;
    faccao?: { id: string | null; nome?: string | null } | null;
    faccaoGrupoId?: string | null;
  } | null;
};

export type AdolescenteRisco = Pick<
  Adolescente,
  | "id"
  | "nomeCompleto"
  | "bairroOrigemId"
  | "faccaoGrupoId"
  | "alertaRiscoSuicidio"
  | "alertaPerfilMapeado"
  | "alertaSaudeConfidencial"
  | "alertaSaudeDetalhes"
> & {
  faccao?: { id: string | null; nome?: string | null } | null;
  conflitosA?: ConflitoRisco[];
  conflitosB?: ConflitoRisco[];
};

export type AlojamentoRisco = Omit<Alojamento, "adolescentes"> & {
  adolescentes: AdolescenteRisco[];
};

export type CasaRisco = Pick<Casa, "id" | "nome" | "numero" | "isolada"> & {
  alojamentos: AlojamentoRisco[];
};

export type SlotAdolescente = {
  adolescente: AdolescenteRisco;
  alojamento: AlojamentoRisco;
  casa: CasaRisco;
};

export type ResultadoRisco = {
  nivel: NivelRiscoBasico;
  categoria: (typeof NIVEL_RISCO_CATALOGO)[NivelRiscoBasico]["categoria"];
  rotulo: string;
  descricao: string;
  motivos: string[];
  detalhes: RiscoDetalhado[];
  ambiental?: {
    ativo: boolean;
    nivel: number;
    motivos: string[];
  } | null;
};

export type RiscoDetalhado = {
  nivel: NivelRiscoBasico;
  tipo: "CONFLITO_INTERNO" | "CONFLITO_EXTERNO" | "ALIADO" | "AMBIENTAL";
  mensagem: string;
  proximidade?: Proximidade;
};

export type ConflitosExternosMapa = Record<
  string,
  ImpactoConflitoExterno[]
>;

export type CalcularRiscoParams = {
  alojamento: AlojamentoRisco;
  casaAtual?: CasaRisco | null;
  casas?: CasaRisco[];
  slots?: Map<string, SlotAdolescente>;
  conflitosExternos?: ConflitosExternosMapa;
};

const MANUAL_OVERRIDE: Record<
  NonNullable<Alojamento["corRisco"]>,
  {
    nivel: NivelRiscoBasico;
    rotulo?: string;
    descricao?: string;
  }
> = {
  perigo: {
    nivel: 5,
    rotulo: "Nivel 5 - Perigo configurado",
    descricao: "Marcado manualmente como perigo pelo operador.",
  },
  atencao: {
    nivel: 3,
    rotulo: "Nivel 3 - Atencao configurada",
    descricao: "Sinalizacao manual de atencao.",
  },
  seguro: {
    nivel: 1,
    rotulo: "Nivel 1 - Seguro configurado",
    descricao: "Marcado manualmente como seguro.",
  },
  livre: {
    nivel: 0,
  },
  interditado: {
    nivel: 0,
    rotulo: "Interditado",
    descricao: "Alojamento bloqueado para uso.",
  },
};

const formatarLocalReferencia = (
  casa?: Pick<Casa, "nome" | "numero"> | null,
  alojamento?: Pick<Alojamento, "numeroAlojamento" | "ala"> | null
) => {
  const partes: string[] = [];
  if (casa?.nome) {
    partes.push(casa.nome);
  } else if (typeof casa?.numero !== "undefined" && casa?.numero !== null) {
    partes.push(`Casa ${casa.numero}`);
  }
  if (alojamento?.numeroAlojamento) {
    partes.push(`Aloj. ${alojamento.numeroAlojamento}`);
  }
  if (alojamento?.ala) {
    partes.push(`Ala ${alojamento.ala}`);
  }
  return partes.join(" - ");
};

export const criarMapaSlots = (
  casas: CasaRisco[]
): Map<string, SlotAdolescente> => {
  const mapa = new Map<string, SlotAdolescente>();
  casas.forEach((casa) => {
    casa.alojamentos.forEach((alojamento) => {
      alojamento.adolescentes.forEach((adolescente) => {
        mapa.set(adolescente.id, {
          adolescente,
          alojamento,
          casa,
        });
      });
    });
  });
  return mapa;
};

const construirSlotInfo = (
  alojamento: AlojamentoRisco,
  casa?: CasaRisco | null
) => ({
  alojamento: {
    id: alojamento.id,
    casaId: alojamento.casaId,
    numeroAlojamento: alojamento.numeroAlojamento,
    ala: alojamento.ala,
    alojamentoFrontalId: alojamento.alojamentoFrontalId,
  },
  casa: casa ? { id: casa.id, numero: casa.numero } : null,
});

export function calcularRiscoAlojamento({
  alojamento,
  casaAtual,
  casas,
  slots,
  conflitosExternos = {},
}: CalcularRiscoParams): ResultadoRisco {
  if (alojamento.statusManutencao === "INTERDITADO") {
    const base = MANUAL_OVERRIDE.interditado;
    return {
      ...NIVEL_RISCO_CATALOGO[base.nivel],
      categoria: "INTERDITADO",
      rotulo: base.rotulo ?? "Interditado",
      descricao: base.descricao ?? "Alojamento bloqueado para uso.",
      motivos: [base.descricao ?? "Alojamento bloqueado para uso."],
      detalhes: [],
      ambiental: null,
    };
  }

  const ocupante = alojamento.adolescentes[0];

  if (!ocupante) {
    const override =
      MANUAL_OVERRIDE[alojamento.corRisco ?? "livre"] ??
      MANUAL_OVERRIDE.livre;
    const base = NIVEL_RISCO_CATALOGO[override.nivel];
    const descricao = override.descricao ?? base.descricao;
    return {
      ...base,
      rotulo: override.rotulo ?? base.rotulo,
      descricao,
      motivos: descricao ? [descricao] : [],
      detalhes: [],
      ambiental: null,
    };
  }

  const mapaSlots =
    slots ??
    (casas ? criarMapaSlots(casas) : new Map<string, SlotAdolescente>());

  const casaReferencia =
    casaAtual ??
    casas?.find((casa) => casa.id === alojamento.casaId) ??
    mapaSlots.get(ocupante.id)?.casa ??
    null;
  const slotAtual = construirSlotInfo(alojamento, casaReferencia);

  const moradoresCasa =
    casaReferencia?.alojamentos
      .flatMap((aloj) =>
        aloj.adolescentes.map((morador) => ({
          adolescente: morador,
          alojamento: aloj,
          casa: casaReferencia,
        }))
      )
      .filter(Boolean) ?? [];

  const motivosPorNivel: Record<5 | 4 | 3 | 2, string[]> = {
    5: [],
    4: [],
    3: [],
    2: [],
  };
  const motivosAmbientais: string[] = [];
  const motivosDetalhados: RiscoDetalhado[] = [];
  const registrarMotivo = (
    nivel: 5 | 4 | 3 | 2,
    mensagem: string,
    tipo: RiscoDetalhado["tipo"],
    proximidade?: Proximidade
  ) => {
    const bucket = motivosPorNivel[nivel];
    if (!bucket.includes(mensagem)) {
      bucket.push(mensagem);
      motivosDetalhados.push({
        nivel: nivel as NivelRiscoBasico,
        tipo,
        mensagem,
        proximidade,
      });
    }
  };
  const registrarAmbiental = (mensagem: string) => {
    if (!motivosAmbientais.includes(mensagem)) {
      motivosAmbientais.push(mensagem);
    }
  };

  const rivaisDiretos = new Set<string>();

  const verificarAliados = (
    alvo: { bairroId?: string | null; faccaoId?: string | null },
    contexto: string,
    opts?: { ignorarIds?: Set<string> }
  ) => {
    if (!alvo.bairroId && !alvo.faccaoId) {
      return;
    }

    mapaSlots.forEach(({ adolescente, alojamento: outro, casa }) => {
      if (adolescente.id === ocupante.id) return;
      if (opts?.ignorarIds?.has(adolescente.id)) return;

      const mesmoBairro =
        alvo.bairroId && adolescente.bairroOrigemId === alvo.bairroId;
      const mesmaFaccao =
        alvo.faccaoId &&
        (adolescente.faccao?.id === alvo.faccaoId ||
          adolescente.faccaoGrupoId === alvo.faccaoId);

      if (!mesmoBairro && !mesmaFaccao) {
        return;
      }

      const proximidade = classificarProximidade(
        slotAtual,
        construirSlotInfo(outro, casa)
      );

      if (
        proximidade === "FORA" ||
        proximidade === undefined
      ) {
        return;
      }

      const localAliado = formatarLocalReferencia(casa, outro);
      const resumo = `${adolescente.nomeCompleto}${
        localAliado ? ` - ${localAliado}` : ""
      } alinhado ao rival (${contexto}).`;

      if (proximidade === "FRONTAL") {
        registrarMotivo(4, resumo, "ALIADO", proximidade);
      } else if (proximidade === "MESMA_ALA") {
        registrarMotivo(3, resumo, "ALIADO", proximidade);
      } else if (proximidade === "MESMA_CASA" || proximidade === "ZONA_JANELA") {
        registrarMotivo(2, resumo, "ALIADO", proximidade);
      }

      registrarAmbiental(resumo);
    });
  };

  const conflitosInternos = [
    ...(ocupante.conflitosA ?? []),
    ...(ocupante.conflitosB ?? []),
  ];

  conflitosInternos.forEach((conflito) => {
    const adversarioId =
      conflito.adversario?.id ??
      (conflito.adolescenteAId === ocupante.id
        ? conflito.adolescenteBId
        : conflito.adolescenteAId);

    if (!adversarioId) return;

    const adversarioSlot = mapaSlots.get(adversarioId);
    if (!adversarioSlot) return;

    const proximidade = classificarProximidade(
      slotAtual,
      construirSlotInfo(adversarioSlot.alojamento, adversarioSlot.casa)
    );
    const local = formatarLocalReferencia(
      adversarioSlot.casa,
      adversarioSlot.alojamento
    );
    const msg = `Conflito interno (${conflito.tipoConflito ?? "Sem tipo"}) com ${
      adversarioSlot.adolescente.nomeCompleto
    }${local ? ` - ${local}` : ""}`;

    if (proximidade === "FRONTAL") {
        registrarMotivo(5, msg, "CONFLITO_INTERNO", proximidade);
    } else if (proximidade === "MESMA_ALA") {
      registrarMotivo(4, msg, "CONFLITO_INTERNO", proximidade);
    } else if (proximidade === "MESMA_CASA") {
      registrarMotivo(3, msg, "CONFLITO_INTERNO", proximidade);
    } else if (proximidade === "ZONA_JANELA") {
      registrarMotivo(2, msg, "CONFLITO_INTERNO", proximidade);
    }

    rivaisDiretos.add(adversarioSlot.adolescente.id);

    verificarAliados(
      {
        bairroId: adversarioSlot.adolescente.bairroOrigemId,
        faccaoId:
          adversarioSlot.adolescente.faccao?.id ??
          adversarioSlot.adolescente.faccaoGrupoId ??
          undefined,
      },
      `conflito interno com ${adversarioSlot.adolescente.nomeCompleto}`,
      { ignorarIds: rivaisDiretos }
    );
  });

  const externos = conflitosExternos[ocupante.id] ?? [];

  externos.forEach((impacto) => {
    const contexto =
      impacto.conflitoTipo === "BAIRRO"
        ? `conflito externo entre bairros (${impacto.conflitoDestino.nome})`
        : `conflito externo entre faccoes (${impacto.conflitoDestino.nome})`;

    mapaSlots.forEach((slot) => {
      const { adolescente, alojamento: outro, casa } = slot;
      if (adolescente.id === ocupante.id) return;

      const rivalBairro =
        impacto.conflitoTipo === "BAIRRO" &&
        adolescente.bairroOrigemId === impacto.conflitoDestino.id;
      const rivalFaccao =
        impacto.conflitoTipo === "FACCAO" &&
        (adolescente.faccao?.id === impacto.conflitoDestino.id ||
          adolescente.faccaoGrupoId === impacto.conflitoDestino.id);

      if (!rivalBairro && !rivalFaccao) {
        return;
      }

      const proximidade = classificarProximidade(
        slotAtual,
        construirSlotInfo(outro, casa)
      );
      if (proximidade === "FORA") {
        return;
      }

      const localRival = formatarLocalReferencia(casa, outro);
      const descricao = `Rival associado a ${impacto.conflitoDestino.nome}: ${
        adolescente.nomeCompleto
      }${localRival ? ` - ${localRival}` : ""}`;
      const riscoElevado = impacto.risco === "ALTO";

      if (proximidade === "FRONTAL") {
        registrarMotivo(
          riscoElevado ? 5 : 4,
          descricao,
          "CONFLITO_EXTERNO",
          proximidade
        );
      } else if (proximidade === "MESMA_ALA") {
        registrarMotivo(
          riscoElevado ? 5 : 4,
          descricao,
          "CONFLITO_EXTERNO",
          proximidade
        );
      } else if (proximidade === "MESMA_CASA") {
        registrarMotivo(
          riscoElevado ? 3 : 2,
          descricao,
          "CONFLITO_EXTERNO",
          proximidade
        );
      } else if (proximidade === "ZONA_JANELA") {
        registrarMotivo(2, descricao, "CONFLITO_EXTERNO", proximidade);
      }

      rivaisDiretos.add(adolescente.id);
    });

    verificarAliados(
      impacto.conflitoTipo === "BAIRRO"
        ? { bairroId: impacto.conflitoDestino.id }
        : { faccaoId: impacto.conflitoDestino.id },
      contexto,
      { ignorarIds: rivaisDiretos }
    );
  });

  const niveisOrdenados: Array<5 | 4 | 3 | 2> = [5, 4, 3, 2];
  const nivelDetectado = niveisOrdenados.find(
    (nivel) => motivosPorNivel[nivel].length > 0
  );
  const nivelFinal: NivelRiscoBasico =
    (nivelDetectado ??
      (motivosAmbientais.length > 0 ? 2 : 1)) as NivelRiscoBasico;
  const base = NIVEL_RISCO_CATALOGO[nivelFinal];

  const motivosOrdenados = niveisOrdenados.flatMap(
    (nivel) => motivosPorNivel[nivel]
  );
  motivosAmbientais.forEach((msg) => {
    if (!motivosOrdenados.includes(msg)) {
      motivosOrdenados.push(msg);
    }
  });

  const justificativa =
    (nivelDetectado ? motivosPorNivel[nivelDetectado][0] : undefined) ??
    motivosAmbientais[0] ??
      base.descricao;

  return {
    ...base,
    descricao: justificativa,
    motivos: motivosOrdenados,
    detalhes: motivosDetalhados,
    ambiental:
      motivosAmbientais.length > 0
        ? { ativo: true, nivel: 2, motivos: motivosAmbientais }
        : null,
  };
}
