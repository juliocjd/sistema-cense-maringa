import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/atos-infracionais/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const atoInfracionalCatalogo = {
    findUnique: vi.fn(),
    delete: vi.fn(),
  };
  const operador = { findUnique: vi.fn() };
  const logAuditoria = { create: vi.fn() };

  return {
    prisma: {
      atoInfracionalCatalogo,
      operador,
      logAuditoria,
    },
  };
});

const mockedAuth = vi.mocked(auth as unknown as ReturnType<typeof vi.fn>);
const mockedPrisma = prisma as unknown as {
  atoInfracionalCatalogo: {
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
};

const buildRequest = (method: string, url: string) =>
  new NextRequest(new Request(url, { method }));

beforeEach(() => {
  mockedAuth.mockReset();
  Object.values(mockedPrisma).forEach((value) => {
    Object.values(value).forEach((fn) => {
      if (typeof fn === "function" && "mockReset" in fn) {
        (fn as any).mockReset();
      }
    });
  });
});

describe("DELETE /api/atos-infracionais/[id]", () => {
  const atoId = "11111111-1111-1111-1111-111111111111";
  const baseUrl = `http://localhost/api/atos-infracionais/${atoId}`;

  it("retorna 409 com a lista de adolescentes quando o ato esta em uso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({
      id: "oper-1",
      funcaoRole: "OPERADOR",
    });
    mockedPrisma.atoInfracionalCatalogo.findUnique.mockResolvedValue({
      id: atoId,
      nome: "Roubo",
      gravidade: "GRAVE",
      violenciaOuGraveAmeaca: true,
      casoTipificacoes: [
        {
          caso: {
            adolescente: {
              id: "ado-2",
              nomeCompleto: "Bruno",
              statusUnidade: "ATIVO",
            },
          },
        },
      ],
      historicos: [
        {
          adolescente: {
            id: "ado-1",
            nomeCompleto: "Ana",
            statusUnidade: "LIBERADO",
          },
        },
        {
          adolescente: {
            id: "ado-2",
            nomeCompleto: "Bruno",
            statusUnidade: "ATIVO",
          },
        },
      ],
    });

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: atoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toContain("esta cadastrado em adolescentes");
    expect(json.totalAdolescentes).toBe(2);
    expect(json.adolescentes).toEqual([
      {
        id: "ado-1",
        nomeCompleto: "Ana",
        statusUnidade: "LIBERADO",
      },
      {
        id: "ado-2",
        nomeCompleto: "Bruno",
        statusUnidade: "ATIVO",
      },
    ]);
    expect(mockedPrisma.atoInfracionalCatalogo.delete).not.toHaveBeenCalled();
  });

  it("remove o ato quando nao ha vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({
      id: "oper-1",
      funcaoRole: "OPERADOR",
    });
    mockedPrisma.atoInfracionalCatalogo.findUnique.mockResolvedValue({
      id: atoId,
      nome: "Roubo",
      gravidade: "GRAVE",
      violenciaOuGraveAmeaca: true,
      casoTipificacoes: [],
      historicos: [],
    });

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: atoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.atoInfracionalCatalogo.delete).toHaveBeenCalledWith({
      where: { id: atoId },
    });
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});
