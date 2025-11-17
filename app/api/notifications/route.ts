import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALERTAS_ESPECIAIS } from "@/lib/alertas/especiais";

const NOTIFICATION_LIMIT = 5;

const TIPOS_CI_CRITICOS = ["RISCO_SUICIDIO", "FUGA", "DISCIPLINAR", "AGRESSAO"];

export async function GET(_request: NextRequest) {
  try {
    const [alertasEspeciais, comunicadosCriticos] = await Promise.all([
      prisma.alertaAtivo.findMany({
        where: {
          desativadoEm: null,
          tipoAlerta: {
            in: Object.values(ALERTAS_ESPECIAIS).map((meta) => meta.tipoAlerta),
          },
        },
        orderBy: { criadoEm: "desc" },
        take: NOTIFICATION_LIMIT,
        include: {
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              statusUnidade: true,
            },
          },
        },
      }),
      prisma.comunicadoInterno.findMany({
        where: {
          tipoCI: { in: TIPOS_CI_CRITICOS },
        },
        orderBy: [{ ano: "desc" }, { numero: "desc" }],
        take: NOTIFICATION_LIMIT,
      }),
    ]);

    return NextResponse.json({
      alertasEspeciais: alertasEspeciais.map((alerta) => ({
        id: alerta.id,
        adolescenteId: alerta.adolescenteId,
        adolescenteNome: alerta.adolescente?.nomeCompleto ?? "Desconhecido",
        status: alerta.adolescente?.statusUnidade ?? null,
        tipoAlerta: alerta.tipoAlerta,
        descricao: alerta.descricaoAlerta,
        criadoEm: alerta.criadoEm,
      })),
      comunicadosCriticos: comunicadosCriticos.map((ci) => ({
        id: ci.id,
        numero: ci.numero,
        ano: ci.ano,
        tipo: ci.tipoCI,
        resumo: ci.resumoCI,
        dataFato: ci.dataFato,
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar notificacoes:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar notificacoes" },
      { status: 500 }
    );
  }
}
