import { prisma } from "@/lib/prisma";

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
    | null,
) => {
  if (!registro) return null;
  const partes: string[] = [];
  if (registro.casa?.nome) {
    partes.push(registro.casa.nome);
  } else if (typeof registro.casa?.numero === "number") {
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

const formatarMes = (chaveMes: string) => {
  if (!/^\d{4}-\d{2}$/.test(chaveMes)) {
    return "Sem data";
  }
  const [anoTexto, mesTexto] = chaveMes.split("-");
  const ano = Number.parseInt(anoTexto, 10);
  const mes = Number.parseInt(mesTexto, 10);
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  const texto = data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const paraIso = (valor?: Date | null) => (valor ? valor.toISOString() : null);

const chaveMesPorIso = (iso?: string | null) => {
  if (!iso) return "sem-data";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "sem-data";
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
};

const textoCompleto = (texto?: string | null) => {
  if (typeof texto !== "string") return null;
  const normalizado = texto.trim();
  return normalizado.length > 0 ? normalizado : null;
};

const situacaoCi = (ci: {
  desativadoEm: Date | null;
  suspensoPorStatus: boolean;
}) => {
  if (ci.desativadoEm) return "DESATIVADO";
  if (ci.suspensoPorStatus) return "SUSPENSO_STATUS";
  return "ATIVO";
};

type CiResumo = {
  id: string;
  numero: number;
  ano: number;
  tipoCI: string;
  resumoCI: string;
  dataFato: Date;
  criadoEm: Date;
  desativadoEm: Date | null;
  suspensoPorStatus: boolean;
};

type RelatorioConflitoDetalhe = {
  id: string;
  tipo: string | null;
  status: string | null;
  descricao: string | null;
  criadoEm: string | null;
  resolvidoEm: string | null;
  origem: "CI_ORIGEM" | "CI_OCORRENCIA" | "AVULSO";
  adversario: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
    alojamento: string | null;
  } | null;
};

type RelatorioAlertaDetalhe = {
  id: string;
  tipo: string | null;
  descricao: string;
  nivelRisco: string | null;
  criadoEm: string | null;
  desativadoEm: string | null;
  origem: "CI_ORIGEM" | "AVULSO";
};

type LinhaTimeline = {
  id: string;
  tipo: "CI" | "CONFLITO" | "ALERTA";
  dataReferencia: string | null;
  titulo: string;
  resumo: string | null;
  status: string;
  ci: {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    resumo: string;
    situacao: string;
  } | null;
  conflito: RelatorioConflitoDetalhe | null;
  alerta: RelatorioAlertaDetalhe | null;
  conflitosDerivados: RelatorioConflitoDetalhe[];
  alertasDerivados: RelatorioAlertaDetalhe[];
};

type LinhaCiAcumulada = LinhaTimeline & {
  conflitoIds: Set<string>;
  alertaIds: Set<string>;
};

type MesAcumulado = {
  chaveMes: string;
  label: string;
  totais: {
    linhas: number;
    ci: number;
    conflitosAvulsos: number;
    alertasAvulsos: number;
    conflitosDerivados: number;
    alertasDerivados: number;
  };
  linhas: LinhaTimeline[];
};

export async function carregarRelatorioProcessoSocioeducativo(
  adolescenteId: string,
) {
  const adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    select: {
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
      bairroOrigem: {
        select: {
          nomeBairro: true,
          cidade: true,
        },
      },
      alojamentoAtual: {
        select: selecionarAlojamento,
      },
      dataEntrada: true,
      dataDesinternacao: true,
    },
  });

  if (!adolescente) {
    return null;
  }

  const [comunicadosVinculados, conflitos, alertas] = await Promise.all([
    prisma.comunicadoInternoAdolescente.findMany({
      where: { adolescenteId },
      select: {
        ci: {
          select: {
            id: true,
            numero: true,
            ano: true,
            tipoCI: true,
            resumoCI: true,
            dataFato: true,
            criadoEm: true,
            desativadoEm: true,
            suspensoPorStatus: true,
          },
        },
      },
    }),
    prisma.conflito.findMany({
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
            tipoCI: true,
            resumoCI: true,
            dataFato: true,
            criadoEm: true,
            desativadoEm: true,
            suspensoPorStatus: true,
          },
        },
        ocorrencias: {
          select: {
            id: true,
            criadoEm: true,
            ci: {
              select: {
                id: true,
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
                dataFato: true,
                criadoEm: true,
                desativadoEm: true,
                suspensoPorStatus: true,
              },
            },
          },
          orderBy: { criadoEm: "desc" },
        },
        adolescenteA: {
          select: selecionarAdolescenteResumo,
        },
        adolescenteB: {
          select: selecionarAdolescenteResumo,
        },
      },
    }),
    prisma.alertaAtivo.findMany({
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
            tipoCI: true,
            resumoCI: true,
            dataFato: true,
            criadoEm: true,
            desativadoEm: true,
            suspensoPorStatus: true,
          },
        },
      },
    }),
  ]);

  const ciLinhas = new Map<string, LinhaCiAcumulada>();
  const linhasAvulsas: LinhaTimeline[] = [];
  const conflitosComDesinternados = new Set<string>();

  const garantirCiLinha = (ci: CiResumo): LinhaCiAcumulada => {
    const existente = ciLinhas.get(ci.id);
    if (existente) {
      return existente;
    }

    const dataReferencia = paraIso(ci.dataFato) ?? paraIso(ci.criadoEm);
    const linha: LinhaCiAcumulada = {
      id: `CI:${ci.id}`,
      tipo: "CI",
      dataReferencia,
      titulo: `CI ${ci.numero}/${ci.ano} - ${ci.tipoCI}`,
      resumo: textoCompleto(ci.resumoCI),
      status: situacaoCi(ci),
      ci: {
        id: ci.id,
        numero: ci.numero,
        ano: ci.ano,
        tipo: ci.tipoCI,
        resumo: ci.resumoCI,
        situacao: situacaoCi(ci),
      },
      conflito: null,
      alerta: null,
      conflitosDerivados: [],
      alertasDerivados: [],
      conflitoIds: new Set<string>(),
      alertaIds: new Set<string>(),
    };
    ciLinhas.set(ci.id, linha);
    return linha;
  };

  comunicadosVinculados.forEach((item) => {
    if (item.ci?.id) {
      garantirCiLinha(item.ci as CiResumo);
    }
  });

  conflitos.forEach((conflito) => {
    const souLadoA = conflito.adolescenteAId === adolescenteId;
    const adversario = souLadoA ? conflito.adolescenteB : conflito.adolescenteA;
    const detalheBase: Omit<RelatorioConflitoDetalhe, "origem"> = {
      id: conflito.id,
      tipo: conflito.tipoConflito ?? null,
      status: conflito.status ?? null,
      descricao: conflito.descricao ?? null,
      criadoEm: paraIso(conflito.criadoEm),
      resolvidoEm: paraIso(conflito.resolvidoEm),
      adversario: adversario
        ? {
            id: adversario.id,
            nome: adversario.nomeCompleto,
            status: adversario.statusUnidade ?? null,
            faccao: adversario.faccao?.nomeFaccao ?? null,
            alojamento: formatarAlojamento(adversario.alojamentoAtual),
          }
        : null,
    };

    if (
      detalheBase.adversario?.status &&
      detalheBase.adversario.status.toUpperCase() !== "ATIVO"
    ) {
      conflitosComDesinternados.add(conflito.id);
    }

    const ciAssociadas = new Set<string>();

    const anexarConflitoAoCi = (ci: CiResumo | null | undefined, origem: "CI_ORIGEM" | "CI_OCORRENCIA") => {
      if (!ci?.id) return;
      const linha = garantirCiLinha(ci);
      if (linha.conflitoIds.has(conflito.id)) {
        ciAssociadas.add(ci.id);
        return;
      }
      linha.conflitoIds.add(conflito.id);
      linha.conflitosDerivados.push({
        ...detalheBase,
        origem,
      });
      ciAssociadas.add(ci.id);
    };

    anexarConflitoAoCi(conflito.ciOrigem as CiResumo | null, "CI_ORIGEM");

    conflito.ocorrencias.forEach((ocorrencia) => {
      anexarConflitoAoCi(
        ocorrencia.ci as CiResumo | null,
        "CI_OCORRENCIA",
      );
    });

    if (ciAssociadas.size === 0) {
      const nomeAdversario = detalheBase.adversario?.nome ?? "adversario nao identificado";
      linhasAvulsas.push({
        id: `CONFLITO:${conflito.id}`,
        tipo: "CONFLITO",
        dataReferencia: paraIso(conflito.criadoEm),
        titulo: `Conflito ${conflito.tipoConflito ?? "nao classificado"} com ${nomeAdversario}`,
        resumo:
          textoCompleto(conflito.descricao) ??
          `Status atual: ${conflito.status ?? "NAO INFORMADO"}.`,
        status: conflito.status ?? "NAO INFORMADO",
        ci: null,
        conflito: {
          ...detalheBase,
          origem: "AVULSO",
        },
        alerta: null,
        conflitosDerivados: [],
        alertasDerivados: [],
      });
    }
  });

  alertas.forEach((alerta) => {
    const detalheBase: Omit<RelatorioAlertaDetalhe, "origem"> = {
      id: alerta.id,
      tipo: alerta.tipoAlerta ?? null,
      descricao: alerta.descricaoAlerta,
      nivelRisco: alerta.nivelRisco ?? null,
      criadoEm: paraIso(alerta.criadoEm),
      desativadoEm: paraIso(alerta.desativadoEm),
    };

    if (alerta.ciOrigem?.id) {
      const linha = garantirCiLinha(alerta.ciOrigem as CiResumo);
      if (!linha.alertaIds.has(alerta.id)) {
        linha.alertaIds.add(alerta.id);
        linha.alertasDerivados.push({
          ...detalheBase,
          origem: "CI_ORIGEM",
        });
      }
      return;
    }

    linhasAvulsas.push({
      id: `ALERTA:${alerta.id}`,
      tipo: "ALERTA",
      dataReferencia: paraIso(alerta.criadoEm),
      titulo: `Alerta ${alerta.tipoAlerta ?? "sem tipo"}`,
      resumo: textoCompleto(alerta.descricaoAlerta),
      status: alerta.desativadoEm ? "ENCERRADO" : "ATIVO",
      ci: null,
      conflito: null,
      alerta: {
        ...detalheBase,
        origem: "AVULSO",
      },
      conflitosDerivados: [],
      alertasDerivados: [],
    });
  });

  const linhasCiSerializadas: LinhaTimeline[] = Array.from(ciLinhas.values()).map(
    (linha) => {
      const totalConflitos = linha.conflitosDerivados.length;
      const totalAlertas = linha.alertasDerivados.length;
      const partesResumo: string[] = [];
      const resumoCi = textoCompleto(linha.ci?.resumo ?? null);
      if (resumoCi) {
        partesResumo.push(resumoCi);
      }
      partesResumo.push(
        `Desdobramentos: ${totalConflitos} conflito(s), ${totalAlertas} alerta(s).`,
      );
      const { conflitoIds: _conflitoIds, alertaIds: _alertaIds, ...restante } =
        linha;
      return {
        ...restante,
        resumo: partesResumo.join(" "),
      };
    },
  );

  const prioridadeTipo: Record<LinhaTimeline["tipo"], number> = {
    CI: 0,
    CONFLITO: 1,
    ALERTA: 2,
  };

  const linhas = [...linhasCiSerializadas, ...linhasAvulsas].sort((a, b) => {
    const dataA = a.dataReferencia ? new Date(a.dataReferencia).getTime() : 0;
    const dataB = b.dataReferencia ? new Date(b.dataReferencia).getTime() : 0;
    if (dataA !== dataB) {
      return dataB - dataA;
    }
    return prioridadeTipo[a.tipo] - prioridadeTipo[b.tipo];
  });

  const mesesMap = new Map<string, MesAcumulado>();
  linhas.forEach((linha) => {
    const chaveMes = chaveMesPorIso(linha.dataReferencia);
    const existente = mesesMap.get(chaveMes);
    if (!existente) {
      mesesMap.set(chaveMes, {
        chaveMes,
        label: formatarMes(chaveMes),
        totais: {
          linhas: 0,
          ci: 0,
          conflitosAvulsos: 0,
          alertasAvulsos: 0,
          conflitosDerivados: 0,
          alertasDerivados: 0,
        },
        linhas: [linha],
      });
      return;
    }
    existente.linhas.push(linha);
  });

  const meses = Array.from(mesesMap.values())
    .map((mes) => {
      mes.totais = mes.linhas.reduce(
        (acc, linha) => {
          acc.linhas += 1;
          if (linha.tipo === "CI") {
            acc.ci += 1;
            acc.conflitosDerivados += linha.conflitosDerivados.length;
            acc.alertasDerivados += linha.alertasDerivados.length;
          } else if (linha.tipo === "CONFLITO") {
            acc.conflitosAvulsos += 1;
          } else if (linha.tipo === "ALERTA") {
            acc.alertasAvulsos += 1;
          }
          return acc;
        },
        {
          linhas: 0,
          ci: 0,
          conflitosAvulsos: 0,
          alertasAvulsos: 0,
          conflitosDerivados: 0,
          alertasDerivados: 0,
        },
      );
      return mes;
    })
    .sort((a, b) => {
      if (a.chaveMes === "sem-data") return 1;
      if (b.chaveMes === "sem-data") return -1;
      return b.chaveMes.localeCompare(a.chaveMes);
    });

  const resumoGeral = meses.reduce(
    (acc, mes) => {
      acc.totalMeses += 1;
      acc.totalLinhas += mes.totais.linhas;
      acc.totalCi += mes.totais.ci;
      acc.totalConflitosAvulsos += mes.totais.conflitosAvulsos;
      acc.totalAlertasAvulsos += mes.totais.alertasAvulsos;
      acc.totalConflitosDerivados += mes.totais.conflitosDerivados;
      acc.totalAlertasDerivados += mes.totais.alertasDerivados;
      return acc;
    },
    {
      totalMeses: 0,
      totalLinhas: 0,
      totalCi: 0,
      totalConflitosAvulsos: 0,
      totalAlertasAvulsos: 0,
      totalConflitosDerivados: 0,
      totalAlertasDerivados: 0,
    },
  );

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
      dataEntrada: paraIso(adolescente.dataEntrada),
      dataDesinternacao: paraIso(adolescente.dataDesinternacao),
    },
    resumo: {
      ...resumoGeral,
      totalConflitosComDesinternados: conflitosComDesinternados.size,
    },
    meses,
    geradoEm: new Date().toISOString(),
  };
}
