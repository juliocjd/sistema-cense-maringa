import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/transferencias/route";
import {
  GET as GET_BY_ID,
  PATCH,
} from "@/app/api/transferencias/[id]/route";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/ensure-operador", () => ({
  ensureOperador: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;

  const solicitacaoTransferencia = {
    findMany: mockFn(),
    findUnique: mockFn(),
    create: mockFn(),
    update: mockFn(),
  };
  const adolescente = {
    findUnique: mockFn(),
  };
  const historicoTransferencia = {
    create: mockFn(),
  };
  const logAuditoria = {
    create: mockFn(),
  };

  return {
    prisma: {
      solicitacaoTransferencia,
      adolescente,
      historicoTransferencia,
      logAuditoria,
      $transaction: mockFn(),
    },
  };
});

const mockedEnsureOperador = vi.mocked(ensureOperador);
const mockedPrisma = prisma as unknown as {
  solicitacaoTransferencia: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  adolescente: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  historicoTransferencia: {
    create: ReturnType<typeof vi.fn>;
  };
  logAuditoria: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const buildRequest = (url: string, init?: RequestInit) => {
  if (init && "body" in init && init.body !== undefined) {
    console.log("buildRequest body raw", init.body);
    const headers = new Headers(init.headers);
    const parsedBody =
      typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    console.log("buildRequest parsed", parsedBody);
    return {
      url,
      headers,
      json: vi.fn().mockResolvedValue(parsedBody),
    } as unknown as NextRequest;
  }

  return new NextRequest(new Request(url, init));
};

const ADOLESCENTE_ID = "11111111-1111-1111-1111-111111111111";
const OUTRO_ADOLESCENTE_ID = "22222222-2222-2222-2222-222222222222";
const TERCEIRO_ADOLESCENTE_ID =
  "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  mockedEnsureOperador.mockReset();
  mockedEnsureOperador.mockResolvedValue({
    ok: true,
    operadorId: "oper-1",
    ip: "127.0.0.1",
  });

  Object.values(mockedPrisma).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) {
      (value as any).mockReset();
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as any).mockReset();
        }
      });
    }
  });
});

describe("API Transferencias - GET /api/transferencias", () => {
  it("lista transferencias com filtros padrao", async () => {
    mockedPrisma.solicitacaoTransferencia.findMany.mockResolvedValue([
      {
        id: "trans-1",
        status: "AGUARDANDO",
        motivoPrincipal: "Risco elevado",
        unidadesSugeridas: ["CENSE Oeste"],
        observacoesAdicionais: null,
        relatorioGeradoPath: null,
        dataSolicitacao: new Date("2025-11-06T10:00:00Z"),
        dataDecisaoJudicial: null,
        decisaoJudicial: null,
        unidadeDestinoEfetiva: null,
        dataTransferenciaEfetiva: null,
        adolescente: {
          id: ADOLESCENTE_ID,
          nomeCompleto: "Joao",
          nomeSocial: null,
          statusUnidade: "ATIVO",
          alojamentoAtual: {
            id: "aloj-1",
            numeroAlojamento: "05",
            ala: "B",
            casa: { nome: "Casa 02" },
          },
        },
        operadorSolicitante: {
          id: "oper-1",
          nomeCompleto: "Maria Silva",
          matricula: "1234",
        },
        historicoTransf: [],
      },
    ]);

    const response = await GET(
      buildRequest("http://localhost/api/transferencias")
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.transferencias[0]).toMatchObject({
      id: "trans-1",
      status: "AGUARDANDO",
      motivoPrincipal: "Risco elevado",
      adolescente: {
        id: ADOLESCENTE_ID,
        nome: "Joao",
        alojamento: {
          numero: "05",
          ala: "B",
          casa: "Casa 02",
        },
      },
    });
  });
});

describe("API Transferencias - POST /api/transferencias", () => {
  it("cria transferencia com sucesso", async () => {
    mockedPrisma.adolescente.findUnique.mockResolvedValue({
      id: ADOLESCENTE_ID,
    });

    const transferenciaCriada = {
      id: "trans-2",
      status: "AGUARDANDO",
      motivoPrincipal: "Grave conflito interno",
      unidadesSugeridas: ["CENSE Londrina"],
      observacoesAdicionais: "Reforçar monitoramento",
      relatorioGeradoPath: null,
      dataSolicitacao: new Date("2025-11-06T10:00:00Z"),
      dataDecisaoJudicial: null,
      decisaoJudicial: null,
      unidadeDestinoEfetiva: null,
      dataTransferenciaEfetiva: null,
      adolescente: {
        id: ADOLESCENTE_ID,
        nomeCompleto: "Lucas Souza",
        nomeSocial: null,
        statusUnidade: "ATIVO",
        alojamentoAtual: null,
      },
      operadorSolicitante: {
        id: "oper-1",
        nomeCompleto: "Maria Silva",
        matricula: "1234",
      },
      historicoTransf: [],
    };

    const tx = {
      solicitacaoTransferencia: {
        create: vi.fn().mockResolvedValue(transferenciaCriada),
      },
      logAuditoria: {
        create: vi.fn().mockResolvedValue({ id: "log-1" }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(tx)
    );

    const response = await POST(
      buildRequest("http://localhost/api/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adolescenteId: ADOLESCENTE_ID,
          motivoPrincipal: "Grave conflito interno",
          unidadesSugeridas: ["CENSE Londrina", " CENSE Cascavel "],
          observacoesAdicionais: "Reforçar monitoramento",
        }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe("trans-2");
    expect(tx.solicitacaoTransferencia.create).toHaveBeenCalled();
    expect(tx.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operadorId: "oper-1",
          acao: "TRANSFERENCIA_CRIAR",
        }),
      })
    );
  });
});

