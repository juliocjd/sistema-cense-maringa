import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * GET /api/qrcode/[codigo]
 * Valida e retorna informações do QR Code escaneado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { codigo } = await params;

  try {
    // Buscar QR Code
    const qrCode = await prisma.qRCodeVisitante.findFirst({
      where: {
        codigoQR: codigo,
      },
      select: {
        id: true,
        visitanteId: true,
        codigoQR: true,
        ativo: true,
        validoAte: true,
        criadoEm: true,
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            rg: true,
            nomePai: true,
            nomeMae: true,
            dataNascimento: true,
            telefones: true,
            email: true,
            fotoUrl: true,
            bnmpUltimaConsultaEm: true,
            antecedentesPdfUrl: true,
            antecedentesPdfAtualizadoEm: true,
            bloqueado: true,
            motivoBloqueio: true,
            dataBloqueio: true,
            dataDesbloqueio: true,
            adolescentesLink: {
              where: { autorizado: true },
              include: {
                adolescente: {
                  select: {
                    id: true,
                    nomeCompleto: true,
                    nomeSocial: true,
                    statusUnidade: true,
                    alojamentoAtual: {
                      select: {
                        casa: {
                          select: {
                            numero: true,
                          },
                        },
                      },
                    },
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
            historicoBloqueios: {
              orderBy: { criadoEm: "desc" },
              take: 5,
              select: {
                id: true,
                motivoBloqueio: true,
                observacoes: true,
                dataBloqueio: true,
                dataDesbloqueio: true,
                desbloqueado: true,
                criadoEm: true,
              },
            },
          },
        },
      },
    });

    if (!qrCode) {
      // Registrar tentativa de scan com código inválido
      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "QRCODE_SCAN_FALHA",
          tabelaAfetada: "qrcodes_visitantes",
          detalhesAlteracao: {
            codigo,
            motivo: "QR Code não encontrado",
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json(
        { erro: "QR Code não encontrado ou inválido" },
        { status: 404 }
      );
    }

    const telefonePrincipal =
      qrCode.visitante.telefones && qrCode.visitante.telefones.length > 0
        ? qrCode.visitante.telefones[0]
        : null;
    const statusGeral = qrCode.visitante.bloqueado ? "BLOQUEADO" : "ATIVO";
    const bloqueadoEmIso =
      qrCode.visitante.dataBloqueio?.toISOString() ?? null;
    const dataExpiracaoIso = qrCode.validoAte?.toISOString() ?? null;

    // Verificar se está ativo
    if (!qrCode.ativo) {
      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "QRCODE_SCAN_FALHA",
          tabelaAfetada: "qrcodes_visitantes",
          registroIdAfetado: qrCode.id,
          detalhesAlteracao: {
            codigo,
            visitanteId: qrCode.visitanteId,
            motivo: "QR Code desativado",
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json(
        { erro: "QR Code desativado. Solicite a geração de um novo QR Code." },
        { status: 403 }
      );
    }

    // Verificar expiração
    if (qrCode.validoAte && qrCode.validoAte < new Date()) {
      // Desativar QR Code expirado
      await prisma.qRCodeVisitante.update({
        where: { id: qrCode.id },
        data: { ativo: false },
      });

      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "QRCODE_SCAN_FALHA",
          tabelaAfetada: "qrcodes_visitantes",
          registroIdAfetado: qrCode.id,
          detalhesAlteracao: {
            codigo,
            visitanteId: qrCode.visitanteId,
            motivo: "QR Code expirado",
            dataExpiracao: qrCode.validoAte.toISOString(),
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json(
        {
          erro: "QR Code expirado. Solicite a geração de um novo QR Code.",
          dataExpiracao: qrCode.validoAte.toISOString(),
        },
        { status: 403 }
      );
    }

    // Verificar se visitante está bloqueado
    if (qrCode.visitante.bloqueado) {
      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "QRCODE_SCAN_BLOQUEADO",
          tabelaAfetada: "qrcodes_visitantes",
          registroIdAfetado: qrCode.id,
          detalhesAlteracao: {
            codigo,
            visitanteId: qrCode.visitanteId,
            visitanteNome: qrCode.visitante.nomeCompleto,
            motivoBloqueio: qrCode.visitante.motivoBloqueio,
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json(
        {
          erro: "Visitante BLOQUEADO. Entrada não permitida.",
          visitante: {
            id: qrCode.visitante.id,
            nomeCompleto: qrCode.visitante.nomeCompleto,
            statusGeral,
            motivoBloqueio: qrCode.visitante.motivoBloqueio,
            bloqueadoEm: bloqueadoEmIso,
          },
        },
        { status: 403 }
      );
    }

    // Buscar visitas recentes (últimos 3 meses)
    const treseMesesAtras = new Date();
    treseMesesAtras.setMonth(treseMesesAtras.getMonth() - 3);

    const visitasRecentes = await prisma.visitaRegistro.findMany({
      where: {
        visitanteId: qrCode.visitanteId,
        dataHoraEntrada: {
          gte: treseMesesAtras,
        },
      },
      orderBy: { dataHoraEntrada: "desc" },
      take: 10,
      select: {
        id: true,
        dataHoraEntrada: true,
        dataHoraSaida: true,
        periodoAutorizado: true,
        periodoRealizado: true,
        adolescente: {
          select: {
            nomeCompleto: true,
          },
        },
      },
    });

    // Contar visitas no mês atual
    const inicioMes = startOfMonth(new Date());
    const fimMes = endOfMonth(new Date());

    const visitasMesAtual = await prisma.visitaRegistro.count({
      where: {
        visitanteId: qrCode.visitanteId,
        dataHoraEntrada: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
    });

    // Buscar configuração ativa para mostrar limite
    const config = await prisma.configuracaoVisitas.findFirst({
      where: { ativo: true },
      select: { quantidadeVisitasMensal: true },
    });

    const limiteVisitasMensal = config?.quantidadeVisitasMensal || 2;

    // Registrar scan bem-sucedido
    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "QRCODE_SCAN_SUCESSO",
        tabelaAfetada: "qrcodes_visitantes",
        registroIdAfetado: qrCode.id,
        detalhesAlteracao: {
          codigo,
          visitanteId: qrCode.visitanteId,
          visitanteNome: qrCode.visitante.nomeCompleto,
          visitasMesAtual,
          limiteVisitasMensal,
        },
        ipOrigem: ip,
      },
    });

    return NextResponse.json({
      valido: true,
      qrCode: {
        id: qrCode.id,
        codigo: qrCode.codigoQR,
        dataGeracao: qrCode.criadoEm.toISOString(),
        dataExpiracao: dataExpiracaoIso,
      },
      visitante: {
        id: qrCode.visitante.id,
        nomeCompleto: qrCode.visitante.nomeCompleto,
        cpf: qrCode.visitante.cpf,
        rg: qrCode.visitante.rg,
        nomePai: qrCode.visitante.nomePai ?? null,
        nomeMae: qrCode.visitante.nomeMae ?? null,
        dataNascimento: qrCode.visitante.dataNascimento
          ? qrCode.visitante.dataNascimento.toISOString()
          : null,
        bnmpUltimaConsultaEm: qrCode.visitante.bnmpUltimaConsultaEm
          ? qrCode.visitante.bnmpUltimaConsultaEm.toISOString()
          : null,
        antecedentesPdfUrl: qrCode.visitante.antecedentesPdfUrl ?? null,
        antecedentesPdfAtualizadoEm:
          qrCode.visitante.antecedentesPdfAtualizadoEm
            ? qrCode.visitante.antecedentesPdfAtualizadoEm.toISOString()
            : null,
        telefone: telefonePrincipal,
        telefones: qrCode.visitante.telefones,
        email: qrCode.visitante.email,
        urlFoto: qrCode.visitante.fotoUrl,
        statusGeral,
        adolescentesVinculados: qrCode.visitante.adolescentesLink.map(
          (vinculo) => ({
            id: vinculo.adolescente.id,
            nomeCompleto: vinculo.adolescente.nomeCompleto,
            nomeSocial: vinculo.adolescente.nomeSocial,
            statusUnidade: vinculo.adolescente.statusUnidade,
            parentesco: vinculo.parentesco,
            numeroCasa: vinculo.adolescente.alojamentoAtual?.casa?.numero || null,
            faccao: vinculo.adolescente.faccao
              ? {
                  id: vinculo.adolescente.faccao.id,
                  nome: vinculo.adolescente.faccao.nomeFaccao,
                }
              : null,
          })
        ),
        historicoBloqueios: qrCode.visitante.historicoBloqueios.map(
          (bloqueio) => ({
            id: bloqueio.id,
            motivo: bloqueio.motivoBloqueio,
            observacoes: bloqueio.observacoes,
            dataInicio: bloqueio.dataBloqueio.toISOString(),
            dataFim: bloqueio.dataDesbloqueio?.toISOString() || null,
            ativo: !bloqueio.desbloqueado,
            criadoEm: bloqueio.criadoEm.toISOString(),
          })
        ),
      },
      estatisticas: {
        visitasMesAtual,
        limiteVisitasMensal,
        proximoDoLimite: visitasMesAtual >= limiteVisitasMensal - 1,
        limiteExcedido: visitasMesAtual >= limiteVisitasMensal,
      },
      visitasRecentes: visitasRecentes.map((visita) => ({
        id: visita.id,
        dataHoraEntrada: visita.dataHoraEntrada.toISOString(),
        dataHoraSaida: visita.dataHoraSaida?.toISOString() || null,
        periodoAutorizado: visita.periodoAutorizado,
        periodoRealizado: visita.periodoRealizado,
        adolescenteNome: visita.adolescente.nomeCompleto,
      })),
    });
  } catch (error) {
    console.error("Erro ao validar QR Code:", error);
    return NextResponse.json(
      {
        erro: "Erro ao validar QR Code",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
