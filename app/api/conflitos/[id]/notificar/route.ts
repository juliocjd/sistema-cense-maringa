import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notificarTecnicosSobreConflito } from "@/lib/notificacoes/tecnico";

type TipoConflito = "bairro" | "faccao" | "interno";

const ensureTipo = (valor: unknown): TipoConflito => {
  if (valor === "bairro" || valor === "faccao" || valor === "interno") {
    return valor;
  }
  return "interno";
};

const montarContatoTecnico = (tecnico?: { nome: string; email: string } | null) =>
  tecnico?.email ? { nome: tecnico.nome, email: tecnico.email } : null;

const buscarAdolescenteComTecnico = (where: object) => {
  return prisma.adolescente.findFirst({
    where,
    include: {
      tecnicoReferencia: {
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
              tecnicoReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
          adolescenteB: {
            select: {
              id: true,
              nomeCompleto: true,
              tecnicoReferencia: {
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
              tecnicoReferencia: {
                select: { nome: true, email: true },
              },
            },
          },
          adolescenteB: {
            select: {
              id: true,
              nomeCompleto: true,
              tecnicoReferencia: {
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
          tecnico: { nome: string; email: string } | null;
        }
      >();

      const adicionarParticipante = (dados?: {
        id: string;
        nomeCompleto: string;
        tecnicoReferencia: { nome: string; email: string } | null;
      }) => {
        if (!dados) return;
        if (!participantes.has(dados.id)) {
          participantes.set(dados.id, {
            id: dados.id,
            nomeCompleto: dados.nomeCompleto,
            tecnico: montarContatoTecnico(dados.tecnicoReferencia),
          });
        }
      };

      conflitosGrupo.forEach((entrada) => {
        adicionarParticipante(entrada.adolescenteA);
        adicionarParticipante(entrada.adolescenteB);
      });

      const participantesArray = Array.from(participantes.values());
      const contatos = participantesArray.filter(
        (participante) => participante.tecnico?.email
      );

      if (contatos.length === 0) {
        return NextResponse.json(
          {
            erro:
              "Os participantes deste conflito nao possuem tecnicos de referencia cadastrados para notificacao",
          },
          { status: 422 }
        );
      }

      const pivot =
        contatos.find((item) => item.id === conflito.adolescenteA.id) ??
        contatos[0];
      const demais = participantesArray.filter((item) => item.id !== pivot.id);

      for (const alvo of demais) {
        await notificarTecnicosSobreConflito({
          contexto: "CONFLITO_INTERNO",
          adolescente: {
            id: pivot.id,
            nomeCompleto: pivot.nomeCompleto,
            tecnico: pivot.tecnico,
          },
          adversario: {
            id: alvo.id,
            nomeCompleto: alvo.nomeCompleto,
            tecnico: alvo.tecnico,
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
        mensagem: `Notificacao enviada para ${demais.length} tecnico(s) vinculados ao grupo.`,
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

    const adolescenteA = await buscarAdolescenteComTecnico(filtroA);
    const adolescenteB = await buscarAdolescenteComTecnico(filtroB);

    if (!adolescenteA || !adolescenteB) {
      return NextResponse.json(
        {
          erro:
            "Nao existem adolescentes vinculados a este conflito com tecnicos de referencia cadastrados",
        },
        { status: 422 }
      );
    }

    await notificarTecnicosSobreConflito({
      contexto: "ALOCACAO",
      adolescente: {
        id: adolescenteA.id,
        nomeCompleto: adolescenteA.nomeCompleto,
        tecnico: montarContatoTecnico(adolescenteA.tecnicoReferencia),
      },
      adversario: {
        id: adolescenteB.id,
        nomeCompleto: adolescenteB.nomeCompleto,
        tecnico: montarContatoTecnico(adolescenteB.tecnicoReferencia),
      },
      mensagem: `Conflito preventivo registrado entre ${origemNome} e ${destinoNome}.`,
      nivelConflito,
      link: `${origem}/inteligencia/conflitos`,
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `Notificacao enviada para os tecnicos vinculados ao confronto ${origemNome} x ${destinoNome}`,
    });
  } catch (error) {
    console.error("Erro ao notificar conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao notificar tecnicos sobre este conflito",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}







