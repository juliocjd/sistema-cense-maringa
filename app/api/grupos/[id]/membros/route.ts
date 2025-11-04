// app/api/grupos/[id]/membros/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/grupos/[id]/membros - Listar membros de um grupo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const incluirInativos = searchParams.get("incluir_inativos") === "true";

    // Verificar se grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id },
      include: {
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { erro: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    // Buscar membros
    const membros = await prisma.grupoMembro.findMany({
      where: {
        grupoId: id,
        ...(incluirInativos ? {} : { dataSaida: null }),
      },
      include: {
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alertaRiscoSuicidio: true,
            alertaPerfilMapeado: true,
            alertaSaudeConfidencial: true,
            alojamentoAtual: {
              include: {
                casa: {
                  select: {
                    id: true,
                    nome: true,
                    numero: true,
                  },
                },
              },
            },
            conflitosA: {
              where: { status: "ATIVO" },
              select: {
                id: true,
                tipoConflito: true,
                adolescenteBId: true,
              },
            },
            conflitosB: {
              where: { status: "ATIVO" },
              select: {
                id: true,
                tipoConflito: true,
                adolescenteAId: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataEntrada: "desc",
      },
    });

    // Formatar resposta
    const membrosFormatados = membros.map((membro) => ({
      id: membro.id,
      dataEntrada: membro.dataEntrada,
      dataSaida: membro.dataSaida,
      ativo: membro.dataSaida === null,
      adolescente: {
        id: membro.adolescente.id,
        nomeCompleto: membro.adolescente.nomeCompleto,
        nomeSocial: membro.adolescente.nomeSocial,
        numeroSms: membro.adolescente.numeroSms,
        fotoUrl: membro.adolescente.fotoUrl,
        statusUnidade: membro.adolescente.statusUnidade,
        alertas: {
          riscoSuicidio: membro.adolescente.alertaRiscoSuicidio,
          perfilMapeado: membro.adolescente.alertaPerfilMapeado,
          saudeConfidencial: membro.adolescente.alertaSaudeConfidencial,
        },
        alojamento: membro.adolescente.alojamentoAtual
          ? {
              id: membro.adolescente.alojamentoAtual.id,
              numero: membro.adolescente.alojamentoAtual.numeroAlojamento,
              ala: membro.adolescente.alojamentoAtual.ala,
              casa: {
                id: membro.adolescente.alojamentoAtual.casa.id,
                nome: membro.adolescente.alojamentoAtual.casa.nome,
                numero: membro.adolescente.alojamentoAtual.casa.numero,
              },
            }
          : null,
        conflitosAtivos:
          membro.adolescente.conflitosA.length +
          membro.adolescente.conflitosB.length,
      },
    }));

    return NextResponse.json({
      grupo: {
        id: grupo.id,
        nomeGrupo: grupo.nomeGrupo,
        ordemAla: grupo.ordemAla,
        status: grupo.status,
        casa: {
          id: grupo.casa.id,
          nome: grupo.casa.nome,
          numero: grupo.casa.numero,
        },
      },
      totalMembros: membrosFormatados.length,
      membrosAtivos: membrosFormatados.filter((m) => m.ativo).length,
      membrosInativos: membrosFormatados.filter((m) => !m.ativo).length,
      membros: membrosFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar membros do grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar membros do grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
