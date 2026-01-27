import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type DocumentoTipo = "CI" | "DECISAO_JUDICIAL" | "OUTRO" | null;

const formatarDocumentoTipo = (tipo?: string | null) => {
  if (!tipo) return "Nao informado";
  if (tipo === "DECISAO_JUDICIAL") return "Decisao judicial";
  if (tipo === "CI") return "CI";
  return "Outro";
};

export async function GET() {
  try {
    const alojamentos = await prisma.alojamento.findMany({
      where: { statusManutencao: "INTERDITADO" },
      select: {
        id: true,
        numeroAlojamento: true,
        ala: true,
        interdicaoJustificativa: true,
        interdicaoDocumentoTipo: true,
        interdicaoDocumentoReferencia: true,
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
      },
      orderBy: [
        { casa: { numero: "asc" } },
        { ala: "asc" },
        { numeroAlojamento: "asc" },
      ],
    });

    const data = alojamentos.map((alojamento) => ({
      id: alojamento.id,
      casa: {
        id: alojamento.casa.id,
        nome: alojamento.casa.nome,
        numero: alojamento.casa.numero,
        label: alojamento.casa.nome ?? `Casa ${alojamento.casa.numero}`,
      },
      numero: alojamento.numeroAlojamento,
      ala: alojamento.ala ?? null,
      justificativa: alojamento.interdicaoJustificativa ?? null,
      documentoTipo: alojamento.interdicaoDocumentoTipo ?? null,
      documentoTipoLabel: formatarDocumentoTipo(
        alojamento.interdicaoDocumentoTipo ?? null
      ),
      documentoReferencia: alojamento.interdicaoDocumentoReferencia ?? null,
    }));

    return NextResponse.json({ total: data.length, alojamentos: data });
  } catch (error) {
    console.error("Erro ao listar alojamentos interditados:", error);
    return NextResponse.json(
      { erro: "Erro ao listar alojamentos interditados" },
      { status: 500 }
    );
  }
}
