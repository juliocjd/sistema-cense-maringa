import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
  type AlojamentoRisco,
  type AdolescenteRisco,
  type ConflitosExternosMapa,
  type RiscoDetalhado,
} from "@/lib/riscos/calcular";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
  type BairroConflitoInfo,
  type FaccaoConflitoInfo,
} from "@/lib/conflitos";

// Tipo inferido da query do adolescente com todos os includes necessários
type PrismaAdolescente = any; // Tipo complexo do Prisma com includes aninhados

const mapearAdolescenteParaRisco = (
  adolescente: PrismaAdolescente
): AdolescenteRisco => ({
  id: adolescente.id,
  nomeCompleto: adolescente.nomeCompleto,
  bairroOrigemId: adolescente.bairroOrigemId,
  faccaoGrupoId: adolescente.faccaoGrupoId,
  alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
  alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
  alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,
  alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes,
  faccao: adolescente.faccao
    ? {
        id: adolescente.faccao.id,
        nome:
          adolescente.faccao.nomeFaccao ??
          adolescente.faccao.nome ??
          undefined,
      }
    : null,
  conflitosA: mapearConflitosInternos(adolescente, "B"),
  conflitosB: mapearConflitosInternos(adolescente, "A"),
});

const mapearConflitosInternos = (
  adolescente: PrismaAdolescente,
  adversarioCampo: "A" | "B"
) => {
  const lista =
    adversarioCampo === "B" ? adolescente.conflitosA ?? [] : adolescente.conflitosB ?? [];

  return lista.map((conflito: any) => {
    const adversario =
      adversarioCampo === "B" ? conflito.adolescenteB : conflito.adolescenteA;

    return {
      id: conflito.id,
      status: conflito.status,
      tipoConflito: conflito.tipoConflito,
      adolescenteAId: conflito.adolescenteAId,
      adolescenteBId: conflito.adolescenteBId,
      adversario: adversario
        ? {
            id: adversario.id,
            nomeCompleto: adversario.nomeCompleto,
            bairroOrigemId: adversario.bairroOrigemId,
            faccaoGrupoId: adversario.faccaoGrupoId,
            faccao: adversario.faccao
              ? {
                  id: adversario.faccao.id,
                  nome:
                    adversario.faccao.nomeFaccao ??
                    adversario.faccao.nome ??
                    undefined,
                }
              : null,
          }
        : null,
    };
  });
};

