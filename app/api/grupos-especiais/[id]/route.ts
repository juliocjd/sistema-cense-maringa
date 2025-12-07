import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(3).optional(),
  tipo: z.string().optional(),
  descricao: z.string().optional().nullable(),
  casas: z.array(z.string().uuid()).min(1).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grupo = await prisma.grupoEspecial.findUnique({
    where: { id },
    include: {
      casas: { include: { casa: true } },
      membros: {
        where: { dataSaida: null },
        include: { adolescente: true },
      },
    },
  });

  if (!grupo) return NextResponse.json({ erro: "Grupo especial não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: grupo.id,
    nome: grupo.nome,
    tipo: grupo.tipo,
    descricao: grupo.descricao,
    ativo: grupo.ativo,
    casas: grupo.casas.map((item) => ({
      id: item.casa.id,
      nome: item.casa.nome,
      numero: item.casa.numero,
    })),
    membrosAtivos: grupo.membros.length,
    membros: grupo.membros.map((membro) => ({
      adolescenteId: membro.adolescenteId,
      dataEntrada: membro.dataEntrada,
      adolescente: {
        id: membro.adolescente?.id ?? membro.adolescenteId,
        nomeCompleto: membro.adolescente?.nomeCompleto ?? "",
        numeroSms: membro.adolescente?.numeroSms ?? null,
      },
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const payload = await request.json();
    const data = updateSchema.parse(payload);
    await prisma.grupoEspecial.update({
      where: { id },
      data: {
        nome: data.nome ?? undefined,
        tipo: data.tipo ?? undefined,
        descricao: data.descricao ?? undefined,
        casas: data.casas
          ? {
              deleteMany: {},
              create: data.casas.map((casaId) => ({ casaId })),
            }
          : undefined,
      },
    });
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: "Payload inválido", detalhes: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.$transaction([
      prisma.grupoEspecialMembro.deleteMany({ where: { grupoId: id } }),
      prisma.grupoEspecialCasa.deleteMany({ where: { grupoId: id } }),
      prisma.grupoEspecial.delete({ where: { id } }),
    ]);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao excluir grupo especial", error);
    return NextResponse.json({ erro: "Erro ao excluir grupo" }, { status: 500 });
  }
}
