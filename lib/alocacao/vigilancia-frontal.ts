type AdolescenteSlim = {
  id: string;
  nomeCompleto?: string | null;
  alertaRiscoSuicidio?: boolean;
  alertaRiscoSuicidioNivel?: string | null;
};

type AlojamentoBasico = {
  id: string;
  casaId: string;
  numeroAlojamento: string;
  ala: string | null;
  statusManutencao?: string | null;
  alojamentoFrontalId?: string | null;
  alojamentoFrontal?: { id: string | null } | null;
  adolescentes: AdolescenteSlim[];
};

type CasaBasica = {
  id: string;
  nome?: string | null;
  numero?: number | null;
};

export type CasaComAlojamentosGenerica<
  C extends CasaBasica,
  A extends AlojamentoBasico,
> = C & { alojamentos: A[] };

export type VigilanciaFrontalResultado = {
  valido: boolean;
  motivo?: string;
  localFrontal?: string;
  avisos?: string[];
};

const formatarCasa = (casa?: CasaBasica | null) => {
  if (!casa) return "Casa";
  if (casa.nome && casa.nome.trim().length > 0) {
    return casa.nome;
  }
  if (typeof casa.numero === "number") {
    return `Casa ${String(casa.numero).padStart(2, "0")}`;
  }
  return "Casa";
};

const formatarLocalFrontal = (
  casa: CasaBasica | null,
  alojamento: AlojamentoBasico,
) => {
  const partes: string[] = [];
  partes.push(formatarCasa(casa));

  if (alojamento.numeroAlojamento) {
    partes.push(`Aloj. ${alojamento.numeroAlojamento}`);
  }

  if (alojamento.ala) {
    partes.push(`Ala ${alojamento.ala}`);
  }

  return partes.join(" - ");
};

export const construirMapaAlojamentos = <
  C extends CasaBasica,
  A extends AlojamentoBasico,
>(
  casas: Array<CasaComAlojamentosGenerica<C, A>>,
) => {
  const mapa = new Map<string, { casa: C; alojamento: A }>();
  casas.forEach((casa) => {
    casa.alojamentos.forEach((aloj) => {
      mapa.set(aloj.id, { casa, alojamento: aloj });
    });
  });
  return mapa;
};

export const avaliarVigilanciaFrontal = <
  C extends CasaBasica,
  A extends AlojamentoBasico,
>(
  alojamento: A,
  mapaAlojamentos: Map<string, { casa: C; alojamento: A }>,
): VigilanciaFrontalResultado => {
  const frontalId =
    alojamento.alojamentoFrontalId ?? alojamento.alojamentoFrontal?.id ?? null;

  if (!frontalId) {
    return {
      valido: false,
      motivo:
        "Sem vigilancia frontal: este alojamento nao possui pareamento definido.",
    };
  }

  const frontalInfo = mapaAlojamentos.get(frontalId);
  if (!frontalInfo) {
    return {
      valido: false,
      motivo:
        "Sem vigilancia frontal: alojamento pareado nao encontrado na estrutura.",
    };
  }

  const local = formatarLocalFrontal(frontalInfo.casa, frontalInfo.alojamento);

  if (frontalInfo.alojamento.statusManutencao === "INTERDITADO") {
    return {
      valido: false,
      motivo: `Sem vigilancia frontal: ${local} esta interditado.`,
      localFrontal: local,
    };
  }

  const avisos: string[] = [];

  if (!frontalInfo.alojamento.adolescentes.length) {
    return {
      valido: false,
      motivo: `Sem vigilancia frontal: ${local} esta vazio.`,
      localFrontal: local,
    };
  }

  const sentinela = frontalInfo.alojamento.adolescentes[0] as
    | AdolescenteSlim
    | undefined;
  if (sentinela?.alertaRiscoSuicidio) {
    const nivel = sentinela.alertaRiscoSuicidioNivel
      ? sentinela.alertaRiscoSuicidioNivel.toLowerCase()
      : null;
    const nome = sentinela.nomeCompleto ?? "Adolescente frontal";
    avisos.push(
      `Atencao: ${nome}${
        nivel ? ` (risco ${nivel})` : ""
      } tambem possui alerta de risco de suicídio no alojamento frontal.`,
    );
  }

  if (avisos.length > 0) {
    return { valido: true, localFrontal: local, avisos };
  }
  return { valido: true, localFrontal: local };
};
