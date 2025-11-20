import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * GET /api/visitas/relatorio-mensal/pdf
 * Gera PDF do relatório mensal de visitas
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

    // Criar PDF
    const doc = new jsPDF();
    const mesNome = mes.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Mensal de Visitas", 105, 15, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`CENSE Maringá - ${mesNome}`, 105, 23, { align: "center" });

    // Estatísticas Gerais
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Estatísticas Gerais", 14, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const stats = [
      `Total de Visitas: ${totalVisitas}`,
      `Total de Pessoas: ${totalPessoas} (visitantes + acompanhantes)`,
      `Visitantes Únicos: ${visitantesUnicos}`,
      `Adolescentes Visitados: ${adolescentesVisitados}`,
      "",
      `Visitas por Período:`,
      `  • Manhã: ${visitasPorPeriodo.MANHA}`,
      `  • Tarde: ${visitasPorPeriodo.TARDE}`,
      `  • Especial: ${visitasPorPeriodo.ESPECIAL}`,
    ];

    let yPos = 42;
    stats.forEach((stat) => {
      doc.text(stat, 14, yPos);
      yPos += 5;
    });

    // Tabela de Visitas
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalhamento das Visitas", 14, yPos);

    const tableData = visitas.map((visita) => [
      new Date(visita.dataHoraEntrada).toLocaleDateString("pt-BR"),
      new Date(visita.dataHoraEntrada).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      visita.visitante.nomeCompleto,
      visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
      visita.adolescente.alojamentoAtual?.casa
        ? `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
        : "N/A",
      visita.periodoAutorizado,
      String(visita.quantidadeAdultos + visita.quantidadeCriancas),
    ]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [
        [
          "Data",
          "Hora",
          "Visitante",
          "Adolescente",
          "Casa",
          "Período",
          "Pessoas",
        ],
      ],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 10 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
      doc.text(
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Gerar buffer do PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-visitas-${mesParam || "atual"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF do relatório",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
