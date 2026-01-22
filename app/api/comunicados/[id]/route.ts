import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const parseAdolescentesIds = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    return valor
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      // Mantém valor simples
    }
    return [trimmed];
  }

  return [];
};

/**
 * GET /api/comunicados/[id]
 * Detalhes completos de um comunicado interno
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let removerConflitos = true;
    let removerAlertas = true;

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        if (typeof (body as any).removerConflitos === "boolean") {
          removerConflitos = (body as any).removerConflitos;
        }
        if (typeof (body as any).removerAlertas === "boolean") {
          removerAlertas = (body as any).removerAlertas;
        }
      }
    }

    const ci = await prisma.comunicadoInterno.findUnique({
      where: { id },
      include: {
        adolescentes: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                nomeSocial: true,
                numeroSms: true,
                fotoUrl: true,
                statusUnidade: true,
                alojamentoAtual: {
                  select: {
                    id: true,
                    numeroAlojamento: true,
                    ala: true,
                    casa: {
                      select: {
                        id: true,
                        nome: true,
                        numero: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        conflitos: {
          include: {
            adolescenteA: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            adolescenteB: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
        alertasAtivos: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
      },
    });

    const conflitosPorOcorrencia = await prisma.conflitoOcorrencia.findMany({
      where: { ciId: id },
      include: {
        conflito: {
          select: {
            id: true,
            adolescenteA: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            adolescenteB: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            tipoConflito: true,
            status: true,
            descricao: true,
            criadoEm: true,
            resolvidoEm: true,
          },
        },
      },
    });

    // Também localizar conflitos ativos existentes entre os mesmos lados do CI (mesmo que a ocorrência não tenha sido registrada)
    if (!ci) {
      return NextResponse.json(
        { erro: "Comunicado n\u00e3o encontrado" },
        { status: 404 }
      );
    }

    const lado1Ids = ci.adolescentes
      .filter((a) => a.ladoConflito === "LADO_1")
      .map((a) => a.adolescenteId);
    const lado2Ids = ci.adolescentes
      .filter((a) => a.ladoConflito === "LADO_2")
      .map((a) => a.adolescenteId);
    const paresLados =
      lado1Ids.length && lado2Ids.length
        ? lado1Ids.flatMap((aId) =>
            lado2Ids.map((bId) => ({
              aId,
              bId,
            }))
          )
        : [];
    const paresFallback =
      paresLados.length === 0 && ci.adolescentes.length >= 2
        ? [
            {
              aId: ci.adolescentes[0].adolescenteId,
              bId: ci.adolescentes[1].adolescenteId,
            },
          ]
        : [];
    const paresParaBuscar = paresLados.length ? paresLados : paresFallback;

    let conflitosPorPar: {
      id: string;
      adolescenteA: { id: string; nomeCompleto: string; numeroSms: string | null } | null;
      adolescenteB: { id: string; nomeCompleto: string; numeroSms: string | null } | null;
      tipoConflito: string | null;
      status: string;
      descricao: string | null;
      criadoEm: Date;
      resolvidoEm: Date | null;
    }[] = [];

    if (paresParaBuscar.length) {
      const conditions = paresParaBuscar.map(({ aId, bId }) => ({
        OR: [
          { AND: [{ adolescenteAId: aId }, { adolescenteBId: bId }] },
          { AND: [{ adolescenteAId: bId }, { adolescenteBId: aId }] },
        ],
      }));

      conflitosPorPar = await prisma.conflito.findMany({
        where: {
          status: "ATIVO",
          OR: conditions,
        },
        select: {
          id: true,
          adolescenteA: {
            select: { id: true, nomeCompleto: true, numeroSms: true },
          },
          adolescenteB: {
            select: { id: true, nomeCompleto: true, numeroSms: true },
          },
          tipoConflito: true,
          status: true,
          descricao: true,
          criadoEm: true,
          resolvidoEm: true,
        },
      });
    }

    if (!ci) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    // Formatar resposta
    const operador =
      ci.operadorId
        ? await prisma.operador.findUnique({
            where: { id: ci.operadorId },
            select: { id: true, nomeCompleto: true },
          })
        : null;

    // Conflitos gerados ou já existentes que receberam ocorrência deste CI
    const conflitosGeradosMap = new Map<string, any>();
    ci.conflitos.forEach((conflito) => {
      conflitosGeradosMap.set(conflito.id, conflito);
    });
    conflitosPorOcorrencia.forEach((oc) => {
      if (oc.conflito) {
        conflitosGeradosMap.set(oc.conflito.id, oc.conflito);
      }
    });
    conflitosPorPar.forEach((conf) => {
      conflitosGeradosMap.set(conf.id, conf);
    });

    const conflitosCompletos = Array.from(conflitosGeradosMap.values()).map(
      (conflito) => ({
        id: conflito.id,
        adolescenteA: conflito.adolescenteA,
        adolescenteB: conflito.adolescenteB,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: conflito.criadoEm
          ? new Date(conflito.criadoEm).toISOString()
          : null,
        resolvidoEm: conflito.resolvidoEm
          ? new Date(conflito.resolvidoEm).toISOString()
          : null,
      })
    );

    const ciFormatado = {
      id: ci.id,
      numero: ci.numero,
      ano: ci.ano,
      dataFato: ci.dataFato.toISOString().split("T")[0],
      tipoCi: ci.tipoCI,
      resumoCi: ci.resumoCI,
      caminhoPdf: ci.caminhoPdf,
      operador: operador
        ? { id: operador.id, nome: operador.nomeCompleto }
        : null,
      criadoEm: ci.criadoEm.toISOString(),
      adolescentes: ci.adolescentes.map((link) => ({
        ...link.adolescente,
        ladoConflito: link.ladoConflito,
      })),
      conflitos: conflitosCompletos,
      conflitosGerados: conflitosCompletos,
      alertas: ci.alertasAtivos.map((alerta) => ({
        id: alerta.id,
        adolescente: alerta.adolescente,
        tipoAlerta: alerta.tipoAlerta,
        descricaoAlerta: alerta.descricaoAlerta,
        nivelRisco: alerta.nivelRisco,
        criadoEm: alerta.criadoEm.toISOString(),
        desativadoEm: alerta.desativadoEm?.toISOString() || null,
      })),
    };

    return NextResponse.json(ciFormatado);
  } catch (error) {
    console.error("Erro ao buscar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar comunicado" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/comunicados/[id]
 * Atualiza um comunicado interno
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar se CI existe
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: { id },
    });

    if (!ciExistente) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    const dataAtualizacao: Record<string, unknown> = {};

    const lado1Ids = parseAdolescentesIds(
      (body?.ladoAIds ?? body?.lado1Ids) ?? null
    );
    const lado2Ids = parseAdolescentesIds(
      (body?.ladoBIds ?? body?.lado2Ids) ?? null
    );
    const ladoConflitoMap = new Map<string, "LADO_1" | "LADO_2">();
    lado1Ids.forEach((id) => ladoConflitoMap.set(id, "LADO_1"));
    lado2Ids.forEach((id) => ladoConflitoMap.set(id, "LADO_2"));

    if (body.numero !== undefined) {
      const numeroInt = parseInt(String(body.numero), 10);
      if (!Number.isFinite(numeroInt) || numeroInt <= 0) {
        return NextResponse.json(
          { erro: "Número inválido para o CI" },
          { status: 400 }
        );
      }
      dataAtualizacao.numero = numeroInt;
    }

    if (body.ano !== undefined) {
      const anoInt = parseInt(String(body.ano), 10);
      if (!Number.isFinite(anoInt) || anoInt < 2000) {
        return NextResponse.json(
          { erro: "Ano inválido para o CI" },
          { status: 400 }
        );
      }
      dataAtualizacao.ano = anoInt;
    }

    if (body.dataFato !== undefined) {
      const data = new Date(body.dataFato);
      if (Number.isNaN(data.getTime())) {
        return NextResponse.json(
          { erro: "Data do fato inválida" },
          { status: 400 }
        );
      }
      dataAtualizacao.dataFato = data;
    }

    if (body.tipoCI !== undefined) {
      if (typeof body.tipoCI !== "string" || body.tipoCI.trim().length === 0) {
        return NextResponse.json(
          { erro: "Tipo de CI inválido" },
          { status: 400 }
        );
      }
      dataAtualizacao.tipoCI = body.tipoCI.trim().toUpperCase();
    }

    if (body.resumoCI !== undefined) {
      const resumo = String(body.resumoCI).trim();
      if (!resumo) {
        return NextResponse.json(
          { erro: "Resumo do CI não pode ficar vazio" },
          { status: 400 }
        );
      }
      dataAtualizacao.resumoCI = resumo;
    }

    if (body.caminhoPdf !== undefined) {
      dataAtualizacao.caminhoPdf =
        body.caminhoPdf && String(body.caminhoPdf).trim().length > 0
          ? String(body.caminhoPdf).trim()
          : null;
    }

    const adolescentesIdsRaw =
      body.adolescentesIds !== undefined
        ? body.adolescentesIds
        : body.adolescentes !== undefined
        ? body.adolescentes
        : undefined;

    let adolescentesIdsArray: string[] | undefined;
    if (adolescentesIdsRaw !== undefined) {
      adolescentesIdsArray = parseAdolescentesIds(adolescentesIdsRaw);
      if (adolescentesIdsArray.length === 0) {
        return NextResponse.json(
          { erro: "Pelo menos um adolescente deve ser vinculado" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(dataAtualizacao).length === 0) {
      return NextResponse.json(
        { erro: "Nenhum dado válido enviado para atualização" },
        { status: 400 }
      );
    }

    const numeroFinal =
      (dataAtualizacao.numero as number | undefined) ?? ciExistente.numero;
    const anoFinal =
      (dataAtualizacao.ano as number | undefined) ?? ciExistente.ano;
    const tipoFinal =
      (dataAtualizacao.tipoCI as string | undefined) ?? ciExistente.tipoCI;

    if (
      numeroFinal !== ciExistente.numero ||
      anoFinal !== ciExistente.ano
    ) {
      const ciDuplicado = await prisma.comunicadoInterno.findUnique({
        where: {
          numero_ano: {
            numero: numeroFinal,
            ano: anoFinal,
          },
        },
      });

      if (ciDuplicado && ciDuplicado.id !== id) {
        return NextResponse.json(
          { erro: `Já existe um CI ${numeroFinal}/${anoFinal}` },
          { status: 400 }
        );
      }
    }

    const ciAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.comunicadoInterno.update({
        where: { id },
        data: dataAtualizacao,
      });

      if (adolescentesIdsArray) {
        const vinculados = await tx.comunicadoInternoAdolescente.findMany({
          where: { ciId: id },
          select: { adolescenteId: true, ladoConflito: true },
        });
        const existentesSet = new Set(
          vinculados.map((item) => item.adolescenteId)
        );
        const novosSet = new Set(adolescentesIdsArray);

        const paraAdicionar = adolescentesIdsArray.filter(
          (adolescenteId) => !existentesSet.has(adolescenteId)
        );
        const paraRemover = vinculados
          .map((item) => item.adolescenteId)
          .filter((adolescenteId) => !novosSet.has(adolescenteId));

        if (paraAdicionar.length > 0) {
          await tx.comunicadoInternoAdolescente.createMany({
            data: paraAdicionar.map((adolescenteId) => ({
              ciId: id,
              adolescenteId,
              ladoConflito:
                tipoFinal === "CONFLITO"
                  ? ladoConflitoMap.get(adolescenteId) ?? null
                  : null,
            })),
          });
        }

        if (paraRemover.length > 0) {
          await tx.comunicadoInternoAdolescente.deleteMany({
            where: {
              ciId: id,
              adolescenteId: { in: paraRemover },
            },
          });
        }
      }

      if (tipoFinal === "CONFLITO" && ladoConflitoMap.size > 0) {
        for (const [adolescenteId, lado] of ladoConflitoMap.entries()) {
          await tx.comunicadoInternoAdolescente.updateMany({
            where: { ciId: id, adolescenteId },
            data: { ladoConflito: lado },
          });
        }
      } else if (tipoFinal !== "CONFLITO") {
        await tx.comunicadoInternoAdolescente.updateMany({
          where: { ciId: id },
          data: { ladoConflito: null },
        });
      }

      return atualizado;
    });

    const resposta = await prisma.comunicadoInterno.findUnique({
      where: { id },
      include: {
        adolescentes: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(resposta ?? ciAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar comunicado" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comunicados/[id]
 * Remove um comunicado interno
 * NOTA: Remove também os conflitos e alertas vinculados (cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let removerConflitos = true;
    let removerAlertas = true;

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        if (typeof (body as any).removerConflitos === "boolean") {
          removerConflitos = (body as any).removerConflitos;
        }
        if (typeof (body as any).removerAlertas === "boolean") {
          removerAlertas = (body as any).removerAlertas;
        }
      }
    }

    // Verificar se CI existe
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: { id },
      include: {
        conflitos: true,
        alertasAtivos: true,
      },
    });

    if (!ciExistente) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    // Deletar em transação
    await prisma.$transaction(async (tx) => {
      // 1. Tratar conflitos vinculados
      if (removerConflitos) {
        await tx.conflito.deleteMany({
          where: { ciOrigemId: id },
        });
      } else {
        await tx.conflito.updateMany({
          where: { ciOrigemId: id },
          data: { ciOrigemId: null },
        });
      }

      // 2. Tratar alertas vinculados
      if (removerAlertas) {
        await tx.alertaAtivo.deleteMany({
          where: { ciOrigemId: id },
        });
      } else {
        await tx.alertaAtivo.updateMany({
          where: { ciOrigemId: id },
          data: { ciOrigemId: null },
        });
      }

      // 3. Deletar vínculos com adolescentes
      await tx.comunicadoInternoAdolescente.deleteMany({
        where: { ciId: id },
      });

      // 4. Deletar CI
      await tx.comunicadoInterno.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      mensagem: "Comunicado removido com sucesso",
      conflitosRemovidos: removerConflitos
        ? ciExistente.conflitos.length
        : 0,
      alertasRemovidos: removerAlertas
        ? ciExistente.alertasAtivos.length
        : 0,
    });
  } catch (error) {
    console.error("Erro ao deletar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao deletar comunicado" },
      { status: 500 }
    );
  }
}
