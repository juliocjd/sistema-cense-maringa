import { prisma } from "@/lib/prisma";
import { differenceInYears, getDay, startOfMonth, endOfMonth } from "date-fns";

/**
 * Busca configurações ativas do sistema
 */
export async function buscarConfiguracoes() {
  const config = await prisma.configuracaoVisitas.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  });

  if (!config) {
    // Configurações padrão caso não exista no banco
    return {
      diasPermitidos: [6], // Sábado
      limiteAdultosPadrao: 2,
      limiteCriancasPadrao: 1,
      habilitarRegraSegundoSabado: true,
      limiteAdultosSegundoSab: 2,
      limiteCriancasSegundoSab: 1,
      permitirAlternativa: true,
      idadeLimiteCrianca: 12,
      periodosPorCasa: { "1": "MANHA", "2": "MANHA", "3": "MANHA", "4": "MANHA", "5": "TARDE", "6": "TARDE", "7": "TARDE", "8": "TARDE" },
      quantidadeVisitasMensal: 2,
      duracaoVisitaMinutos: 120, // 2 horas padrão
    };
  }

  return {
    ...config,
    diasPermitidos: Array.isArray(config.diasPermitidos)
      ? config.diasPermitidos
      : [6],
  };
}

/**
 * Verifica se o adolescente está ativo/internado
 */
export async function verificarAdolescenteAtivo(adolescenteId: string) {
  const adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    select: {
      id: true,
      nomeCompleto: true,
      statusUnidade: true,
      alojamentoAtualId: true,
      alojamentoAtual: {
        select: {
          casaId: true,
          casa: {
            select: {
              numero: true,
            },
          },
        },
      },
      faccaoGrupoId: true,
    },
  });

  if (!adolescente) {
    return { valido: false, erro: "Adolescente não encontrado" };
  }

  if (adolescente.statusUnidade !== "ATIVO") {
    return {
      valido: false,
      erro: `Adolescente não está ativo. Status: ${adolescente.statusUnidade}`,
    };
  }

  return {
    valido: true,
    adolescente,
  };
}

/**
 * Valida dia da semana permitido
 */
export function validarDiaPermitido(data: Date, diasPermitidos: number[]) {
  const diaSemana = getDay(data); // 0 = domingo, 6 = sábado

  if (!diasPermitidos.includes(diaSemana)) {
    const diasNomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const diasPermitidosNomes = diasPermitidos.map((d) => diasNomes[d]).join(", ");

    return {
      valido: false,
      erro: `Visitas só são permitidas em: ${diasPermitidosNomes}`,
    };
  }

  return { valido: true };
}

/**
 * Verifica se é o segundo sábado do mês
 */
export function isSegundoSabado(data: Date): boolean {
  if (getDay(data) !== 6) return false; // Não é sábado

  const primeiroDiaMes = startOfMonth(data);
  const dia = data.getDate();

  // Encontrar primeiro sábado
  let primeiroSabado = 1;
  while (getDay(new Date(data.getFullYear(), data.getMonth(), primeiroSabado)) !== 6) {
    primeiroSabado++;
  }

  const segundoSabado = primeiroSabado + 7;
  return dia === segundoSabado;
}

/**
 * Valida quantidade de acompanhantes
 */
export function validarQuantidadeAcompanhantes(
  quantidadeAdultos: number,
  quantidadeCriancas: number,
  dataVisita: Date,
  config: any
) {
  const eSegundoSabado = config.habilitarRegraSegundoSabado && isSegundoSabado(dataVisita);

  if (eSegundoSabado) {
    // Regra especial segundo sábado
    if (config.permitirAlternativa) {
      // 2 adultos + 1 criança OU 1 adulto + 2 crianças
      const opcao1 = quantidadeAdultos === 2 && quantidadeCriancas <= 1;
      const opcao2 = quantidadeAdultos === 1 && quantidadeCriancas <= 2;

      if (!opcao1 && !opcao2) {
        return {
          valido: false,
          erro: "No segundo sábado: permitido 2 adultos + 1 criança OU 1 adulto + 2 crianças",
        };
      }
    } else {
      if (quantidadeAdultos > config.limiteAdultosSegundoSab) {
        return {
          valido: false,
          erro: `Máximo ${config.limiteAdultosSegundoSab} adultos no segundo sábado`,
        };
      }
      if (quantidadeCriancas > config.limiteCriancasSegundoSab) {
        return {
          valido: false,
          erro: `Máximo ${config.limiteCriancasSegundoSab} criança(s) no segundo sábado`,
        };
      }
    }
  } else {
    // Regra padrão
    if (quantidadeAdultos > config.limiteAdultosPadrao) {
      return {
        valido: false,
        erro: `Máximo ${config.limiteAdultosPadrao} adultos permitidos`,
      };
    }
    if (quantidadeCriancas > config.limiteCriancasPadrao) {
      return {
        valido: false,
        erro: `Máximo ${config.limiteCriancasPadrao} criança(s) permitidas`,
      };
    }
  }

  return { valido: true };
}

