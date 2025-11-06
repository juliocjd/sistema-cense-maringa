import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import {
  mapVisitanteDetalhado,
  type VisitanteComRelacoes,
} from "@/lib/visitantes/mappers";

const vinculoSchema = z.object({
  adolescenteId: z.string().uuid("adolescenteId invalido"),
  parentesco: z.string().min(2).max(100).optional().nullable(),
  autorizado: z.boolean().optional(),
  observacoes: z.string().max(500).optional().nullable(),
});

const updateVisitanteSchema = z
  .object({
    nomeCompleto: z
      .string()
      .min(3, "Nome completo deve ter no minimo 3 caracteres")
      .optional(),
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
  })
  .refine(
    (value) =>
      value.nomeCompleto !== undefined ||
      value.cpf !== undefined ||
      value.dataNascimento !== undefined ||
      value.enderecoCompleto !== undefined ||
      value.telefones !== undefined ||
      value.fotoUrl !== undefined ||
      value.vinculos !== undefined,
    { message: "Nenhum campo informado para atualizar." }
  );

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

const buildVisitaInclude = (take: number) => ({
  orderBy: { dataHoraEntrada: "desc" as const },
  take,
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

const ensureAdolescentesExistem = async (ids: string[]) => {
  if (ids.length === 0) return;

  const encontrados = await prisma.adolescente.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  const existenteSet = new Set(encontrados.map((item) => item.id));
  const ausentes = ids.filter((id) => !existenteSet.has(id));
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

const fetchVisitanteDetalhado = async (id: string, takeVisitas = 20) => {
  return prisma.visitante.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          adolescentesLink: true,
          visitasRegistro: true,
        },
      },
      adolescentesLink: buildLinkInclude(),
      visitasRegistro: buildVisitaInclude(takeVisitas),
    },
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const visitante = await fetchVisitanteDetalhado(id);

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      mapVisitanteDetalhado(visitante as VisitanteComRelacoes, {
        incluirVinculos: true,
        incluirVisitas: true,
        limiteVisitas: 20,
      })
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    console.error("Erro ao buscar visitante:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar visitante",
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
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const rawBody = await parseJsonBody(request);
    const body = updateVisitanteSchema.parse(rawBody);

    const telefones =
      body.telefones !== undefined
        ? normalizeTelefones(body.telefones)
        : undefined;
    const cpfNormalizado =
      body.cpf !== undefined ? normalizeCpf(body.cpf ?? null) : undefined;
    const dataNascimento =
      body.dataNascimento !== undefined
        ? body.dataNascimento && body.dataNascimento.trim().length > 0
          ? new Date(body.dataNascimento)
          : null
        : undefined;

    const vinculos = body.vinculos;
    if (vinculos) {
      await ensureAdolescentesExistem(vinculos.map((v) => v.adolescenteId));
    }

    const visitanteAtualizado = await prisma.$transaction(async (tx) => {
      const existente = await tx.visitante.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existente) {
        throw new NextResponse(
          JSON.stringify({ erro: "Visitante nao encontrado" }),
          { status: 404 }
        );
      }

      const data: Prisma.VisitanteUpdateInput = {};

      if (body.nomeCompleto !== undefined) {
        data.nomeCompleto = body.nomeCompleto.trim();
      }
      if (body.enderecoCompleto !== undefined) {
        data.enderecoCompleto =
          body.enderecoCompleto?.trim() !== ""
            ? body.enderecoCompleto?.trim() ?? null
            : null;
      }
      if (telefones !== undefined) {
        data.telefones = telefones;
      }
      if (body.fotoUrl !== undefined) {
        data.fotoUrl = body.fotoUrl ?? null;
      }
      if (cpfNormalizado !== undefined) {
        data.cpf = cpfNormalizado;
      }
      if (dataNascimento !== undefined) {
        data.dataNascimento = dataNascimento;
      }

      if (Object.keys(data).length > 0) {
        await tx.visitante.update({
          where: { id },
          data,
        });
      }

      if (vinculos) {
        const existentes = await tx.adolescenteVisitanteLink.findMany({
          where: { visitanteId: id },
        });

        const existentesPorAdolescente = new Map<string, string>();

        existentes.forEach((item) => {
          existentesPorAdolescente.set(item.adolescenteId, item.id);
        });

        const incomingSet = new Set(vinculos.map((item) => item.adolescenteId));

        for (const atual of existentes) {
          if (!incomingSet.has(atual.adolescenteId)) {
            await tx.adolescenteVisitanteLink.delete({
              where: { id: atual.id },
            });
          }
        }

        for (const vinculo of vinculos) {
          const existenteId = existentesPorAdolescente.get(
            vinculo.adolescenteId
          );
          if (existenteId) {
            await tx.adolescenteVisitanteLink.update({
              where: { id: existenteId },
              data: {
                parentesco: vinculo.parentesco?.trim() ?? null,
                autorizado:
                  vinculo.autorizado === undefined
                    ? true
                    : vinculo.autorizado,
                observacoes: vinculo.observacoes?.trim() ?? null,
              },
            });
          } else {
            await tx.adolescenteVisitanteLink.create({
              data: {
                visitanteId: id,
                adolescenteId: vinculo.adolescenteId,
                parentesco: vinculo.parentesco?.trim() ?? null,
                autorizado:
                  vinculo.autorizado === undefined
                    ? true
                    : vinculo.autorizado,
                observacoes: vinculo.observacoes?.trim() ?? null,
              },
            });
          }
        }
      }

      const visitanteFinal = await fetchVisitanteDetalhado(id);

      if (!visitanteFinal) {
        throw new NextResponse(
          JSON.stringify({ erro: "Visitante nao encontrado apos atualizar" }),
          { status: 404 }
        );
      }

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITANTE_ATUALIZAR",
          tabelaAfetada: "visitantes",
          registroIdAfetado: visitanteFinal.id,
          detalhesAlteracao: {
            cpfAlterado: body.cpf !== undefined,
            telefonesAlterados: body.telefones !== undefined,
            totalVinculos: visitanteFinal._count.adolescentesLink,
          },
          ipOrigem: ip,
        },
      });

      return visitanteFinal;
    });

    return NextResponse.json(
      mapVisitanteDetalhado(visitanteAtualizado as VisitanteComRelacoes, {
        incluirVinculos: true,
        incluirVisitas: true,
        limiteVisitas: 20,
      })
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

    console.error("Erro ao atualizar visitante:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar visitante",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const visitante = await prisma.visitante.findUnique({
      where: { id },
      select: {
        id: true,
        nomeCompleto: true,
      },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }

    const visitasEmAberto = await prisma.visitaRegistro.count({
      where: { visitanteId: id, dataHoraSaida: null },
    });

    if (visitasEmAberto > 0) {
      return NextResponse.json(
        {
          erro: "Existem visitas em aberto para este visitante",
          visitasEmAberto,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.adolescenteVisitanteLink.deleteMany({
        where: { visitanteId: id },
      });
      await tx.visitaRegistro.deleteMany({
        where: { visitanteId: id },
      });
      await tx.visitante.delete({
        where: { id },
      });
      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITANTE_REMOVER",
          tabelaAfetada: "visitantes",
          registroIdAfetado: id,
          detalhesAlteracao: {
            nomeCompleto: visitante.nomeCompleto,
          },
          ipOrigem: ip,
        },
      });
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Visitante removido com sucesso",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao remover visitante:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover visitante",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
