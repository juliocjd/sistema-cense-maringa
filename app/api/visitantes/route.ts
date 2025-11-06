import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import {
  mapVisitanteBasico,
  mapVisitanteDetalhado,
  type VisitanteComRelacoes,
} from "@/lib/visitantes/mappers";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCpf = (value: string | null | undefined) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits : value.trim();
};

const normalizeTelefones = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return Array.from(new Set(cleaned));
};

const vinculoSchema = z.object({
  adolescenteId: z.string().uuid("adolescenteId invalido"),
  parentesco: z.string().min(2, "Parentesco deve ter ao menos 2 caracteres").max(100).optional().nullable(),
  autorizado: z.boolean().optional(),
  observacoes: z.string().max(500, "Observacoes deve ter no maximo 500 caracteres").optional().nullable(),
});

const createVisitanteSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3, "Nome completo deve ter no minimo 3 caracteres"),
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || /\d/.test(value), {
      message: "CPF deve conter numeros",
    }),
  dataNascimento: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) =>
        !value || !Number.isNaN(Date.parse(value)) || value.trim().length === 0,
      { message: "dataNascimento invalida" }
    ),
  enderecoCompleto: z.string().optional().nullable(),
  telefones: z.array(z.string()).optional(),
  fotoUrl: z
    .string()
    .url("fotoUrl invalida")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  vinculos: z.array(vinculoSchema).optional(),
});

const updateVisitanteSchema = createVisitanteSchema.partial().extend({
  vinculos: z.array(vinculoSchema).optional(),
});

const buildLinkInclude = () => ({
  include: {
    adolescente: {
      select: {
        id: true,
        nomeCompleto: true,
        nomeSocial: true,
        statusUnidade: true,
      },
    },
  },
});

const buildVisitaInclude = (take?: number) => ({
  orderBy: { dataHoraEntrada: "desc" as const },
  ...(take ? { take } : {}),
  include: {
    adolescente: {
      select: {
        id: true,
        nomeCompleto: true,
        nomeSocial: true,
      },
    },
  },
});

const ensureAdolescentesExistem = async (ids: string[]) => {
  if (ids.length === 0) {
    return;
  }

  const encontrados = await prisma.adolescente.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  const encontradosSet = new Set(encontrados.map((item) => item.id));
  const ausentes = ids.filter((id) => !encontradosSet.has(id));

  if (ausentes.length > 0) {
    throw new NextResponse(
      JSON.stringify({
        erro: "Alguns adolescentes nao foram encontrados",
        ausentes,
      }),
      { status: 404 }
    );
  }
};

const parseJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    throw new NextResponse(
      JSON.stringify({ erro: "Payload invalido: esperado JSON" }),
      { status: 400 }
    );
  }
};

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const url = new URL(request.url);
    const { searchParams } = url;

    const busca = normalizeString(searchParams.get("busca"));
    const adolescenteIdParam = normalizeString(
      searchParams.get("adolescente_id")
    );
    const autorizadoParam = searchParams.get("autorizado");
    const detalhes = searchParams.get("detalhes") === "true";
    const incluirVisitas = searchParams.get("incluir_visitas") === "true";
    const limiteVisitas = Math.min(
      Math.max(parseInt(searchParams.get("limite_visitas") ?? "5", 10), 1),
      20
    );

    const limite = Math.min(
      Math.max(parseInt(searchParams.get("limite") ?? "50", 10), 1),
      200
    );

    const where: Prisma.VisitanteWhereInput = {};

    if (busca) {
      where.OR = [
        {
          nomeCompleto: {
            contains: busca,
            mode: "insensitive",
          },
        },
        {
          cpf: {
            contains: busca,
          },
        },
      ];
    }

    const linkFilter: Prisma.AdolescenteVisitanteLinkWhereInput = {};
    if (adolescenteIdParam) {
      linkFilter.adolescenteId = adolescenteIdParam;
    }
    if (autorizadoParam === "true" || autorizadoParam === "false") {
      linkFilter.autorizado = autorizadoParam === "true";
    }
    if (Object.keys(linkFilter).length > 0) {
      where.adolescentesLink = { some: linkFilter };
    }

    const include: Prisma.VisitanteInclude = {
      _count: {
        select: {
          adolescentesLink: true,
          visitasRegistro: true,
        },
      },
    };

    if (detalhes) {
      include.adolescentesLink = buildLinkInclude();
    }

    if (incluirVisitas || detalhes) {
      include.visitasRegistro = buildVisitaInclude(
        incluirVisitas ? limiteVisitas : 5
      );
    }

    const visitantes = await prisma.visitante.findMany({
      where,
      take: limite,
      orderBy: { nomeCompleto: "asc" },
      include,
    });

    const visitantesSerializados = visitantes.map((visitante) => {
      if (detalhes || incluirVisitas) {
        return mapVisitanteDetalhado(
          visitante as VisitanteComRelacoes,
          {
            incluirVinculos: detalhes,
            incluirVisitas: incluirVisitas,
            limiteVisitas: incluirVisitas ? limiteVisitas : 5,
          }
        );
      }

      return mapVisitanteBasico(visitante);
    });

    return NextResponse.json({
      total: visitantesSerializados.length,
      visitantes: visitantesSerializados,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    console.error("Erro ao listar visitantes:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar visitantes",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const rawBody = await parseJsonBody(request);
    const body = createVisitanteSchema.parse(rawBody);

    const telefones = normalizeTelefones(body.telefones);
    const cpfNormalizado = normalizeCpf(body.cpf ?? null);
    const dataNascimento =
      body.dataNascimento && body.dataNascimento.trim().length > 0
        ? new Date(body.dataNascimento)
        : null;

    const vinculos = body.vinculos ?? [];
    await ensureAdolescentesExistem(vinculos.map((v) => v.adolescenteId));

    const visitante = await prisma.$transaction(async (tx) => {
      const novoVisitante = await tx.visitante.create({
        data: {
          nomeCompleto: body.nomeCompleto.trim(),
          cpf: cpfNormalizado,
          dataNascimento,
          enderecoCompleto: body.enderecoCompleto?.trim() ?? null,
          telefones,
          fotoUrl: body.fotoUrl ?? null,
          adolescentesLink: vinculos.length
            ? {
                create: vinculos.map((vinculo) => ({
                  adolescenteId: vinculo.adolescenteId,
                  parentesco: vinculo.parentesco?.trim() ?? null,
                  autorizado:
                    vinculo.autorizado === undefined
                      ? true
                      : vinculo.autorizado,
                  observacoes: vinculo.observacoes?.trim() ?? null,
                })),
              }
            : undefined,
        },
        include: {
          _count: {
            select: {
              adolescentesLink: true,
              visitasRegistro: true,
            },
          },
          adolescentesLink: buildLinkInclude(),
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITANTE_CRIAR",
          tabelaAfetada: "visitantes",
          registroIdAfetado: novoVisitante.id,
          detalhesAlteracao: {
            nomeCompleto: novoVisitante.nomeCompleto,
            cpf: novoVisitante.cpf,
            totalVinculos: novoVisitante._count.adolescentesLink,
          },
          ipOrigem: ip,
        },
      });

      return novoVisitante;
    });

    return NextResponse.json(
      mapVisitanteDetalhado(
        {
          ...visitante,
          visitasRegistro: [],
        } as VisitanteComRelacoes,
        { incluirVinculos: true, incluirVisitas: false }
      ),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { erro: "CPF ja cadastrado para outro visitante" },
        { status: 409 }
      );
    }

    console.error("Erro ao criar visitante:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar visitante",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
