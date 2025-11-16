import { describe, it, beforeEach, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/eventos-especiais/[id]/verificar-conflitos/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  coletarContextoEvento,
  calcularRiscoEvento,
} from "@/lib/eventos/calc-risco-evento";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const eventoEspecial = { findUnique: vi.fn() };
  const operador = { findUnique: vi.fn() };
  const logAuditoria = { create: vi.fn() };

  return {
    prisma: {
      eventoEspecial,
      operador,
      logAuditoria,
    },
  };
});

vi.mock("@/lib/eventos/calc-risco-evento", () => {
  const coletarContextoEvento = vi.fn();
  const calcularRiscoEvento = vi.fn();
  return {
    coletarContextoEvento,
    calcularRiscoEvento,
  };
});

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedPrisma = prisma as unknown as {
  eventoEspecial: { findUnique: ReturnType<typeof vi.fn> };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
};
const mockedColetar = vi.mocked(coletarContextoEvento);
const mockedCalcular = vi.mocked(calcularRiscoEvento);

const buildRequest = (eventoId: string, body?: unknown) => {
  const url = `http://localhost/api/eventos-especiais/${eventoId}/verificar-conflitos`;
  const init: RequestInit = { method: "POST" };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = {
      "Content-Type": "application/json",
    };
  }

  return new NextRequest(new Request(url, init));
};

beforeEach(() => {
  mockedAuth.mockReset();
  mockedPrisma.eventoEspecial.findUnique.mockReset();
  mockedPrisma.operador.findUnique.mockReset();
  mockedPrisma.logAuditoria.create.mockReset();
  mockedColetar.mockReset();
  mockedCalcular.mockReset();
});

describe("POST /api/eventos-especiais/[id]/verificar-conflitos", () => {
  const eventoId = "1e0a37b1-2ea6-49b6-8e42-86951d760001";
  const grupoId = "11111111-1111-1111-1111-111111111111";
  const participanteId = "22222222-2222-2222-2222-222222222222";

  it("retorna 401 quando operador nao autenticado", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest(eventoId);
    const response = await POST(request, {
      params: Promise.resolve({ id: eventoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 404 quando evento nao existe", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.eventoEspecial.findUnique.mockResolvedValue(null);

    const request = buildRequest(eventoId);
    const response = await POST(request, {
      params: Promise.resolve({ id: eventoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.erro).toBe("Evento nao encontrado");
  });

  it("retorna 404 quando grupos nao encontrados", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.eventoEspecial.findUnique.mockResolvedValue({
      id: eventoId,
      grupos: [{ grupoId }],
      participantes: [],
    });
    mockedColetar.mockResolvedValue({
      contexto: {
        participantes: new Map(),
        gruposResumo: [],
      },
      gruposNaoEncontrados: [grupoId],
      adolescentesNaoEncontrados: [],
    });

    const request = buildRequest(eventoId);
    const response = await POST(request, {
      params: Promise.resolve({ id: eventoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.erro).toBe("Alguns grupos nao foram encontrados");
    expect(json.grupos_nao_encontrados).toEqual([grupoId]);
  });

  it("retorna analise de risco quando dados validos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.eventoEspecial.findUnique.mockResolvedValue({
      id: eventoId,
      grupos: [{ grupoId }],
      participantes: [{ adolescenteId: participanteId }],
    });

    const mockAnalise = {
      score_risco_combinado: 120,
      nivel: "ALTO" as const,
      conflitos_criticos: 1,
      conflitos_detalhados: [],
      recomendacoes: ["Separar participantes com conflito critico em horarios distintos."],
      participantes_avaliados: 3,
    };

    mockedColetar.mockResolvedValue({
      contexto: {
        participantes: new Map([
          [
            participanteId,
            {
              id: participanteId,
              nome: "Adolescente 1",
              grupoId,
              grupoNome: "Grupo 1",
              casaId: "casa-1",
              casaNome: "Casa 1",
              alertaPerfilMapeado: false,
              alertaRiscoSuicidio: false,
              alertaSaudeConfidencial: false,
              conflitos: [],
            },
          ],
        ]),
        gruposResumo: [],
      },
      gruposNaoEncontrados: [],
      adolescentesNaoEncontrados: [],
    });

    mockedCalcular.mockReturnValue(mockAnalise);

    const request = buildRequest(eventoId, {
      gruposParticipantes: [grupoId],
      adolescentesParticipantes: [participanteId],
    });
    const response = await POST(request, {
      params: Promise.resolve({ id: eventoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.eventoId).toBe(eventoId);
    expect(json.analise).toEqual(mockAnalise);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operadorId: "oper-1",
          registroIdAfetado: eventoId,
        }),
      })
    );
  });
});
