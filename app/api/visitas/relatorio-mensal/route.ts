import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get("mes"); // formato: YYYY-MM
    const adolescenteId = searchParams.get("adolescenteId");

    let mes: Date;
    let inicioMes: Date;
    let fimMes: Date;

    if (mesParam) {
      const [ano, mesNumero] = mesParam.split("-").map(Number);
      mes = new Date(ano, mesNumero - 1, 1);
      inicioMes = new Date(ano, mesNumero - 1, 1);
      fimMes = new Date(ano, mesNumero, 0, 23, 59, 59);
    } else {
      mes = new Date();
      inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
      fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);
    }

    const where: any = {
      dataHoraEntrada: {
        gte: inicioMes,
        lte: fimMes,
      },
    };

    if (adolescenteId) {
      where.adolescenteId = adolescenteId;
    }

    // Buscar todas as visitas do mês
    const visitas = await prisma.visitaRegistro.findMany({
      where,
      include: {
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
          },
        },
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            alojamentoAtual: {
              select: {
                casa: {
                  select: {
                    numero: true,
                    nome: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dataHoraEntrada: "asc" },
    });

    // Estatísticas gerais
    const totalVisitas = visitas.length;
    const visitasFinalizadas = visitas.filter((v) => v.dataHoraSaida).length;
    const visitasEmAberto = visitas.filter((v) => !v.dataHoraSaida).length;

    // Visitas com alertas
    const visitasComAlertaFaccao = visitas.filter((v) => v.alertaFaccaoRival).length;
    const visitasComAlertaHorario = visitas.filter((v) => v.alertaHorario).length;
    const visitasComAlertaLimite = visitas.filter((v) => v.alertaLimiteVisitas).length;

    // Por adolescente
    const visitasPorAdolescente = visitas.reduce((acc, visita) => {
      const key = visita.adolescenteId;
      if (!acc[key]) {
        acc[key] = {
          adolescente: visita.adolescente,
          totalVisitas: 0,
          visitantes: new Set(),
          visitas: [],
        };
      }
      acc[key].totalVisitas++;
      acc[key].visitantes.add(visita.visitante.nomeCompleto);
      acc[key].visitas.push({
        id: visita.id,
        visitante: visita.visitante.nomeCompleto,
        dataHoraEntrada: visita.dataHoraEntrada,
        dataHoraSaida: visita.dataHoraSaida,
        periodo: visita.periodoRealizado,
        temAlertas:
          visita.alertaFaccaoRival ||
          visita.alertaHorario ||
          visita.alertaLimiteVisitas,
      });
      return acc;
    }, {} as Record<string, any>);

    // Por visitante
    const visitasPorVisitante = visitas.reduce((acc, visita) => {
      const key = visita.visitanteId;
      if (!acc[key]) {
        acc[key] = {
          visitante: visita.visitante,
          totalVisitas: 0,
          adolescentes: new Set(),
          visitas: [],
        };
      }
      acc[key].totalVisitas++;
      acc[key].adolescentes.add(
        visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial
      );
      acc[key].visitas.push({
        id: visita.id,
        adolescente: visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial,
        dataHoraEntrada: visita.dataHoraEntrada,
        dataHoraSaida: visita.dataHoraSaida,
        periodo: visita.periodoRealizado,
        temAlertas:
          visita.alertaFaccaoRival ||
          visita.alertaHorario ||
          visita.alertaLimiteVisitas,
      });
      return acc;
    }, {} as Record<string, any>);

    // Converter Sets para arrays
    Object.values(visitasPorAdolescente).forEach((item: any) => {
      item.visitantes = Array.from(item.visitantes);
    });

    Object.values(visitasPorVisitante).forEach((item: any) => {
      item.adolescentes = Array.from(item.adolescentes);
    });

    // Por período (manhã/tarde)
    const visitasPorPeriodo = {
      MANHA: visitas.filter((v) => v.periodoRealizado === "MANHA").length,
      TARDE: visitas.filter((v) => v.periodoRealizado === "TARDE").length,
    };

    // Por tipo
    const visitasPorTipo = {
      REGULAR: visitas.filter((v) => v.tipoVisita === "REGULAR").length,
      SEGUNDO_SABADO: visitas.filter((v) => v.tipoVisita === "SEGUNDO_SABADO").length,
    };

    // Duração média (apenas visitas finalizadas)
    const visitasComDuracao = visitas.filter((v) => v.dataHoraSaida);
    const duracaoTotal = visitasComDuracao.reduce((acc, v) => {
      const duracao =
        new Date(v.dataHoraSaida!).getTime() - new Date(v.dataHoraEntrada).getTime();
      return acc + duracao;
    }, 0);
    const duracaoMediaMinutos =
      visitasComDuracao.length > 0
        ? Math.round(duracaoTotal / visitasComDuracao.length / 60000)
        : 0;

    return NextResponse.json({
      mes: {
        ano: mes.getFullYear(),
        mes: mes.getMonth() + 1,
        nome: mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        inicio: inicioMes,
        fim: fimMes,
      },
      estatisticas: {
        totalVisitas,
        visitasFinalizadas,
        visitasEmAberto,
        duracaoMediaMinutos,
        alertas: {
          faccaoRival: visitasComAlertaFaccao,
          horario: visitasComAlertaHorario,
          limiteVisitas: visitasComAlertaLimite,
        },
      },
      porAdolescente: Object.values(visitasPorAdolescente),
      porVisitante: Object.values(visitasPorVisitante),
      porPeriodo: visitasPorPeriodo,
      porTipo: visitasPorTipo,
      visitas,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório mensal:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar relatório mensal",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
