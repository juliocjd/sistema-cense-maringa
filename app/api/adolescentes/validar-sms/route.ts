import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const sanitizeNullableString = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const numeroSms = sanitizeNullableString(searchParams.get("numeroSms"));
    const ignorarId = sanitizeNullableString(searchParams.get("ignorarId"));

    if (!numeroSms) {
      return NextResponse.json(
        { erro: "numeroSms e obrigatorio" },
        { status: 400 }
      );
    }

    const existente = await prisma.adolescente.findFirst({
      where: { numeroSms },
      select: {
        id: true,
        nomeCompleto: true,
        numeroSms: true,
      },
    });

    if (!existente) {
      return NextResponse.json({ existe: false });
    }

    if (ignorarId && existente.id === ignorarId) {
      return NextResponse.json({ existe: false });
    }

    return NextResponse.json({
      existe: true,
      adolescente: existente,
    });
  } catch (error) {
    console.error("Erro ao validar numero SMS:", error);
    return NextResponse.json(
      { erro: "Erro ao validar numero SMS" },
      { status: 500 }
    );
  }
}
