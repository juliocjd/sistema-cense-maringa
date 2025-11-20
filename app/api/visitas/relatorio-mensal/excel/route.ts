import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import * as XLSX from "xlsx";

/**
 * GET /api/visitas/relatorio-mensal/excel
 * Gera arquivo Excel do relatório mensal de visitas
 */
export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get("mes"); // formato: YYYY-MM

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

    // Buscar todas as visitas do mês
    const visitas = await prisma.visitaRegistro.findMany({
      where: {
        dataHoraEntrada: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
      include: {
        visitante: {
          select: {
            nomeCompleto: true,
            cpf: true,
            telefones: true,
          },
        },
        adolescente: {
          select: {
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
                numeroAlojamento: true,
              },
            },
          },
        },
      },
      orderBy: { dataHoraEntrada: "asc" },
    });

    // Calcular estatísticas
    const totalVisitas = visitas.length;
    const totalPessoas = visitas.reduce(
      (acc, v) => acc + v.quantidadeAdultos + v.quantidadeCriancas,
      0
    );
    const visitantesUnicos = new Set(visitas.map((v) => v.visitanteId)).size;
    const adolescentesVisitados = new Set(visitas.map((v) => v.adolescenteId)).size;

    const visitasPorPeriodo = {
      MANHA: visitas.filter((v) => v.periodoAutorizado === "MANHA").length,
      TARDE: visitas.filter((v) => v.periodoAutorizado === "TARDE").length,
      ESPECIAL: visitas.filter((v) => v.periodoAutorizado === "ESPECIAL").length,
    };

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Aba 1: Estatísticas
    const statsData = [
      ["Relatório Mensal de Visitas - CENSE Maringá"],
      [
        mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      ],
      [],
      ["Estatísticas Gerais"],
      ["Total de Visitas", totalVisitas],
      ["Total de Pessoas", totalPessoas],
      ["Visitantes Únicos", visitantesUnicos],
      ["Adolescentes Visitados", adolescentesVisitados],
      [],
      ["Visitas por Período"],
      ["Manhã", visitasPorPeriodo.MANHA],
      ["Tarde", visitasPorPeriodo.TARDE],
      ["Especial", visitasPorPeriodo.ESPECIAL],
      [],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, wsStats, "Estatísticas");

    // Aba 2: Visitas Detalhadas
    const visitasData = visitas.map((visita) => ({
      Data: new Date(visita.dataHoraEntrada).toLocaleDateString("pt-BR"),
      Hora: new Date(visita.dataHoraEntrada).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Visitante: visita.visitante.nomeCompleto,
      "CPF Visitante": visita.visitante.cpf || "Não informado",
      "Telefone Visitante": visita.visitante.telefones?.[0] || "Não informado",
      Adolescente: visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
      Casa: visita.adolescente.alojamentoAtual?.casa
        ? `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
        : "N/A",
      Alojamento: visita.adolescente.alojamentoAtual?.numeroAlojamento || "N/A",
      Período: visita.periodoAutorizado,
      Adultos: visita.quantidadeAdultos,
      Crianças: visita.quantidadeCriancas,
      "Total Pessoas": visita.quantidadeAdultos + visita.quantidadeCriancas,
      "Alerta Facção": visita.alertaFaccaoRival ? "SIM" : "NÃO",
      "Alerta Horário": visita.alertaHorario ? "SIM" : "NÃO",
      "Alerta Limite": visita.alertaLimiteVisitas ? "SIM" : "NÃO",
      Observações: visita.observacoes || "",
    }));

    const wsVisitas = XLSX.utils.json_to_sheet(visitasData);
    XLSX.utils.book_append_sheet(workbook, wsVisitas, "Visitas");

    // Aba 3: Por Adolescente
    const visitasPorAdolescente = visitas.reduce((acc, visita) => {
      const key = visita.adolescenteId;
      if (!acc[key]) {
        acc[key] = {
          Adolescente: visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
          Casa: visita.adolescente.alojamentoAtual?.casa
            ? `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
            : "N/A",
          "Total Visitas": 0,
          "Total Pessoas": 0,
          Visitantes: new Set<string>(),
        };
      }
      acc[key]["Total Visitas"]++;
      acc[key]["Total Pessoas"] += visita.quantidadeAdultos + visita.quantidadeCriancas;
      acc[key].Visitantes.add(visita.visitante.nomeCompleto);
      return acc;
    }, {} as Record<string, any>);

    const adolescentesData = Object.values(visitasPorAdolescente).map((item: any) => ({
      Adolescente: item.Adolescente,
      Casa: item.Casa,
      "Total Visitas": item["Total Visitas"],
      "Total Pessoas": item["Total Pessoas"],
      "Visitantes Únicos": item.Visitantes.size,
      "Média Pessoas/Visita": (item["Total Pessoas"] / item["Total Visitas"]).toFixed(1),
    }));

    const wsAdolescentes = XLSX.utils.json_to_sheet(adolescentesData);
    XLSX.utils.book_append_sheet(workbook, wsAdolescentes, "Por Adolescente");

    // Aba 4: Por Visitante
    const visitasPorVisitante = visitas.reduce((acc, visita) => {
      const key = visita.visitanteId;
      if (!acc[key]) {
        acc[key] = {
          Visitante: visita.visitante.nomeCompleto,
          CPF: visita.visitante.cpf || "Não informado",
          "Total Visitas": 0,
          "Total Pessoas": 0,
          Adolescentes: new Set<string>(),
        };
      }
      acc[key]["Total Visitas"]++;
      acc[key]["Total Pessoas"] += visita.quantidadeAdultos + visita.quantidadeCriancas;
      acc[key].Adolescentes.add(
        visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || ""
      );
      return acc;
    }, {} as Record<string, any>);

    const visitantesData = Object.values(visitasPorVisitante).map((item: any) => ({
      Visitante: item.Visitante,
      CPF: item.CPF,
      "Total Visitas": item["Total Visitas"],
      "Total Pessoas": item["Total Pessoas"],
      "Adolescentes Visitados": item.Adolescentes.size,
      "Média Pessoas/Visita": (item["Total Pessoas"] / item["Total Visitas"]).toFixed(1),
    }));

    const wsVisitantes = XLSX.utils.json_to_sheet(visitantesData);
    XLSX.utils.book_append_sheet(workbook, wsVisitantes, "Por Visitante");

    // Gerar buffer do Excel
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Retornar Excel
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-visitas-${mesParam || "atual"}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar Excel do relatório",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
