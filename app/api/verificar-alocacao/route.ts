import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type CasaRisco,
  type AdolescenteRisco,
  type ConflitosExternosMapa,
} from "@/lib/riscos/calcular";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
  type BairroConflitoInfo,
  type FaccaoConflitoInfo,
} from "@/lib/conflitos";
import { getEstruturaCasasParaCalculo } from "@/lib/estrutura/snapshot";
import { simularAlocacao } from "@/lib/alocacao/simulador";
import { formatarImpactosExternos } from "@/lib/alocacao/utils";

// Tipo inferido da query do adolescente com todos os includes necessários
type PrismaAdolescente = any; // Tipo complexo do Prisma com includes aninhados

const mapearCasas = (casasDb: CasaRisco[]): CasaRisco[] =>
  casasDb.map((casa) => ({
    ...casa,
    alojamentos: casa.alojamentos.map((alojamento) => ({
      ...alojamento,
      adolescentes: [...alojamento.adolescentes],
    })),
  }));

const removerAdolescenteDasCasas = (
  casas: CasaRisco[],
  adolescenteId: string
) => {
  casas.forEach((casa) => {
    casa.alojamentos.forEach((aloj) => {
      if (aloj.adolescentes.some((a) => a.id === adolescenteId)) {
        aloj.adolescentes = aloj.adolescentes.filter(
          (a) => a.id !== adolescenteId
        );
      }
    });
  });
};

const construirAlertas = (
  detalhes: RiscoDetalhado[],
  ambiental?: { ativo: boolean; nivel: number; motivos: string[] } | null
) => {
  const alertas = detalhes.map((item) => ({
    tipo: item.tipo,
    nivel: item.nivel,
    mensagem: item.mensagem,
    proximidade: item.proximidade,
  }));

  if (ambiental?.ativo) {
    ambiental.motivos.forEach((mensagem) => {
      alertas.push({
        tipo: "AMBIENTAL",
        nivel: (ambiental.nivel ?? 2) as any,
        mensagem,
        proximidade: undefined,
      });
    });
  }

  return alertas;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adolescenteId = searchParams.get("adolescenteId");
    const alojamentoId = searchParams.get("alojamentoId");
    const skipCache =
      searchParams.get("refresh") === "1" ||
      searchParams.get("cache") === "off";

    if (!adolescenteId || !alojamentoId) {
      return NextResponse.json(
        {
          erro: "adolescenteId e alojamentoId são obrigatorios",
          permite_alocacao: false,
        },
        { status: 400 }
      );
    }

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        bairroOrigem: true,
        faccao: true,
        conflitosA: {
          where: { status: "ATIVO" },
          include: {
            adolescenteB: {
              include: {
                faccao: true,
              },
            },
          },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: {
            adolescenteA: {
              include: {
                faccao: true,
              },
            },
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    const casasParaCalculo = await getEstruturaCasasParaCalculo({
      skipCache,
    });

    const [mapaBairros, mapaFaccoes] = await Promise.all([
      montarMapaBairrosConflitantes(adolescente.bairroOrigemId),
      montarMapaFaccoesConflitantes(
        adolescente.faccaoGrupoId ?? adolescente.faccao?.id ?? null
      ),
    ]);

    const conflitosExternos = formatarImpactosExternos(
      adolescente,
      mapaBairros,
      mapaFaccoes
    );

    const resultado = simularAlocacao({
      adolescente,
      alojamentoId,
      casasBase: casasParaCalculo,
      conflitosExternos,
    });

    if (resultado.status !== 200) {
      return NextResponse.json(
        {
          erro: resultado.erro ?? "Falha ao avaliar alojamento",
          permite_alocacao: false,
        },
        { status: resultado.status ?? 500 }
      );
    }

    return NextResponse.json({
      ...resultado.dados,
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        sms: adolescente.numeroSms,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar alocacao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao verificar alocacao",
        detalhes: error instanceof Error ? error.message : String(error),
        permite_alocacao: false,
      },
      { status: 500 }
    );
  }
}
