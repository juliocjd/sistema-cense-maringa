import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma, AdolescenteHistoricoInfracional } from "@prisma/client";
import type { StatusUnidade } from "@/types";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";
import {
  garantirNumeroInternoDisponivel,
  NumeroInternoIndisponivelError,
} from "@/lib/adolescentes/numeracao";

const historicoRegistroSchema = z
  .array(
    z.object({
      descricao: z
        .string()
        .min(3, "Descrição do histórico deve ter ao menos 3 caracteres"),
      ano: z.union([z.string(), z.number()]).optional().nullable(),
      unidade: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    })
  )
  .optional();

const updateAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres").optional(),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  numeroInterno: z
    .union([
      z
        .number({ invalid_type_error: "Numero interno deve ser numerico" })
        .int("Numero interno deve ser inteiro")
        .min(1, "Numero interno deve estar entre 1 e 86")
        .max(86, "Numero interno deve estar entre 1 e 86"),
      z.null(),
    ])
    .optional(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  dataDesinternacao: z.string().optional().nullable(),
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
  historicoInfracional: historicoRegistroSchema,
  tecnicoReferenciaId: z.string().uuid().optional().nullable(),
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

type HistoricoEntrada = {
  atoInfracionalDescricao: string;
  atoInfracionalAno: number | null;
  atoInfracionalProcesso: string | null;
  atoInfracionalGravidade: boolean;
  atoInfracionalGravidadeObs: string | null;
  unidadeInternacao: string | null;
  ano: number | null;
  observacoes: string | null;
};

const parseHistoricoPayload = (
  registros?: Array<{
    descricao: string;
    ano?: string | number | null;
    unidade?: string | null;
    observacoes?: string | null;
  }>
): HistoricoEntrada[] => {
  if (!registros || registros.length === 0) {
    return [];
  }

  const entradas: HistoricoEntrada[] = [];
  const chaves = new Set<string>();

  registros.forEach((item) => {
    const descricao = sanitizeNullableString(item.descricao) ?? "";
    if (!descricao) {
      return;
    }

    const anoInformado =
      item.ano === null || item.ano === undefined || item.ano === ""
        ? null
        : Number.parseInt(String(item.ano), 10);
    const anoValido =
      anoInformado !== null && !Number.isNaN(anoInformado)
        ? anoInformado
        : null;

    const entrada: HistoricoEntrada = {
      atoInfracionalDescricao: descricao,
      atoInfracionalAno: anoValido,
      atoInfracionalProcesso: null,
      atoInfracionalGravidade: false,
      atoInfracionalGravidadeObs: null,
      unidadeInternacao: sanitizeNullableString(item.unidade ?? undefined) ?? null,
      ano: anoValido,
      observacoes: sanitizeNullableString(item.observacoes ?? undefined) ?? null,
    };

    const chave = buildHistoricoKey(entrada);
    if (chaves.has(chave)) {
      return;
    }

    chaves.add(chave);
    entradas.push(entrada);
  });

  return entradas;
};

const buildHistoricoKey = (entrada: HistoricoEntrada) =>
  [
    entrada.atoInfracionalDescricao.trim().toLowerCase(),
    entrada.atoInfracionalAno ?? "",
    entrada.atoInfracionalProcesso ?? "",
    entrada.unidadeInternacao ?? "",
    entrada.observacoes ?? "",
  ].join("|");

const toHistoricoEntradaFromDb = (
  registro: Pick<
    AdolescenteHistoricoInfracional,
    | "atoInfracionalDescricao"
    | "atoInfracionalAno"
    | "atoInfracionalProcesso"
    | "atoInfracionalGravidade"
    | "atoInfracionalGravidadeObs"
    | "unidadeInternacao"
    | "ano"
    | "observacoes"
  >
): HistoricoEntrada => ({
  atoInfracionalDescricao: registro.atoInfracionalDescricao,
  atoInfracionalAno: registro.atoInfracionalAno ?? null,
  atoInfracionalProcesso: registro.atoInfracionalProcesso ?? null,
  atoInfracionalGravidade: registro.atoInfracionalGravidade ?? false,
  atoInfracionalGravidadeObs: registro.atoInfracionalGravidadeObs ?? null,
  unidadeInternacao: registro.unidadeInternacao ?? null,
  ano: registro.ano ?? registro.atoInfracionalAno ?? null,
  observacoes: registro.observacoes ?? null,
});

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
    const historicoNovos = parseHistoricoPayload(
      validated.historicoInfracional
    );

    const existente = await prisma.adolescente.findUnique({
      where: { id },
      select: {
        id: true,
        nomeCompleto: true,
        statusUnidade: true,
        numeroInterno: true,
        alojamentoAtualId: true,
        alojamentoAtual: {
          select: {
            casa: {
              select: {
                nome: true,
              },
            },
          },
        },
        atoInfracionalAtual: true,
        atoInfracionalAno: true,
        atoInfracionalProcesso: true,
        atoInfracionalGravidade: true,
        atoInfracionalGravidadeObs: true,
        numeroProcesso: true,
        dataDesinternacao: true,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const data: Prisma.AdolescenteUpdateInput = {};
    const statusAtual = (existente.statusUnidade as StatusUnidade) ?? "ATIVO";
    const novoStatus = (validated.statusUnidade ?? statusAtual) as StatusUnidade;
    const statusMudou =
      validated.statusUnidade !== undefined &&
      validated.statusUnidade !== statusAtual;
    const saiuDeAtivo = statusAtual === "ATIVO" && novoStatus !== "ATIVO";
    const retornandoParaAtivo = novoStatus === "ATIVO" && statusAtual !== "ATIVO";
    const numeroAtual = existente.numeroInterno ?? null;
    const numeroInternoInput = validated.numeroInterno;
    const numeroInternoDesejado =
      numeroInternoInput === undefined
        ? undefined
        : numeroInternoInput === null
        ? null
        : numeroInternoInput;

    if (
      numeroInternoDesejado === null &&
      (novoStatus === "ATIVO" || statusAtual === "ATIVO")
    ) {
      return NextResponse.json(
        {
          erro:
            "Nao e permitido remover o numero interno enquanto o adolescente estiver ATIVO. Informe um novo numero ou altere o status.",
        },
        { status: 400 }
      );
    }

    if (
      numeroInternoDesejado !== undefined &&
      numeroInternoDesejado !== null &&
      novoStatus !== "ATIVO"
    ) {
      return NextResponse.json(
        { erro: "Somente adolescentes ativos podem ter numero interno" },
        { status: 400 }
      );
    }
    if (
      statusMudou &&
      statusAtual === "ATIVO" &&
      novoStatus !== "ATIVO" &&
      validated.dataDesinternacao === undefined
    ) {
      return NextResponse.json(
        {
          erro:
            "Data de desinternacao obrigatoria ao alterar status para inativo",
        },
        { status: 400 }
      );
    }

    let historicoParaRestaurar:
      | {
          atoInfracionalDescricao: string;
          atoInfracionalAno: number | null;
          atoInfracionalProcesso: string | null;
          atoInfracionalGravidade: boolean;
          atoInfracionalGravidadeObs: string | null;
        }
      | null = null;

    if (
      retornandoParaAtivo &&
      statusAtual !== "LIBERADO" &&
      validated.atoInfracionalAtual === undefined
    ) {
      const registro =
        await prisma.adolescenteHistoricoInfracional.findFirst({
          where: { adolescenteId: id },
          orderBy: [
            { ano: "desc" },
            { atoInfracionalAno: "desc" },
            { id: "desc" },
          ],
          select: {
            atoInfracionalDescricao: true,
            atoInfracionalAno: true,
            atoInfracionalProcesso: true,
            atoInfracionalGravidade: true,
            atoInfracionalGravidadeObs: true,
          },
        });

      if (registro) {
        historicoParaRestaurar = registro;
      }
    }

    const deveGerarHistorico =
      saiuDeAtivo && Boolean(existente.atoInfracionalAtual);

    const unidadeHistoricoPadrao =
      existente.alojamentoAtual?.casa?.nome ?? "Cense de Maringa";

    const historicoParaCriar: Prisma.AdolescenteHistoricoInfracionalUncheckedCreateInput | null =
      deveGerarHistorico
        ? {
            adolescenteId: id,
            atoInfracionalDescricao: existente.atoInfracionalAtual ?? "",
            atoInfracionalAno: existente.atoInfracionalAno,
            atoInfracionalProcesso:
              existente.atoInfracionalProcesso ?? existente.numeroProcesso ?? null,
            atoInfracionalGravidade: existente.atoInfracionalGravidade ?? false,
            atoInfracionalGravidadeObs:
              existente.atoInfracionalGravidadeObs ?? null,
            unidadeInternacao: unidadeHistoricoPadrao,
            ano: existente.atoInfracionalAno ?? new Date().getFullYear(),
            observacoes: `Status alterado de ${statusAtual} para ${novoStatus}`,
          }
        : null;
    const camposAlterados: string[] = [];
    let numeroInternoParaSalvar: number | null | undefined = undefined;
    let deveValidarNumeroInterno = false;

    if (novoStatus === "ATIVO") {
      let alvo =
        numeroInternoDesejado !== undefined
          ? numeroInternoDesejado
          : numeroAtual;
      if (alvo === null || alvo === undefined) {
        return NextResponse.json(
          {
            erro:
              "Informe o numero interno (1 a 86) para adolescentes com status ATIVO.",
          },
          { status: 400 }
        );
      }
      numeroInternoParaSalvar = alvo;
      if (alvo !== numeroAtual) {
        deveValidarNumeroInterno = true;
        camposAlterados.push("numeroInterno");
      }
    } else {
      if (numeroAtual !== null || numeroInternoDesejado !== undefined) {
        numeroInternoParaSalvar = null;
        camposAlterados.push("numeroInterno");
      }
    }

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

    if (novoStatus !== "ATIVO" && existente.alojamentoAtualId) {
      data.alojamentoAtual = { disconnect: true };
      camposAlterados.push("alojamentoAtualId");
    }

    if (validated.dataDesinternacao !== undefined) {
      const dataStatus = toDateOrNull(validated.dataDesinternacao);
      data.dataDesinternacao =
        novoStatus === "ATIVO"
          ? null
          : dataStatus ?? existente.dataDesinternacao ?? new Date();
      camposAlterados.push("dataDesinternacao");
    } else if (statusMudou) {
      if (novoStatus === "ATIVO") {
        data.dataDesinternacao = null;
        camposAlterados.push("dataDesinternacao");
      } else if (statusAtual === "ATIVO" && !existente.dataDesinternacao) {
        data.dataDesinternacao = new Date();
        camposAlterados.push("dataDesinternacao");
      }
    }

    if (historicoParaRestaurar) {
      if (validated.atoInfracionalAtual === undefined) {
        data.atoInfracionalAtual = historicoParaRestaurar.atoInfracionalDescricao;
        camposAlterados.push("atoInfracionalAtual");
      }
      if (validated.atoInfracionalAno === undefined) {
        data.atoInfracionalAno = historicoParaRestaurar.atoInfracionalAno ?? null;
        camposAlterados.push("atoInfracionalAno");
      }
      if (validated.atoInfracionalProcesso === undefined) {
        data.atoInfracionalProcesso =
          historicoParaRestaurar.atoInfracionalProcesso ?? null;
        camposAlterados.push("atoInfracionalProcesso");
      }
      if (validated.atoInfracionalGravidade === undefined) {
        data.atoInfracionalGravidade =
          historicoParaRestaurar.atoInfracionalGravidade ?? false;
        camposAlterados.push("atoInfracionalGravidade");
      }
      if (validated.atoInfracionalGravidadeObs === undefined) {
        data.atoInfracionalGravidadeObs =
          historicoParaRestaurar.atoInfracionalGravidadeObs ?? null;
        camposAlterados.push("atoInfracionalGravidadeObs");
      }
      if (
        validated.numeroProcesso === undefined &&
        historicoParaRestaurar.atoInfracionalProcesso
      ) {
        data.numeroProcesso = historicoParaRestaurar.atoInfracionalProcesso;
        camposAlterados.push("numeroProcesso");
      }
    }

    if (historicoParaCriar) {
      data.atoInfracionalAtual = null;
      data.atoInfracionalAno = null;
      data.atoInfracionalProcesso = null;
      data.atoInfracionalGravidade = false;
      data.atoInfracionalGravidadeObs = null;
      camposAlterados.push(
        "atoInfracionalAtual",
        "atoInfracionalAno",
        "atoInfracionalProcesso",
        "atoInfracionalGravidade",
        "atoInfracionalGravidadeObs"
      );
      if (validated.numeroProcesso === undefined) {
        data.numeroProcesso = null;
        camposAlterados.push("numeroProcesso");
      }
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

    if (validated.tecnicoReferenciaId !== undefined) {
      data.tecnicoReferencia = validated.tecnicoReferenciaId
        ? { connect: { id: validated.tecnicoReferenciaId } }
        : { disconnect: true };
      camposAlterados.push("tecnicoReferenciaId");
    }

    if (validated.dataNascimento !== undefined) {
      data.dataNascimento = toDateOrNull(validated.dataNascimento);
      camposAlterados.push("dataNascimento");
    }

    if (validated.dataEntrada !== undefined) {
      data.dataEntrada = toDateOrNull(validated.dataEntrada);
      camposAlterados.push("dataEntrada");
    }

    if (numeroInternoParaSalvar !== undefined) {
      data.numeroInterno = numeroInternoParaSalvar;
    }

    if (historicoNovos.length > 0) {
      camposAlterados.push("historicoInfracional");
    }

    if (camposAlterados.length === 0) {
      return NextResponse.json(
        { mensagem: "Nenhuma alteracao aplicada" },
        { status: 200 }
      );
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      if (
        novoStatus === "ATIVO" &&
        numeroInternoParaSalvar !== undefined &&
        numeroInternoParaSalvar !== null &&
        (deveValidarNumeroInterno || numeroAtual === null)
      ) {
        await garantirNumeroInternoDisponivel(
          tx,
          numeroInternoParaSalvar,
          id
        );
      }

      const registro = await tx.adolescente.update({
        where: { id },
        data,
        include: INCLUDE_ADOLESCENTE_DEFAULT,
      });

      const historicoExistentes =
        await tx.adolescenteHistoricoInfracional.findMany({
          where: { adolescenteId: id },
          select: {
            atoInfracionalDescricao: true,
            atoInfracionalAno: true,
            atoInfracionalProcesso: true,
            atoInfracionalGravidade: true,
            atoInfracionalGravidadeObs: true,
            unidadeInternacao: true,
            ano: true,
            observacoes: true,
          },
        });

      const historicoChaves = new Set(
        historicoExistentes.map((registroExistente) =>
          buildHistoricoKey(toHistoricoEntradaFromDb(registroExistente))
        )
      );

      const registrarEntrada = async (entrada: HistoricoEntrada) => {
        const chave = buildHistoricoKey(entrada);
        if (historicoChaves.has(chave)) {
          return;
        }
        await tx.adolescenteHistoricoInfracional.create({
          data: {
            adolescenteId: id,
            ...entrada,
          },
        });
        historicoChaves.add(chave);
      };

      if (historicoParaCriar) {
        await registrarEntrada({
          atoInfracionalDescricao: historicoParaCriar.atoInfracionalDescricao,
          atoInfracionalAno:
            historicoParaCriar.atoInfracionalAno ?? historicoParaCriar.ano ?? null,
          atoInfracionalProcesso:
            historicoParaCriar.atoInfracionalProcesso ?? null,
          atoInfracionalGravidade:
            historicoParaCriar.atoInfracionalGravidade ?? false,
          atoInfracionalGravidadeObs:
            historicoParaCriar.atoInfracionalGravidadeObs ?? null,
          unidadeInternacao: historicoParaCriar.unidadeInternacao ?? null,
          ano: historicoParaCriar.ano ?? historicoParaCriar.atoInfracionalAno ?? null,
          observacoes: historicoParaCriar.observacoes ?? null,
        });
      }

      for (const entrada of historicoNovos) {
        await registrarEntrada(entrada);
      }

      return registro;
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
    if (error instanceof NumeroInternoIndisponivelError) {
      return NextResponse.json(
        {
          erro: `Numero interno ${error.numero} indisponivel. Atualmente atribuido a ${error.titular}.`,
        },
        { status: 409 }
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
