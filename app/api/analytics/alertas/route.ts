import { NextRequest, NextResponse } from "next/server";
import {
  getEstruturaSnapshot,
  type EstruturaSnapshot,
} from "@/lib/estrutura/snapshot";
import type { RiscoDetalhado } from "@/lib/riscos/calcular";

type NivelRisco =
  | "CRITICO"
  | "ALTO"
  | "MEDIO"
  | "BAIXO"
  | "NAO_CLASSIFICADO";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TIPO_LABEL: Record<string, string> = {
  CONFLITO_INTERNO: "Conflito interno",
  CONFLITO_EXTERNO: "Conflito externo",
  ALIADO: "Alerta aliado",
  AMBIENTAL: "Condicao ambiental",
};

const normalizarNivel = (nivel: number | null | undefined): NivelRisco => {
  if (nivel === undefined || nivel === null) {
    return "NAO_CLASSIFICADO";
  }
  if (nivel >= 5) return "CRITICO";
  if (nivel === 4) return "ALTO";
  if (nivel === 3) return "MEDIO";
  if (nivel === 2) return "BAIXO";
  return "NAO_CLASSIFICADO";
};

const rotuloTipo = (tipo?: string | null) => {
  if (!tipo) return "Sem classificacao";
  return (
    TIPO_LABEL[tipo] ??
    tipo
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
  );
};

const coletarOcupantes = (snapshot: EstruturaSnapshot) => {
  const ocupantes: {
    casaNome: string;
    alojamentoId: string;
    alojamentoRotulo: string;
    ocupante: NonNullable<
      EstruturaSnapshot["casas"][number]["alojamentos"][number]["ocupante"]
    >;
    avaliacao: EstruturaSnapshot["casas"][number]["alojamentos"][number]["avaliacao_risco"];
  }[] = [];

  snapshot.casas.forEach((casa) => {
    casa.alojamentos.forEach((alojamento) => {
      if (!alojamento.ocupante) {
        return;
      }
      ocupantes.push({
        casaNome: casa.nome,
        alojamentoId: alojamento.id,
        alojamentoRotulo: `${casa.nome} - ${alojamento.numero}${
          alojamento.ala ? ` - ${alojamento.ala}` : ""
        }`,
        ocupante: alojamento.ocupante,
        avaliacao: alojamento.avaliacao_risco,
      });
    });
  });

  return ocupantes;
};

