import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_RESULTADOS = 6;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({
      resultados: { adolescentes: [], comunicados: [] },
    });
  }

  const numeroBusca = Number.parseInt(query, 10);
  const numeroValido = Number.isNaN(numeroBusca) ? null : numeroBusca;

  try {
    const [adolescentes, comunicados] = await Promise.all([
      prisma.adolescente.findMany({
        where: {
          OR: [
            { nomeCompleto: { contains: query, mode: "insensitive" } },
            { nomeSocial: { contains: query, mode: "insensitive" } },
            { numeroSms: { contains: query } },
            { numeroProcesso: { contains: query, mode: "insensitive" } },
            ...(numeroValido !== null ? [{ numeroInterno: numeroValido }] : []),
          ],
        },
        orderBy: { nomeCompleto: "asc" },
        take: MAX_RESULTADOS,
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
          numeroProcesso: true,
          statusUnidade: true,
          alojamentoAtual: {
            select: {
              numeroAlojamento: true,
              ala: true,
              casa: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.comunicadoInterno.findMany({
        where: buildComunicadoWhere(query, numeroValido),
        orderBy: [{ ano: "desc" }, { numero: "desc" }],
        take: Math.min(5, MAX_RESULTADOS),
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
        },
      }),
    ]);

    return NextResponse.json({
      resultados: {
        adolescentes: adolescentes.map((ado) => ({
          id: ado.id,
          nome: ado.nomeCompleto,
          numeroSms: ado.numeroSms,
          numeroProcesso: ado.numeroProcesso,
          status: ado.statusUnidade,
          alojamento: ado.alojamentoAtual
            ? `${ado.alojamentoAtual.casa?.nome ?? "Casa"} ${
                ado.alojamentoAtual.numeroAlojamento
              }${
                ado.alojamentoAtual.ala
                  ? ` (Ala ${ado.alojamentoAtual.ala})`
                  : ""
              }`
            : null,
        })),
        comunicados: comunicados.map((ci) => ({
          id: ci.id,
          numero: ci.numero,
          ano: ci.ano,
          tipo: ci.tipoCI,
          resumo: ci.resumoCI,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao executar busca rapida:", error);
    return NextResponse.json(
      { erro: "Erro ao executar busca" },
      { status: 500 }
    );
  }
}

const buildComunicadoWhere = (
  query: string,
  numeroValido: number | null
): Prisma.ComunicadoInternoWhereInput => {
  const or: Prisma.ComunicadoInternoWhereInput[] = [
    { resumoCI: { contains: query, mode: "insensitive" } },
    { tipoCI: { contains: query, mode: "insensitive" } },
  ];

  if (numeroValido !== null) {
    or.push({ numero: numeroValido });
    or.push({ ano: numeroValido });
  }

  if (query.includes("/")) {
    const [numeroParte, anoParte] = query.split("/");
    const cond: Prisma.ComunicadoInternoWhereInput = {};
    const numeroSplit = Number.parseInt(numeroParte, 10);
    const anoSplit = Number.parseInt(anoParte, 10);
    if (!Number.isNaN(numeroSplit)) {
      cond.numero = numeroSplit;
    }
    if (!Number.isNaN(anoSplit)) {
      cond.ano = anoSplit;
    }
    if (Object.keys(cond).length > 0) {
      or.push(cond);
    }
  }

  return { OR: or };
};
