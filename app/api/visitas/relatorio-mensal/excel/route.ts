import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import * as XLSX from "xlsx";

const formatPeriodoTexto = (inicio: Date, fim: Date) =>
  `${inicio.toLocaleDateString("pt-BR")} - ${fim.toLocaleDateString("pt-BR")}`;

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get("mes");
    const inicioParam = searchParams.get("inicio");
    const fimParam = searchParams.get("fim");
    const adolescenteId = searchParams.get("adolescenteId");

    let inicioPeriodo: Date;
    let fimPeriodo: Date;
    let descricaoPeriodo: string;

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
      descricaoPeriodo = formatPeriodoTexto(inicio, fim);
    } else if (mesParam) {
      const [ano, mesNumero] = mesParam.split("-").map(Number);
      const mesBase = new Date(ano, mesNumero - 1, 1);
      inicioPeriodo = new Date(ano, mesNumero - 1, 1);
      fimPeriodo = new Date(ano, mesNumero, 0, 23, 59, 59);
      descricaoPeriodo = mesBase.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    } else {
      const hoje = new Date();
      inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
      descricaoPeriodo = hoje.toLocaleDateString("pt-BR", {
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

    const visitas = await prisma.visitaRegistro.findMany({
      where,
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

    const workbook = XLSX.utils.book_new();

    const statsData = [
      ["Relatorio de Visitas - CENSE Maringa"],
      [descricaoPeriodo],
      [],
      ["Estatisticas gerais"],
      ["Total de visitas", totalVisitas],
      ["Total de pessoas", totalPessoas],
      ["Visitantes unicos", visitantesUnicos],
      ["Adolescentes visitados", adolescentesVisitados],
      [],
      ["Visitas por periodo"],
      ["Manha", visitasPorPeriodo.MANHA],
      ["Tarde", visitasPorPeriodo.TARDE],
      ["Especial", visitasPorPeriodo.ESPECIAL],
      [],
      [
        adolescenteId
          ? `Filtro por adolescente: ${
              visitas[0]?.adolescente.nomeCompleto ||
              visitas[0]?.adolescente.nomeSocial ||
              adolescenteId
            }`
          : "Sem filtro de adolescente",
      ],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, wsStats, "Estatisticas");

    const visitasData = visitas.map((visita) => ({
      Data: new Date(visita.dataHoraEntrada).toLocaleDateString("pt-BR"),
      Hora: new Date(visita.dataHoraEntrada).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Visitante: visita.visitante.nomeCompleto,
      "CPF Visitante": visita.visitante.cpf || "Nao informado",
      "Telefone Visitante": visita.visitante.telefones?.[0] || "Nao informado",
      Adolescente: visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
      Casa: visita.adolescente.alojamentoAtual?.casa
        ? visita.adolescente.alojamentoAtual.casa.nome ??
          `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
        : "N/A",
      Alojamento: visita.adolescente.alojamentoAtual?.numeroAlojamento || "N/A",
      Periodo: visita.periodoAutorizado,
      Adultos: visita.quantidadeAdultos,
      Criancas: visita.quantidadeCriancas,
      "Total Pessoas": visita.quantidadeAdultos + visita.quantidadeCriancas,
      "Alerta Faccao": visita.alertaFaccaoRival ? "SIM" : "NAO",
      "Alerta Horario": visita.alertaHorario ? "SIM" : "NAO",
      "Alerta Limite": visita.alertaLimiteVisitas ? "SIM" : "NAO",
      Observacoes: visita.observacoes || "",
    }));

    const wsVisitas = XLSX.utils.json_to_sheet(visitasData);
    XLSX.utils.book_append_sheet(workbook, wsVisitas, "Visitas");

    const visitasPorAdolescente = visitas.reduce((acc, visita) => {
      const key = visita.adolescenteId;
      if (!acc[key]) {
        acc[key] = {
          Adolescente: visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
          Casa: visita.adolescente.alojamentoAtual?.casa
            ? visita.adolescente.alojamentoAtual.casa.nome ??
              `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
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
      "Visitantes unicos": item.Visitantes.size,
      "Media pessoas/visita": (item["Total Pessoas"] / item["Total Visitas"]).toFixed(1),
    }));

    const wsAdolescentes = XLSX.utils.json_to_sheet(adolescentesData);
    XLSX.utils.book_append_sheet(workbook, wsAdolescentes, "Por Adolescente");

    const visitasPorVisitante = visitas.reduce((acc, visita) => {
      const key = visita.visitanteId;
      if (!acc[key]) {
        acc[key] = {
          Visitante: visita.visitante.nomeCompleto,
          CPF: visita.visitante.cpf || "Nao informado",
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
      "Adolescentes visitados": item.Adolescentes.size,
      "Media pessoas/visita": (item["Total Pessoas"] / item["Total Visitas"]).toFixed(1),
    }));

    const wsVisitantes = XLSX.utils.json_to_sheet(visitantesData);
    XLSX.utils.book_append_sheet(workbook, wsVisitantes, "Por Visitante");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const nomeArquivoBase =
      inicioParam || mesParam || new Date().toISOString().slice(0, 7);

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-visitas-${nomeArquivoBase}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar Excel do relatorio",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
