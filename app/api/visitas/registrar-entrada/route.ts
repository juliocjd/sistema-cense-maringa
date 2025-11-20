import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const registrarEntradaSchema = z.object({
  visitanteId: z.string().uuid("visitanteId inválido"),
  adolescenteId: z.string().uuid("adolescenteId inválido"),
  quantidadeAdultos: z.number().int().min(1).max(10).default(1),
  quantidadeCriancas: z.number().int().min(0).max(10).default(0),
  justificativaHorario: z.string().optional().nullable(),
});

type AlertaVisita = {
  tipo: "FACCAO_RIVAL" | "HORARIO" | "LIMITE_VISITAS";
  mensagem: string;
  nivel: "ALTO" | "MEDIO" | "BAIXO";
};

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = registrarEntradaSchema.parse(await request.json());
    const { visitanteId, adolescenteId, quantidadeAdultos, quantidadeCriancas, justificativaHorario } = body;

    // Buscar configurações de visita
    const config = await prisma.configuracaoVisitas.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
    });

    if (!config) {
      return NextResponse.json(
        { erro: "Configuração de visitas não encontrada" },
        { status: 500 }
      );
    }

    // 1. Verificar se visitante existe e não está bloqueado
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
      include: {
        adolescentesLink: {
          include: {
            adolescente: {
              include: { faccao: true },
            },
          },
        },
      },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    if (visitante.bloqueado) {
      return NextResponse.json(
        {
          erro: "Visitante bloqueado",
          motivo: visitante.motivoBloqueio,
          dataBloqueio: visitante.dataBloqueio,
        },
        { status: 403 }
      );
    }

    if (!visitante.ativo) {
      return NextResponse.json(
        { erro: "Visitante inativo" },
        { status: 403 }
      );
    }

    // 2. Verificar se adolescente existe e está ATIVO/INTERNADO
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        faccao: true,
        alojamentoAtual: {
          include: {
            casa: true
          }
        }
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    if (!["ATIVO", "INTERNADO"].includes(adolescente.statusUnidade)) {
      return NextResponse.json(
        {
          erro: "Adolescente não está disponível para visitas",
          status: adolescente.statusUnidade,
        },
        { status: 403 }
      );
    }

    // 3. Verificar se existe vínculo autorizado
    const vinculo = visitante.adolescentesLink.find(
      (v) => v.adolescenteId === adolescenteId
    );

    if (!vinculo) {
      return NextResponse.json(
        { erro: "Visitante não está vinculado a este adolescente" },
        { status: 403 }
      );
    }

    if (!vinculo.autorizado) {
      return NextResponse.json(
        { erro: "Visita não autorizada para este vínculo" },
        { status: 403 }
      );
    }

    // 4. Determinar periodo autorizado baseado na casa
    const casaNumero = adolescente.alojamentoAtual?.casa?.numero || 0;
    const periodosPorCasa: Record<string, "MANHA" | "TARDE"> = (() => {
      try {
        if (
          config.periodosPorCasa &&
          typeof config.periodosPorCasa === "object" &&
          !Array.isArray(config.periodosPorCasa)
        ) {
          return config.periodosPorCasa as Record<string, "MANHA" | "TARDE">;
        }
        if (typeof config.periodosPorCasa === "string") {
          return JSON.parse(config.periodosPorCasa) as Record<string, "MANHA" | "TARDE">;
        }
      } catch (error) {
        console.error(
          "Erro ao interpretar periodosPorCasa em configuracao de visitas:",
          error
        );
      }
      return {} as Record<string, "MANHA" | "TARDE">;
    })();

    const periodoCasa = periodosPorCasa[String(casaNumero)];
    let periodoAutorizado: "MANHA" | "TARDE" =
      periodoCasa === "TARDE" ? "TARDE" : "MANHA";

