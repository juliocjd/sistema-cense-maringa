import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const estaDentroDaJanela = (hora: string, inicio: string, fim: string) => {
  if (!hora || !inicio || !fim) return false;
  if (inicio <= fim) {
    return hora >= inicio && hora <= fim;
  }
  return hora >= inicio || hora <= fim;
};

/**
 * POST /api/visitas/validar-pre-entrada
 * Valida regras ANTES de abrir modal de registro (não bloqueia, apenas avisa)
 */
export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { visitanteId, adolescenteId } = await request.json();

    if (!visitanteId || !adolescenteId) {
      return NextResponse.json(
        { erro: "visitanteId e adolescenteId são obrigatórios" },
        { status: 400 }
      );
    }

    const alertas: string[] = [];
    const avisos: string[] = [];
    let requerJustificativa = false;

    // Buscar configuração ativa
    const config = await prisma.configuracaoVisitas.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
    });

    if (!config) {
      return NextResponse.json({
        permitido: true,
        alertas: ["Configurações de visitas não encontradas"],
        avisos: [],
        requerJustificativa: false,
      });
    }

    // Buscar vínculo
    const vinculo = await prisma.adolescenteVisitanteLink.findFirst({
      where: {
        visitanteId,
        adolescenteId,
      },
      include: {
        adolescente: {
          include: {
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    if (!vinculo) {
      return NextResponse.json({
        permitido: false,
        alertas: [],
        avisos: [],
        requerJustificativa: false,
        erro: "Vínculo não encontrado entre visitante e adolescente",
      });
    }

    if (!vinculo.autorizado) {
      alertas.push("⚠️ ATENÇÃO: Visitante NÃO está autorizado para este adolescente");
      requerJustificativa = true;
    }

    // Validar dia da semana
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = domingo, 6 = sábado

    const diasPermitidosArray: number[] = Array.isArray(config.diasPermitidos)
      ? (config.diasPermitidos as number[])
      : (() => {
          if (typeof config.diasPermitidos === "string") {
            try {
              const parsed = JSON.parse(config.diasPermitidos);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        })();

    const diasPermitidosSet = new Set(
      diasPermitidosArray.map((d: any) => {
        if (typeof d === 'number') return d;
        const map: Record<string, number> = {
          domingo: 0,
          segunda: 1,
          terca: 2,
          quarta: 3,
          quinta: 4,
          sexta: 5,
          sabado: 6,
        };
        return map[String(d).toLowerCase()];
      })
    );

    if (!diasPermitidosSet.has(diaSemana)) {
      const diasNomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      const diasPermitidosNomes = diasPermitidosArray.map((d: any) =>
        typeof d === 'number' ? diasNomes[d] : String(d)
      ).join(", ");

      alertas.push(
        `⚠️ ATENÇÃO: Hoje é ${diasNomes[diaSemana]}. Visitas só são permitidas em: ${diasPermitidosNomes}`
      );
      requerJustificativa = true;
    }

    const horaAtualStr = hoje.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let periodoAtual: "MANHA" | "TARDE" | "FORA_HORARIO" =
      estaDentroDaJanela(horaAtualStr, config.horarioManhaInicio, config.horarioManhaFim)
        ? "MANHA"
        : estaDentroDaJanela(horaAtualStr, config.horarioTardeInicio, config.horarioTardeFim)
        ? "TARDE"
        : "FORA_HORARIO";

    const casa = vinculo.adolescente?.alojamentoAtual?.casa;
    const periodosPorCasa =
      typeof config.periodosPorCasa === "object" &&
      config.periodosPorCasa !== null &&
      !Array.isArray(config.periodosPorCasa)
        ? (config.periodosPorCasa as Record<string, string>)
        : {};
    const periodoAutorizado: "MANHA" | "TARDE" =
      casa && periodosPorCasa[casa.numero.toString()] === "TARDE" ? "TARDE" : "MANHA";

    const janelaIdentificacao =
      periodoAutorizado === "TARDE"
        ? {
            inicio: config.janelaIdentificacaoTardeInicio,
            fim: config.janelaIdentificacaoTardeFim,
          }
        : {
            inicio: config.janelaIdentificacaoManhaInicio,
            fim: config.janelaIdentificacaoManhaFim,
          };
    const janelaPermanencia =
      periodoAutorizado === "TARDE"
        ? { inicio: config.horarioTardeInicio, fim: config.horarioTardeFim }
        : { inicio: config.horarioManhaInicio, fim: config.horarioManhaFim };

    const dentroIdentAutorizado = estaDentroDaJanela(
      horaAtualStr,
      janelaIdentificacao.inicio,
      janelaIdentificacao.fim
    );
    const dentroPermanenciaAutorizada = estaDentroDaJanela(
      horaAtualStr,
      janelaPermanencia.inicio,
      janelaPermanencia.fim
    );

    if (periodoAtual === "FORA_HORARIO" && (!dentroIdentAutorizado && !dentroPermanenciaAutorizada)) {
      alertas.push(
        `⚠️ ATENÇÃO: Fora do horário de visitas. Horários permitidos: ${config.horarioManhaInicio}-${config.horarioManhaFim} (manhã) e ${config.horarioTardeInicio}-${config.horarioTardeFim} (tarde)`
      );
      requerJustificativa = true;
    }

    if (!dentroIdentAutorizado && !dentroPermanenciaAutorizada) {
      const descricaoJanela =
        periodoAutorizado === "MANHA"
          ? `Identificacao ${config.janelaIdentificacaoManhaInicio}-${config.janelaIdentificacaoManhaFim} / Permanencia ${config.horarioManhaInicio}-${config.horarioManhaFim}`
          : `Identificacao ${config.janelaIdentificacaoTardeInicio}-${config.janelaIdentificacaoTardeFim} / Permanencia ${config.horarioTardeInicio}-${config.horarioTardeFim}`;
      alertas.push(
        `⚠️ ATENÇÃO: ${casa?.nome ?? "Casa"} possui janela ${periodoAutorizado}. Intervalos configurados: ${descricaoJanela}`
      );
      requerJustificativa = true;
    }

    if (periodoAtual !== "FORA_HORARIO" && casa) {
      if (periodoAutorizado !== periodoAtual) {
        alertas.push(
          `⚠️ ATENÇÃO: ${casa.nome} tem autorização para ${periodoAutorizado}, mas visita está sendo registrada no período da ${periodoAtual}`
        );
        requerJustificativa = true;
      }
    }

    // Verificar se há visitas em andamento para este visitante
    const visitaEmAndamento = await prisma.visitaRegistro.findFirst({
      where: {
        visitanteId,
        dataHoraSaida: null, // Ainda não saiu
      },
      include: {
        adolescente: true,
      },
    });

    if (visitaEmAndamento) {
      avisos.push(
        `ℹ️ Visitante já possui visita em andamento com ${visitaEmAndamento.adolescente.nomeCompleto}`
      );
    }

    return NextResponse.json({
      permitido: true, // SEMPRE permite, mas avisa
      alertas,
      avisos,
      requerJustificativa,
      periodoAtual,
    });
  } catch (error) {
    console.error("Erro ao validar pré-entrada:", error);
    return NextResponse.json(
      {
        erro: "Erro ao validar entrada",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
