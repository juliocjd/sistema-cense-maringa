// app/api/casas/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Buscar casas com alojamentos e ocupantes do banco
    const casas = await prisma.casa.findMany({
      include: {
        alojamentos: {
          include: {
            adolescentes: {
              include: {
                conflitosA: {
                  where: { status: "ATIVO" },
                },
                conflitosB: {
                  where: { status: "ATIVO" },
                },
              },
            },
            alojamentoFrontal: true,
          },
          orderBy: [{ ala: "asc" }, { numeroAlojamento: "asc" }],
        },
      },
      orderBy: { numero: "asc" },
    });

    // Processar casas para incluir análise de risco
    const casasProcessadas = casas.map((casa) => {
      const alojamentosProcessados = casa.alojamentos.map((alojamento) => {
        const ocupante = alojamento.adolescentes[0];

        // Determinar cor e nível de risco
        let corRisco = "livre";
        let nivelRisco = 1;
        const alertas: string[] = [];
        const icones: string[] = [];

        if (alojamento.statusManutencao === "INTERDITADO") {
          corRisco = "interditado";
          nivelRisco = 0;
        } else if (ocupante) {
          // Verificar conflitos críticos
          const conflitos = [
            ...(ocupante.conflitosA || []),
            ...(ocupante.conflitosB || []),
          ];

          // Verificar conflitos na mesma ala ou frontal
          const temConflitoCritico = conflitos.some((conflito) => {
            const outroId =
              conflito.adolescenteAId === ocupante.id
                ? conflito.adolescenteBId
                : conflito.adolescenteAId;

            // Verificar frontal
            if (alojamento.alojamentoFrontalId) {
              const frontal = casa.alojamentos.find(
                (a) => a.id === alojamento.alojamentoFrontalId
              );
              if (frontal?.adolescentes[0]?.id === outroId) return true;
            }

            // Verificar mesma ala
            const mesmaAla = casa.alojamentos.some(
              (a) =>
                a.ala === alojamento.ala && a.adolescentes[0]?.id === outroId
            );
            return mesmaAla;
          });

          if (temConflitoCritico) {
            corRisco = "perigo";
            nivelRisco = 4;
            alertas.push("Conflito crítico detectado");
          } else if (conflitos.length > 0) {
            corRisco = "atencao";
            nivelRisco = 3;
            alertas.push("Adolescente possui conflitos registrados");
          } else {
            corRisco = "seguro";
            nivelRisco = 2;
          }

          // Adicionar ícones de alertas especiais
          if (ocupante.alertaRiscoSuicidio) {
            icones.push("risco_suicidio");
            alertas.push("Risco de suicídio");
          }
          if (ocupante.alertaPerfilMapeado) {
            icones.push("perfil_mapeado");
            alertas.push("Perfil mapeado");
          }
          if (ocupante.alertaSaudeConfidencial) {
            icones.push("saude_confidencial");
            alertas.push("Alerta de saúde");
          }
        }

        return {
          id: alojamento.id,
          numero: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          status_manutencao: alojamento.statusManutencao,
          cor_risco: corRisco,
          nivel_risco: nivelRisco,
          icones,
          alertas,
          ocupante: ocupante
            ? {
                id: ocupante.id,
                nome_completo: ocupante.nomeCompleto,
                nome_social: ocupante.nomeSocial,
                numero_sms: ocupante.numeroSms,
                foto_url: ocupante.fotoUrl,
              }
            : null,
        };
      });

      // Calcular score de tensão da casa
      const scoreTensao = alojamentosProcessados.reduce(
        (acc, aloj) => acc + (aloj.nivel_risco - 1),
        0
      );

      return {
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        isolada: casa.isolada,
        score_tensao: scoreTensao,
        alojamentos: alojamentosProcessados,
      };
    });

    // Calcular estatísticas
    const totalAlojamentos = casasProcessadas.reduce(
      (acc, casa) => acc + casa.alojamentos.length,
      0
    );
    const alojamentosOcupados = casasProcessadas.reduce(
      (acc, casa) =>
        acc + casa.alojamentos.filter((a) => a.ocupante !== null).length,
      0
    );
    const alojamentosLivres = casasProcessadas.reduce(
      (acc, casa) =>
        acc +
        casa.alojamentos.filter(
          (a) => a.ocupante === null && a.status_manutencao === "LIVRE"
        ).length,
      0
    );
    const alojamentosComRisco = casasProcessadas.reduce(
      (acc, casa) =>
        acc +
        casa.alojamentos.filter((a) => a.nivel_risco >= 3).length,
      0
    );

    const taxaOcupacao =
      totalAlojamentos > 0
        ? `${Math.round((alojamentosOcupados / totalAlojamentos) * 100)}%`
        : "0%";

    return NextResponse.json({
      casas: casasProcessadas,
      estatisticas: {
        total_alojamentos: totalAlojamentos,
        alojamentos_ocupados: alojamentosOcupados,
        alojamentos_livres: alojamentosLivres,
        alojamentos_com_risco: alojamentosComRisco,
        taxa_ocupacao: taxaOcupacao,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar status das casas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar status das casas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
