import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST, DELETE } from "@/app/api/alocar/route";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;
  const alojamento = { findUnique: mockFn() };
  const adolescente = { findUnique: mockFn(), update: mockFn() };
  const operador = { findUnique: mockFn() };
  const logAuditoria = { create: mockFn() };
  const decisaoOperacional = { create: mockFn() };
  const txContext = {
    adolescente,
    decisaoOperacional,
    logAuditoria,
    operador,
    alojamento,
  };

  return {
    prisma: {
      alojamento,
      adolescente,
      operador,
      logAuditoria,
      decisaoOperacional,
      $transaction: mockFn().mockImplementation((callback: any) =>
        callback(txContext)
      ),
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedPrisma = prisma as unknown as {
  alojamento: { findUnique: ReturnType<typeof vi.fn> };
  adolescente: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
  decisaoOperacional: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const createRequest = (
  method: string,
  body?: Record<string, unknown>,
  search = ""
) => {
  const url = new URL(`http://localhost/api/alocar${search}`);
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new Request(url, init));
};

const mockVerificacao = {
  requer_justificativa: false,
  nivel_risco: 1,
  alertas: [],
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockedAuth.mockReset();
  Object.values(mockedPrisma).forEach((value) => {
    if (typeof value === "object" && value !== null) {
      Object.values(value).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as any).mockReset();
        }
      });
    } else if (typeof value === "function" && "mockReset" in value) {
      (value as any).mockReset();
    }
  });

  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(mockVerificacao), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  mockedPrisma.alojamento.findUnique.mockResolvedValue({
    id: "aloj-1",
    adolescentes: [],
    statusManutencao: "LIVRE",
  });

  mockedPrisma.adolescente.findUnique.mockResolvedValue({
    id: "ado-1",
    alojamentoAtualId: null,
    statusUnidade: "ATIVO",
  });

  mockedPrisma.logAuditoria.create.mockResolvedValue({ id: "log-1" } as any);
  mockedPrisma.decisaoOperacional.create.mockResolvedValue({ id: "dec-1" } as any);
  mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-default" });
  mockedAuth.mockResolvedValue({ user: { id: "oper-default" } } as any);

  mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
    callback({
      adolescente: {
        update: mockedPrisma.adolescente.update,
      },
      decisaoOperacional: {
        create: mockedPrisma.decisaoOperacional.create,
      },
      logAuditoria: {
        create: mockedPrisma.logAuditoria.create,
      },
    })
  );
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("POST /api/alocar", () => {
  it("retorna 401 quando operador não está autenticado", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const request = createRequest("POST", {
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador não existe no banco", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const request = createRequest("POST", {
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("realiza alocacao com sucesso", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    const adolescenteAtualizado = {
      id: "ado-1",
      nomeCompleto: "Fulano de Tal",
      alojamentoAtual: {
        id: "aloj-1",
        numeroAlojamento: "01",
        ala: "A",
        casa: { id: "casa-1", nome: "Casa 01", numero: 1 },
      },
    };

    mockedPrisma.adolescente.update.mockResolvedValueOnce(adolescenteAtualizado);
    mockedPrisma.logAuditoria.create.mockResolvedValueOnce({ id: "log-1" } as any);

    const request = createRequest("POST", {
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
      medidas_adicionais: [],
    });

    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBe(201);
    expect(json).toMatchObject({
      sucesso: true,
      adolescente: {
        id: "ado-1",
        alojamento: { casa: "Casa 01", numero: "01", ala: "A" },
      },
    });
    expect(mockedPrisma.adolescente.update).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it("retorna 400 quando verificacao exige justificativa sem fornecer", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requer_justificativa: true,
          nivel_risco: 5,
          alertas: [{ tipo: "CONFLITO_FRONTAL" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const request = createRequest("POST", {
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
      medidas_adicionais: [],
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Esta alocacao exige justificativa");
    expect(json.requer_justificativa).toBe(true);
    expect(mockedPrisma.adolescente.update).not.toHaveBeenCalled();
  });

  it("retorna 400 quando alojamento esta interditado", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    mockedPrisma.alojamento.findUnique.mockResolvedValueOnce({
      id: "aloj-1",
      adolescentes: [],
      statusManutencao: "INTERDITADO",
    });

    const request = createRequest("POST", {
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Alojamento esta interditado");
    expect(mockedPrisma.adolescente.update).not.toHaveBeenCalled();
  });

});

describe("DELETE /api/alocar", () => {
  it("retorna 401 quando operador nǜo autenticado", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const request = createRequest(
      "DELETE",
      {
        adolescenteId: "ado-1",
      },
      ""
    );

    const response = await DELETE(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nǜo encontrado", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const request = createRequest(
      "DELETE",
      {
        adolescenteId: "ado-1",
      },
      ""
    );

    const response = await DELETE(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("remove alocacao com sucesso", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    mockedPrisma.adolescente.findUnique.mockResolvedValueOnce({
      id: "ado-1",
      alojamentoAtualId: "aloj-1",
      statusUnidade: "ATIVO",
      alojamentoAtual: {
        id: "aloj-1",
        numeroAlojamento: "01",
        casa: { nome: "Casa 01" },
      },
    });

    mockedPrisma.logAuditoria.create.mockResolvedValueOnce({ id: "log-2" } as any);
    mockedPrisma.adolescente.update.mockResolvedValueOnce({ id: "ado-1" });

    const request = createRequest(
      "DELETE",
      {
        adolescenteId: "ado-1",
      },
      ""
    );

    const response = await DELETE(request);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      sucesso: true,
      alojamento_liberado: { casa: "Casa 01", numero: "01" },
    });
    expect(mockedPrisma.adolescente.update).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
  });
});
