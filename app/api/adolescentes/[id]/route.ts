import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";

const updateAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres").optional(),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  numeroProcesso: z.string().optional().nullable(),
  atoInfracionalAtual: z.string().optional().nullable(),
  atoInfracionalAno: z.number().optional().nullable(),
  atoInfracionalProcesso: z.string().optional().nullable(),
  atoInfracionalGravidade: z.boolean().optional(),
  atoInfracionalGravidadeObs: z.string().optional().nullable(),
  statusUnidade: z.enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"]).optional(),
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoNumeroMembro: z.string().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),
  alertaRiscoSuicidio: z.boolean().optional(),
  alertaPerfilMapeado: z.boolean().optional(),
  alertaSaudeConfidencial: z.boolean().optional(),
  alertaSaudeDetalhes: z.string().optional().nullable(),
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),
});

const sanitizeNullableString = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const nullableStringOrNull = (value: string | null | undefined) => {
  if (value === null) {
    return null;
  }
  const sanitized = sanitizeNullableString(value);
  return sanitized ?? null;
};

const toDateOrNull = (value?: string | null) => {
  if (value === null) {
    return null;
  }
  const sanitized = sanitizeNullableString(value);
  if (!sanitized) {
    return null;
  }
  const parsed = new Date(sanitized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adolescente = await prisma.adolescente.findUnique({
      where: { id },
      include: INCLUDE_ADOLESCENTE_DEFAULT,
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapPrismaAdolescente(adolescente));
  } catch (error) {
    console.error("Erro ao buscar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth().catch((err) => {
      console.error("Erro ao obter sessao:", err);
      return null;
    });
    const operadorId = sanitizeNullableString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operador) {
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
        { erro: "Payload invalido, esperado JSON" },
        { status: 400 }
      );
    }

    const validated = updateAdolescenteSchema.parse(payload);

    const existente = await prisma.adolescente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const data: Prisma.AdolescenteUpdateInput = {};
    const camposAlterados: string[] = [];

    if (validated.nomeCompleto !== undefined) {
      data.nomeCompleto = validated.nomeCompleto.trim();
      camposAlterados.push("nomeCompleto");
    }

    if (validated.nomeSocial !== undefined) {
      data.nomeSocial = nullableStringOrNull(validated.nomeSocial);
      camposAlterados.push("nomeSocial");
    }

    if (validated.fotoUrl !== undefined) {
      data.fotoUrl = nullableStringOrNull(validated.fotoUrl);
      camposAlterados.push("fotoUrl");
    }

    if (validated.numeroSms !== undefined) {
      data.numeroSms = nullableStringOrNull(validated.numeroSms);
      camposAlterados.push("numeroSms");
    }

    if (validated.numeroProcesso !== undefined) {
      data.numeroProcesso = nullableStringOrNull(validated.numeroProcesso);
      camposAlterados.push("numeroProcesso");
    }

    if (validated.atoInfracionalAtual !== undefined) {
      data.atoInfracionalAtual = nullableStringOrNull(
        validated.atoInfracionalAtual
      );
      camposAlterados.push("atoInfracionalAtual");
    }

    if (validated.atoInfracionalAno !== undefined) {
      data.atoInfracionalAno = validated.atoInfracionalAno ?? null;
      camposAlterados.push("atoInfracionalAno");
    }

    if (validated.atoInfracionalProcesso !== undefined) {
      data.atoInfracionalProcesso = nullableStringOrNull(
        validated.atoInfracionalProcesso
      );
      camposAlterados.push("atoInfracionalProcesso");
    }

    if (validated.atoInfracionalGravidade !== undefined) {
      data.atoInfracionalGravidade = validated.atoInfracionalGravidade;
      camposAlterados.push("atoInfracionalGravidade");
    }

    if (validated.atoInfracionalGravidadeObs !== undefined) {
      data.atoInfracionalGravidadeObs = nullableStringOrNull(
        validated.atoInfracionalGravidadeObs
      );
      camposAlterados.push("atoInfracionalGravidadeObs");
    }

    if (validated.statusUnidade !== undefined) {
      data.statusUnidade = validated.statusUnidade;
      camposAlterados.push("statusUnidade");
    }

    if (validated.faccaoGrupoId !== undefined) {
      data.faccao = validated.faccaoGrupoId
        ? { connect: { id: validated.faccaoGrupoId } }
        : { disconnect: true };
      camposAlterados.push("faccaoGrupoId");
    }

    if (validated.faccaoNumeroMembro !== undefined) {
      data.faccaoNumeroMembro =
        sanitizeNullableString(validated.faccaoNumeroMembro) ?? null;
      camposAlterados.push("faccaoNumeroMembro");
    }

    if (validated.bairroOrigemId !== undefined) {
      data.bairroOrigem = validated.bairroOrigemId
        ? { connect: { id: validated.bairroOrigemId } }
        : { disconnect: true };
      camposAlterados.push("bairroOrigemId");
    }

    if (validated.riscoFuga !== undefined) {
      data.riscoFuga = validated.riscoFuga ?? null;
      camposAlterados.push("riscoFuga");
    }

    if (validated.alertaRiscoSuicidio !== undefined) {
      data.alertaRiscoSuicidio = validated.alertaRiscoSuicidio;
      camposAlterados.push("alertaRiscoSuicidio");
    }

    if (validated.alertaPerfilMapeado !== undefined) {
      data.alertaPerfilMapeado = validated.alertaPerfilMapeado;
      camposAlterados.push("alertaPerfilMapeado");
    }

    if (validated.alertaSaudeConfidencial !== undefined) {
      data.alertaSaudeConfidencial = validated.alertaSaudeConfidencial;
      camposAlterados.push("alertaSaudeConfidencial");
    }

    if (validated.alertaSaudeDetalhes !== undefined) {
      data.alertaSaudeDetalhes = nullableStringOrNull(
        validated.alertaSaudeDetalhes
      );
      camposAlterados.push("alertaSaudeDetalhes");
    }

    if (validated.alojamentoAtualId !== undefined) {
      data.alojamentoAtual = validated.alojamentoAtualId
        ? { connect: { id: validated.alojamentoAtualId } }
        : { disconnect: true };
      camposAlterados.push("alojamentoAtualId");
    }

    if (validated.faseInternacaoAtualId !== undefined) {
      data.faseInternacaoAtual = validated.faseInternacaoAtualId
        ? { connect: { id: validated.faseInternacaoAtualId } }
        : { disconnect: true };
      camposAlterados.push("faseInternacaoAtualId");
    }

    if (validated.dataNascimento !== undefined) {
      data.dataNascimento = toDateOrNull(validated.dataNascimento);
      camposAlterados.push("dataNascimento");
    }

    if (validated.dataEntrada !== undefined) {
      data.dataEntrada = toDateOrNull(validated.dataEntrada);
      camposAlterados.push("dataEntrada");
    }

    if (camposAlterados.length === 0) {
      return NextResponse.json(
        { mensagem: "Nenhuma alteracao aplicada" },
        { status: 200 }
      );
    }

    const atualizado = await prisma.adolescente.update({
      where: { id },
      data,
      include: INCLUDE_ADOLESCENTE_DEFAULT,
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "UPDATE",
        tabelaAfetada: "adolescentes",
        registroIdAfetado: atualizado.id,
        detalhesAlteracao: {
          camposAlterados,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({
      mensagem: "Adolescente atualizado com sucesso",
      adolescente: mapPrismaAdolescente(atualizado),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
