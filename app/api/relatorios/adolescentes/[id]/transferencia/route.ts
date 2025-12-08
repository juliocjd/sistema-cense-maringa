import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { carregarRelatorioInternoBase } from "@/lib/relatorios/interno";

const paramsSchema = z.object({
  id: z.string().uuid("Identificador do adolescente invalido"),
});

const niveisGraves = new Set(["ALTO", "CRITICO"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json({ erro: "Id invalido" }, { status: 400 });
    }

    const base = await carregarRelatorioInternoBase(parsed.data.id);
    if (!base) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const totalConflitos = base.conflitos.length;
    const conflitosAtivos = base.conflitos.filter(
      (conflito) => conflito.status?.toUpperCase() === "ATIVO"
    );
    const conflitosResolvidos = totalConflitos - conflitosAtivos.length;

    const faccoes = new Set<string>();
    const alojamentos = new Set<string>();
    conflitosAtivos.forEach((conflito) => {
      if (conflito.adversario?.faccao) {
        faccoes.add(conflito.adversario.faccao);
      }
      if (conflito.adversario?.alojamento) {
        alojamentos.add(conflito.adversario.alojamento);
      }
    });

    const alertasGraves = base.alertas.filter((alerta) =>
      niveisGraves.has((alerta.nivelRisco ?? "").toUpperCase())
    );

    const ultimaOcorrenciaConflito = base.conflitos[0]?.criadoEm ?? null;
    const ultimaOcorrenciaAlertaGrave =
      alertasGraves.length > 0 ? alertasGraves[0].criadoEm : null;

    const metricas = {
      totalConflitos,
      conflitosAtivos: conflitosAtivos.length,
      conflitosResolvidos,
      faccoesEnvolvidas: Array.from(faccoes),
      alojamentosEnvolvidos: Array.from(alojamentos),
      alertasTotais: base.alertas.length,
      alertasGraves: alertasGraves.length,
      ultimaOcorrenciaConflito,
      ultimaOcorrenciaAlertaGrave,
    };

    return NextResponse.json({
      ...base,
      metricas,
    });
  } catch (error) {
    console.error(
      "Erro ao gerar relatorio de transferencia:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { erro: "Erro ao gerar relatorio" },
      { status: 500 }
    );
  }
}