const formatarImpactosExternos = (
  adolescente: PrismaAdolescente,
  bairros: Map<string, BairroConflitoInfo>,
  faccoes: Map<string, FaccaoConflitoInfo>
): ConflitosExternosMapa => {
  const impactos: ImpactoConflitoExterno[] = [];

  bairros.forEach((info) => {
    impactos.push({
      conflitoId: info.id,
      conflitoTipo: "BAIRRO",
      statusConflito: info.status,
      risco: "MEDIO",
      conflitoOrigem: {
        id: info.origem.id,
        nome: info.origem.nome,
      },
      conflitoDestino: {
        id: info.destino.id,
        nome: info.destino.nome,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        status: adolescente.statusUnidade,
        numeroSms: adolescente.numeroSms,
        bairro: adolescente.bairroOrigem
          ? {
              id: adolescente.bairroOrigem.id,
              nome:
                adolescente.bairroOrigem.nomeBairro ??
                adolescente.bairroOrigem.nome,
              cidade: adolescente.bairroOrigem.cidade ?? "Desconhecida",
            }
          : null,
        faccao: null,
        alojamento: null,
      },
    });
  });

  faccoes.forEach((info) => {
    impactos.push({
      conflitoId: info.id,
      conflitoTipo: "FACCAO",
      statusConflito: info.status,
      risco: "ALTO",
      conflitoOrigem: {
        id: info.origem.id,
        nome: info.origem.nome,
      },
      conflitoDestino: {
        id: info.destino.id,
        nome: info.destino.nome,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        status: adolescente.statusUnidade,
        numeroSms: adolescente.numeroSms,
        bairro: null,
        faccao: adolescente.faccao
          ? {
              id: adolescente.faccao.id,
              nome:
                adolescente.faccao.nomeFaccao ??
                adolescente.faccao.nome ??
                undefined,
            }
          : null,
        alojamento: null,
      },
    });
  });

  if (impactos.length === 0) {
    return {};
  }

  return { [adolescente.id]: impactos };
};

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

    const casasDb = await prisma.casa.findMany({
      orderBy: { numero: "asc" },
      include: {
        alojamentos: {
          orderBy: [{ ala: "asc" }, { numeroAlojamento: "asc" }],
          include: {
            adolescentes: {
              where: { statusUnidade: "ATIVO" },
              select: {
                id: true,
                nomeCompleto: true,
                bairroOrigemId: true,
                faccaoGrupoId: true,
                alertaRiscoSuicidio: true,
                alertaPerfilMapeado: true,
                alertaSaudeConfidencial: true,
                alertaSaudeDetalhes: true,
                faccao: {
                  select: {
                    id: true,
                    nomeFaccao: true,
                  },
                },
                conflitosA: {
                  where: { status: "ATIVO" },
                  select: {
                    id: true,
                    status: true,
                    tipoConflito: true,
                    adolescenteAId: true,
                    adolescenteBId: true,
                    adolescenteB: {
                      select: {
                        id: true,
                        nomeCompleto: true,
                        bairroOrigemId: true,
                        faccaoGrupoId: true,
                        faccao: {
                          select: {
                            id: true,
                            nomeFaccao: true,
                          },
                        },
                      },
                    },
                  },
                },
                conflitosB: {
                  where: { status: "ATIVO" },
                  select: {
                    id: true,
                    status: true,
                    tipoConflito: true,
                    adolescenteAId: true,
                    adolescenteBId: true,
                    adolescenteA: {
                      select: {
                        id: true,
                        nomeCompleto: true,
                        bairroOrigemId: true,
                        faccaoGrupoId: true,
                        faccao: {
                          select: {
                            id: true,
                            nomeFaccao: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as any;

    const casasParaCalculo: CasaRisco[] = casasDb.map((casa: any) => ({
      id: casa.id,
      nome: casa.nome,
      numero: casa.numero ?? 0,
      isolada: casa.isolada,
      alojamentos: casa.alojamentos.map(
        (alojamento: any): AlojamentoRisco => ({
          id: alojamento.id,
          casaId: casa.id,
          numeroAlojamento: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          statusManutencao: alojamento.statusManutencao,
          alojamentoFrontalId: alojamento.alojamentoFrontalId,
          localizacaoPreferencial: alojamento.localizacaoPreferencial,
          corRisco: alojamento.corRisco ?? undefined,
          nivelRisco: alojamento.nivelRisco ?? undefined,
          icones: alojamento.icones ?? [],
          alertas: alojamento.alertas ?? [],
          adolescentes: alojamento.adolescentes.map(
            (morador: any): AdolescenteRisco => {
              const conflitosA = mapearConflitosInternos(morador, "B");
              const conflitosB = mapearConflitosInternos(morador, "A");

              // DEBUG: Log para verificar conflitos mapeados
              if (conflitosA.length > 0 || conflitosB.length > 0) {
                console.log(`[DEBUG] Morador ${morador.nomeCompleto} tem conflitos:`, {
                  conflitosA: conflitosA.length,
                  conflitosB: conflitosB.length,
                  adversarios: [...conflitosA, ...conflitosB].map(c => c.adversario?.nomeCompleto),
                });
              }

              return {
                id: morador.id,
                nomeCompleto: morador.nomeCompleto,
                bairroOrigemId: morador.bairroOrigemId,
                faccaoGrupoId: morador.faccaoGrupoId,
                alertaRiscoSuicidio: morador.alertaRiscoSuicidio,
                alertaPerfilMapeado: morador.alertaPerfilMapeado,
                alertaSaudeConfidencial: morador.alertaSaudeConfidencial,
                alertaSaudeDetalhes: morador.alertaSaudeDetalhes,
                faccao: morador.faccao
                  ? {
                      id: morador.faccao.id,
                      nome:
                        morador.faccao.nomeFaccao ??
                        morador.faccao.nome ??
                        undefined,
                    }
                  : null,
                conflitosA,
                conflitosB,
              };
            }
          ),
        })
      ),
    }));

    const casasClonadas = mapearCasas(casasParaCalculo);
    removerAdolescenteDasCasas(casasClonadas, adolescente.id);

    const casaAlvo = casasClonadas.find((casa) =>
      casa.alojamentos.some((aloj) => aloj.id === alojamentoId)
    );

    if (!casaAlvo) {
      return NextResponse.json(
        { erro: "Alojamento não encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    const alojamentoAlvo = casaAlvo.alojamentos.find(
      (aloj) => aloj.id === alojamentoId
    );

    if (!alojamentoAlvo) {
      return NextResponse.json(
        { erro: "Alojamento não encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    const adolescenteSimulado = mapearAdolescenteParaRisco(adolescente);

    // DEBUG: Log para verificar adolescente simulado
    console.log(`[DEBUG] Simulando alocacao de ${adolescenteSimulado.nomeCompleto}:`, {
      id: adolescenteSimulado.id,
      conflitosA: adolescenteSimulado.conflitosA?.length ?? 0,
      conflitosB: adolescenteSimulado.conflitosB?.length ?? 0,
      adversarios: [
        ...(adolescenteSimulado.conflitosA ?? []),
        ...(adolescenteSimulado.conflitosB ?? []),
      ].map(c => c.adversario?.nomeCompleto),
    });

    console.log(`[DEBUG] Status do alojamento ANTES da simulacao:`, {
      alojamentoId: alojamentoAlvo.id,
      numero: alojamentoAlvo.numeroAlojamento,
      statusManutencao: alojamentoAlvo.statusManutencao,
      ocupantesAtuais: alojamentoAlvo.adolescentes.length,
    });

    alojamentoAlvo.adolescentes = [adolescenteSimulado];

    // Para simular alocação, o alojamento deve estar disponível (não INTERDITADO)
    // Temporariamente mudar status para permitir cálculo de risco
    const statusOriginal = alojamentoAlvo.statusManutencao;
    if (alojamentoAlvo.statusManutencao === "INTERDITADO") {
      alojamentoAlvo.statusManutencao = "DISPONIVEL";
      console.log(`[DEBUG] Alojamento estava INTERDITADO, mudando para DISPONIVEL para simular`);
    }

    const mapaSlots = criarMapaSlots(casasClonadas);

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

    // DEBUG: Log para verificar alojamento frontal
    if (alojamentoAlvo.alojamentoFrontalId) {
      const frontal = casaAlvo.alojamentos.find(a => a.id === alojamentoAlvo.alojamentoFrontalId);
      console.log(`[DEBUG] Alojamento ${alojamentoAlvo.numeroAlojamento} tem frontal:`, {
        frontalId: alojamentoAlvo.alojamentoFrontalId,
        frontalNumero: frontal?.numeroAlojamento,
        ocupantes: frontal?.adolescentes.map(a => a.nomeCompleto),
      });
    }

    const resultado = calcularRiscoAlojamento({
      alojamento: alojamentoAlvo,
      casaAtual: casaAlvo,
      casas: casasClonadas,
      slots: mapaSlots,
      conflitosExternos,
    });

    console.log(`[DEBUG] Resultado do calculo:`, {
      nivel: resultado.nivel,
      categoria: resultado.categoria,
      motivos: resultado.motivos,
    });

    const alertas = construirAlertas(resultado.detalhes, resultado.ambiental);
    const requerJustificativa = resultado.nivel >= 3;
    const permiteAlocacao = resultado.nivel < 5;

    return NextResponse.json({
      permite_alocacao: permiteAlocacao,
      requer_justificativa: requerJustificativa,
      nivel_risco: resultado.categoria,
      nivel_numerico: resultado.nivel,
      alertas,
      motivos: resultado.motivos,
      alojamento: {
        id: alojamentoAlvo.id,
        numero: alojamentoAlvo.numeroAlojamento,
        ala: alojamentoAlvo.ala,
        casa: casaAlvo.nome ?? `Casa ${casaAlvo.numero}`,
      },
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