const agruparAlertasPorTipo = (
  detalhes: RiscoDetalhado[],
  acumulado: Map<
    string,
    { etiqueta: string; individuos: Set<string> }
  >,
  adolescenteId: string
) => {
  detalhes.forEach((detalhe) => {
    const chave = detalhe.tipo ?? "OUTROS";
    const atual =
      acumulado.get(chave) ??
      ({
        etiqueta: rotuloTipo(detalhe.tipo),
        individuos: new Set<string>(),
      } as const);
    atual.individuos.add(adolescenteId);
    acumulado.set(chave, atual);
  });
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * MS_PER_DAY);
    const trintaDiasAtras = new Date(agora.getTime() - 30 * MS_PER_DAY);
    const snapshot = await getEstruturaSnapshot();
    const ocupantes = coletarOcupantes(snapshot);

    const resumoPorNivel: Record<NivelRisco, number> = {
      CRITICO: 0,
      ALTO: 0,
      MEDIO: 0,
      BAIXO: 0,
      NAO_CLASSIFICADO: 0,
    };
    const tipos = new Map<
      string,
      { etiqueta: string; individuos: Set<string> }
    >();

    let totalAtivos = 0;
    let novosUltimosSeteDias = 0;
    let encerradosUltimosTrintaDias = 0;

    const alertasRecentes = ocupantes
      .map((item) => {
        const detalhes: RiscoDetalhado[] =
          item.avaliacao.detalhes && item.avaliacao.detalhes.length > 0
            ? item.avaliacao.detalhes
            : [
                {
                  tipo: "CONFLITO_INTERNO",
                  mensagem: item.avaliacao.rotulo,
                  nivel: item.avaliacao.nivel,
                  proximidade: undefined,
                },
              ];

        const nivel = normalizarNivel(item.avaliacao.nivel);
        if (nivel !== "NAO_CLASSIFICADO") {
          totalAtivos += 1;
          resumoPorNivel[nivel] += 1;
          agruparAlertasPorTipo(detalhes, tipos, item.ocupante.id);
        }

        const conflitosAtivos = [
          ...(item.ocupante.conflitosA ?? []),
          ...(item.ocupante.conflitosB ?? []),
        ].filter((conflito) => conflito.status !== "RESOLVIDO");

        conflitosAtivos.forEach((conflito) => {
          if (
            conflito.criadoEm &&
            new Date(conflito.criadoEm) >= seteDiasAtras
          ) {
            novosUltimosSeteDias += 1;
          }
        });

        (item.ocupante.conflitosResolvidos ?? []).forEach((conflito) => {
          if (
            conflito.resolvidoEm &&
            new Date(conflito.resolvidoEm) >= trintaDiasAtras
          ) {
            encerradosUltimosTrintaDias += 1;
          }
        });

        const referencia = conflitosAtivos.reduce<Date | null>(
          (maisAntiga, conflito) => {
            if (!conflito.criadoEm) {
              return maisAntiga;
            }
            const criado = new Date(conflito.criadoEm);
            if (!maisAntiga || criado < maisAntiga) {
              return criado;
            }
            return maisAntiga;
          },
          null
        );

        const diasAtivo = referencia
          ? Math.max(
              0,
              Math.floor(
                (agora.getTime() - referencia.getTime()) / MS_PER_DAY
              )
            )
          : null;

        const destaque = detalhes.reduce<RiscoDetalhado | null>(
          (maisSevero, atual) => {
            if (!maisSevero) {
              return atual;
            }
            if ((atual.nivel ?? 0) > (maisSevero.nivel ?? 0)) {
              return atual;
            }
            return maisSevero;
          },
          null
        );

        return {
          chaveOrdenacao: item.avaliacao.nivel ?? 0,
          alerta: {
            id: `${item.alojamentoId}:${item.ocupante.id}`,
            tipo: rotuloTipo(destaque?.tipo),
            nivel,
            descricao: destaque?.mensagem ?? item.avaliacao.descricao,
            criadoEm: referencia ? referencia.toISOString() : null,
            diasAtivo,
            adolescente: {
              id: item.ocupante.id,
              nome: item.ocupante.nome_completo,
              alojamento: {
                id: item.alojamentoId,
                rotulo: item.alojamentoRotulo,
              },
            },
          },
        };
      })
      .filter((entrada) => entrada.alerta.nivel !== "NAO_CLASSIFICADO")
      .sort((a, b) => b.chaveOrdenacao - a.chaveOrdenacao)
      .slice(0, 10)
      .map((entrada) => entrada.alerta);

    const porTipo = Array.from(tipos.entries()).map(([chave, valor]) => {
      const ativos = valor.individuos.size;
      const percentual =
        totalAtivos > 0 ? Number(((ativos / totalAtivos) * 100).toFixed(1)) : 0;
      return {
        chave,
        tipo: valor.etiqueta,
        ativos,
        percentual,
      };
    });

    return NextResponse.json({
      resumo: {
        totalAtivos,
        ativosCriticos: resumoPorNivel.CRITICO,
        ativosPorNivel: resumoPorNivel,
        novosUltimos7Dias: novosUltimosSeteDias,
        encerradosUltimos30Dias: encerradosUltimosTrintaDias,
      },
      porTipo,
      alertasRecentes,
    });
  } catch (error) {
    console.error("Erro ao gerar analytics de alertas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar analytics de alertas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