// 5. Verificar horário atual
    const agora = new Date();
    const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const diaSemana = agora.getDay(); // 0 = domingo, 6 = sábado

    const diasPermitidos = Array.isArray(config.diasPermitidos)
      ? config.diasPermitidos
      : JSON.parse(config.diasPermitidos as any);

    let periodoRealizado: "MANHA" | "TARDE";
    let horarioDiferente = false;

    // Determinar período realizado
    if (horaAtual >= config.horarioManhaInicio && horaAtual <= config.horarioManhaFim) {
      periodoRealizado = "MANHA";
    } else if (horaAtual >= config.horarioTardeInicio && horaAtual <= config.horarioTardeFim) {
      periodoRealizado = "TARDE";
    } else {
      // Fora do horário, mas permite com justificativa
      periodoRealizado = periodoAutorizado;
      horarioDiferente = true;
    }

    // Verifica se período realizado é diferente do autorizado
    if (periodoRealizado !== periodoAutorizado && !justificativaHorario) {
      horarioDiferente = true;
    }

    // 6. Verificar limites de visitantes
    const ehSegundoSabado = diaSemana === 6 && Math.ceil(agora.getDate() / 7) === 2;

    let limiteAdultos = config.limiteAdultosPadrao;
    let limiteCriancas = config.limiteCriancasPadrao;

    if (ehSegundoSabado && config.habilitarRegraSegundoSabado) {
      limiteAdultos = config.limiteAdultosSegundoSab;
      limiteCriancas = config.limiteCriancasSegundoSab;
    }

    const totalVisitantes = quantidadeAdultos + quantidadeCriancas;
    let alertaLimiteVisitas = false;

    if (quantidadeAdultos > limiteAdultos || quantidadeCriancas > limiteCriancas) {
      return NextResponse.json(
        {
          erro: "Limite de visitantes excedido",
          limites: {
            adultos: limiteAdultos,
            criancas: limiteCriancas,
          },
          informado: {
            adultos: quantidadeAdultos,
            criancas: quantidadeCriancas,
          },
        },
        { status: 400 }
      );
    }

    // 7. Verificar limite de visitas no mês
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    const visitasNoMes = await prisma.visitaRegistro.count({
      where: {
        visitanteId,
        adolescenteId,
        dataHoraEntrada: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
    });

    if (visitasNoMes >= config.quantidadeVisitasMensal) {
      alertaLimiteVisitas = true;
    }

    // 8. Verificar alerta de facção rival
    const alertas: AlertaVisita[] = [];
    let alertaFaccaoRival = false;

    if (visitante.adolescentesLink.length > 1 && adolescente.faccao) {
      const outrosVinculos = visitante.adolescentesLink.filter(
        (v) => v.adolescenteId !== adolescenteId && v.adolescente.faccao
      );

      for (const outroVinculo of outrosVinculos) {
        const outraFaccao = outroVinculo.adolescente.faccao;

        if (outraFaccao && adolescente.faccao.id !== outraFaccao.id) {
          alertaFaccaoRival = true;
          alertas.push({
            tipo: "FACCAO_RIVAL",
            mensagem: `POSSÍVEL LEVA-E-TRAZ: Visitante vinculado a adolescentes de facções diferentes (${adolescente.faccao.nomeFaccao} e ${outraFaccao.nomeFaccao})`,
            nivel: "ALTO",
          });

          // Registrar alerta no banco
          await prisma.alertaFaccaoRival.create({
            data: {
              visitanteId,
              faccao1Id: adolescente.faccao.id,
              faccao2Id: outraFaccao.id,
              adolescente1Id: adolescenteId,
              adolescente2Id: outroVinculo.adolescenteId,
              nivelAlerta: "ALTO",
              observacoes: `Visita registrada em ${agora.toLocaleString("pt-BR")}`,
            },
          });
        }
      }
    }

    // Adicionar outros alertas
    if (horarioDiferente) {
      alertas.push({
        tipo: "HORARIO",
        mensagem: `Visita fora do período autorizado (${periodoAutorizado}). Realizado: ${periodoRealizado}`,
        nivel: justificativaHorario ? "BAIXO" : "MEDIO",
      });
    }

    if (alertaLimiteVisitas) {
      alertas.push({
        tipo: "LIMITE_VISITAS",
        mensagem: `Limite de visitas mensais atingido (${visitasNoMes}/${config.quantidadeVisitasMensal})`,
        nivel: "MEDIO",
      });
    }

    // 9. Registrar entrada da visita
    const visitaRegistro = await prisma.$transaction(async (tx) => {
      const registro = await tx.visitaRegistro.create({
        data: {
          visitanteId,
          adolescenteId,
          dataHoraEntrada: agora,
          operadorEntradaId: operadorId,
          tipoVisita: ehSegundoSabado ? "SEGUNDO_SABADO" : "REGULAR",
          periodoAutorizado,
          periodoRealizado,
          horarioDiferente,
          justificativaHorario,
          quantidadeAdultos,
          quantidadeCriancas,
          alertaFaccaoRival,
          alertaHorario: horarioDiferente,
          alertaLimiteVisitas,
          observacoesAlertas: alertas.map((a) => a.mensagem).join("; "),
        },
        include: {
          visitante: {
            select: {
              id: true,
              nomeCompleto: true,
              fotoUrl: true,
            },
          },
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              nomeSocial: true,
              alojamentoAtual: {
                select: {
                  casa: {
                    select: {
                      id: true,
                      numero: true,
                      nome: true,
                    }
                  }
                }
              },
            },
          },
        },
      });

      // Log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITA_REGISTRAR_ENTRADA",
          tabelaAfetada: "visitas_registro",
          registroIdAfetado: registro.id,
          detalhesAlteracao: {
            visitante: visitante.nomeCompleto,
            adolescente: adolescente.nomeCompleto,
            totalVisitantes,
            alertas: alertas.length,
            temAlertas: alertas.length > 0,
          },
          ipOrigem: ip,
        },
      });

      return registro;
    });

    return NextResponse.json({
      sucesso: true,
      visita: visitaRegistro,
      alertas,
      mensagem: alertas.length > 0
        ? "Visita registrada com alertas"
        : "Visita registrada com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao registrar entrada:", error);
    return NextResponse.json(
      {
        erro: "Erro ao registrar entrada da visita",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
