import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";

// GET /api/justificativas-algema/[id]/pdf - Gerar PDF da justificativa
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Buscar justificativa com todos os relacionamentos
    const justificativa = await prisma.justificativaAlgema.findUnique({
      where: { id },
      include: {
        adolescente: {
          select: {
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            dataNascimento: true,
            numeroProcesso: true,
            atoInfracionalAtual: true,
            atoInfracionalGravidade: true,
            atoInfracionalGravidadeObs: true,
            riscoFuga: true,
            faccao: {
              select: {
                nomeFaccao: true,
              },
            },
            bairroOrigem: {
              select: {
                nomeBairro: true,
                cidade: true,
              },
            },
          },
        },
        operadorResponsavel: {
          select: {
            nomeCompleto: true,
            funcaoRole: true,
          },
        },
        aprovador: {
          select: {
            nomeCompleto: true,
            funcaoRole: true,
          },
        },
      },
    });

    if (!justificativa) {
      return NextResponse.json(
        { erro: "Justificativa não encontrada" },
        { status: 404 }
      );
    }

    // Gerar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Função auxiliar para adicionar linha horizontal
    const addLine = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPosition, pageWidth - 14, yPosition);
      yPosition += 5;
    };

    // Função para verificar quebra de página
    const checkPageBreak = (spaceNeeded: number) => {
      if (yPosition + spaceNeeded > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // ================= CABEÇALHO =================
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("JUSTIFICATIVA DE USO DE ALGEMA", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Centro de Socioeducação de Maringá - CENSE", pageWidth / 2, 24, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Documento Nº ${justificativa.numeroDocumento}`, pageWidth / 2, 32, { align: "center" });

    yPosition = 50;
    doc.setTextColor(0, 0, 0);

    // ================= IDENTIFICAÇÃO DO ADOLESCENTE =================
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("1. IDENTIFICAÇÃO DO ADOLESCENTE", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const dadosAdolescente = [
      ["Nome Completo:", justificativa.adolescente.nomeCompleto],
      ["Nome Social:", justificativa.adolescente.nomeSocial || "Não informado"],
      ["Número SMS:", justificativa.adolescente.numeroSms || "Não informado"],
      ["Data de Nascimento:", justificativa.adolescente.dataNascimento
        ? new Date(justificativa.adolescente.dataNascimento).toLocaleDateString("pt-BR")
        : "Não informado"
      ],
      ["Número do Processo:", justificativa.numeroProcesso || "Não informado"],
    ];

    dadosAdolescente.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 14, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(value, 65, yPosition);
      yPosition += 6;
    });

    yPosition += 3;
    addLine();

    // ================= DADOS DA OCORRÊNCIA =================
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("2. DADOS DA OCORRÊNCIA", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const motivosMap: Record<string, string> = {
      TRANSFERENCIA_JUDICIAL: "Transferência Judicial",
      AUDIENCIA: "Audiência no Fórum",
      ATENDIMENTO_EXTERNO: "Atendimento Médico/Hospitalar Externo",
      FUGA_TENTATIVA: "Tentativa de Fuga",
      AGRESSAO_GRAVE: "Agressão Grave ou Risco Iminente",
      OUTRO: "Outro Motivo"
    };

    const dadosOcorrencia = [
      ["Data/Hora:", new Date(justificativa.dataHoraOcorrencia).toLocaleString("pt-BR")],
      ["Motivo Principal:", motivosMap[justificativa.motivoPrincipal] || justificativa.motivoPrincipal],
      ["Destino:", justificativa.destinoMovimentacao || "Não especificado"],
    ];

    dadosOcorrencia.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 14, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(value, 65, yPosition);
      yPosition += 6;
    });

    yPosition += 3;
    addLine();

    // ================= FUNDAMENTAÇÃO LEGAL =================
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("3. FUNDAMENTAÇÃO LEGAL", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const fundamentacaoLinhas = doc.splitTextToSize(justificativa.fundamentacaoLegal, pageWidth - 28);
    fundamentacaoLinhas.forEach((linha: string) => {
      checkPageBreak(6);
      doc.text(linha, 14, yPosition);
      yPosition += 6;
    });

    if (justificativa.atoInfracionalBase) {
      yPosition += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Ato Infracional:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      doc.text(justificativa.atoInfracionalBase, 14, yPosition);
      yPosition += 6;
    }

    if (justificativa.adolescente.atoInfracionalGravidade && justificativa.adolescente.atoInfracionalGravidadeObs) {
      yPosition += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Gravidade do Ato:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      const gravidadeLinhas = doc.splitTextToSize(justificativa.adolescente.atoInfracionalGravidadeObs, pageWidth - 28);
      gravidadeLinhas.forEach((linha: string) => {
        checkPageBreak(6);
        doc.text(linha, 14, yPosition);
        yPosition += 6;
      });
    }

    if (justificativa.decisaoJudicial) {
      yPosition += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Decisão Judicial:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      doc.text(justificativa.decisaoJudicial, 14, yPosition);
      yPosition += 6;
    }

    yPosition += 3;
    addLine();

    // ================= AVALIAÇÃO DE RISCO =================
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("4. AVALIAÇÃO DE RISCO", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    autoTable(doc, {
      startY: yPosition,
      head: [["Tipo de Risco", "Nível"]],
      body: [
        ["Risco de Fuga", justificativa.riscoFuga],
        ["Risco de Agressão", justificativa.riscoAgressao],
        ["Risco de Autolesão", justificativa.riscoAutolesao],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: "center" },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Pontuações (se disponíveis)
    if (justificativa.pontuacaoRiscoFuga || justificativa.pontuacaoRiscoAgressao || justificativa.pontuacaoRiscoAutolesao) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.text("Pontuações do Sistema de Inteligência:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (justificativa.pontuacaoRiscoFuga) {
        doc.text(`• Risco de Fuga: ${justificativa.pontuacaoRiscoFuga} pontos`, 20, yPosition);
        yPosition += 5;
      }
      if (justificativa.pontuacaoRiscoAgressao) {
        doc.text(`• Risco de Agressão: ${justificativa.pontuacaoRiscoAgressao} pontos`, 20, yPosition);
        yPosition += 5;
      }
      if (justificativa.pontuacaoRiscoAutolesao) {
        doc.text(`• Risco de Autolesão: ${justificativa.pontuacaoRiscoAutolesao} pontos`, 20, yPosition);
        yPosition += 5;
      }

      doc.setFontSize(10);
      yPosition += 3;
    }

    // Fatores Agravantes Identificados pelo Sistema
    if (justificativa.fatoresAgravantes && justificativa.fatoresAgravantes.length > 0) {
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(255, 243, 224); // Laranja claro
      doc.rect(14, yPosition - 4, pageWidth - 28, 8, "F");
      doc.setTextColor(180, 83, 9); // Laranja escuro
      doc.text("⚠ FATORES AGRAVANTES IDENTIFICADOS PELO SISTEMA DE INTELIGÊNCIA", 16, yPosition);
      yPosition += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      justificativa.fatoresAgravantes.forEach((fator: string) => {
        const fatorLinhas = doc.splitTextToSize(`• ${fator}`, pageWidth - 34);
        fatorLinhas.forEach((linha: string) => {
          checkPageBreak(5);
          doc.text(linha, 20, yPosition);
          yPosition += 5;
        });
      });

      doc.setFontSize(10);
      yPosition += 5;
    }

    if (justificativa.historicoComportamental) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.text("Histórico Comportamental:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      const historicoLinhas = doc.splitTextToSize(justificativa.historicoComportamental, pageWidth - 28);
      historicoLinhas.forEach((linha: string) => {
        checkPageBreak(6);
        doc.text(linha, 14, yPosition);
        yPosition += 6;
      });
    }

    yPosition += 3;
    addLine();

    // ================= MEDIDAS DE SEGURANÇA =================
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("5. MEDIDAS DE SEGURANÇA ADOTADAS", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    justificativa.medidasSeguranca.forEach((medida) => {
      checkPageBreak(6);
      doc.text(`• ${medida}`, 14, yPosition);
      yPosition += 6;
    });

    yPosition += 3;
    doc.setFont("helvetica", "bold");
    doc.text("Equipe Profissional:", 14, yPosition);
    yPosition += 6;

    justificativa.equipeProfissional.forEach((membro) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "normal");
      doc.text(`• ${membro}`, 14, yPosition);
      yPosition += 6;
    });

    if (justificativa.veiculoUtilizado) {
      yPosition += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Veículo Utilizado:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      doc.text(justificativa.veiculoUtilizado, 14, yPosition);
      yPosition += 6;
    }

    yPosition += 3;
    addLine();

    // ================= TEMPO DE USO =================
    if (justificativa.horaInicio || justificativa.horaFim) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text("6. CONTROLE DE TEMPO", 14, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      if (justificativa.horaInicio) {
        doc.text(`Hora de Aplicação: ${new Date(justificativa.horaInicio).toLocaleTimeString("pt-BR")}`, 14, yPosition);
        yPosition += 6;
      }

      if (justificativa.horaFim) {
        doc.text(`Hora de Retirada: ${new Date(justificativa.horaFim).toLocaleTimeString("pt-BR")}`, 14, yPosition);
        yPosition += 6;
      }

      if (justificativa.duracaoMinutos) {
        doc.text(`Duração Total: ${justificativa.duracaoMinutos} minuto(s)`, 14, yPosition);
        yPosition += 6;
      }

      yPosition += 3;
      addLine();
    }

    // ================= OBSERVAÇÕES =================
    if (justificativa.observacoesAdicionais) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text("7. OBSERVAÇÕES ADICIONAIS", 14, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const observacoesLinhas = doc.splitTextToSize(justificativa.observacoesAdicionais, pageWidth - 28);
      observacoesLinhas.forEach((linha: string) => {
        checkPageBreak(6);
        doc.text(linha, 14, yPosition);
        yPosition += 6;
      });

      yPosition += 3;
      addLine();
    }

    // ================= RESPONSÁVEL =================
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("8. RESPONSÁVEL PELA JUSTIFICATIVA", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Nome: ${justificativa.operadorResponsavel.nomeCompleto}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Cargo/Função: ${justificativa.operadorResponsavel.funcaoRole}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Data de Emissão: ${new Date(justificativa.criadoEm).toLocaleString("pt-BR")}`, 14, yPosition);
    yPosition += 10;

    doc.text("_____________________________________________", 14, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.text("Assinatura do Responsável", 14, yPosition);

    // ================= RODAPÉ =================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(
        `CENSE Maringá - Justificativa de Algema ${justificativa.numeroDocumento} | Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      doc.setFontSize(7);
      doc.text(
        "Documento confidencial - Uso restrito aos profissionais autorizados",
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" }
      );
    }

    // Gerar buffer do PDF
    const pdfBuffer = doc.output("arraybuffer");

    // Retornar como resposta
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="justificativa-algema-${justificativa.numeroDocumento}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { erro: "Erro ao gerar PDF da justificativa" },
      { status: 500 }
    );
  }
}
