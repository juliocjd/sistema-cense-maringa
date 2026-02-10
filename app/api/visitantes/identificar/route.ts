import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getVisitanteEmbeddingCache,
} from "@/lib/visitantes/embedding-cache";
import {
  findBestEmbeddingMatch,
} from "@/lib/visitantes/embedding-utils";

/**
 * Calcula a distância euclidiana entre dois vetores
 */
function euclideanDistance(vec1: number[], vec2: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += Math.pow(vec1[i] - vec2[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Encontra o visitante com melhor correspondência facial
 */
/**
 * POST - Identifica visitante por reconhecimento facial
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      faceEmbeddings,
      threshold = 0.6,
      fotoCapturadaUrl,
      operadorId,
      ipOrigem,
    } = body;

    // Validações
    if (!faceEmbeddings || !Array.isArray(faceEmbeddings)) {
      return NextResponse.json(
        { error: "Face embeddings inválidos" },
        { status: 400 }
      );
    }

    if (faceEmbeddings.length !== 128) {
      return NextResponse.json(
        { error: `Face embeddings deve ter 128 dimensões (recebido: ${faceEmbeddings.length})` },
        { status: 400 }
      );
    }

    const { entries: visitantesComFace } =
      await getVisitanteEmbeddingCache();

    if (visitantesComFace.length === 0) {
      // Registrar tentativa sem sucesso
      await prisma.verificacaoFacial.create({
        data: {
          visitanteId: "00000000-0000-0000-0000-000000000000", // ID dummy para registro
          resultado: "FALHA",
          confianca: 0,
          fotoCapturadaUrl: fotoCapturadaUrl || null,
          operadorId: operadorId || null,
          ipOrigem: ipOrigem || null,
        },
      });

      return NextResponse.json({
        success: false,
        message: "Nenhum visitante com face cadastrada encontrado",
        match: null,
      });
    }

    // Buscar melhor correspondência
    const match = findBestEmbeddingMatch(
      faceEmbeddings,
      visitantesComFace,
      threshold
    );

    if (!match) {
      // Registrar tentativa sem sucesso
      await prisma.verificacaoFacial.create({
        data: {
          visitanteId: "00000000-0000-0000-0000-000000000000",
          resultado: "FALHA",
          confianca: 0,
          fotoCapturadaUrl: fotoCapturadaUrl || null,
          operadorId: operadorId || null,
          ipOrigem: ipOrigem || null,
        },
      });

      return NextResponse.json({
        success: false,
        message: "Nenhuma correspondência encontrada",
        match: null,
        totalVisitantesCadastrados: visitantesComFace.length,
      });
    }

    // Buscar dados completos do visitante identificado
    const visitanteIdentificado = await prisma.visitante.findUnique({
      where: { id: match.id },
      include: {
        adolescentesLink: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                nomeSocial: true,
                statusUnidade: true,
              },
            },
          },
        },
        visitasRegistro: {
          orderBy: { dataHoraEntrada: "desc" },
          take: 5,
          select: {
            id: true,
            dataHoraEntrada: true,
            dataHoraSaida: true,
            observacoes: true,
          },
        },
      },
    });

    if (!visitanteIdentificado) {
      return NextResponse.json(
        { error: "Erro ao buscar dados do visitante identificado" },
        { status: 500 }
      );
    }

    // Registrar verificação bem-sucedida
    await prisma.verificacaoFacial.create({
      data: {
        visitanteId: match.id,
        resultado: "SUCESSO",
        confianca: match.confidence,
        fotoCapturadaUrl: fotoCapturadaUrl || null,
        operadorId: operadorId || null,
        ipOrigem: ipOrigem || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Visitante identificado com sucesso",
      match: {
        id: match.id,
        nomeCompleto: match.nome ?? "Visitante",
        confidence: match.confidence,
        distance: match.distance,
      },
      visitante: {
        id: visitanteIdentificado.id,
        nomeCompleto: visitanteIdentificado.nomeCompleto,
        cpf: visitanteIdentificado.cpf,
        rg: visitanteIdentificado.rg ?? null,
        nomePai: visitanteIdentificado.nomePai ?? null,
        nomeMae: visitanteIdentificado.nomeMae ?? null,
        dataNascimento: visitanteIdentificado.dataNascimento,
        bnmpUltimaConsultaEm: visitanteIdentificado.bnmpUltimaConsultaEm
          ? visitanteIdentificado.bnmpUltimaConsultaEm.toISOString()
          : null,
        antecedentesPdfUrl: visitanteIdentificado.antecedentesPdfUrl ?? null,
        antecedentesPdfAtualizadoEm:
          visitanteIdentificado.antecedentesPdfAtualizadoEm
            ? visitanteIdentificado.antecedentesPdfAtualizadoEm.toISOString()
            : null,
        fotoUrl: visitanteIdentificado.fotoUrl,
        adolescentes: visitanteIdentificado.adolescentesLink.map(
          (rel) => rel.adolescente
        ),
        ultimasVisitas: visitanteIdentificado.visitasRegistro,
      },
    });
  } catch (error) {
    console.error("Erro ao identificar visitante:", error);
    return NextResponse.json(
      { error: "Erro ao identificar visitante" },
      { status: 500 }
    );
  }
}

/**
 * GET - Estatísticas de reconhecimento facial
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const whereClause: any = {};

    if (dataInicio) {
      whereClause.dataHora = { gte: new Date(dataInicio) };
    }

    if (dataFim) {
      whereClause.dataHora = {
        ...whereClause.dataHora,
        lte: new Date(dataFim),
      };
    }

    const [totalVerificacoes, verificacoesSucesso, verificacoesFalha, visitantesComFace] =
      await Promise.all([
        prisma.verificacaoFacial.count({ where: whereClause }),
        prisma.verificacaoFacial.count({
          where: { ...whereClause, resultado: "SUCESSO" },
        }),
        prisma.verificacaoFacial.count({
          where: { ...whereClause, resultado: "FALHA" },
        }),
        prisma.visitante.count({
          where: {
            faceEmbeddings: { not: Prisma.JsonNull },
            consentimentoBiometria: true,
            ativo: true,
          },
        }),
      ]);

    const taxaSucesso =
      totalVerificacoes > 0
        ? ((verificacoesSucesso / totalVerificacoes) * 100).toFixed(1)
        : "0.0";

    // Buscar verificações recentes
    const verificacoesRecentes = await prisma.verificacaoFacial.findMany({
      where: whereClause,
      orderBy: { dataHora: "desc" },
      take: 10,
      include: {
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
            fotoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      estatisticas: {
        totalVerificacoes,
        verificacoesSucesso,
        verificacoesFalha,
        taxaSucesso: parseFloat(taxaSucesso),
        visitantesComFaceCadastrada: visitantesComFace,
      },
      verificacoesRecentes,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas de reconhecimento facial" },
      { status: 500 }
    );
  }
}