describe("API Transferencias - GET /api/transferencias/[id]", () => {
  it("retorna detalhes da transferencia", async () => {
    mockedPrisma.solicitacaoTransferencia.findUnique.mockResolvedValue({
      id: "trans-1",
      status: "APROVADA",
      motivoPrincipal: "Grave conflito interno",
      unidadesSugeridas: ["CENSE Londrina"],
      observacoesAdicionais: null,
      relatorioGeradoPath: null,
      dataSolicitacao: new Date("2025-11-06T08:00:00Z"),
      dataDecisaoJudicial: new Date("2025-11-07T10:00:00Z"),
      decisaoJudicial: "Aprovado pelo juiz",
      unidadeDestinoEfetiva: null,
      dataTransferenciaEfetiva: null,
      adolescente: {
        id: ADOLESCENTE_ID,
        nomeCompleto: "Joao",
        nomeSocial: null,
        statusUnidade: "ATIVO",
        alojamentoAtual: null,
      },
      operadorSolicitante: {
        id: "oper-1",
        nomeCompleto: "Maria Silva",
        matricula: "1234",
      },
      historicoTransf: [],
    });

    const response = await GET_BY_ID(
      buildRequest("http://localhost/api/transferencias/trans-1"),
      { params: Promise.resolve({ id: "trans-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe("trans-1");
    expect(json.status).toBe("APROVADA");
  });
});

describe("API Transferencias - PATCH /api/transferencias/[id]", () => {
  it("atualiza transferencia para status APROVADA", async () => {
    mockedPrisma.solicitacaoTransferencia.findUnique
      .mockResolvedValueOnce({
        id: "trans-3",
        status: "AGUARDANDO",
        adolescenteId: OUTRO_ADOLESCENTE_ID,
        decisaoJudicial: null,
        dataDecisaoJudicial: null,
        unidadeDestinoEfetiva: null,
        dataTransferenciaEfetiva: null,
      });

    const transferenciaAtualizada = {
      id: "trans-3",
      status: "APROVADA",
      motivoPrincipal: "Conflitos graves",
      unidadesSugeridas: ["CENSE Londrina"],
      observacoesAdicionais: null,
      relatorioGeradoPath: null,
      dataSolicitacao: new Date("2025-11-06T08:00:00Z"),
      dataDecisaoJudicial: new Date("2025-11-07T10:00:00Z"),
      decisaoJudicial: "Aprovado com vigencia imediata",
      unidadeDestinoEfetiva: null,
      dataTransferenciaEfetiva: null,
      adolescente: {
        id: OUTRO_ADOLESCENTE_ID,
        nomeCompleto: "Ana",
        nomeSocial: null,
        statusUnidade: "ATIVO",
        alojamentoAtual: null,
      },
      operadorSolicitante: {
        id: "oper-1",
        nomeCompleto: "Maria Silva",
        matricula: "1234",
      },
      historicoTransf: [],
    };

    const tx = {
      solicitacaoTransferencia: {
        update: vi.fn().mockResolvedValue(transferenciaAtualizada),
      },
      historicoTransferencia: {
        create: vi.fn(),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(tx)
    );

    const response = await PATCH(
      buildRequest("http://localhost/api/transferencias/trans-3", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APROVADA",
          decisaoJudicial: "Aprovado com vigencia imediata",
          dataDecisaoJudicial: "2025-11-07T10:00:00Z",
        }),
      }),
      { params: Promise.resolve({ id: "trans-3" }) }
    );
    const json = await response.json();
    console.log("PATCH aprovacao ->", response.status, json);

    expect(response.status).toBe(200);
    expect(json.status).toBe("APROVADA");
    expect(tx.solicitacaoTransferencia.update).toHaveBeenCalled();
    expect(tx.historicoTransferencia.create).not.toHaveBeenCalled();
    expect(tx.logAuditoria.create).toHaveBeenCalled();
  });

  it("usa dados existentes ao atualizar status sem reenviar decisao", async () => {
    const dataDecisao = new Date("2025-11-07T10:00:00Z");
    mockedPrisma.solicitacaoTransferencia.findUnique
      .mockResolvedValueOnce({
        id: "trans-5",
        status: "AGUARDANDO",
        adolescenteId: OUTRO_ADOLESCENTE_ID,
        decisaoJudicial: "Decisao emitida anteriormente",
        dataDecisaoJudicial: dataDecisao,
        unidadeDestinoEfetiva: null,
        dataTransferenciaEfetiva: null,
      });

    const transferenciaAtualizada = {
      id: "trans-5",
      status: "APROVADA",
      motivoPrincipal: "Conflitos graves",
      unidadesSugeridas: ["CENSE Londrina"],
      observacoesAdicionais: null,
      relatorioGeradoPath: null,
      dataSolicitacao: new Date("2025-11-06T08:00:00Z"),
      dataDecisaoJudicial: dataDecisao,
      decisaoJudicial: "Decisao emitida anteriormente",
      unidadeDestinoEfetiva: null,
      dataTransferenciaEfetiva: null,
      adolescente: {
        id: OUTRO_ADOLESCENTE_ID,
        nomeCompleto: "Ana",
        nomeSocial: null,
        statusUnidade: "ATIVO",
        alojamentoAtual: null,
      },
      operadorSolicitante: {
        id: "oper-1",
        nomeCompleto: "Maria Silva",
        matricula: "1234",
      },
      historicoTransf: [],
    };

    const tx = {
      solicitacaoTransferencia: {
        update: vi.fn().mockResolvedValue(transferenciaAtualizada),
      },
      historicoTransferencia: {
        create: vi.fn(),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(tx)
    );

    const response = await PATCH(
      buildRequest("http://localhost/api/transferencias/trans-5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APROVADA",
        }),
      }),
      { params: Promise.resolve({ id: "trans-5" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("APROVADA");
    expect(tx.solicitacaoTransferencia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APROVADA",
        }),
      })
    );
    expect(tx.historicoTransferencia.create).not.toHaveBeenCalled();
  });

  it("registra transferencia concluida com historico", async () => {
    mockedPrisma.solicitacaoTransferencia.findUnique
      .mockResolvedValueOnce({
        id: "trans-4",
        status: "APROVADA",
        adolescenteId: TERCEIRO_ADOLESCENTE_ID,
        decisaoJudicial: "Transferencia autorizada",
        dataDecisaoJudicial: new Date("2025-11-07T10:00:00Z"),
        unidadeDestinoEfetiva: null,
        dataTransferenciaEfetiva: null,
      });

    const transferenciaAtualizada = {
      id: "trans-4",
      status: "TRANSFERIDA",
      motivoPrincipal: "Mudanca de unidade",
      unidadesSugeridas: ["CENSE Cascavel"],
      observacoesAdicionais: null,
      relatorioGeradoPath: null,
      dataSolicitacao: new Date("2025-11-06T08:00:00Z"),
      dataDecisaoJudicial: new Date("2025-11-07T10:00:00Z"),
      decisaoJudicial: "Transferencia autorizada",
      unidadeDestinoEfetiva: "CENSE Cascavel",
      dataTransferenciaEfetiva: new Date("2025-11-10T12:00:00Z"),
      adolescente: {
        id: TERCEIRO_ADOLESCENTE_ID,
        nomeCompleto: "Carlos",
        nomeSocial: null,
        statusUnidade: "TRANSFERIDO",
        alojamentoAtual: null,
      },
      operadorSolicitante: {
        id: "oper-1",
        nomeCompleto: "Maria Silva",
        matricula: "1234",
      },
      historicoTransf: [
        {
          id: "hist-1",
          adolescenteId: TERCEIRO_ADOLESCENTE_ID,
          unidadeOrigem: "CENSE Maringa",
          unidadeDestino: "CENSE Cascavel",
          dataTransferencia: new Date("2025-11-08T00:00:00Z"),
          motivo: "Autorizado pela decisao",
          conflitosNaOrigem: 2,
          relatorioTransferenciaId: "trans-4",
        },
      ],
    };

    const tx = {
      solicitacaoTransferencia: {
        update: vi.fn().mockResolvedValue(transferenciaAtualizada),
      },
      historicoTransferencia: {
        create: vi.fn(),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(tx)
    );

    const response = await PATCH(
      buildRequest("http://localhost/api/transferencias/trans-4", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TRANSFERIDA",
          unidadeDestinoEfetiva: "CENSE Cascavel",
          dataTransferenciaEfetiva: "2025-11-10T12:00:00Z",
          historicoTransferencia: {
            unidadeOrigem: "CENSE Maringa",
            unidadeDestino: "CENSE Cascavel",
            dataTransferencia: "2025-11-08",
            motivo: "Autorizado pela decisao",
            conflitosNaOrigem: 2,
          },
        }),
      }),
      { params: Promise.resolve({ id: "trans-4" }) }
    );
    const json = await response.json();
    console.log("PATCH transferida ->", response.status, json);

    expect(response.status).toBe(200);
    expect(json.status).toBe("TRANSFERIDA");
    expect(tx.historicoTransferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unidadeOrigem: "CENSE Maringa",
          unidadeDestino: "CENSE Cascavel",
          relatorioTransferenciaId: "trans-4",
        }),
      })
    );
  });
});
