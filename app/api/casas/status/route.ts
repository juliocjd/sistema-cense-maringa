// app/api/casas/status/route.ts
// VERSÃO SIMPLIFICADA - Funciona mesmo sem gerar Prisma
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Retornar estrutura mockada para não quebrar frontend
    const casas = [
      "Casa 01",
      "Casa 02",
      "Casa 03",
      "Casa 04",
      "Casa 05",
      "Casa 06",
      "Casa 07",
      "Casa 08",
    ];

    const casasProcessadas = casas.map((nome, index) => ({
      id: `casa-${String(index + 1).padStart(2, "0")}`,
      nome: nome,
      numero: index + 1,
      isolada: nome === "Casa 01" || nome === "Casa 08",
      score_tensao: 0,
      alojamentos: Array.from({ length: index === 7 ? 8 : 10 }, (_, i) => ({
        id: `aloj-${index}-${i}`,
        numero: String(i + 1).padStart(2, "0"),
        ala: i < 6 ? "A" : "B",
        status_manutencao: "LIVRE",
        cor_risco: "livre",
        nivel_risco: 1,
        icones: [],
        alertas: [],
        ocupante: null,
      })),
    }));

    return NextResponse.json({
      casas: casasProcessadas,
      estatisticas: {
        total_alojamentos: 78,
        alojamentos_ocupados: 0,
        alojamentos_livres: 78,
        alojamentos_com_risco: 0,
        taxa_ocupacao: "0%",
      },
      aviso:
        "Dados mockados - Execute: npx prisma generate && npx prisma db push",
    });
  } catch (error) {
    console.error("Erro:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar status", detalhes: String(error) },
      { status: 500 }
    );
  }
}
