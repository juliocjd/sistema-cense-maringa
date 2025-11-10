import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notificarAgentesSobreConflito } from "@/lib/notificacoes/agente";

type TipoConflito = "bairro" | "faccao" | "interno";

const ensureTipo = (valor: unknown): TipoConflito => {
  if (valor === "bairro" || valor === "faccao" || valor === "interno") {
    return valor;
  }
  return "interno";
};

const montarContatoAgente = (agente?: { nome: string; email: string } | null) =>
  agente?.email ? { nome: agente.nome, email: agente.email } : null;

const buscarAdolescenteComAgente = (where: object) => {
  return prisma.adolescente.findFirst({
    where,
    include: {
      agenteReferencia: {
        select: {
          nome: true,
          email: true,
        },
      },
    },
  });
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const tipo = ensureTipo(body.tipo);
    const { id } = await params;
    const origem = request.nextUrl.origin;

    if (tipo === "interno") {
      const conflito = await prisma.conflito.findUnique({
        where: { id },
        include: {
          adolescenteA: {
            select: {
              id: true,
              nomeCompleto: true,
              agenteReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
          adolescenteB: {
            select: {
              id: true,
              nomeCompleto: true,
              agenteReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
        },
      });

      if (!conflito) {
        return NextResponse.json(
          { erro: "Conflito nao encontrado" },
          { status: 404 }
        );
      }

      const grupoId = conflito.registroGrupoId ?? conflito.id;
      const conflitosGrupo = await prisma.conflito.findMany({
        where: grupoId
          ? {
              OR: [
                { registroGrupoId: grupoId },
                { id: grupoId },
              ],
            }
          : { id },
        include: {
          adolescenteA: {
            select: {
              id: true,
              nomeCompleto: true,
              agenteReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
          adolescenteB: {
            select: {
              id: true,
              nomeCompleto: true,
              agenteReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
        },
      });

      const participantes = new Map<
        string,
        {
          id: string;
          nomeCompleto: string;
          agente: { nome: string; email: string } | null;
        }
      >();

      const adicionarParticipante = (dados?: {
        id: string;
        nomeCompleto: string;
        agenteReferencia: { nome: string; email: string } | null;
      }) => {
        if (!dados) return;
        if (!participantes.has(dados.id)) {
          participantes.set(dados.id, {
            id: dados.id,
            nomeCompleto: dados.nomeCompleto,
            agente: montarContatoAgente(dados.agenteReferencia),
          });
        }
      };

      conflitosGrupo.forEach((entrada) => {
        adicionarParticipante(entrada.adolescenteA);
        adicionarParticipante(entrada.adolescenteB);
      });

      const contatos = Array.from(participantes.values()).filter(
        (participante) => participante.agente?.email
      );

      if (contatos.length < 2) {
        return NextResponse.json(
          {
            erro:
              "Os participantes deste conflito nao possuem agentes de referencia suficientes para notificacao",
          },
          { status: 422 }
        );
      }

      const pivot =
        contatos.find((item) => item.id === conflito.adolescenteA.id) ??
        contatos[0];
      const demais = contatos.filter((item) => item.id !== pivot.id);

      for (const alvo of demais) {
        await notificarAgentesSobreConflito({
          contexto: "CONFLITO_INTERNO",
          adolescente: {
            id: pivot.id,
            nomeCompleto: pivot.nomeCompleto,
            agente: pivot.agente,
          },
          adversario: {
            id: alvo.id,
            nomeCompleto: alvo.nomeCompleto,
            agente: alvo.agente,
          },
          mensagem: `Conflito interno do tipo ${
            conflito.tipoConflito ?? "OUTROS"
          } registrado.`,
          nivelConflito: conflito.status,
          link: `${origem}/conflitos/${id}`,
        });
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `Notificacao enviada para ${demais.length} agente(s) vinculados ao grupo.`,
      });
    }

    let origemNome = "";
    let destinoNome = "";
    let nivelConflito = "ATIVO";
    let filtroA: object | null = null;
    let filtroB: object | null = null;

    if (tipo === "bairro") {
      const conflitoBairro = await prisma.bairroConflito.findUnique({
        where: { id },
        include: { bairroA: true, bairroB: true },
      });

      if (!conflitoBairro) {
        return NextResponse.json(
          { erro: "Conflito territorial nao encontrado" },
          { status: 404 }
        );
      }

      origemNome = conflitoBairro.bairroA?.nomeBairro ?? "Origem desconhecida";
      destinoNome = conflitoBairro.bairroB?.nomeBairro ?? "Destino desconhecido";
      nivelConflito = conflitoBairro.status;
      filtroA = { bairroOrigemId: conflitoBairro.bairroAId };
      filtroB = { bairroOrigemId: conflitoBairro.barroBId };
    } else {
      const conflitoFaccao = await prisma.faccaoConflito.findUnique({
        where: { id },
        include: { faccaoA: true, faccaoB: true },
      });

      if (!conflitoFaccao) {
        return NextResponse.json(
          { erro: "Conflito entre faccoes nao encontrado" },
          { status: 404 }
        );
      }

      origemNome = conflitoFaccao.faccaoA?.nomeFaccao ?? "Origem desconhecida";
      destinoNome = conflitoFaccao.faccaoB?.nomeFaccao ?? "Destino desconhecido";
      nivelConflito = conflitoFaccao.status;
      filtroA = { faccaoGrupoId: conflitoFaccao.faccaoAId };
      filtroB = { faccaoGrupoId: conflitoFaccao.faccaoBId };
    }

    if (!filtroA || !filtroB) {
      return NextResponse.json(
        { erro: "Nao foi possivel identificar os adolescentes envolvidos" },
        { status: 422 }
      );
    }

    const adolescenteA = await buscarAdolescenteComAgente(filtroA);
    const adolescenteB = await buscarAdolescenteComAgente(filtroB);

    if (!adolescenteA || !adolescenteB) {
      return NextResponse.json(
        {
          erro:
            "Nao existem adolescentes vinculados a este conflito com agentes de referencia cadastrados",
        },
        { status: 422 }
      );
    }

    await notificarAgentesSobreConflito({
      contexto: "ALOCACAO",
      adolescente: {
        id: adolescenteA.id,
        nomeCompleto: adolescenteA.nomeCompleto,
        agente: montarContatoAgente(adolescenteA.agenteReferencia),
      },
      adversario: {
        id: adolescenteB.id,
        nomeCompleto: adolescenteB.nomeCompleto,
        agente: montarContatoAgente(adolescenteB.agenteReferencia),
      },
      mensagem: `Conflito preventivo registrado entre ${origemNome} e ${destinoNome}.`,
      nivelConflito,
      link: `${origem}/inteligencia/conflitos`,
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `Notificacao enviada para os agentes vinculados ao confronto ${origemNome} x ${destinoNome}`,
    });
  } catch (error) {
    console.error("Erro ao notificar conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao notificar agentes sobre este conflito",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
