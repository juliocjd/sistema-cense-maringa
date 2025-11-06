import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type EnsureOperadorSuccess = {
  ok: true;
  operadorId: string;
  ip: string;
};

type EnsureOperadorFailure = {
  ok: false;
  response: NextResponse;
};

export type EnsureOperadorResult =
  | EnsureOperadorSuccess
  | EnsureOperadorFailure;

/**
 * Garantir que exista um operador autenticado e cadastrado.
 * Retorna o identificador do operador e o IP extraído do cabeçalho.
 */
export async function ensureOperador(
  request: NextRequest
): Promise<EnsureOperadorResult> {
  const session = await auth().catch(() => null);
  const operadorId = session?.user?.id?.trim();

  if (!operadorId) {
    return {
      ok: false,
      response: NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      ),
    };
  }

  const operadorExiste = await prisma.operador.findUnique({
    where: { id: operadorId },
    select: { id: true },
  });

  if (!operadorExiste) {
    return {
      ok: false,
      response: NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      ),
    };
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  return {
    ok: true,
    operadorId,
    ip,
  };
}
