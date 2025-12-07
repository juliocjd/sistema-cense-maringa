import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(3),
  tipo: z.string().optional(),
  descricao: z.string().optional(),
  casas: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id;
    if (!operadorId) {
      return NextResponse.json({ erro: "Operador nao autenticado" }, { status: 401 });
    }

    const payload = await request.json();
    const dados = createSchema.parse(payload);

    const grupo = await prisma.grupoEspecial.create({
      data: {
        nome: dados.nome,
        tipo: dados.tipo ?? "ESPECIAL",
        descricao: dados.descricao,
        operadorId,
        casas: {
          create: dados.casas.map((casaId) => ({ casaId })),
        },
      },
      include: {
        casas: { include: { casa: true } },
      },
    });

    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    console.error("Erro criar grupo especial", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: "Payload invalido", detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { erro: "Erro interno", detalhes: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const grupos = await prisma.grupoEspecial.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      casas: { include: { casa: true } },
      membros: { where: { dataSaida: null } },
    },
  });
  const payload = grupos.map((grupo) => ({
    id: grupo.id,
    nome: grupo.nome,
    tipo: grupo.tipo,
    descricao: grupo.descricao,
    ativo: grupo.ativo,
    criadoEm: grupo.criadoEm,
    casas: grupo.casas.map((item) => ({
      id: item.casa.id,
      nome: item.casa.nome,
      numero: item.casa.numero,
    })),
    membrosAtivos: grupo.membros.length,
  }));
  return NextResponse.json({ total: payload.length, grupos: payload });
}
