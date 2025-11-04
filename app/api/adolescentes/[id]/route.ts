// app/api/adolescentes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para atualizar adolescente
const updateAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  numeroProcesso: z.string().optional().nullable(),
  atoInfracionalAtual: z.string().optional().nullable(),
  statusUnidade: z.enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"]).optional(),

  // Perfil de Risco
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoNumeroMembro: z.string().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),

  // Alertas
  alertaRiscoSuicidio: z.boolean().optional(),
  alertaPerfilMapeado: z.boolean().optional(),
  alertaSaudeConfidencial: z.boolean().optional(),
  alertaSaudeDetalhes: z.string().optional().nullable(),

  // Alocação
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),
});

// GET /api/adolescentes/[id] - Buscar adolescente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adolescente = await prisma.adolescente.findUnique({
      where: { id },
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
        conflitosA: {
          include: {
            adolescenteB: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
        conflitosB: {
          include: {
            adolescenteA: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // Formatar resposta em camelCase
    const adolescenteFormatado = {
      id: adolescente.id,
      nomeCompleto: adolescente.nomeCompleto,
      nomeSocial: adolescente.nomeSocial,
      fotoUrl: adolescente.fotoUrl,
      numeroSms: adolescente.numeroSms,
      numeroProcesso: adolescente.numeroProcesso,
      dataNascimento: adolescente.dataNascimento?.toISOString().split("T")[0],
      dataEntrada: adolescente.dataEntrada?.toISOString().split("T")[0],
      atoInfracionalAtual: adolescente.atoInfracionalAtual,
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
      faccao: adolescente.faccao
        ? {
            id: adolescente.faccao.id,
            nome: adolescente.faccao.nomeFaccao,
          }
        : null,

      // Bairro
      bairroOrigem: adolescente.bairroOrigem
        ? {
            id: adolescente.bairroOrigem.id,
            nome: adolescente.bairroOrigem.nomeBairro,
            cidade: adolescente.bairroOrigem.cidade,
          }
        : null,

      // Grupos ativos
      grupos: adolescente.gruposMembros.map((gm) => ({
        id: gm.grupo.id,
        nome: gm.grupo.nomeGrupo,
      })),

      // Alertas
      alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
      alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
      alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,

      // Conflitos
      conflitosA: adolescente.conflitosA.map((c) => ({
        id: c.id,
        tipo: c.tipoConflito,
        status: c.status,
        adversario: c.adolescenteB,
      })),
      conflitosB: adolescente.conflitosB.map((c) => ({
        id: c.id,
        tipo: c.tipoConflito,
        status: c.status,
        adversario: c.adolescenteA,
      })),
    };

    return NextResponse.json(adolescenteFormatado);
  } catch (error) {
    console.error("Erro ao buscar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// PUT /api/adolescentes/[id] - Atualizar adolescente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar dados
    const validatedData = updateAdolescenteSchema.parse(body);

    // Verificar se adolescente existe
    const adolescenteExistente = await prisma.adolescente.findUnique({
      where: { id },
    });

    if (!adolescenteExistente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // Preparar dados para atualização (converter null para undefined)
    const dadosAtualizacao: any = {};

    if (validatedData.nomeCompleto !== undefined) {
      dadosAtualizacao.nomeCompleto = validatedData.nomeCompleto;
    }
    if (validatedData.nomeSocial !== undefined) {
      dadosAtualizacao.nomeSocial = validatedData.nomeSocial || undefined;
    }
    if (validatedData.fotoUrl !== undefined) {
      dadosAtualizacao.fotoUrl = validatedData.fotoUrl || undefined;
    }
    if (validatedData.numeroSms !== undefined) {
      dadosAtualizacao.numeroSms = validatedData.numeroSms || undefined;
    }
    if (validatedData.numeroProcesso !== undefined) {
      dadosAtualizacao.numeroProcesso = validatedData.numeroProcesso || undefined;
    }
    if (validatedData.atoInfracionalAtual !== undefined) {
      dadosAtualizacao.atoInfracionalAtual = validatedData.atoInfracionalAtual || undefined;
    }
    if (validatedData.statusUnidade !== undefined) {
      dadosAtualizacao.statusUnidade = validatedData.statusUnidade;
    }
    if (validatedData.faccaoGrupoId !== undefined) {
      dadosAtualizacao.faccaoGrupoId = validatedData.faccaoGrupoId || undefined;
    }
    if (validatedData.faccaoNumeroMembro !== undefined) {
      dadosAtualizacao.faccaoNumeroMembro = validatedData.faccaoNumeroMembro || undefined;
    }
    if (validatedData.bairroOrigemId !== undefined) {
      dadosAtualizacao.bairroOrigemId = validatedData.bairroOrigemId || undefined;
    }
    if (validatedData.riscoFuga !== undefined) {
      dadosAtualizacao.riscoFuga = validatedData.riscoFuga || undefined;
    }
    if (validatedData.alertaRiscoSuicidio !== undefined) {
      dadosAtualizacao.alertaRiscoSuicidio = validatedData.alertaRiscoSuicidio;
    }
    if (validatedData.alertaPerfilMapeado !== undefined) {
      dadosAtualizacao.alertaPerfilMapeado = validatedData.alertaPerfilMapeado;
    }
    if (validatedData.alertaSaudeConfidencial !== undefined) {
      dadosAtualizacao.alertaSaudeConfidencial = validatedData.alertaSaudeConfidencial;
    }
    if (validatedData.alertaSaudeDetalhes !== undefined) {
      dadosAtualizacao.alertaSaudeDetalhes = validatedData.alertaSaudeDetalhes || undefined;
    }
    if (validatedData.alojamentoAtualId !== undefined) {
      dadosAtualizacao.alojamentoAtualId = validatedData.alojamentoAtualId || undefined;
    }
    if (validatedData.faseInternacaoAtualId !== undefined) {
      dadosAtualizacao.faseInternacaoAtualId = validatedData.faseInternacaoAtualId || undefined;
    }

    // Converter datas
    if (validatedData.dataNascimento !== undefined) {
      dadosAtualizacao.dataNascimento = validatedData.dataNascimento
        ? new Date(validatedData.dataNascimento)
        : undefined;
    }
    if (validatedData.dataEntrada !== undefined) {
      dadosAtualizacao.dataEntrada = validatedData.dataEntrada
        ? new Date(validatedData.dataEntrada)
        : undefined;
    }

    // Atualizar adolescente
    const adolescenteAtualizado = await prisma.adolescente.update({
      where: { id },
      data: dadosAtualizacao,
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
        acao: "UPDATE",
        tabelaAfetada: "Adolescentes",
        registroIdAfetado: adolescenteAtualizado.id,
        detalhesAlteracao: {
          campos_alterados: Object.keys(dadosAtualizacao),
          valores_antigos: {
            nomeCompleto: adolescenteExistente.nomeCompleto,
            statusUnidade: adolescenteExistente.statusUnidade,
          },
          valores_novos: {
            nomeCompleto: adolescenteAtualizado.nomeCompleto,
            statusUnidade: adolescenteAtualizado.statusUnidade,
          },
        },
        // ipOrigem: request.ip,
      },
    });

    return NextResponse.json({
      id: adolescenteAtualizado.id,
      nomeCompleto: adolescenteAtualizado.nomeCompleto,
      statusUnidade: adolescenteAtualizado.statusUnidade,
      mensagem: "Adolescente atualizado com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
