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

    // Total de pessoas (visitantes + acompanhantes)
    const totalPessoas = visitas.reduce((acc, visita) => {
      return acc + visita.quantidadeAdultos + visita.quantidadeCriancas;
    }, 0);

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
        periodo: visita.periodoAutorizado,
        totalPessoas: visita.quantidadeAdultos + visita.quantidadeCriancas,
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
        periodo: visita.periodoAutorizado,
        totalPessoas: visita.quantidadeAdultos + visita.quantidadeCriancas,
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

    // Por período (manhã/tarde/especial)
    const visitasPorPeriodo = {
      MANHA: visitas.filter((v) => v.periodoAutorizado === "MANHA").length,
      TARDE: visitas.filter((v) => v.periodoAutorizado === "TARDE").length,
      ESPECIAL: visitas.filter((v) => v.periodoAutorizado === "ESPECIAL").length,
    };

    // Visitantes únicos
    const visitantesUnicos = new Set(visitas.map((v) => v.visitanteId)).size;

    // Adolescentes visitados
    const adolescentesVisitados = new Set(visitas.map((v) => v.adolescenteId)).size;

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
        totalPessoas,
        visitantesUnicos,
        adolescentesVisitados,
        alertas: {
          faccaoRival: visitasComAlertaFaccao,
          horario: visitasComAlertaHorario,
          limiteVisitas: visitasComAlertaLimite,
        },
      },
      porAdolescente: Object.values(visitasPorAdolescente),
      porVisitante: Object.values(visitasPorVisitante),
      porPeriodo: visitasPorPeriodo,
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
