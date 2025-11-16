import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEstruturaCasasParaCalculo } from "@/lib/estrutura/snapshot";
import { simularAlocacao } from "@/lib/alocacao/simulador";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
} from "@/lib/conflitos";
import { formatarImpactosExternos } from "@/lib/alocacao/utils";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);

    if (
      !payload ||
      typeof payload.adolescenteId !== "string" ||
      !Array.isArray(payload.alojamentoIds)
    ) {
      return NextResponse.json(
        { erro: "Informe adolescenteId e uma lista de alojamentoIds" },
        { status: 400 }
      );
    }

    const alojamentoIds: string[] = payload.alojamentoIds
      .map((id: unknown) => (typeof id === "string" ? id : null))
      .filter((id: string | null): id is string => Boolean(id));

    if (alojamentoIds.length === 0) {
      return NextResponse.json(
        { erro: "Lista de alojamentos vazia" },
        { status: 400 }
      );
    }

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: payload.adolescenteId },
      include: {
        bairroOrigem: true,
        faccao: true,
        conflitosA: {
          where: { status: "ATIVO" },
          include: { adolescenteB: { include: { faccao: true } } },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: { adolescenteA: { include: { faccao: true } } },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    const casasParaCalculo = await getEstruturaCasasParaCalculo({
      skipCache: payload.refresh === true,
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

    const resultados = await Promise.all(
      alojamentoIds.map(async (alojamentoId) => {
        const avaliacao = simularAlocacao({
          adolescente,
          alojamentoId,
          casasBase: casasParaCalculo,
          conflitosExternos,
        });

        if (avaliacao.status !== 200 || !avaliacao.dados) {
          return {
            alojamentoId,
            sucesso: false,
            erro: avaliacao.erro ?? "Falha ao avaliar alojamento",
          };
        }

        return {
          alojamentoId,
          sucesso: true,
          dados: avaliacao.dados,
        };
      })
    );

    return NextResponse.json({
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        sms: adolescente.numeroSms,
      },
      resultados,
    });
  } catch (error) {
    console.error("Erro na avaliacao em lote:", error);
    return NextResponse.json(
      { erro: "Erro interno ao avaliar alojamentos" },
      { status: 500 }
    );
  }
}
