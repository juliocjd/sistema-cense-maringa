import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

/**
 * GET /api/visitas/em-andamento
 * Retorna todas as visitas registradas hoje
 */
export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    // Buscar visitas de hoje
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    const visitasEmAndamento = await prisma.visitaRegistro.findMany({
      where: {
        dataHoraEntrada: {
          gte: inicioHoje,
          lte: fimHoje,
        },
      },
      orderBy: {
        dataHoraEntrada: "desc",
      },
      select: {
        id: true,
        dataHoraEntrada: true,
        dataHoraSaida: true,
        periodoAutorizado: true,
        quantidadeAdultos: true,
        quantidadeCriancas: true,
        observacoes: true,
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            fotoUrl: true,
            telefones: true,
          },
        },
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            alojamentoAtual: {
              select: {
                casa: {
                  select: {
                    numero: true,
                    nome: true,
                  },
                },
                numeroAlojamento: true,
              },
            },
          },
        },
      },
    });

    // Calcular tempo de visita para cada uma
    const visitasComTempo = visitasEmAndamento.map((visita) => {
      const tempoDecorrido = Date.now() - new Date(visita.dataHoraEntrada).getTime();
      const horasDecorridas = Math.floor(tempoDecorrido / (1000 * 60 * 60));
      const minutosDecorridos = Math.floor((tempoDecorrido % (1000 * 60 * 60)) / (1000 * 60));

      // Verificar se está próximo do limite de tempo
      const limiteHoras = visita.periodoAutorizado === "MANHA" || visita.periodoAutorizado === "TARDE" ? 4 : 2;
      const limiteMs = limiteHoras * 60 * 60 * 1000;
      const percentualTempo = (tempoDecorrido / limiteMs) * 100;

      return {
        id: visita.id,
        dataHoraEntrada: visita.dataHoraEntrada.toISOString(),
        dataHoraSaida: visita.dataHoraSaida ? visita.dataHoraSaida.toISOString() : null,
        periodoAutorizado: visita.periodoAutorizado,
        visitante: {
          id: visita.visitante.id,
          nomeCompleto: visita.visitante.nomeCompleto,
          cpf: visita.visitante.cpf,
          fotoUrl: visita.visitante.fotoUrl,
          telefones: visita.visitante.telefones,
        },
        adolescente: {
          id: visita.adolescente.id,
          nomeCompleto: visita.adolescente.nomeCompleto,
          casa: visita.adolescente.alojamentoAtual?.casa
            ? {
                numero: visita.adolescente.alojamentoAtual.casa.numero,
                nome: visita.adolescente.alojamentoAtual.casa.nome,
              }
            : null,
          alojamento: visita.adolescente.alojamentoAtual?.numeroAlojamento || null,
        },
        totalAcompanhantes: visita.quantidadeAdultos + visita.quantidadeCriancas - 1, // -1 pois o visitante principal está incluído em adultos
        quantidadeAdultos: visita.quantidadeAdultos,
        quantidadeCriancas: visita.quantidadeCriancas,
        tempoDecorrido: {
          horas: horasDecorridas,
          minutos: minutosDecorridos,
          total: `${horasDecorridas}h ${minutosDecorridos}min`,
          percentual: Math.round(percentualTempo),
          alertaProximoLimite: percentualTempo >= 80,
          alertaExcedido: percentualTempo >= 100,
        },
        encerrada: visita.dataHoraSaida !== null,
        observacoes: visita.observacoes,
      };
    });

    return NextResponse.json({
      success: true,
      total: visitasComTempo.length,
      visitas: visitasComTempo,
    });
  } catch (error) {
    console.error("Erro ao buscar visitas em andamento:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar visitas em andamento",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
