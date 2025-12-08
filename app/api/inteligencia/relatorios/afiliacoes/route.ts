import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RelatorioTipo = "REGIAO" | "FACCAO";
type RelatorioStatusFiltro = "ATIVOS" | "INATIVOS" | "OUTROS" | "TODOS";

const isTipoValido = (valor: string | null): valor is RelatorioTipo =>
  valor === "REGIAO" || valor === "FACCAO";

const isStatusFiltroValido = (
  valor: string | null
): valor is RelatorioStatusFiltro =>
  valor === "ATIVOS" ||
  valor === "INATIVOS" ||
  valor === "OUTROS" ||
  valor === "TODOS";

const selecionarAlojamento = {
  id: true,
  numeroAlojamento: true,
  ala: true,
  casa: {
    select: {
      nome: true,
      numero: true,
    },
  },
} as const;

const selecionarAdolescente = {
  id: true,
  nomeCompleto: true,
  numeroSms: true,
  statusUnidade: true,
  alojamentoAtual: {
    select: selecionarAlojamento,
  },
} as const;

const formatarAlojamento = (
  data?:
    | {
        numeroAlojamento?: string | null;
        ala?: string | null;
        casa?: { nome?: string | null; numero?: number | null } | null;
      }
    | null
) => {
  if (!data) return undefined;
  const partes: string[] = [];
  if (data.casa?.nome) {
    partes.push(data.casa.nome);
  } else if (data.casa?.numero) {
    partes.push(`Casa ${data.casa.numero}`);
  }
  if (data.numeroAlojamento) {
    partes.push(`Aloj. ${data.numeroAlojamento}`);
  }
  if (data.ala) {
    partes.push(`Ala ${data.ala}`);
  }
  return partes.length > 0 ? partes.join(" - ") : undefined;
};

const mapearAdolescente = (registro: {
  id: string;
  nomeCompleto: string;
  numeroSms: string | null;
  statusUnidade: string | null;
  alojamentoAtual: {
    numeroAlojamento?: string | null;
    ala?: string | null;
    casa?: { nome?: string | null; numero?: number | null } | null;
  } | null;
}) => ({
  id: registro.id,
  nome: registro.nomeCompleto,
  numeroSms: registro.numeroSms ?? undefined,
  statusUnidade: registro.statusUnidade ?? undefined,
  alojamento: formatarAlojamento(registro.alojamentoAtual),
});

const STATUS_BASE_ATIVOS = ["ATIVO"];
const STATUS_BASE_INATIVOS = ["LIBERADO", "TRANSFERIDO"];
const STATUS_KNOWN = [...STATUS_BASE_ATIVOS, ...STATUS_BASE_INATIVOS];

const montarFiltroStatus = (
  filtro: RelatorioStatusFiltro
): Prisma.AdolescenteWhereInput | undefined => {
  switch (filtro) {
    case "ATIVOS":
      return { statusUnidade: { in: STATUS_BASE_ATIVOS } };
    case "INATIVOS":
      return {
        statusUnidade: { in: STATUS_BASE_INATIVOS },
      };
    case "OUTROS":
      return {
        statusUnidade: { notIn: STATUS_KNOWN },
      };
    default:
      return undefined;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoRaw = searchParams.get("tipo");
    const tipoSelecionado = tipoRaw ? tipoRaw.toUpperCase() : null;
    const statusRaw = searchParams.get("status");
    const statusSelecionado = statusRaw
      ? statusRaw.toUpperCase()
      : ("ATIVOS" as RelatorioStatusFiltro);

    if (!isTipoValido(tipoSelecionado)) {
      return NextResponse.json(
        {
          erro:
            "Informe o tipo do relatório usando ?tipo=REGIAO ou ?tipo=FACCAO",
        },
        { status: 400 }
      );
    }

    if (!isStatusFiltroValido(statusSelecionado)) {
      return NextResponse.json(
        {
          erro:
            "Informe o status usando ?status=ATIVOS|INATIVOS|OUTROS|TODOS",
        },
        { status: 400 }
      );
    }

    const filtroStatus = montarFiltroStatus(statusSelecionado);

    if (tipoSelecionado === "FACCAO") {
      const faccoes = await prisma.faccao.findMany({
        orderBy: { nomeFaccao: "asc" },
        select: {
          id: true,
          nomeFaccao: true,
          descricao: true,
          adolescentes: {
            ...(filtroStatus ? { where: filtroStatus } : {}),
            orderBy: { nomeCompleto: "asc" },
            select: selecionarAdolescente,
          },
        },
      });

      const grupos = faccoes.map((faccao) => ({
        id: faccao.id,
        nome: faccao.nomeFaccao,
        descricao: faccao.descricao,
        total: faccao.adolescentes.length,
        adolescentes: faccao.adolescentes.map(mapearAdolescente),
      }));

      return NextResponse.json({
        tipo: tipoSelecionado,
        statusFiltro: statusSelecionado,
        grupos,
      });
    }

    const bairros = await prisma.bairro.findMany({
      orderBy: [{ cidade: "asc" }, { nomeBairro: "asc" }],
      select: {
        id: true,
        nomeBairro: true,
        cidade: true,
        adolescentes: {
          ...(filtroStatus ? { where: filtroStatus } : {}),
          orderBy: { nomeCompleto: "asc" },
          select: selecionarAdolescente,
        },
      },
    });

    const grupos = bairros.map((bairro) => ({
      id: bairro.id,
      nome: bairro.nomeBairro,
      cidade: bairro.cidade,
      total: bairro.adolescentes.length,
      adolescentes: bairro.adolescentes.map(mapearAdolescente),
    }));

    return NextResponse.json({
      tipo: tipoSelecionado,
      statusFiltro: statusSelecionado,
      grupos,
    });
  } catch (error) {
    console.error(
      "Erro ao gerar relatório de afiliações:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { erro: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
