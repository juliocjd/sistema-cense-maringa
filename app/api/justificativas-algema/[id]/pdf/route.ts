import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TIPO_CI_MAP } from "@/lib/comunicados/tipos";
import {
  TIPO_PROTOCOLO_ALTA,
  TIPO_PROTOCOLO_ATIVADO,
} from "@/lib/alertas/protocolo-risco-suicidio";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";

const RISCO_EXPLICACOES = {
  fuga: "soma atos infracionais graves, avaliacoes previas de fuga, alertas criticos e conflitos territoriais associados",
  agressao:
    "pondera historico de violencia, vinculos faccionais, conflitos interpessoais e comunicados internos recentes",
  autolesao:
    "considera protocolos de suicidio, alertas de saude confidenciais e registros psicossociais criticos",
};

const TIPOS_CRITICOS_DESTAQUE = ["FUGA", "AGRESSAO", "AMEACA_SERVIDOR"];
const DIRETOR_MARKER = "__DIRETOR_ATUAL__:";

// GET /api/justificativas-algema/[id]/pdf - Gerar PDF da justificativa
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { erro: "ID da justificativa não informado" },
        { status: 400 },
      );
    }

    const formatarDataHora = (valor?: Date | string | null) =>
      valor ? new Date(valor).toLocaleString("pt-BR") : null;

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
        { status: 404 },
      );
    }

    const diretorAtualUnidade =
      justificativa.equipeProfissional
        ?.find((item) => item.startsWith(DIRETOR_MARKER))
        ?.slice(DIRETOR_MARKER.length)
        .trim() ?? null;

    const [
      riscoFugaRegistro,
      alertasCriticos,
      cisCriticos,
      suicidioEventos,
      alertaSuicidioAtivo,
    ] = await Promise.all([
      prisma.historicoMovimentacao.findFirst({
        where: {
          adolescenteId: justificativa.adolescenteId,
          tipo: "RISCO_FUGA_ALERTA",
        },
        orderBy: [{ registradoEm: "desc" }, { criadoEm: "desc" }],
        select: {
          descricao: true,
          registradoEm: true,
          criadoEm: true,
          referenciaTipo: true,
          referenciaId: true,
          operador: {
            select: {
              nomeCompleto: true,
            },
          },
        },
      }),
      prisma.alertaAtivo.findMany({
        where: {
          adolescenteId: justificativa.adolescenteId,
          desativadoEm: null,
          tipoAlerta: { in: TIPOS_CRITICOS_DESTAQUE },
        },
        select: {
          id: true,
          tipoAlerta: true,
          descricaoAlerta: true,
          nivelRisco: true,
          criadoEm: true,
        },
        orderBy: { criadoEm: "desc" },
      }),
      prisma.comunicadoInterno.findMany({
        where: {
          tipoCI: { in: TIPOS_CRITICOS_DESTAQUE },
          adolescentes: {
            some: {
              adolescenteId: justificativa.adolescenteId,
            },
          },
        },
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
          dataFato: true,
          criadoEm: true,
        },
        orderBy: [{ ano: "desc" }, { numero: "desc" }],
        take: 5,
      }),
      prisma.historicoMovimentacao.findMany({
        where: {
          adolescenteId: justificativa.adolescenteId,
          tipo: {
            in: [TIPO_PROTOCOLO_ATIVADO, TIPO_PROTOCOLO_ALTA],
          },
        },
        orderBy: [{ registradoEm: "desc" }, { criadoEm: "desc" }],
        take: 10,
      }),
      prisma.alertaAtivo.findFirst({
        where: {
          adolescenteId: justificativa.adolescenteId,
          tipoAlerta: "RISCO_SUICIDIO",
          desativadoEm: null,
        },
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          descricaoAlerta: true,
          nivelRisco: true,
          criadoEm: true,
        },
      }),
    ]);

    let riscoFugaOrigemDescricao: string | undefined;

    if (
      riscoFugaRegistro?.referenciaTipo === "CI" &&
      riscoFugaRegistro.referenciaId
    ) {
      const origemCI = await prisma.comunicadoInterno.findUnique({
        where: { id: riscoFugaRegistro.referenciaId },
        select: { numero: true, ano: true, tipoCI: true },
      });
      if (origemCI) {
        const tipoLabel =
          TIPO_CI_MAP.get(origemCI.tipoCI) ?? origemCI.tipoCI ?? "";
        riscoFugaOrigemDescricao = `Origem: Comunicado Interno ${origemCI.numero}/${origemCI.ano} (${tipoLabel})`;
      } else {
        riscoFugaOrigemDescricao = "Origem: Comunicado Interno";
      }
    } else if (
      riscoFugaRegistro?.referenciaTipo === "ALERTA" &&
      riscoFugaRegistro.referenciaId
    ) {
      const alertaOrigem = await prisma.alertaAtivo.findUnique({
        where: { id: riscoFugaRegistro.referenciaId },
        select: { tipoAlerta: true, nivelRisco: true },
      });
      if (alertaOrigem) {
        const tipo = alertaOrigem.tipoAlerta ?? "Alerta registrado";
        const nivel = alertaOrigem.nivelRisco
          ? ` - Nivel ${alertaOrigem.nivelRisco}`
          : "";
        riscoFugaOrigemDescricao = `Origem: ${tipo}${nivel}`;
      } else {
        riscoFugaOrigemDescricao = "Origem: Alerta registrado";
      }
    } else if (riscoFugaRegistro?.referenciaTipo) {
      riscoFugaOrigemDescricao = `Origem: ${riscoFugaRegistro.referenciaTipo}`;
    }

    const riscoFugaDestaque = riscoFugaRegistro
      ? {
          descricao:
            riscoFugaRegistro.descricao ??
            "Risco de fuga elevado automaticamente apos CI/Alerta recente.",
          data: formatarDataHora(
            riscoFugaRegistro.registradoEm ?? riscoFugaRegistro.criadoEm,
          ),
          origem: riscoFugaOrigemDescricao,
          responsavel: riscoFugaRegistro.operador?.nomeCompleto ?? null,
        }
      : null;
    const eventoProtocolo = suicidioEventos.find(
      (evento) => evento.tipo === TIPO_PROTOCOLO_ATIVADO,
    );
    const eventoAltaProtocolo = suicidioEventos.find(
      (evento) => evento.tipo === TIPO_PROTOCOLO_ALTA,
    );
    const ultimoEventoProtocolo = suicidioEventos[0] ?? null;
    const altaRecenteProtocolo =
      ultimoEventoProtocolo?.tipo === TIPO_PROTOCOLO_ALTA;
    const MENSAGEM_SUICIDIO_ATIVO =
      "Há protocolo vigente de risco de suicídio, exigindo contenção para proteger a integridade física do adolescente, da equipe e de terceiros, conforme Súmula Vinculante nº 11 do STF.";
    const MENSAGEM_SUICIDIO_ALTA =
      "Adolescente ingressou em protocolo de suicídio, recebendo alta médica. Entretanto, há indícios de instabilidade emocional com dificuldades para lidar com frustrações, exigindo monitoramento contínuo para prevenção de riscos à sua integridade e à segurança da equipe e de terceiros.";
    const mensagemSuicidioFinal = altaRecenteProtocolo
      ? MENSAGEM_SUICIDIO_ALTA
      : MENSAGEM_SUICIDIO_ATIVO;
    const fundamentacaoLegalAjustada = justificativa.fundamentacaoLegal
      .replace(MENSAGEM_SUICIDIO_ATIVO, mensagemSuicidioFinal)
      .replace(MENSAGEM_SUICIDIO_ALTA, mensagemSuicidioFinal);
    const protocoloSuicidioResumo =
      alertaSuicidioAtivo || eventoProtocolo || eventoAltaProtocolo
        ? {
            ativo: Boolean(alertaSuicidioAtivo),
            nivel: alertaSuicidioAtivo?.nivelRisco ?? null,
            alertaDescricao: alertaSuicidioAtivo?.descricaoAlerta ?? null,
            alertaCriadoEm: alertaSuicidioAtivo?.criadoEm ?? null,
            altaRecente: altaRecenteProtocolo,
            ingresso: eventoProtocolo
              ? {
                  data:
                    eventoProtocolo.registradoEm ?? eventoProtocolo.criadoEm,
                  descricao: eventoProtocolo.descricao ?? null,
                }
              : null,
            alta: eventoAltaProtocolo
              ? {
                  data:
                    eventoAltaProtocolo.registradoEm ??
                    eventoAltaProtocolo.criadoEm,
                  descricao: eventoAltaProtocolo.descricao ?? null,
                }
              : null,
          }
        : null;

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
    doc.text("JUSTIFICATIVA DE USO DE ALGEMA", pageWidth / 2, 15, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Centro de Socioeducação de Maringá - CENSE", pageWidth / 2, 24, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.text(
      `Documento Nº ${justificativa.numeroDocumento}`,
      pageWidth / 2,
      32,
      { align: "center" },
    );

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

    const dadosAdolescente: Array<[string, string]> = [
      ["Nome Completo:", justificativa.adolescente.nomeCompleto],
    ];

    if (justificativa.adolescente.nomeSocial) {
      dadosAdolescente.push([
        "Nome Social:",
        justificativa.adolescente.nomeSocial,
      ]);
    }

    if (justificativa.adolescente.numeroSms) {
      dadosAdolescente.push([
        "Número SMS:",
        justificativa.adolescente.numeroSms,
      ]);
    }

    if (justificativa.adolescente.dataNascimento) {
      dadosAdolescente.push([
        "Data de Nascimento:",
        new Date(justificativa.adolescente.dataNascimento).toLocaleDateString(
          "pt-BR",
        ),
      ]);
    }

    if (justificativa.numeroProcesso) {
      dadosAdolescente.push([
        "N?mero do Processo:",
        justificativa.numeroProcesso,
      ]);
    }

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
      OUTRO: "Outro Motivo",
    };

    const dadosOcorrencia = [
      [
        "Data/Hora:",
        new Date(justificativa.dataHoraOcorrencia).toLocaleString("pt-BR"),
      ],
      [
        "Motivo Principal:",
        motivosMap[justificativa.motivoPrincipal] ||
          justificativa.motivoPrincipal,
      ],
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
    const tituloFundamentacao =
      "3. FUNDAMENTAÇÃO FÁTICA - ELEMENTOS APURADOS PELOS DADOS NO SISTEMA";
    const larguraMaxima = pageWidth - 28;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    let tituloFontSize = 13;
    doc.setFontSize(tituloFontSize);
    while (
      doc.getTextWidth(tituloFundamentacao) > larguraMaxima &&
      tituloFontSize > 11
    ) {
      tituloFontSize -= 0.5;
      doc.setFontSize(tituloFontSize);
    }
    doc.text(tituloFundamentacao, 14, yPosition);
    yPosition += 7;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const ROTULOS_NEGRITO = [
      "Ato infracional em apuração:",
      "Há protocolo vigente de risco de suicídio",
      "Vínculo orgânico com",
      "Conflitos ativos:",
      "Comunicados internos recentes:",
      "Alertas ativos registrados no sistema:",
      "Movimentação prevista para",
      "Atualmente alojado",
      "Integrante de grupo(s) em andamento:",
    ];

    const parseItensFundamentacao = (texto: string) => {
      const conteudo = (texto ?? "").trim();
      if (!conteudo) return [] as Array<{ numero: string; conteudo: string }>;
      const regex = /(^|\n)(\d+)\.\s+/g;
      const marcadores: Array<{
        inicio: number;
        inicioConteudo: number;
        numero: string;
      }> = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(conteudo)) !== null) {
        const inicio = match.index + (match[1] ? 1 : 0);
        marcadores.push({
          inicio,
          inicioConteudo: regex.lastIndex,
          numero: match[2],
        });
      }
      if (marcadores.length === 0) {
        return [{ numero: "1", conteudo }];
      }
      return marcadores
        .map((marcador, indice) => {
          const fim = marcadores[indice + 1]?.inicio ?? conteudo.length;
          const trecho = conteudo.slice(marcador.inicioConteudo, fim).trim();
          return trecho
            ? {
                numero: marcador.numero,
                conteudo: trecho,
              }
            : null;
        })
        .filter((item): item is { numero: string; conteudo: string } =>
          Boolean(item),
        );
    };

    const extrairRotulo = (conteudo: string) => {
      const texto = conteudo.trim();
      const rotuloConhecido = ROTULOS_NEGRITO.find((rotulo) =>
        texto.startsWith(rotulo),
      );
      if (rotuloConhecido) {
        return {
          rotulo: rotuloConhecido,
          resto: texto.slice(rotuloConhecido.length).trim(),
        };
      }
      const colonIndex = texto.indexOf(":");
      if (colonIndex > 0 && colonIndex < 120) {
        const rotulo = texto.slice(0, colonIndex + 1);
        return {
          rotulo,
          resto: texto.slice(colonIndex + 1).trim(),
        };
      }
      return { rotulo: "", resto: texto };
    };

    const extrairItensLista = (texto: string) => {
      const base = texto.trim();
      if (!base) return [] as string[];
      if (base.includes("\n- ")) {
        return base
          .split(/\n\s*-\s+/)
          .map((item) => item.replace(/^\-\s*/, "").trim())
          .filter(Boolean);
      }
      return base
        .split(/;\s+/)
        .map((item) => item.replace(/^\-\s*/, "").trim())
        .filter(Boolean);
    };

    const lineHeight = 5.2;
    const renderLinhas = (linhas: string[], x = 14) => {
      linhas.forEach((linha) => {
        checkPageBreak(lineHeight + 1.5);
        doc.text(linha, x, yPosition);
        yPosition += lineHeight;
      });
    };

    const itensFundamentacao = parseItensFundamentacao(
      fundamentacaoLegalAjustada
    ).filter(
      (item) =>
        !item.conteudo.trim().startsWith("Integrante de grupo(s) em andamento:")
    );

    itensFundamentacao.forEach((item) => {
      const { rotulo, resto } = extrairRotulo(item.conteudo);
      const ehLista =
        /conflitos ativos|comunicados internos recentes|alertas ativos registrados no sistema/i.test(
          rotulo,
        );

      if (!rotulo) {
        doc.setFont("helvetica", "normal");
        renderLinhas(
          doc.splitTextToSize(
            `${item.numero}. ${item.conteudo}`,
            larguraMaxima,
          ),
        );
        yPosition += 1.5;
        return;
      }

      doc.setFont("helvetica", "bold");
      renderLinhas(
        doc.splitTextToSize(`${item.numero}. ${rotulo}`, larguraMaxima),
      );

      doc.setFont("helvetica", "normal");
      if (!ehLista && resto) {
        renderLinhas(doc.splitTextToSize(resto, larguraMaxima));
        yPosition += 1.5;
        return;
      }

      const itensLista = ehLista ? extrairItensLista(resto) : [];
      const linhasLista =
        itensLista.length > 0 ? itensLista : resto ? [resto] : [];
      linhasLista.forEach((linha, indice) => {
        if (indice > 0) {
          yPosition += 1.5;
        }
        const bullet = `- ${linha}`;
        const bulletLinhas = doc.splitTextToSize(bullet, larguraMaxima - 6);
        renderLinhas(bulletLinhas, 18);
        yPosition += 1.2;
      });
      yPosition += 1.5;
    });

    if (
      justificativa.adolescente.atoInfracionalGravidade &&
      justificativa.adolescente.atoInfracionalGravidadeObs
    ) {
      yPosition += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Gravidade do Ato:", 14, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      const gravidadeLinhas = doc.splitTextToSize(
        justificativa.adolescente.atoInfracionalGravidadeObs,
        pageWidth - 28,
      );
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

    const riscosDetalhados = [
      {
        titulo: "Risco de fuga",
        pontos:
          justificativa.pontuacaoRiscoFuga != null
            ? `${justificativa.pontuacaoRiscoFuga} ponto(s)`
            : "sem pontuacao registrada",
        nivel: justificativa.riscoFuga,
        explicacao: RISCO_EXPLICACOES.fuga,
      },
      {
        titulo: "Risco de agressao",
        pontos:
          justificativa.pontuacaoRiscoAgressao != null
            ? `${justificativa.pontuacaoRiscoAgressao} ponto(s)`
            : "sem pontuacao registrada",
        nivel: justificativa.riscoAgressao,
        explicacao: RISCO_EXPLICACOES.agressao,
      },
      {
        titulo: "Risco de autolesao",
        pontos:
          justificativa.pontuacaoRiscoAutolesao != null
            ? `${justificativa.pontuacaoRiscoAutolesao} ponto(s)`
            : "sem pontuacao registrada",
        nivel: justificativa.riscoAutolesao,
        explicacao: RISCO_EXPLICACOES.autolesao,
      },
    ];

    riscosDetalhados.forEach((risco) => {
      const linhaCompleta = `- ${risco.titulo}: ${risco.pontos} (${risco.nivel}) - ${risco.explicacao}`;
      const linhas = doc.splitTextToSize(linhaCompleta, pageWidth - 34);
      linhas.forEach((trecho: string) => {
        checkPageBreak(6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(trecho, 20, yPosition);
        yPosition += 5;
      });
    });

    if (protocoloSuicidioResumo) {
      const boxWidth = pageWidth - 28;
      const linhasResumo: string[] = [
        protocoloSuicidioResumo.ativo
          ? `Protocolo ativo (nivel ${protocoloSuicidioResumo.nivel ?? "N/I"})`
          : "Protocolo registrado sem alerta ativo no momento",
      ];
      if (protocoloSuicidioResumo.ingresso) {
        linhasResumo.push(
          `Ingresso em ${formatarDataHora(
            protocoloSuicidioResumo.ingresso.data,
          )}${
            protocoloSuicidioResumo.ingresso.descricao
              ? ` — ${protocoloSuicidioResumo.ingresso.descricao}`
              : ""
          }`,
        );
      } else if (protocoloSuicidioResumo.alertaCriadoEm) {
        linhasResumo.push(
          `Ultimo alerta registrado em ${formatarDataHora(
            protocoloSuicidioResumo.alertaCriadoEm,
          )}${
            protocoloSuicidioResumo.alertaDescricao
              ? ` — ${protocoloSuicidioResumo.alertaDescricao}`
              : ""
          }`,
        );
      }
      if (protocoloSuicidioResumo.alta) {
        linhasResumo.push(
          `Alta medica em ${formatarDataHora(
            protocoloSuicidioResumo.alta.data,
          )}${
            protocoloSuicidioResumo.alta.descricao
              ? ` — ${protocoloSuicidioResumo.alta.descricao}`
              : ""
          }`,
        );
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const larguraTexto = boxWidth - 12;
      const linhasResumoQuebradas = linhasResumo.flatMap((linha) =>
        doc.splitTextToSize(linha, larguraTexto),
      );
      const blocoAltura = 24 + linhasResumoQuebradas.length * 5;
      checkPageBreak(blocoAltura + 6);
      doc.setFillColor(253, 242, 248);
      doc.setDrawColor(219, 39, 119);
      doc.roundedRect(14, yPosition, boxWidth, blocoAltura, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(157, 23, 77);
      doc.text(
        "PROTOCOLO DE RISCO DE SUICIDIO / ALTA MEDICA",
        pageWidth / 2,
        yPosition + 8,
        { align: "center" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(74, 74, 74);
      let blocoY = yPosition + 15;
      linhasResumoQuebradas.forEach((linha) => {
        doc.text(linha, 20, blocoY);
        blocoY += 5;
      });
      yPosition = yPosition + blocoAltura + 8;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
    }

    if (riscoFugaDestaque) {
      const boxWidth = pageWidth - 28;
      const descricaoLinhas = doc.splitTextToSize(
        `Motivo: ${riscoFugaDestaque.descricao}`,
        boxWidth - 12,
      );
      const metaLinhasOrigem: string[] = [];

      if (riscoFugaDestaque.data) {
        metaLinhasOrigem.push(
          `Registrado em: ${riscoFugaDestaque.data as string}`,
        );
      }
      if (riscoFugaDestaque.origem) {
        metaLinhasOrigem.push(riscoFugaDestaque.origem);
      }
      if (riscoFugaDestaque.responsavel) {
        metaLinhasOrigem.push(
          `Operador: ${riscoFugaDestaque.responsavel as string}`,
        );
      }

      const metaLinhas = metaLinhasOrigem.flatMap((linha) =>
        doc.splitTextToSize(linha, boxWidth - 12),
      );
      const blocoAltura =
        22 + (descricaoLinhas.length + metaLinhas.length) * 5 + 4;

      checkPageBreak(blocoAltura + 6);
      doc.setFillColor(254, 226, 226);
      doc.setDrawColor(248, 113, 113);
      doc.roundedRect(14, yPosition, boxWidth, blocoAltura, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(190, 18, 60);
      doc.text(
        "ELEVACAO AUTOMATICA DO RISCO DE FUGA",
        pageWidth / 2,
        yPosition + 8,
        { align: "center" },
      );

      let blocoY = yPosition + 16;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      descricaoLinhas.forEach((linha: string) => {
        doc.text(linha, 20, blocoY);
        blocoY += 5;
      });
      if (metaLinhas.length > 0) {
        blocoY += 4;
        metaLinhas.forEach((linha: string) => {
          doc.text(linha, 20, blocoY);
          blocoY += 5;
        });
      }

      yPosition = yPosition + blocoAltura + 8;
      doc.setTextColor(0, 0, 0);
    }

    // Destaques de alertas/CI criticos (Fuga, Agressao, Ameaca contra servidor)
    const registrosCriticos = [
      ...alertasCriticos.map((alerta) => ({
        origem: "ALERTA" as const,
        tipo: alerta.tipoAlerta ?? "ALERTA",
        descricao: alerta.descricaoAlerta ?? "Alerta registrado",
        data: alerta.criadoEm,
        nivel: alerta.nivelRisco ?? null,
      })),
      ...cisCriticos.map((ci) => ({
        origem: "CI" as const,
        tipo: ci.tipoCI,
        descricao:
          ci.resumoCI ??
          `Comunicado Interno ${ci.numero}/${ci.ano} (${ci.tipoCI})`,
        data: ci.dataFato ?? ci.criadoEm,
        numero: `${ci.numero}/${ci.ano}`,
      })),
    ];

    if (registrosCriticos.length > 0) {
      const boxWidth = pageWidth - 28;
      const titulo = "REGISTROS CRITICOS: FUGA / AGRESSAO / AMEACA A SERVIDOR";
      const corpo: string[] = [];

      registrosCriticos.forEach((registro) => {
        const tipoLabel =
          TIPO_CI_MAP.get(registro.tipo) ??
          registro.tipo ??
          (registro.origem === "CI" ? "CI" : "Alerta");
        const data = formatarDataHora(registro.data);
        const nivel =
          registro.origem === "ALERTA" && registro.nivel
            ? ` - Nivel ${registro.nivel}`
            : "";
        const origemLabel =
          registro.origem === "CI"
            ? `CI ${registro.numero ?? ""}`.trim()
            : "Alerta";
        const linha = `• ${origemLabel}: ${tipoLabel}${nivel}${
          data ? ` (${data})` : ""
        } - ${registro.descricao}`;
        corpo.push(...doc.splitTextToSize(linha, boxWidth - 12));
      });

      const blocoAltura = 18 + corpo.length * 5;
      checkPageBreak(blocoAltura + 8);

      doc.setFillColor(255, 243, 224); // amarelo claro
      doc.setDrawColor(249, 115, 22); // laranja
      doc.roundedRect(14, yPosition, boxWidth, blocoAltura, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text(titulo, pageWidth / 2, yPosition + 8, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      let blocoY = yPosition + 15;
      corpo.forEach((linha) => {
        doc.text(linha, 20, blocoY);
        blocoY += 5;
      });

      yPosition = yPosition + blocoAltura + 8;
      doc.setTextColor(0, 0, 0);
    }

    doc.setFontSize(10);
    yPosition += 6;

    // Fatores Agravantes Identificados pelo Sistema
    if (
      justificativa.fatoresAgravantes &&
      justificativa.fatoresAgravantes.length > 0
    ) {
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(255, 243, 224); // Laranja claro
      doc.rect(14, yPosition - 4, pageWidth - 28, 8, "F");
      doc.setTextColor(180, 83, 9); // Laranja escuro
      doc.text(
        "FATORES AGRAVANTES IDENTIFICADOS PELO SISTEMA DE INTELIGENCIA",
        pageWidth / 2,
        yPosition,
        { align: "center" },
      );
      yPosition += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const fatoresList = [...(justificativa.fatoresAgravantes ?? [])];
      if (justificativa.adolescente.atoInfracionalGravidade) {
        const detalheGravidade = justificativa.adolescente
          .atoInfracionalGravidadeObs
          ? `: ${justificativa.adolescente.atoInfracionalGravidadeObs}`
          : "";
        fatoresList.unshift(
          `Ato com repercussao publica ou gravidade elevada${detalheGravidade}`,
        );
      }

      fatoresList.forEach((fator: string) => {
        const fatorLinhas = doc.splitTextToSize(`- ${fator}`, pageWidth - 34);
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
      const historicoLinhas = doc.splitTextToSize(
        justificativa.historicoComportamental,
        pageWidth - 28,
      );
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
        doc.text(
          `Hora de Aplicação: ${new Date(
            justificativa.horaInicio,
          ).toLocaleTimeString("pt-BR")}`,
          14,
          yPosition,
        );
        yPosition += 6;
      }

      if (justificativa.horaFim) {
        doc.text(
          `Hora de Retirada: ${new Date(
            justificativa.horaFim,
          ).toLocaleTimeString("pt-BR")}`,
          14,
          yPosition,
        );
        yPosition += 6;
      }

      if (justificativa.duracaoMinutos) {
        doc.text(
          `Duração Total: ${justificativa.duracaoMinutos} minuto(s)`,
          14,
          yPosition,
        );
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

      const observacoesLinhas = doc.splitTextToSize(
        justificativa.observacoesAdicionais,
        pageWidth - 28,
      );
      observacoesLinhas.forEach((linha: string) => {
        checkPageBreak(6);
        doc.text(linha, 14, yPosition);
        yPosition += 6;
      });

      yPosition += 3;
      addLine();
    }

    // ================= ASSINATURA DO DIRETOR =================
    const diretorAssinatura =
      diretorAtualUnidade?.trim() || "Diretor da unidade";
    checkPageBreak(36);
    yPosition += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("_____________________________________________", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 6;
    doc.text(diretorAssinatura, pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 6;
    doc.text("Diretor do Centro de Socioeducação", pageWidth / 2, yPosition, {
      align: "center",
    });

    // ================= RODAPÉ =================
    const dataEmissao = new Date(justificativa.criadoEm).toLocaleString(
      "pt-BR",
    );
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(
        `CENSE Maringá - Justificativa de Algema ${justificativa.numeroDocumento} | Data de Emissão: ${dataEmissao} | Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );

      doc.setFontSize(7);
      doc.text(
        "Documento confidencial - Uso restrito aos profissionais autorizados",
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" },
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
      { status: 500 },
    );
  }
}
