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
    logAuditoria: { create: vi.fn(), createMany: vi.fn() },
    adolescenteHistoricoGlobal: { createMany: vi.fn() },
    adolescenteTatuagemGlobal: { createMany: vi.fn() },
    txAdolescente: { update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    txHistorico: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    txTatuagem: { createMany: vi.fn() },
    txCasoInfracional: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    txCasoTipificacao: { deleteMany: vi.fn(), createMany: vi.fn() },
    alertaAtivoGlobal: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    txAlertas: { updateMany: vi.fn(), findMany: vi.fn() },
    historicoMovimentacaoGlobal: { create: vi.fn() },
    txHistoricoMovimentacao: { create: vi.fn() },
    txConflito: { findMany: vi.fn(), updateMany: vi.fn() },
    txComunicadoInterno: { findMany: vi.fn(), updateMany: vi.fn() },
  };

  const transaction = vi.fn().mockImplementation((callback: any) =>
    callback({
      adolescente: refs.txAdolescente,
      adolescenteHistoricoInfracional: refs.txHistorico,
      adolescenteTatuagem: refs.txTatuagem,
      adolescenteCasoInfracional: refs.txCasoInfracional,
      adolescenteCasoInfracionalTipificacao: refs.txCasoTipificacao,
      alertaAtivo: refs.txAlertas,
      historicoMovimentacao: refs.txHistoricoMovimentacao,
      logAuditoria: refs.logAuditoria,
      conflito: refs.txConflito,
      comunicadoInterno: refs.txComunicadoInterno,
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
      conflito: refs.txConflito,
      comunicadoInterno: refs.txComunicadoInterno,
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
    txCasoInfracional: txCasoInfracionalMock,
    txCasoTipificacao: txCasoTipificacaoMock,
    alertaAtivoGlobal: alertaAtivoGlobalMock,
    txAlertas: txAlertasMock,
    historicoMovimentacaoGlobal: historicoMovimentacaoGlobalMock,
    txHistoricoMovimentacao: txHistoricoMovimentacaoMock,
    txConflito: txConflitoMock,
    txComunicadoInterno: txComunicadoInternoMock,
  },
  transaction: transactionMock,
} = prismaSetup;

const mockedAuth = vi.mocked(auth as unknown as ReturnType<typeof vi.fn>);

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
    logAuditoriaMock.createMany,
    adolescenteHistoricoGlobalMock.createMany,
    adolescenteTatuagemGlobalMock.createMany,
    txAdolescenteMock.update,
    txAdolescenteMock.findUnique,
    txAdolescenteMock.findFirst,
    txHistoricoMock.findMany,
    txHistoricoMock.create,
    txHistoricoMock.deleteMany,
    txTatuagemMock.createMany,
    txCasoInfracionalMock.updateMany,
    txCasoInfracionalMock.findFirst,
    txCasoInfracionalMock.findMany,
    txCasoInfracionalMock.update,
    txCasoInfracionalMock.create,
    txCasoInfracionalMock.delete,
    txCasoInfracionalMock.deleteMany,
    txCasoTipificacaoMock.deleteMany,
    txCasoTipificacaoMock.createMany,
    alertaAtivoGlobalMock.count,
    alertaAtivoGlobalMock.groupBy,
    alertaAtivoGlobalMock.findMany,
    txAlertasMock.updateMany,
    txAlertasMock.findMany,
    historicoMovimentacaoGlobalMock.create,
    txHistoricoMovimentacaoMock.create,
    txConflitoMock.findMany,
    txConflitoMock.updateMany,
    txComunicadoInternoMock.findMany,
    txComunicadoInternoMock.updateMany,
  ].forEach((fn) => fn.mockReset());

  alertaAtivoGlobalMock.count.mockResolvedValue(0);
  alertaAtivoGlobalMock.groupBy.mockResolvedValue([]);
  alertaAtivoGlobalMock.findMany.mockResolvedValue([]);
  txAlertasMock.updateMany.mockResolvedValue({ count: 0 });
  txAlertasMock.findMany.mockResolvedValue([]);
  txCasoInfracionalMock.updateMany.mockResolvedValue({ count: 0 });
  txCasoInfracionalMock.findFirst.mockResolvedValue(null);
  txCasoInfracionalMock.findMany.mockResolvedValue([]);
  txAdolescenteMock.findFirst.mockResolvedValue(null);
  txCasoInfracionalMock.deleteMany.mockResolvedValue({ count: 0 });
  txCasoTipificacaoMock.deleteMany.mockResolvedValue({ count: 0 });
  txCasoTipificacaoMock.createMany.mockResolvedValue({ count: 0 });
  txHistoricoMock.deleteMany.mockResolvedValue({ count: 0 });
  txConflitoMock.findMany.mockResolvedValue([]);
  txConflitoMock.updateMany.mockResolvedValue({ count: 0 });
  txComunicadoInternoMock.findMany.mockResolvedValue([]);
  txComunicadoInternoMock.updateMany.mockResolvedValue({ count: 0 });
  logAuditoriaMock.createMany.mockResolvedValue({ count: 0 });

  transactionMock.mockReset();
  transactionMock.mockImplementation((callback: any) =>
    callback({
      adolescente: txAdolescenteMock,
      adolescenteHistoricoInfracional: txHistoricoMock,
      adolescenteTatuagem: txTatuagemMock,
      adolescenteCasoInfracional: txCasoInfracionalMock,
      adolescenteCasoInfracionalTipificacao: txCasoTipificacaoMock,
      alertaAtivo: txAlertasMock,
      historicoMovimentacao: txHistoricoMovimentacaoMock,
      logAuditoria: logAuditoriaMock,
      conflito: txConflitoMock,
      comunicadoInterno: txComunicadoInternoMock,
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

describe("API de adolescentes - casos infracionais historicos", () => {
  const baseExistente = {
    id: "adol-99",
    nomeCompleto: "Caso Historico",
    statusUnidade: "ATIVO",
    numeroInterno: 12,
    alojamentoAtualId: "aloj-x",
    alojamentoAtual: { casa: { nome: "Casa Azul" } },
    atoInfracionalGravidade: true,
    atoInfracionalGravidadeObs: null,
    casosInfracionais: [
      {
        id: "caso-atual-1",
        status: "ATUAL",
        numeroProcesso: "PROC-X",
        anoFato: 2023,
        comarca: null,
        narrativa: "Narrativa do caso atual",
        tipificacoes: [
          {
            id: "tip-1",
            ordem: 1,
            atoInfracionalCatalogoId: "catalogo-1",
            descricaoManual: "Roubo",
            principal: true,
            naturezaExecucao: null,
            qualificadora: null,
            majorante: null,
            observacoes: null,
            atoInfracionalCatalogo: {
              id: "catalogo-1",
              nome: "Roubo",
            },
          },
        ],
      },
    ],
    dataDesinternacao: null,
  };

  it("reclassifica o caso atual como historico ao sair do status ativo", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-3" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-3" });
    adolescenteMock.findUnique.mockResolvedValue(baseExistente);
    txAdolescenteMock.update.mockResolvedValue({ id: "adol-99" });
    txAdolescenteMock.findUnique.mockResolvedValue({ id: "adol-99" });

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
    expect(txCasoInfracionalMock.updateMany).toHaveBeenCalledWith({
      where: {
        adolescenteId: "adol-99",
        status: "ATUAL",
      },
      data: {
        status: "HISTORICO",
      },
    });
    expect(
      txHistoricoMock.create
    ).not.toHaveBeenCalled();
  });

  it("reaproveita o caso historico com o mesmo processo ao retornar para ativo", async () => {
    const casoHistoricoId = "11111111-1111-4111-8111-111111111111";
    const catalogoId = "22222222-2222-4222-8222-222222222222";

    mockedAuth.mockResolvedValue({ user: { id: "operador-5" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-5" });
    adolescenteMock.findUnique.mockResolvedValue({
      ...baseExistente,
      statusUnidade: "EVADIDO",
      numeroInterno: null,
      alojamentoAtualId: null,
      alojamentoAtual: null,
      dataDesinternacao: new Date("2024-05-11T00:00:00.000Z"),
      casosInfracionais: [
        {
          id: casoHistoricoId,
          status: "HISTORICO",
          numeroProcesso: "PROC-X",
          anoFato: 2023,
          comarca: "Maringa",
          narrativa: "Narrativa do caso atual",
          tipificacoes: [
            {
              id: "tip-hist-1",
              ordem: 1,
              atoInfracionalCatalogoId: catalogoId,
              descricaoManual: "Roubo",
              principal: true,
              naturezaExecucao: null,
              qualificadora: null,
              majorante: null,
              observacoes: null,
              atoInfracionalCatalogo: {
                id: catalogoId,
                nome: "Roubo",
              },
            },
          ],
        },
      ],
    });
    txAdolescenteMock.update.mockResolvedValue({ id: "adol-99" });
    txAdolescenteMock.findUnique.mockResolvedValue({ id: "adol-99" });
    txCasoInfracionalMock.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: casoHistoricoId });
    txCasoInfracionalMock.findMany.mockResolvedValueOnce([]);

    const request = buildRequest(
      "PUT",
      "http://localhost/api/adolescentes/adol-99",
      {
        statusUnidade: "ATIVO",
        numeroInterno: 12,
        casoInfracionalAtual: {
          numeroProcesso: "PROC-X",
          anoFato: 2023,
          comarca: "Maringa",
          narrativa: "Narrativa do caso atual",
          tipificacoes: [
            {
              ordem: 1,
              catalogoId,
              descricao: "Roubo",
              principal: true,
            },
          ],
        },
        casosInfracionais: [
          {
            id: casoHistoricoId,
            status: "HISTORICO",
            numeroProcesso: "PROC-X",
            anoFato: 2023,
            comarca: "Maringa",
            narrativa: "Narrativa do caso atual",
            tipificacoes: [
              {
                ordem: 1,
                catalogoId,
                descricao: "Roubo",
                principal: true,
              },
            ],
          },
        ],
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "adol-99" }),
    });

    expect(response.status).toBe(200);
    expect(txCasoInfracionalMock.update).toHaveBeenCalledWith({
      where: { id: casoHistoricoId },
      data: {
        status: "ATUAL",
        numeroProcesso: "PROC-X",
        anoFato: 2023,
        comarca: "Maringa",
        narrativa: "Narrativa do caso atual",
      },
    });
    expect(txCasoInfracionalMock.create).not.toHaveBeenCalled();
    expect(txCasoInfracionalMock.deleteMany).toHaveBeenCalledWith({
      where: {
        adolescenteId: "adol-99",
        id: { not: casoHistoricoId },
        numeroProcesso: {
          equals: "PROC-X",
          mode: "insensitive",
        },
      },
    });
  });

  it("migra historico legado informado no payload para casos estruturados", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-4" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-4" });
    adolescenteMock.findUnique.mockResolvedValue({
      ...baseExistente,
      casosInfracionais: [],
    });
    txAdolescenteMock.update.mockResolvedValue({ id: "adol-99" });
    txAdolescenteMock.findUnique.mockResolvedValue({ id: "adol-99" });
    txCasoInfracionalMock.findMany.mockResolvedValue([]);
    txCasoInfracionalMock.create.mockResolvedValue({ id: "caso-hist-1" });

    const request = buildRequest(
      "PUT",
      "http://localhost/api/adolescentes/adol-99",
      {
        historicoInfracional: [
          {
            descricao: "Roubo qualificado",
            ano: 2022,
            processo: "PROC-HIST-1",
            comarca: "Maringa",
            observacoes: "Registro legado",
          },
        ],
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "adol-99" }),
    });

    expect(response.status).toBe(200);
    expect(txCasoInfracionalMock.create).toHaveBeenCalledWith({
      data: {
        adolescenteId: "adol-99",
        status: "HISTORICO",
        numeroProcesso: "PROC-HIST-1",
        anoFato: 2022,
        comarca: "Maringa",
        narrativa: null,
      },
      select: { id: true },
    });
    expect(
      txCasoTipificacaoMock.createMany
    ).toHaveBeenCalledWith({
      data: [
        {
          casoId: "caso-hist-1",
          ordem: 1,
          atoInfracionalCatalogoId: undefined,
          descricaoManual: "Roubo qualificado",
          principal: true,
          naturezaExecucao: null,
          qualificadora: null,
          majorante: null,
          observacoes: "Registro legado",
        },
      ],
    });
    expect(txHistoricoMock.deleteMany).toHaveBeenCalledWith({
      where: { adolescenteId: "adol-99" },
    });
  });
});
