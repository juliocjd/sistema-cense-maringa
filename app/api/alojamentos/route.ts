import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  casa_id: z.string().uuid("Casa ID invalido"),
  numero_alojamento: z.string().min(1, "Numero do alojamento e obrigatorio"),
  ala: z.string().max(2).optional(),
  status_manutencao: z.enum(["LIVRE", "INTERDITADO"]).default("LIVRE"),
  alojamento_frontal_id: z.string().uuid().optional(),
  zona_risco_id: z.string().uuid().optional(),
  localizacao_preferencial: z.boolean().default(false),
});

const documentoTipoEnum = z.enum(["CI", "DECISAO_JUDICIAL", "OUTRO"]);

const updateSchema = z.object({
  statusManutencao: z.enum(["LIVRE", "INTERDITADO"]).optional(),
  localizacaoPreferencial: z.boolean().optional(),
  interdicaoJustificativa: z.string().optional(),
  interdicaoDocumentoTipo: documentoTipoEnum.nullable().optional(),
  interdicaoDocumentoReferencia: z.string().optional(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const casaId = searchParams.get("casa_id");
    const status = searchParams.get("status");
    const somenteLivres = searchParams.get("apenas_livres") === "true";

    const where: Record<string, unknown> = {};

    if (casaId) {
      where.casaId = casaId;
    }

    if (status) {
      where.statusManutencao = status;
    }

    const alojamentos = await prisma.alojamento.findMany({
      where,
      include: {
        casa: true,
        adolescentes: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            alertaRiscoSuicidio: true,
            alertaPerfilMapeado: true,
            alertaSaudeConfidencial: true,
          },
        },
        alojamentoFrontal: {
          select: {
            id: true,
            numeroAlojamento: true,
            ala: true,
          },
        },
      },
      orderBy: [
        { casa: { numero: "asc" } },
        { ala: "asc" },
        { numeroAlojamento: "asc" },
      ],
    });

    const filtrados = somenteLivres
      ? alojamentos.filter(
          (alojamento) =>
            alojamento.statusManutencao === "LIVRE" &&
            alojamento.adolescentes.length === 0
        )
      : alojamentos;

    const resposta = filtrados.map((alojamento) => {
      const ocupante = alojamento.adolescentes[0];
      return {
        id: alojamento.id,
        casa: {
          id: alojamento.casa.id,
          nome: alojamento.casa.nome,
          numero: alojamento.casa.numero,
        },
        numero_alojamento: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        status_manutencao: alojamento.statusManutencao,
        localizacao_preferencial: alojamento.localizacaoPreferencial,
        interdicaoJustificativa: alojamento.interdicaoJustificativa,
        interdicaoDocumentoTipo: alojamento.interdicaoDocumentoTipo,
        interdicaoDocumentoReferencia: alojamento.interdicaoDocumentoReferencia,
        alojamento_frontal: alojamento.alojamentoFrontal
          ? {
              id: alojamento.alojamentoFrontal.id,
              numero: alojamento.alojamentoFrontal.numeroAlojamento,
              ala: alojamento.alojamentoFrontal.ala,
            }
          : null,
        ocupado: Boolean(ocupante),
        ocupante: ocupante
          ? {
              id: ocupante.id,
              nome_completo: ocupante.nomeCompleto,
              nome_social: ocupante.nomeSocial,
              numero_sms: ocupante.numeroSms,
              foto_url: ocupante.fotoUrl,
              alertas: [
                ocupante.alertaRiscoSuicidio ? "risco_suicidio" : null,
                ocupante.alertaPerfilMapeado ? "perfil_mapeado" : null,
                ocupante.alertaSaudeConfidencial ? "saude_confidencial" : null,
              ].filter(Boolean),
            }
          : null,
      };
    });

    return NextResponse.json({
      total: resposta.length,
      alojamentos: resposta,
    });
  } catch (error) {
    console.error("Erro ao buscar alojamentos:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar alojamentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const dados = createSchema.parse(payload);

    const casa = await prisma.casa.findUnique({
      where: { id: dados.casa_id },
    });

    if (!casa) {
      return NextResponse.json(
        { erro: "Casa nao encontrada" },
        { status: 404 }
      );
    }

    const alojamento = await prisma.alojamento.create({
      data: {
        casaId: dados.casa_id,
        numeroAlojamento: dados.numero_alojamento,
        ala: dados.ala ?? null,
        statusManutencao: dados.status_manutencao,
        alojamentoFrontalId: dados.alojamento_frontal_id ?? null,
        zonaRiscoId: dados.zona_risco_id ?? null,
        localizacaoPreferencial: dados.localizacao_preferencial,
      },
      include: {
        casa: true,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "ALOJAMENTO_CRIAR",
        tabelaAfetada: "alojamentos",
        registroIdAfetado: alojamento.id,
        detalhesAlteracao: {
          casa: casa.nome,
          numeroAlojamento: alojamento.numeroAlojamento,
          ala: alojamento.ala,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: alojamento.id,
        casa: alojamento.casa.nome,
        numero_alojamento: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        mensagem: "Alojamento criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar alojamento:", error);
    return NextResponse.json(
      { erro: "Erro ao criar alojamento" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = ensureString(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { erro: "ID do alojamento e obrigatorio" },
        { status: 400 }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const dados = updateSchema.parse(payload);

    const alojamentoAtual = await prisma.alojamento.findUnique({
      where: { id },
    });

    if (!alojamentoAtual) {
      return NextResponse.json(
        { erro: "Alojamento nao encontrado" },
        { status: 404 }
      );
    }

    const formatOptionalString = (valor?: string | null) => {
      if (valor === undefined || valor === null) {
        return valor === null ? null : undefined;
      }
      const trimmed = valor.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const novoStatus =
      dados.statusManutencao ?? alojamentoAtual.statusManutencao;

    const justificativaFinal =
      dados.interdicaoJustificativa !== undefined
        ? formatOptionalString(dados.interdicaoJustificativa)
        : alojamentoAtual.interdicaoJustificativa;

    const documentoTipoFinal =
      dados.interdicaoDocumentoTipo !== undefined
        ? dados.interdicaoDocumentoTipo ?? null
        : alojamentoAtual.interdicaoDocumentoTipo;

    const documentoReferenciaFinal =
      dados.interdicaoDocumentoReferencia !== undefined
        ? formatOptionalString(dados.interdicaoDocumentoReferencia)
        : alojamentoAtual.interdicaoDocumentoReferencia;

    if (
      novoStatus === "INTERDITADO" &&
      (!justificativaFinal ||
        !documentoTipoFinal ||
        !documentoReferenciaFinal)
    ) {
      return NextResponse.json(
        {
          erro:
            "Justificativa, tipo de documento e referencia sao obrigatorios para interditar um alojamento.",
        },
        { status: 400 }
      );
    }

    const updateData: Prisma.AlojamentoUpdateInput = {};

    if (dados.statusManutencao !== undefined) {
      updateData.statusManutencao = dados.statusManutencao;
    }
    if (dados.localizacaoPreferencial !== undefined) {
      updateData.localizacaoPreferencial = dados.localizacaoPreferencial;
    }
    if (dados.interdicaoJustificativa !== undefined) {
      updateData.interdicaoJustificativa = justificativaFinal ?? null;
    }
    if (dados.interdicaoDocumentoTipo !== undefined) {
      updateData.interdicaoDocumentoTipo = documentoTipoFinal ?? null;
    }
    if (dados.interdicaoDocumentoReferencia !== undefined) {
      updateData.interdicaoDocumentoReferencia =
        documentoReferenciaFinal ?? null;
    }

    if (novoStatus === "LIVRE") {
      updateData.interdicaoJustificativa = null;
      updateData.interdicaoDocumentoTipo = null;
      updateData.interdicaoDocumentoReferencia = null;
    }

    const alojamento = await prisma.alojamento.update({
      where: { id },
      data: updateData,
      include: {
        casa: true,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "ALOJAMENTO_ATUALIZAR",
        tabelaAfetada: "alojamentos",
        registroIdAfetado: alojamento.id,
        detalhesAlteracao: dados,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: alojamento.id,
      casa: alojamento.casa.nome,
      numero_alojamento: alojamento.numeroAlojamento,
      status_manutencao: alojamento.statusManutencao,
      localizacao_preferencial: alojamento.localizacaoPreferencial,
      interdicao_justificativa: alojamento.interdicaoJustificativa,
      interdicao_documento_tipo: alojamento.interdicaoDocumentoTipo,
      interdicao_documento_referencia:
        alojamento.interdicaoDocumentoReferencia,
      mensagem: "Alojamento atualizado com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar alojamento:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar alojamento" },
      { status: 500 }
    );
  }
}
