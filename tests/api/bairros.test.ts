import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/bairros/route";
import {
  GET as GET_BAIRRO,
  PUT,
  DELETE,
} from "@/app/api/bairros/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const bairro = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const cidade = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  };
  const operador = { findUnique: vi.fn() };
  const logAuditoria = { create: vi.fn() };

  return {
    prisma: {
      bairro,
      cidade,
      operador,
      logAuditoria,
    },
  };
});

const mockedAuth = vi.mocked(auth as unknown as ReturnType<typeof vi.fn>);
const mockedPrisma = prisma as unknown as {
  bairro: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  cidade: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
};

const buildRequest = (method: string, url: string, body?: unknown) => {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new Request(url, init));
};

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

describe("GET /api/bairros", () => {
  it("lista bairros com sucesso", async () => {
    mockedPrisma.bairro.findMany.mockResolvedValue([
      {
        id: "bairro-1",
        nomeBairro: "Zona 7",
        cidade: "Maringa",
        cidadeId: "22222222-2222-2222-2222-222222222222",
        cidadeCatalogo: { estado: "PR" },
        _count: { adolescentes: 5 },
      },
    ]);

    const request = buildRequest(
      "GET",
      "http://localhost/api/bairros?incluirTotal=true"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.bairros[0].totalAdolescentes).toBe(5);
  });
});

describe("GET /api/bairros/[id]", () => {
  const bairroId = "11111111-1111-1111-1111-111111111111";
  const baseUrl = `http://localhost/api/bairros/${bairroId}`;

  it("retorna 400 quando id invalido", async () => {
    const request = buildRequest("GET", baseUrl);
    const response = await GET_BAIRRO(request, {
      params: Promise.resolve({ id: "nao-uuid" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Id do bairro invalido");
  });

  it("retorna 404 quando bairro nao encontrado", async () => {
    mockedPrisma.bairro.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("GET", baseUrl);
    const response = await GET_BAIRRO(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Bairro nao encontrado");
  });

  it("retorna bairro com adolescentes quando solicitado", async () => {
    mockedPrisma.bairro.findUnique.mockResolvedValueOnce({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      cidadeId: "22222222-2222-2222-2222-222222222222",
      cidadeCatalogo: { estado: "PR" },
      _count: { adolescentes: 2, bairrosConflitosA: 1, bairrosConflitosB: 0 },
      adolescentes: [
        {
          id: "ado-1",
          nomeCompleto: "Joao",
          statusUnidade: "ATIVO",
          alojamentoAtual: {
            id: "aloj-1",
            numeroAlojamento: "01",
            ala: "A",
            casa: { id: "casa-1", nome: "Casa 1", numero: 1 },
          },
        },
      ],
    });

    const request = buildRequest(
      "GET",
      `${baseUrl}?incluir_adolescentes=true`
    );
    const response = await GET_BAIRRO(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalAdolescentes).toBe(2);
    expect(json.conflitosRegistrados).toBe(1);
    expect(json.adolescentes[0]).toEqual(
      expect.objectContaining({
        id: "ado-1",
        alojamento: expect.objectContaining({
          casa: expect.objectContaining({ nome: "Casa 1" }),
        }),
      })
    );
  });
});

describe("POST /api/bairros", () => {
  const url = "http://localhost/api/bairros";

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 400 quando payload invalido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const request = buildRequest("POST", url, { nomeBairro: "" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Dados invalidos");
  });

  it("retorna 400 quando corpo nao e JSON valido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const rawRequest = new NextRequest(
      new Request(url, {
        method: "POST",
        body: "nao-json",
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await POST(rawRequest);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Payload invalido: esperado JSON");
  });

  it("retorna 409 quando bairro ja cadastrado na mesma cidade", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findFirst.mockResolvedValueOnce({ id: "bairro-dup" });
    mockedPrisma.cidade.findUnique.mockResolvedValueOnce({
      id: "22222222-2222-2222-2222-222222222222",
      nome: "Maringa",
      estado: "PR",
    });

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe("Bairro ja cadastrado nesta cidade");
  });

  it("cria bairro quando dados validos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findFirst.mockResolvedValue(null);
    mockedPrisma.cidade.findUnique.mockResolvedValueOnce({
      id: "22222222-2222-2222-2222-222222222222",
      nome: "Maringa",
      estado: "PR",
    });
    mockedPrisma.bairro.create.mockResolvedValue({
      id: "bairro-1",
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.nomeBairro).toBe("Zona 7");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

describe("PUT /api/bairros/[id]", () => {
  const bairroId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/bairros/${bairroId}`;

  it("retorna 400 quando id invalido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "invalido" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Id do bairro invalido");
  });

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("atualiza bairro com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique
      .mockResolvedValueOnce({
        id: bairroId,
        nomeBairro: "Zona 7",
        cidade: "Maringa",
        cidadeId: "22222222-2222-2222-2222-222222222222",
      })
      .mockResolvedValueOnce(null);
    mockedPrisma.cidade.findMany.mockResolvedValueOnce([
      { id: "33333333-3333-3333-3333-333333333333", nome: "Sarandi", estado: "PR" },
    ]);
    mockedPrisma.bairro.update.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Sarandi",
      cidadeId: "33333333-3333-3333-3333-333333333333",
    });

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.cidade).toBe("Sarandi");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });

  it("retorna 400 quando nenhum campo informado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValueOnce({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      cidadeId: "22222222-2222-2222-2222-222222222222",
    });

    const request = buildRequest("PUT", url, {});
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Dados invalidos");
  });

  it("retorna 404 quando bairro nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Bairro nao encontrado");
  });

  it("retorna 409 quando novo nome ja existe na cidade", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique
      .mockResolvedValueOnce({
        id: bairroId,
        nomeBairro: "Zona 7",
        cidade: "Maringa",
        cidadeId: "22222222-2222-2222-2222-222222222222",
      })
      .mockResolvedValueOnce({
        id: "outro-bairro",
        nomeBairro: "Zona 8",
        cidade: "Maringa",
        cidadeId: "22222222-2222-2222-2222-222222222222",
      });
    mockedPrisma.bairro.findFirst.mockResolvedValueOnce({
      id: "outro-bairro",
    });

    const request = buildRequest("PUT", url, {
      nomeBairro: "Zona 8",
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe("Ja existe bairro com este nome nesta cidade");
  });
});

describe("DELETE /api/bairros/[id]", () => {
  const bairroId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/bairros/${bairroId}`;

  it("retorna 400 quando id invalido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nao-uuid" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Id do bairro invalido");
  });

  it("retorna 409 quando ha vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      _count: { adolescentes: 1, bairrosConflitosA: 0, bairrosConflitosB: 2 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Nao e possivel remover bairro com vinculacoes ativas"
    );
  });

  it("retorna 404 quando bairro nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Bairro nao encontrado");
  });

  it("remove bairro quando sem vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      _count: { adolescentes: 0, bairrosConflitosA: 0, bairrosConflitosB: 0 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});
