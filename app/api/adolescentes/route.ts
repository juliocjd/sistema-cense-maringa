// app/api/adolescentes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para criar adolescente
const createAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  numeroProcesso: z.string().optional().nullable(),
  atoInfracionalAtual: z.string().optional().nullable(),
  statusUnidade: z
    .enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"])
    .default("ATIVO"),

  // Perfil de Risco
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoNumeroMembro: z.string().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),

  // Alertas
  alertaRiscoSuicidio: z.boolean().default(false),
  alertaPerfilMapeado: z.boolean().default(false),
  alertaSaudeConfidencial: z.boolean().default(false),
  alertaSaudeDetalhes: z.string().optional().nullable(),

  // Alocação
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),

  // Campos que podem vir do formulário mas não são salvos diretamente
  conflitosA: z.array(z.any()).optional(),
  conflitosB: z.array(z.any()).optional(),
});

// GET /api/adolescentes - Listar adolescentes com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtros disponíveis
    const status = searchParams.get("status");
    const busca = searchParams.get("busca");
    const casa_id = searchParams.get("casa_id");
    const grupo_id = searchParams.get("grupo_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query dinâmica
    const where: any = {};

    if (status) {
      where.statusUnidade = status;
    }

    if (busca) {
      where.OR = [
        { nomeCompleto: { contains: busca, mode: "insensitive" } },
        { numeroSms: { contains: busca } },
      ];
    }

    if (casa_id) {
      where.alojamentoAtual = {
        casaId: casa_id,
      };
    }

    if (grupo_id) {
      where.gruposMembros = {
        some: {
          grupoId: grupo_id,
          dataSaida: null, // Apenas membros ativos
        },
      };
    }

    // Buscar adolescentes
    const [adolescentes, total] = await Promise.all([
      prisma.adolescente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          alojamentoAtual: {
            include: {
              casa: true,
            },
          },
          faccao: true,
          bairroOrigem: true,
          gruposMembros: {
            where: { dataSaida: null },
            include: {
              grupo: true,
            },
          },
          conflitosA: true,
          conflitosB: true,
        },
        orderBy: {
          nomeCompleto: "asc",
        },
      }),
      prisma.adolescente.count({ where }),
    ]);

    // Formatar resposta em camelCase para o frontend
    const adolescentesFormatados = adolescentes.map((adolescente) => ({
      id: adolescente.id,
      nomeCompleto: adolescente.nomeCompleto,
      nomeSocial: adolescente.nomeSocial,
      fotoUrl: adolescente.fotoUrl,
      numeroSms: adolescente.numeroSms,
      statusUnidade: adolescente.statusUnidade,
      alojamentoAtualId: adolescente.alojamentoAtualId,

      // Alocação atual
      alojamentoAtual: adolescente.alojamentoAtual
        ? {
            id: adolescente.alojamentoAtual.id,
            casa: adolescente.alojamentoAtual.casa.nome,
            numero: adolescente.alojamentoAtual.numeroAlojamento,
            ala: adolescente.alojamentoAtual.ala,
          }
        : null,

      // Facção
      faccao: adolescente.faccao?.nomeFaccao || null,

      // Bairro
      bairro: adolescente.bairroOrigem
        ? `${adolescente.bairroOrigem.nomeBairro} - ${adolescente.bairroOrigem.cidade}`
        : null,

      // Grupos ativos
      grupos: adolescente.gruposMembros.map((gm) => gm.grupo.nomeGrupo),

      // Alertas
      alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
      alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
      alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,

      // Conflitos
      conflitosA: adolescente.conflitosA || [],
      conflitosB: adolescente.conflitosB || [],
    }));

    return NextResponse.json(adolescentesFormatados);
  } catch (error) {
    console.error("Erro ao buscar adolescentes:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar adolescentes", detalhes: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

// POST /api/adolescentes - Cadastrar novo adolescente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = createAdolescenteSchema.parse(body);

    // Remover campos que não devem ser salvos diretamente
    const { conflitosA, conflitosB, ...dadosParaSalvar } = validatedData;

    // Converter strings de data para Date e null para undefined
    const data = {
      ...dadosParaSalvar,
      nomeSocial: dadosParaSalvar.nomeSocial || undefined,
      fotoUrl: dadosParaSalvar.fotoUrl || undefined,
      numeroSms: dadosParaSalvar.numeroSms || undefined,
      numeroProcesso: dadosParaSalvar.numeroProcesso || undefined,
      atoInfracionalAtual: dadosParaSalvar.atoInfracionalAtual || undefined,
      faccaoGrupoId: dadosParaSalvar.faccaoGrupoId || undefined,
      faccaoNumeroMembro: dadosParaSalvar.faccaoNumeroMembro || undefined,
      bairroOrigemId: dadosParaSalvar.bairroOrigemId || undefined,
      riscoFuga: dadosParaSalvar.riscoFuga || undefined,
      alertaSaudeDetalhes: dadosParaSalvar.alertaSaudeDetalhes || undefined,
      alojamentoAtualId: dadosParaSalvar.alojamentoAtualId || undefined,
      faseInternacaoAtualId: dadosParaSalvar.faseInternacaoAtualId || undefined,
      dataNascimento: dadosParaSalvar.dataNascimento
        ? new Date(dadosParaSalvar.dataNascimento)
        : undefined,
      dataEntrada: dadosParaSalvar.dataEntrada
        ? new Date(dadosParaSalvar.dataEntrada)
        : new Date(),
    };

    // Criar adolescente
    const adolescente = await prisma.adolescente.create({
      data,
      include: {
        alojamentoAtual: {
          include: {
            casa: true,
          },
        },
        faccao: true,
        bairroOrigem: true,
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: request.user?.id, // TODO: Adicionar após implementar auth
        acao: "INSERT",
        tabelaAfetada: "Adolescentes",
        registroIdAfetado: adolescente.id,
        detalhesAlteracao: {
          nomeCompleto: adolescente.nomeCompleto,
          numeroSms: adolescente.numeroSms,
        },
        // ipOrigem: request.ip,
      },
    });

    return NextResponse.json(
      {
        id: adolescente.id,
        nomeCompleto: adolescente.nomeCompleto,
        numeroSms: adolescente.numeroSms,
        statusUnidade: adolescente.statusUnidade,
        mensagem: "Adolescente cadastrado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao cadastrar adolescente:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar adolescente" },
      { status: 500 }
    );
  }
}
