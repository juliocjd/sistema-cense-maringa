import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_RESULTADOS = 6;

const normalizarTextoBusca = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({
      resultados: { adolescentes: [], comunicados: [] },
    });
  }

  const numeroBusca = Number.parseInt(query, 10);
  const numeroValido = Number.isNaN(numeroBusca) ? null : numeroBusca;
  const termoNormalizado = normalizarTextoBusca(query);

  try {
    const [adolescentes, comunicados] = await Promise.all([
      prisma.adolescente.findMany({
        orderBy: { nomeCompleto: "asc" },
        select: {
          id: true,
          nomeCompleto: true,
          nomeSocial: true,
          fotoUrl: true,
          numeroSms: true,
          numeroInterno: true,
          statusUnidade: true,
          casosInfracionais: {
            where: { status: "ATUAL" },
            take: 1,
            select: {
              numeroProcesso: true,
            },
          },
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
        adolescentes: adolescentes
          .filter((ado) => {
            const nome = normalizarTextoBusca(ado.nomeCompleto);
            const nomeSocial = normalizarTextoBusca(ado.nomeSocial);
            const sms = normalizarTextoBusca(ado.numeroSms);
            const numeroProcesso = normalizarTextoBusca(
              ado.casosInfracionais?.[0]?.numeroProcesso ?? null,
            );
            const numeroInterno =
              ado.numeroInterno !== null && ado.numeroInterno !== undefined
                ? String(ado.numeroInterno)
                : "";

            return (
              nome.includes(termoNormalizado) ||
              nomeSocial.includes(termoNormalizado) ||
              sms.includes(termoNormalizado) ||
              numeroProcesso.includes(termoNormalizado) ||
              numeroInterno.includes(query)
            );
          })
          .slice(0, MAX_RESULTADOS)
          .map((ado) => ({
            id: ado.id,
            nome: ado.nomeCompleto,
            fotoUrl: ado.fotoUrl,
            numeroSms: ado.numeroSms,
            numeroProcesso: ado.casosInfracionais?.[0]?.numeroProcesso ?? null,
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
      { status: 500 },
    );
  }
}

const buildComunicadoWhere = (
  query: string,
  numeroValido: number | null,
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
