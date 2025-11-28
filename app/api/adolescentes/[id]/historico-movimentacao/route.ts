import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: adolescenteId } = await params;
  const { searchParams } = new URL(request.url);
  const take = Math.min(
    Number(searchParams.get("take")) || DEFAULT_PAGE_SIZE,
    100
  );
  const cursor = searchParams.get("cursor");
  const tipo = searchParams.get("tipo");

  try {
    const historico = await prisma.historicoMovimentacao.findMany({
      where: {
        adolescenteId,
        ...(tipo ? { tipo } : {}),
      },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [
        { registradoEm: "desc" },
        { criadoEm: "desc" },
      ],
      select: {
        id: true,
        tipo: true,
        descricao: true,
        registradoEm: true,
        criadoEm: true,
        referenciaTipo: true,
        referenciaId: true,
        origemCasa: {
          select: { id: true, nome: true, numero: true },
        },
        origemAlojamento: {
          select: { id: true, numeroAlojamento: true, ala: true },
        },
        destinoCasa: {
          select: { id: true, nome: true, numero: true },
        },
        destinoAlojamento: {
          select: { id: true, numeroAlojamento: true, ala: true },
        },
        operador: {
          select: { id: true, nomeCompleto: true },
        },
      },
    });

    const nextCursor =
      historico.length === take ? historico[historico.length - 1].id : null;

    return NextResponse.json({
      historico,
      nextCursor,
    });
  } catch (error) {
    console.error("Erro ao listar histórico de movimentação:", error);
    return NextResponse.json(
      { erro: "Não foi possível carregar o histórico" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: adolescenteId } = await params;

  try {
    const body = await request.json();
    const {
      tipo,
      descricao,
      origemCasaId,
      origemAlojamentoId,
      destinoCasaId,
      destinoAlojamentoId,
      referenciaTipo,
      referenciaId,
      operadorId,
      registradoEm,
    } = body;

    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json(
        { erro: "Tipo é obrigatório" },
        { status: 400 }
      );
    }

    const existe = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      select: { id: true },
    });

    if (!existe) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    const registro = await prisma.historicoMovimentacao.create({
      data: {
        adolescenteId,
        tipo,
        descricao,
        origemCasaId,
        origemAlojamentoId,
        destinoCasaId,
        destinoAlojamentoId,
        referenciaTipo,
        referenciaId,
        operadorId,
        registradoEm: registradoEm ? new Date(registradoEm) : new Date(),
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    return NextResponse.json(
      { erro: "Não foi possível registrar a movimentação" },
      { status: 500 }
    );
  }
}
