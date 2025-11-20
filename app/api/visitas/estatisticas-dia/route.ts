import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/visitas/estatisticas-dia
 * Retorna estatísticas das visitas do dia atual
 */
export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);
    const fimHoje = endOfDay(hoje);

    // Buscar todas as visitas do dia
    const visitasDoDia = await prisma.visitaRegistro.findMany({
      where: {
        dataHoraEntrada: {
          gte: inicioHoje,
          lte: fimHoje,
        },
      },
      select: {
        id: true,
        dataHoraEntrada: true,
        periodoAutorizado: true,
        visitanteId: true,
        adolescenteId: true,
        quantidadeAdultos: true,
        quantidadeCriancas: true,
      },
    });

    // Calcular estatísticas
    const totalVisitas = visitasDoDia.length;

    // Total de pessoas (visitantes + acompanhantes)
    const totalPessoas = visitasDoDia.reduce((acc, visita) => {
      return acc + visita.quantidadeAdultos + visita.quantidadeCriancas;
    }, 0);

    // Contadores por período
    const porPeriodo = {
      MANHA: visitasDoDia.filter((v) => v.periodoAutorizado === "MANHA").length,
      TARDE: visitasDoDia.filter((v) => v.periodoAutorizado === "TARDE").length,
      ESPECIAL: visitasDoDia.filter((v) => v.periodoAutorizado === "ESPECIAL").length,
    };

    // Visitantes únicos do dia
    const visitantesUnicos = new Set(visitasDoDia.map((v) => v.visitanteId)).size;

    // Adolescentes visitados
    const adolescentesVisitados = new Set(visitasDoDia.map((v) => v.adolescenteId)).size;

    // Visitas por hora (últimas 12 horas)
    const agora = new Date();
    const ultimasHoras: { hora: string; quantidade: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const horaReferencia = new Date(agora);
      horaReferencia.setHours(agora.getHours() - i, 0, 0, 0);

      const horaFim = new Date(horaReferencia);
      horaFim.setHours(horaReferencia.getHours() + 1);

      const visitasNaHora = visitasDoDia.filter((v) => {
        const entrada = new Date(v.dataHoraEntrada);
        return entrada >= horaReferencia && entrada < horaFim;
      }).length;

      ultimasHoras.push({
        hora: horaReferencia.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        quantidade: visitasNaHora,
      });
    }

    // Tempo médio de permanência (do horário de entrada até agora)
    let tempoMedioMinutos = 0;
    if (totalVisitas > 0) {
      const agora = Date.now();
      const totalMinutos = visitasDoDia.reduce((acc, visita) => {
        const entrada = new Date(visita.dataHoraEntrada).getTime();
        const duracaoMinutos = (agora - entrada) / (1000 * 60);
        return acc + duracaoMinutos;
      }, 0);

      tempoMedioMinutos = Math.round(totalMinutos / totalVisitas);
    }

    // Verificações faciais do dia
    const verificacoesFaciais = await prisma.verificacaoFacial.count({
      where: {
        dataHora: {
          gte: inicioHoje,
          lte: fimHoje,
        },
      },
    });

    const verificacoesSucesso = await prisma.verificacaoFacial.count({
      where: {
        dataHora: {
          gte: inicioHoje,
          lte: fimHoje,
        },
        resultado: "SUCESSO",
      },
    });

    const taxaSucessoFacial = verificacoesFaciais > 0
      ? Math.round((verificacoesSucesso / verificacoesFaciais) * 100)
      : 0;

    // QR Codes escaneados hoje
    const qrCodesEscaneados = await prisma.logAuditoria.count({
      where: {
        acao: "QRCODE_SCAN_SUCESSO",
        dataHora: {
          gte: inicioHoje,
          lte: fimHoje,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: hoje.toISOString().split("T")[0],
      estatisticas: {
        visitas: {
          total: totalVisitas,
          totalPessoas,
        },
        visitantes: {
          unicos: visitantesUnicos,
          adolescentesVisitados,
        },
        periodos: porPeriodo,
        tempo: {
          mediaPermanenciaMinutos: tempoMedioMinutos,
          mediaPermanenciaFormatada: `${Math.floor(tempoMedioMinutos / 60)}h ${tempoMedioMinutos % 60}min`,
        },
        identificacao: {
          verificacoesFaciais,
          verificacoesSucesso,
          taxaSucessoFacial,
          qrCodesEscaneados,
        },
        grafico: {
          ultimasHoras,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dia:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar estatísticas do dia",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
