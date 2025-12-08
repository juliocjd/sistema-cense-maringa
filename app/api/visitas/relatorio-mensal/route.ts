import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const formatPeriodoDescricao = (inicio: Date, fim: Date) =>
  `${inicio.toLocaleDateString("pt-BR")} - ${fim.toLocaleDateString("pt-BR")}`;

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get("mes"); // formato: YYYY-MM
    const inicioParam = searchParams.get("inicio"); // YYYY-MM-DD
    const fimParam = searchParams.get("fim"); // YYYY-MM-DD
    const adolescenteId = searchParams.get("adolescenteId");

    let inicioPeriodo: Date;
    let fimPeriodo: Date;
    let periodoDescricao: string;

    if (inicioParam && fimParam) {
      const inicio = new Date(`${inicioParam}T00:00:00`);
      const fim = new Date(`${fimParam}T23:59:59`);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        return NextResponse.json(
          { erro: "Periodo invalido" },
          { status: 400 }
        );
      }

      if (inicio > fim) {
        return NextResponse.json(
          { erro: "Data inicial maior que final" },
          { status: 400 }
        );
      }

      inicioPeriodo = inicio;
      fimPeriodo = fim;
      periodoDescricao = `Periodo ${formatPeriodoDescricao(inicio, fim)}`;
    } else if (mesParam) {
      const [ano, mesNumero] = mesParam.split("-").map(Number);
      const mes = new Date(ano, mesNumero - 1, 1);
      inicioPeriodo = new Date(ano, mesNumero - 1, 1);
      fimPeriodo = new Date(ano, mesNumero, 0, 23, 59, 59);
      periodoDescricao = mes.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    } else {
      const hoje = new Date();
      inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
      periodoDescricao = hoje.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }

    const where: any = {
      dataHoraEntrada: {
        gte: inicioPeriodo,
        lte: fimPeriodo,
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
        ano: inicioPeriodo.getFullYear(),
        mes: inicioPeriodo.getMonth() + 1,
        nome: periodoDescricao,
        inicio: inicioPeriodo,
        fim: fimPeriodo,
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
