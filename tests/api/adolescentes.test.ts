import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/adolescentes/route";
import { PUT } from "@/app/api/adolescentes/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const alertasEspeciaisMocks = vi.hoisted(() => {
  const aplicarAlertasEspeciais = vi.fn().mockResolvedValue(undefined);
  const mapearAlertasEspeciaisDoPayload = vi.fn(() => []);
  const atualizarFlagsAlertasEspeciais = vi.fn().mockResolvedValue(undefined);
  return {
    aplicarAlertasEspeciais,
    mapearAlertasEspeciaisDoPayload,
    atualizarFlagsAlertasEspeciais,
    factory: () => ({
      aplicarAlertasEspeciais,
      mapearAlertasEspeciaisDoPayload,
      atualizarFlagsAlertasEspeciais,
    }),
  };
});

vi.mock(
  "@/lib/alertas/sincronizar-especiais",
  alertasEspeciaisMocks.factory
);

vi.mock("@/lib/adolescentes/transformers", () => ({
  INCLUDE_ADOLESCENTE_DEFAULT: {},
  mapPrismaAdolescente: vi.fn((input) => input),
}));

const prismaSetup = vi.hoisted(() => {
  const refs = {
    operador: { findUnique: vi.fn() },
    adolescente: { findUnique: vi.fn() },
    logAuditoria: { create: vi.fn() },
    adolescenteHistoricoGlobal: { createMany: vi.fn() },
    adolescenteTatuagemGlobal: { createMany: vi.fn() },
    txAdolescente: { update: vi.fn(), findUnique: vi.fn() },
    txHistorico: { findMany: vi.fn(), create: vi.fn() },
    txTatuagem: { createMany: vi.fn() },
    alertaAtivoGlobal: { count: vi.fn(), groupBy: vi.fn() },
    txAlertas: { updateMany: vi.fn() },
    historicoMovimentacaoGlobal: { create: vi.fn() },
    txHistoricoMovimentacao: { create: vi.fn() },
  };

  const transaction = vi.fn().mockImplementation((callback: any) =>
    callback({
      adolescente: refs.txAdolescente,
      adolescenteHistoricoInfracional: refs.txHistorico,
      adolescenteTatuagem: refs.txTatuagem,
      alertaAtivo: refs.txAlertas,
      historicoMovimentacao: refs.txHistoricoMovimentacao,
    })
  );

  const factory = () => ({
    prisma: {
      operador: refs.operador,
      adolescente: refs.adolescente,
      logAuditoria: refs.logAuditoria,
      adolescenteHistoricoInfracional: refs.adolescenteHistoricoGlobal,
      adolescenteTatuagem: refs.adolescenteTatuagemGlobal,
      alertaAtivo: refs.alertaAtivoGlobal,
      historicoMovimentacao: refs.historicoMovimentacaoGlobal,
      $transaction: transaction,
    },
  });

  return { refs, factory, transaction };
});

vi.mock("@/lib/prisma", prismaSetup.factory);

const {
  refs: {
    operador: operadorMock,
    adolescente: adolescenteMock,
    logAuditoria: logAuditoriaMock,
    adolescenteHistoricoGlobal: adolescenteHistoricoGlobalMock,
    adolescenteTatuagemGlobal: adolescenteTatuagemGlobalMock,
    txAdolescente: txAdolescenteMock,
    txHistorico: txHistoricoMock,
    txTatuagem: txTatuagemMock,
    alertaAtivoGlobal: alertaAtivoGlobalMock,
    txAlertas: txAlertasMock,
    historicoMovimentacaoGlobal: historicoMovimentacaoGlobalMock,
    txHistoricoMovimentacao: txHistoricoMovimentacaoMock,
  },
  transaction: transactionMock,
} = prismaSetup;

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const buildRequest = (
  method: string,
  url: string,
  body?: Record<string, unknown>
) => {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new Request(url, init));
};

