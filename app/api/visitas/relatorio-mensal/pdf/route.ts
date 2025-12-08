import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

    let adolescenteNome: string | null = null;
    if (adolescenteId) {
      const ado = await prisma.adolescente.findUnique({
        where: { id: adolescenteId },
        select: { nomeCompleto: true, nomeSocial: true },
      });
      adolescenteNome =
        ado?.nomeCompleto || ado?.nomeSocial || "Adolescente filtrado";
    }

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

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatorio de Visitas", 105, 15, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text(`CENSE Maringa - ${descricaoPeriodo}`, 105, 23, { align: "center" });
    if (adolescenteNome) {
      doc.setFontSize(11);
      doc.text(`Filtro: ${adolescenteNome}`, 105, 30, { align: "center" });
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Estatisticas gerais", 14, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const stats = [
      `Total de visitas: ${totalVisitas}`,
      `Total de pessoas: ${totalPessoas}`,
      `Visitantes unicos: ${visitantesUnicos}`,
      `Adolescentes visitados: ${adolescentesVisitados}`,
      "",
      `Visitas por periodo:`,
      `  - Manha: ${visitasPorPeriodo.MANHA}`,
      `  - Tarde: ${visitasPorPeriodo.TARDE}`,
      `  - Especial: ${visitasPorPeriodo.ESPECIAL}`,
    ];

    let yPos = 47;
    stats.forEach((texto) => {
      doc.text(texto, 14, yPos);
      yPos += 5;
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalhamento das visitas", 14, yPos + 5);

    const tableData = visitas.map((visita) => [
      new Date(visita.dataHoraEntrada).toLocaleDateString("pt-BR"),
      new Date(visita.dataHoraEntrada).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      visita.visitante.nomeCompleto,
      visita.adolescente.nomeCompleto || visita.adolescente.nomeSocial || "",
      visita.adolescente.alojamentoAtual?.casa
        ? visita.adolescente.alojamentoAtual.casa.nome ??
          `Casa ${visita.adolescente.alojamentoAtual.casa.numero}`
        : "N/A",
      visita.periodoAutorizado,
      String(visita.quantidadeAdultos + visita.quantidadeCriancas),
    ]);

    autoTable(doc, {
      startY: yPos + 10,
      head: [["Data", "Hora", "Visitante", "Adolescente", "Casa", "Periodo", "Pessoas"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Pagina ${i} de ${pageCount}`,
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

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const nomeArquivoBase =
      inicioParam || mesParam || new Date().toISOString().slice(0, 7);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-visitas-${nomeArquivoBase}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF do relatorio",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