/**
 * Conta visitas do visitante no mês
 */
export async function contarVisitasMes(visitanteId: string, mes: Date) {
  const inicioMes = startOfMonth(mes);
  const fimMes = endOfMonth(mes);

  const count = await prisma.visitaRegistro.count({
    where: {
      visitanteId,
      dataHoraEntrada: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
  });

  return count;
}

/**
 * Valida limite de visitas mensais
 */
export async function validarLimiteVisitasMensal(
  visitanteId: string,
  dataVisita: Date,
  config: any
) {
  const visitasNoMes = await contarVisitasMes(visitanteId, dataVisita);

  if (visitasNoMes >= config.quantidadeVisitasMensal) {
    return {
      valido: false,
      excedido: true,
      erro: `Limite de ${config.quantidadeVisitasMensal} visitas mensais atingido (${visitasNoMes}/${config.quantidadeVisitasMensal})`,
      visitasRealizadas: visitasNoMes,
    };
  }

  return {
    valido: true,
    excedido: false,
    visitasRealizadas: visitasNoMes,
  };
}

/**
 * Determina período (MANHA/TARDE) baseado na casa
 */
export function determinarPeriodoPorCasa(numeroCasa: number, config: any) {
  const periodosPorCasa = typeof config.periodosPorCasa === 'object' && config.periodosPorCasa !== null
    ? config.periodosPorCasa
    : {};

  // Buscar período da casa no mapeamento
  const periodo = periodosPorCasa[numeroCasa.toString()];
  return periodo || "MANHA"; // Default MANHA se não encontrar
}

/**
 * Verifica se visitante tem vínculos com facções rivais
 */
export async function detectarFaccoesRivais(visitanteId: string) {
  // Buscar todos os adolescentes vinculados ao visitante
  const vinculos = await prisma.adolescenteVisitanteLink.findMany({
    where: {
      visitanteId,
      autorizado: true,
    },
    include: {
      adolescente: {
        select: {
          id: true,
          nomeCompleto: true,
          faccaoGrupoId: true,
        },
      },
    },
  });

  const faccoesEncontradas = new Set<string>();
  const adolescentesPorFaccao: Record<string, any[]> = {};

  for (const vinculo of vinculos) {
    const faccaoId = vinculo.adolescente.faccaoGrupoId;
    if (faccaoId) {
      faccoesEncontradas.add(faccaoId);
      if (!adolescentesPorFaccao[faccaoId]) {
        adolescentesPorFaccao[faccaoId] = [];
      }
      adolescentesPorFaccao[faccaoId].push(vinculo.adolescente);
    }
  }

  // Se tem mais de uma facção, pode ser "leva-e-traz"
  if (faccoesEncontradas.size > 1) {
    return {
      alerta: true,
      faccoesEnvolvidas: Array.from(faccoesEncontradas),
      adolescentesPorFaccao,
      mensagem: "ALERTA: Visitante possui vínculos com adolescentes de facções diferentes. Possível 'leva-e-traz'.",
    };
  }

  return {
    alerta: false,
  };
}

/**
 * Validação completa para registro de visita
 * Modificado para ser não-bloqueante: apenas gera alertas, não bloqueia
 */
export async function validarRegistroVisita(params: {
  visitanteId: string;
  adolescenteId: string;
  dataHoraEntrada?: Date;
  quantidadeAdultos?: number;
  quantidadeCriancas?: number;
  permitirComJustificativa?: boolean; // Novo parâmetro
}) {
  const {
    visitanteId,
    adolescenteId,
    dataHoraEntrada = new Date(),
    quantidadeAdultos = 1,
    quantidadeCriancas = 0,
    permitirComJustificativa = true, // Por padrão, permite com justificativa
  } = params;

  const config = await buscarConfiguracoes();
  const alertas: string[] = [];
  const erros: string[] = [];

  // 1. Verificar se adolescente está ativo
  const checkAdolescente = await verificarAdolescenteAtivo(adolescenteId);
  if (!checkAdolescente.valido) {
    erros.push(checkAdolescente.erro!);
    return {
      valido: false,
      erros,
      alertas,
      metadata: {
        periodoAutorizado: "MANHA",
        periodoRealizado: "MANHA",
        alertaHorario: false,
        alertaFaccaoRival: false,
        alertaLimiteVisitas: false,
        numeroCasa: 0,
        visitasRealizadasMes: 0,
        limiteVisitasMensal: 0,
      },
    };
  }

  const adolescente = checkAdolescente.adolescente!;

  // 2. Validar dia permitido (apenas alerta se permitirComJustificativa = true)
  const checkDia = validarDiaPermitido(dataHoraEntrada, config.diasPermitidos as number[]);
  if (!checkDia.valido) {
    if (permitirComJustificativa) {
      alertas.push(checkDia.erro!);
    } else {
      erros.push(checkDia.erro!);
    }
  }

  // 3. Validar quantidade de acompanhantes (apenas alerta se permitirComJustificativa = true)
  const checkAcompanhantes = validarQuantidadeAcompanhantes(
    quantidadeAdultos,
    quantidadeCriancas,
    dataHoraEntrada,
    config
  );
  if (!checkAcompanhantes.valido) {
    if (permitirComJustificativa) {
      alertas.push(checkAcompanhantes.erro!);
    } else {
      erros.push(checkAcompanhantes.erro!);
    }
  }

  // 4. Validar limite mensal (apenas alerta se permitirComJustificativa = true)
  const checkLimite = await validarLimiteVisitasMensal(visitanteId, dataHoraEntrada, config);
  if (!checkLimite.valido) {
    if (checkLimite.excedido) {
      if (permitirComJustificativa) {
        alertas.push(checkLimite.erro!);
      } else {
        erros.push(checkLimite.erro!);
      }
    }
  } else if (checkLimite.visitasRealizadas > 0) {
    alertas.push(
      `Visitante já realizou ${checkLimite.visitasRealizadas} de ${config.quantidadeVisitasMensal} visitas este mês`
    );
  }

  // 5. Determinar período autorizado
  const numeroCasa = adolescente.alojamentoAtual?.casa?.numero || 1;
  const periodoAutorizado = determinarPeriodoPorCasa(numeroCasa, config);
  const horaAtual = dataHoraEntrada.getHours();
  const periodoRealizado = horaAtual < 12 ? "MANHA" : "TARDE";

  let alertaHorario = false;
  if (periodoAutorizado !== periodoRealizado) {
    alertas.push(
      `ATENÇÃO: Casa ${numeroCasa} tem autorização para ${periodoAutorizado}, mas visita está sendo registrada no período da ${periodoRealizado}`
    );
    alertaHorario = true;
  }

  // 6. Detectar facções rivais
  const checkFaccoes = await detectarFaccoesRivais(visitanteId);
  let alertaFaccaoRival = false;
  if (checkFaccoes.alerta) {
    alertas.push(checkFaccoes.mensagem!);
    alertaFaccaoRival = true;
  }

  return {
    valido: erros.length === 0,
    erros,
    alertas,
    metadata: {
      periodoAutorizado,
      periodoRealizado,
      alertaHorario,
      alertaFaccaoRival,
      alertaLimiteVisitas: checkLimite.visitasRealizadas >= config.quantidadeVisitasMensal - 1,
      numeroCasa,
      visitasRealizadasMes: checkLimite.visitasRealizadas,
      limiteVisitasMensal: config.quantidadeVisitasMensal,
    },
  };
}
