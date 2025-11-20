import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

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

    // Buscar configurações de visitas
    const config = await prisma.configuracaoVisitas.findFirst();

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

    const diasPermitidosArray = Array.isArray(config.diasPermitidos)
      ? config.diasPermitidos
      : [];

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

    // Validar período (manhã/tarde)
    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();
    const horarioAtual = horaAtual * 60 + minutoAtual; // minutos desde meia-noite

    const [horaInicioManha, minutoInicioManha] = config.horarioManhaInicio
      .split(":")
      .map(Number);
    const [horaFimManha, minutoFimManha] = config.horarioManhaFim.split(":").map(Number);
    const [horaInicioTarde, minutoInicioTarde] = config.horarioTardeInicio
      .split(":")
      .map(Number);
    const [horaFimTarde, minutoFimTarde] = config.horarioTardeFim.split(":").map(Number);

    const inicioManha = horaInicioManha * 60 + minutoInicioManha;
    const fimManha = horaFimManha * 60 + minutoFimManha;
    const inicioTarde = horaInicioTarde * 60 + minutoInicioTarde;
    const fimTarde = horaFimTarde * 60 + minutoFimTarde;

    let periodoAtual: "MANHA" | "TARDE" | "FORA_HORARIO" = "FORA_HORARIO";

    if (horarioAtual >= inicioManha && horarioAtual <= fimManha) {
      periodoAtual = "MANHA";
    } else if (horarioAtual >= inicioTarde && horarioAtual <= fimTarde) {
      periodoAtual = "TARDE";
    } else {
      alertas.push(
        `⚠️ ATENÇÃO: Fora do horário de visitas. Horários permitidos: ${config.horarioManhaInicio}-${config.horarioManhaFim} (manhã) e ${config.horarioTardeInicio}-${config.horarioTardeFim} (tarde)`
      );
      requerJustificativa = true;
    }

    // Validar período autorizado baseado na Casa
    const casa = vinculo.adolescente?.alojamentoAtual?.casa;
    if (periodoAtual !== "FORA_HORARIO" && casa) {
      const numeroCasa = casa.numero;

      // Determinar período autorizado baseado no mapeamento de períodos por casa
      const periodosPorCasa = typeof config.periodosPorCasa === 'object' && config.periodosPorCasa !== null
        ? config.periodosPorCasa
        : {};

      const periodoAutorizado = periodosPorCasa[numeroCasa.toString()] || null;

      if (periodoAutorizado && periodoAutorizado !== periodoAtual) {
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