beforeEach(() => {
  mockedAuth.mockReset();
  alertasEspeciaisMocks.aplicarAlertasEspeciais.mockClear();
  alertasEspeciaisMocks.mapearAlertasEspeciaisDoPayload
    .mockReset()
    .mockReturnValue([]);
  alertasEspeciaisMocks.atualizarFlagsAlertasEspeciais.mockClear();
  [
    operadorMock.findUnique,
    adolescenteMock.findUnique,
    logAuditoriaMock.create,
    adolescenteHistoricoGlobalMock.createMany,
    adolescenteTatuagemGlobalMock.createMany,
    txAdolescenteMock.update,
    txAdolescenteMock.findUnique,
    txHistoricoMock.findMany,
    txHistoricoMock.create,
    txTatuagemMock.createMany,
    alertaAtivoGlobalMock.count,
    alertaAtivoGlobalMock.groupBy,
    txAlertasMock.updateMany,
    historicoMovimentacaoGlobalMock.create,
    txHistoricoMovimentacaoMock.create,
  ].forEach((fn) => fn.mockReset());

  alertaAtivoGlobalMock.count.mockResolvedValue(0);
  alertaAtivoGlobalMock.groupBy.mockResolvedValue([]);
  txAlertasMock.updateMany.mockResolvedValue({ count: 0 });

  transactionMock.mockReset();
  transactionMock.mockImplementation((callback: any) =>
    callback({
      adolescente: txAdolescenteMock,
      adolescenteHistoricoInfracional: txHistoricoMock,
      adolescenteTatuagem: txTatuagemMock,
      alertaAtivo: txAlertasMock,
      historicoMovimentacao: txHistoricoMovimentacaoMock,
    })
  );
});

describe("API de adolescentes - validacoes de status", () => {
  it("exige data de desinternacao ao cadastrar adolescente nao ativo", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-1" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-1" });

    const request = buildRequest(
      "POST",
      "http://localhost/api/adolescentes",
      {
        nomeCompleto: "Fulano da Silva",
        statusUnidade: "LIBERADO",
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.erro).toContain("Data de desinternacao");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("impede transicao de ativo para liberado sem data de desinternacao", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-2" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-2" });
    adolescenteMock.findUnique.mockResolvedValue({
      id: "adol-1",
      nomeCompleto: "Adolescente Teste",
      statusUnidade: "ATIVO",
      alojamentoAtualId: "aloj-1",
      alojamentoAtual: { casa: { nome: "Casa Leste" } },
      atoInfracionalAtual: "Homicidio",
      atoInfracionalAno: 2024,
      atoInfracionalProcesso: "PROC123",
      atoInfracionalGravidade: true,
      atoInfracionalGravidadeObs: null,
      numeroProcesso: "PROC123",
      dataDesinternacao: null,
    });

    const request = buildRequest(
      "PUT",
      "http://localhost/api/adolescentes/adol-1",
      { statusUnidade: "LIBERADO" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "adol-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.erro).toContain("Data de desinternacao");
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("API de adolescentes - historico infracional", () => {
  const baseExistente = {
    id: "adol-99",
    nomeCompleto: "Caso Historico",
    statusUnidade: "ATIVO",
    alojamentoAtualId: "aloj-x",
    alojamentoAtual: { casa: { nome: "Casa Azul" } },
    atoInfracionalAtual: "Roubo",
    atoInfracionalAno: 2023,
    atoInfracionalProcesso: "PROC-X",
    atoInfracionalGravidade: true,
    atoInfracionalGravidadeObs: null,
    numeroProcesso: "PROC-X",
    dataDesinternacao: null,
  };

  it("usa nome da casa ao registrar historico automatico", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-3" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-3" });
    adolescenteMock.findUnique.mockResolvedValue(baseExistente);
    txAdolescenteMock.update.mockResolvedValue({ id: "adol-99" });
    txAdolescenteMock.findUnique.mockResolvedValue({ id: "adol-99" });
    txHistoricoMock.findMany.mockResolvedValue([]);

    const request = buildRequest(
      "PUT",
      "http://localhost/api/adolescentes/adol-99",
      {
        statusUnidade: "LIBERADO",
        dataDesinternacao: "2024-05-10",
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "adol-99" }),
    });

    expect(response.status).toBe(200);
    expect(txHistoricoMock.create).toHaveBeenCalledTimes(1);
    expect(
      txHistoricoMock.create.mock.calls[0][0].data.unidadeInternacao
    ).toBe("Casa Azul");
  });

  it('define "Cense de Maringa" quando adolescente nao possui casa registrada', async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-4" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-4" });
    adolescenteMock.findUnique.mockResolvedValue({
      ...baseExistente,
      alojamentoAtual: null,
    });
    txAdolescenteMock.update.mockResolvedValue({ id: "adol-99" });
    txAdolescenteMock.findUnique.mockResolvedValue({ id: "adol-99" });
    txHistoricoMock.findMany.mockResolvedValue([]);

    const request = buildRequest(
      "PUT",
      "http://localhost/api/adolescentes/adol-99",
      {
        statusUnidade: "LIBERADO",
        dataDesinternacao: "2024-05-10",
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "adol-99" }) });

    expect(txHistoricoMock.create).toHaveBeenCalledTimes(1);
    expect(
      txHistoricoMock.create.mock.calls[0][0].data.unidadeInternacao
    ).toBe("Cense de Maringa");
  });
});
