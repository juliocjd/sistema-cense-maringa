import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CiResumo = {
  numero: number;
  ano: number;
  tipoCI: string | null;
  resumoCI: string | null;
};

type BairroBasico = {
  id: string;
  nomeBairro: string;
  cidade: string;
};

type BairroFormatado = {
  id: string;
  nome: string;
  cidade: string | null;
};

type DestinoContexto = {
  bairroOrigem: BairroFormatado | null;
  bairroDestino: BairroFormatado | null;
  destinoDescricao: string | null;
  conflitoTerritorial:
    | {
        id: string;
        status: string;
        origem: string;
        destino: string;
      }
    | null;
};

const limparTexto = (valor?: string | null): string | null => {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : null;
};

const formatarCi = (ci?: CiResumo | null): string | null => {
  if (!ci) return null;
  const tipo = ci.tipoCI ? ` (${ci.tipoCI})` : "";
  return `CI ${ci.numero}/${ci.ano}${tipo}`;
};

function formatarBairro(
  bairro?: BairroBasico | null
): BairroFormatado | null {
  if (!bairro) return null;
  return {
    id: bairro.id,
    nome: bairro.nomeBairro,
    cidade: bairro.cidade ?? null,
  };
}

const descreverBairro = (bairro?: BairroFormatado | null): string | null => {
  if (!bairro) return null;
  return bairro.cidade ? `${bairro.nome} - ${bairro.cidade}` : bairro.nome;
};

const descreverPessoa = (nome?: string | null, sms?: string | null): string => {
  if (nome && sms) return `${nome} (SMS ${sms})`;
  if (nome) return nome;
  if (sms) return `SMS ${sms}`;
  return "adolescente não identificado";
};

const adicionarTexto = (lista: string[], texto?: string | null) => {
  if (!texto) return;
  const limpo = texto.trim();
  if (limpo.length === 0) return;
  lista.push(limpo);
};

const limitarLista = (itens: string[], limite = 3): string => {
  if (itens.length === 0) return "";
  const primeiros = itens.slice(0, limite);
  const resto = itens.length - primeiros.length;
  return resto > 0
    ? `${primeiros.join("; ")} (+${resto} registro${resto > 1 ? "s" : ""})`
    : primeiros.join("; ");
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const adolescenteId = url.searchParams.get("adolescenteId");
    const bairroDestinoId = url.searchParams.get("bairroDestinoId");
    const destinoDescricao = limparTexto(url.searchParams.get("destinoDescricao"));

    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "ID do adolescente é obrigatório" },
        { status: 400 }
      );
    }

    const adolescentePromise = prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        faccao: true,
        bairroOrigem: true,
        alojamentoAtual: {
          include: {
            casa: true,
          },
        },
        faseInternacaoAtual: true,
        conflitosA: {
          where: { status: "ATIVO" },
          include: {
            adolescenteB: {
              select: {
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            ciOrigem: {
              select: {
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
              },
            },
          },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: {
            adolescenteA: {
              select: {
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            ciOrigem: {
              select: {
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
              },
            },
          },
        },
        tatuagens: {
          include: {
            tatuagemCatalogo: true,
          },
        },
        historicoInfracional: {
          orderBy: {
            ano: "desc",
          },
        },
        comunicadosInternos: {
          include: {
            ci: true,
          },
          take: 5,
        },
        alertasAtivos: {
          where: { desativadoEm: null },
          include: {
            ciOrigem: {
              select: {
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
              },
            },
          },
        },
        gruposMembros: {
          where: {
            dataSaida: null,
          },
          include: {
            grupo: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    const bairroDestinoPromise = bairroDestinoId
      ? prisma.bairro.findUnique({
          where: { id: bairroDestinoId },
        })
      : Promise.resolve(null);

    const [adolescente, bairroDestino] = await Promise.all([
      adolescentePromise,
      bairroDestinoPromise,
    ]);

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    const origemBairro = formatarBairro(adolescente.bairroOrigem as BairroBasico | null);
    const destinoBairro = bairroDestino ? formatarBairro(bairroDestino) : null;

    let conflitosOrigemBrutos:
      | Array<{
          id: string;
          status: string;
          bairroAId: string;
          barroBId: string;
          bairroA: BairroBasico;
          bairroB: BairroBasico;
        }>
      | null = null;

    if (origemBairro) {
      conflitosOrigemBrutos = await prisma.bairroConflito.findMany({
        where: {
          status: "ATIVO",
          OR: [{ bairroAId: origemBairro.id }, { barroBId: origemBairro.id }],
        },
        include: {
          bairroA: true,
          bairroB: true,
        },
      });
    }

    const conflitoTerritorial =
      origemBairro &&
      destinoBairro &&
      conflitosOrigemBrutos?.find(
        (registro) =>
          (registro.bairroAId === origemBairro.id &&
            registro.barroBId === destinoBairro.id) ||
          (registro.bairroAId === destinoBairro.id &&
            registro.barroBId === origemBairro.id)
      );

    const conflitosOrigemDescritos =
      conflitosOrigemBrutos
        ?.map((registro) => {
          const outro =
            registro.bairroAId === origemBairro?.id
              ? registro.bairroB
              : registro.bairroA;
          if (!outro) return null;
          const cidade = outro.cidade ? ` - ${outro.cidade}` : "";
          return `${outro.nomeBairro}${cidade}`;
        })
        .filter((item): item is string => Boolean(item)) ?? [];

    const destinoContexto: DestinoContexto = {
      bairroOrigem: origemBairro,
      bairroDestino: destinoBairro,
      destinoDescricao,
      conflitoTerritorial: conflitoTerritorial
        ? {
            id: conflitoTerritorial.id,
            status: conflitoTerritorial.status,
            origem: `${conflitoTerritorial.bairroA.nomeBairro} - ${conflitoTerritorial.bairroA.cidade}`,
            destino: `${conflitoTerritorial.bairroB.nomeBairro} - ${conflitoTerritorial.bairroB.cidade}`,
          }
        : null,
    };

    let pontuacaoRiscoFuga = 0;
    let pontuacaoRiscoAgressao = 0;
    let pontuacaoRiscoAutolesao = 0;
    const fundamentacoes: string[] = [];
    const fatoresAgravantes: string[] = [];

    // 1. Ato infracional atual
    const atoAtualPartes = [
      adolescente.atoInfracionalAtual,
      adolescente.atoInfracionalAno ? `(${adolescente.atoInfracionalAno})` : null,
      adolescente.atoInfracionalProcesso
        ? `Processo ${adolescente.atoInfracionalProcesso}`
        : null,
    ].filter(Boolean);

    if (atoAtualPartes.length > 0) {
      pontuacaoRiscoFuga += adolescente.atoInfracionalGravidade ? 30 : 10;
      pontuacaoRiscoAgressao += adolescente.atoInfracionalGravidade ? 30 : 5;

      adicionarTexto(
        fatoresAgravantes,
        adolescente.atoInfracionalGravidade
          ? `Ato infracional grave em apuração: ${atoAtualPartes.join(" ")}`
          : `Ato infracional atual: ${atoAtualPartes.join(" ")}`
      );

      if (adolescente.atoInfracionalGravidade) {
        let complementoGravidade = "";
        if (adolescente.atoInfracionalGravidadeObs?.trim()) {
          complementoGravidade = ` Consta indicação no sistema de que o ato possui repercussão ou gravidade elevada, nos seguintes termos: ${adolescente.atoInfracionalGravidadeObs.trim()}`;
        }
        adicionarTexto(
          fundamentacoes,
          `Consta ato infracional de natureza grave (${atoAtualPartes.join(
            " "
          )}), indicando risco concreto de resistência e reiteração.${complementoGravidade}`
        );
      } else {
        adicionarTexto(
          fundamentacoes,
          `Ato infracional em apuração: ${atoAtualPartes.join(
            " "
          )}, considerado na avaliação de risco.`
        );
      }
    }

    // 2. Histórico infracional
    if (adolescente.historicoInfracional.length > 0) {
      const atosGraves = adolescente.historicoInfracional.filter(
        (registro) => registro.atoInfracionalGravidade
      );
      const totalAtos = adolescente.historicoInfracional.length;

      pontuacaoRiscoFuga += Math.min(totalAtos * 5, 20);
      pontuacaoRiscoAgressao += Math.min(atosGraves.length * 10, 30);

      adicionarTexto(
        fatoresAgravantes,
        `Histórico infracional registra ${totalAtos} ocorrência(s), ${atosGraves.length} com gravidade reconhecida`
      );

      const historicoDetalhado = adolescente.historicoInfracional
        .slice(0, 3)
        .map((registro) => {
          const itens = [
            registro.atoInfracionalDescricao,
            registro.atoInfracionalAno ? `(${registro.atoInfracionalAno})` : null,
            registro.atoInfracionalProcesso
              ? `Processo ${registro.atoInfracionalProcesso}`
              : null,
            registro.atoInfracionalGravidade ? "gravidade reconhecida" : null,
          ].filter(Boolean);
          return itens.join(" - ");
        });

      adicionarTexto(
        fundamentacoes,
        `Reincidência comprovada: ${limitarLista(historicoDetalhado)}.`
      );
    }

    // 3. Risco de suicídio
    if (adolescente.alertaRiscoSuicidio) {
      pontuacaoRiscoAutolesao += 50;
      pontuacaoRiscoAgressao += 20;
      adicionarTexto(
        fatoresAgravantes,
        "Protocolo ativo de risco de suicídio/autolesão"
      );
      adicionarTexto(
        fundamentacoes,
        "Há protocolo vigente de risco de suicídio, exigindo contenção para proteger a integridade física do adolescente, da equipe e de terceiros, conforme Súmula Vinculante nº 11 do STF."
      );
    }

    // 4. Alerta de saúde
    if (adolescente.alertaSaudeConfidencial) {
      pontuacaoRiscoAutolesao += 15;
      adicionarTexto(fatoresAgravantes, "Alerta de saúde confidencial ativo");
      adicionarTexto(
        fundamentacoes,
        adolescente.alertaSaudeDetalhes
          ? `Condição clínica que demanda supervisão durante deslocamentos: ${adolescente.alertaSaudeDetalhes}`
          : "Condição clínica monitorada exige supervisão em deslocamentos."
      );
    }

    // 5. Facção
    if (adolescente.faccao) {
      pontuacaoRiscoFuga += 25;
      pontuacaoRiscoAgressao += 35;
      adicionarTexto(
        fatoresAgravantes,
        `Vínculo faccional identificado: ${adolescente.faccao.nomeFaccao}`
      );

      let conflitosFaccionais = 0;
      if (adolescente.faccaoGrupoId) {
        conflitosFaccionais = await prisma.faccaoConflito.count({
          where: {
            status: "ATIVO",
            OR: [
              { faccaoAId: adolescente.faccaoGrupoId },
              { faccaoBId: adolescente.faccaoGrupoId },
            ],
          },
        });
      }

      if (conflitosFaccionais > 0) {
        pontuacaoRiscoAgressao += 20;
        adicionarTexto(
          fatoresAgravantes,
          `Facção possui conflitos cadastrados com ${conflitosFaccionais} grupo(s)`
        );
      }

      adicionarTexto(
        fundamentacoes,
        `Vínculo orgânico com ${adolescente.faccao.nomeFaccao}, com risco de articulação externa e retaliações durante deslocamentos.`
      );
    }

    // 6. Tatuagens
    if (adolescente.tatuagens.length > 0) {
      const alto = adolescente.tatuagens.filter(
        (item) => item.tatuagemCatalogo?.nivelRisco === "ALTO"
      );
      const medio = adolescente.tatuagens.filter(
        (item) => item.tatuagemCatalogo?.nivelRisco === "MEDIO"
      );

      pontuacaoRiscoFuga += alto.length * 10 + medio.length * 5;
      pontuacaoRiscoAgressao += alto.length * 15 + medio.length * 7;

      if (alto.length > 0) {
        const lista = alto
          .map((item) => item.tatuagemCatalogo?.nomeSimbolo ?? "Símbolo não identificado")
          .join(", ");
        adicionarTexto(
          fatoresAgravantes,
          `${alto.length} tatuagem(ns) de alto risco: ${lista}`
        );
        adicionarTexto(
          fundamentacoes,
          `Marcas corporais catalogadas (${lista}) associam o adolescente a delitos violentos/faccionais, reforçando a necessidade de contenção reforçada.`
        );
      }

      if (medio.length > 0) {
        adicionarTexto(
          fatoresAgravantes,
          `${medio.length} tatuagem(ns) classificadas como risco médio`
        );
      }
    }

    // 7. Conflitos interpessoais
    const conflitosInterpessoais = [
      ...adolescente.conflitosA.map((registro) => ({
        nome: descreverPessoa(
          registro.adolescenteB?.nomeCompleto,
          registro.adolescenteB?.numeroSms
        ),
        tipo: registro.tipoConflito,
        descricao: registro.descricao,
        ci: formatarCi(registro.ciOrigem),
      })),
      ...adolescente.conflitosB.map((registro) => ({
        nome: descreverPessoa(
          registro.adolescenteA?.nomeCompleto,
          registro.adolescenteA?.numeroSms
        ),
        tipo: registro.tipoConflito,
        descricao: registro.descricao,
        ci: formatarCi(registro.ciOrigem),
      })),
    ];

    const totalConflitosAtivos =
      adolescente.conflitosA.length + adolescente.conflitosB.length;

    if (totalConflitosAtivos > 0) {
      pontuacaoRiscoAgressao += Math.min(totalConflitosAtivos * 15, 40);
      adicionarTexto(
        fatoresAgravantes,
        `${totalConflitosAtivos} conflito(s) interpessoal(is) ativo(s)`
      );
      const detalhesConflitos = conflitosInterpessoais
        .slice(0, 3)
        .map((item) =>
          [
            `com ${item.nome}`,
            item.tipo ? `(${item.tipo})` : null,
            item.ci ? `registrado em ${item.ci}` : null,
            item.descricao,
          ]
            .filter(Boolean)
            .join(" - ")
        );
      adicionarTexto(
        fundamentacoes,
        `Conflitos ativos: ${limitarLista(detalhesConflitos)}.`
      );
    }

    // 8. Comunicados internos
    const cisRecentes = adolescente.comunicadosInternos.length;
    if (cisRecentes > 0) {
      pontuacaoRiscoAgressao += Math.min(cisRecentes * 5, 20);
      const detalhesCis = adolescente.comunicadosInternos
        .map((registro) => registro.ci)
        .filter(Boolean)
        .map((ci) => {
          const referencia = formatarCi(ci as CiResumo);
          const resumo = ci?.resumoCI ? ` - ${ci.resumoCI}` : "";
          return `${referencia}${resumo}`;
        });

      adicionarTexto(
        fatoresAgravantes,
        `${cisRecentes} Comunicado(s) Interno(s) recentes`
      );
      adicionarTexto(
        fundamentacoes,
        `Comunicados internos recentes: ${limitarLista(detalhesCis)}.`
      );
    }

    // 9. Alertas ativos
    if (adolescente.alertasAtivos.length > 0) {
      const alertasCriticos = adolescente.alertasAtivos.filter(
        (alerta) => alerta.nivelRisco === "CRITICO"
      );
      const alertasAltos = adolescente.alertasAtivos.filter(
        (alerta) => alerta.nivelRisco === "ALTO"
      );

      pontuacaoRiscoFuga += alertasCriticos.length * 20 + alertasAltos.length * 10;
      pontuacaoRiscoAgressao += alertasCriticos.length * 25 + alertasAltos.length * 12;

      adicionarTexto(
        fatoresAgravantes,
        `${adolescente.alertasAtivos.length} alerta(s) ativos (${alertasCriticos.length} crítico(s), ${alertasAltos.length} alto(s))`
      );

      const detalhesAlertas = adolescente.alertasAtivos
        .slice(0, 3)
        .map((alerta) => {
          const referencia = formatarCi(alerta.ciOrigem);
          return [
            alerta.tipoAlerta ?? "Alerta operacional",
            alerta.nivelRisco ? `nível ${alerta.nivelRisco}` : null,
            alerta.descricaoAlerta,
            referencia,
          ]
            .filter(Boolean)
            .join(" - ");
        });

      adicionarTexto(
        fundamentacoes,
        `Alertas ativos registrados no sistema: ${limitarLista(detalhesAlertas)}.`
      );
    }

    // 10. Risco de fuga cadastrado
    if (adolescente.riscoFuga) {
      const risco = adolescente.riscoFuga.toUpperCase();
      if (risco === "ALTO") {
        pontuacaoRiscoFuga += 30;
        adicionarTexto(fatoresAgravantes, "Avaliação prévia de alto risco de fuga");
      } else if (risco === "MEDIO" || risco === "MÉDIO") {
        pontuacaoRiscoFuga += 15;
        adicionarTexto(fatoresAgravantes, "Avaliação prévia de risco médio de fuga");
      }
    }

    // 11. Origem e destino territoriais
    if (origemBairro) {
      pontuacaoRiscoFuga += 10;
      adicionarTexto(
        fatoresAgravantes,
        `Origem territorial monitorada: ${descreverBairro(origemBairro)}${
          conflitosOrigemDescritos.length > 0
            ? ` (conflito(s) ativo(s) com ${limitarLista(conflitosOrigemDescritos)})`
            : ""
        }`
      );
      adicionarTexto(
        fundamentacoes,
        `Adolescente oriundo de ${descreverBairro(
          origemBairro
        )}, área acompanhada pelo módulo de inteligência territorial${
          conflitosOrigemDescritos.length > 0
            ? `, com conflitos registrados contra ${limitarLista(conflitosOrigemDescritos)}`
            : ""
        }.`
      );
    }

    if (destinoBairro) {
      adicionarTexto(
        fatoresAgravantes,
        `Destino informado: ${descreverBairro(destinoBairro)}`
      );
      adicionarTexto(
        fundamentacoes,
        `Movimentação prevista para ${descreverBairro(
          destinoBairro
        )}, incluída na análise automática.`
      );
    } else if (destinoDescricao) {
      adicionarTexto(fatoresAgravantes, `Destino informado: ${destinoDescricao}`);
    }

    if (destinoContexto.conflitoTerritorial) {
      pontuacaoRiscoAgressao += 25;
      pontuacaoRiscoFuga += 15;
      adicionarTexto(
        fatoresAgravantes,
        `Conflito territorial mapeado (${destinoContexto.conflitoTerritorial.origem} x ${destinoContexto.conflitoTerritorial.destino})`
      );
      adicionarTexto(
        fundamentacoes,
        `Registro de conflito territorial ativo (${destinoContexto.conflitoTerritorial.origem} x ${destinoContexto.conflitoTerritorial.destino}), exigindo variação de rota e contenção reforçada.`
      );
    }

    // 12. Alojamento e grupos
    if (adolescente.alojamentoAtual?.numeroAlojamento && adolescente.alojamentoAtual?.casa) {
      adicionarTexto(
        fundamentacoes,
        `Atualmente alojado no ${adolescente.alojamentoAtual.numeroAlojamento} da Casa ${adolescente.alojamentoAtual.casa.nome}, alvo de monitoramento constante.`
      );
    }

    if (adolescente.gruposMembros.length > 0) {
      const grupos = adolescente.gruposMembros.map((membro) => {
        const casa = membro.grupo.casa?.nome
          ? `/${membro.grupo.casa?.nome}`
          : "";
        return `${membro.grupo.nomeGrupo}${casa}`;
      });
      adicionarTexto(
        fundamentacoes,
        `Integrante de grupo(s) em andamento: ${grupos.join(", ")}.`
      );
    }

    const classificarRisco = (pontuacao: number): "ALTO" | "MEDIO" | "BAIXO" => {
      if (pontuacao >= 60) return "ALTO";
      if (pontuacao >= 30) return "MEDIO";
      return "BAIXO";
    };

    const riscoFugaFinal = classificarRisco(pontuacaoRiscoFuga);
    const riscoAgressaoFinal = classificarRisco(pontuacaoRiscoAgressao);
    const riscoAutolesaoFinal = classificarRisco(pontuacaoRiscoAutolesao);

    const detalharPontuacao = (
      titulo: string,
      pontos: number,
      classificacao: string,
      metodologia: string
    ) =>
      `${titulo}: ${pontos} pontos (${classificacao}) — ${metodologia}`;

    const explicacoesPontuacao: string[] = [];

    if (riscoFugaFinal !== "BAIXO") {
      explicacoesPontuacao.push(
        detalharPontuacao(
          "Risco de fuga",
          pontuacaoRiscoFuga,
          riscoFugaFinal,
          "soma atos infracionais graves, avaliações prévias de fuga, alertas críticos e conflitos territoriais associados"
        )
      );
    }

    if (riscoAgressaoFinal !== "BAIXO") {
      explicacoesPontuacao.push(
        detalharPontuacao(
          "Risco de agressão",
          pontuacaoRiscoAgressao,
          riscoAgressaoFinal,
          "pondera histórico de violência, vínculos faccionais, conflitos interpessoais e comunicados internos recentes"
        )
      );
    }

    if (riscoAutolesaoFinal !== "BAIXO") {
      explicacoesPontuacao.push(
        detalharPontuacao(
          "Risco de autolesão",
          pontuacaoRiscoAutolesao,
          riscoAutolesaoFinal,
          "considera protocolos de suicídio, alertas de saúde confidenciais e registros psicossociais críticos"
        )
      );
    }

    const fundamentacaoLegalBase = [
      fundamentacoes.map((texto, indice) => `${indice + 1}. ${texto}`).join("\n"),
    ]
      .filter((parte) => Boolean(parte && parte.trim().length > 0))
      .join("\n\n");

    const medidasRecomendadas: string[] = [
      "Uso de algemas restrito ao deslocamento externo, com registro fotográfico discreto",
      "Acompanhamento por equipe socioeducativa dedicada (mínimo de dois agentes, ampliando conforme recomendações complementares)",
      "Comunicação prévia ao destino (fórum, hospital ou órgão demandante)",
    ];

    if (riscoFugaFinal === "ALTO" || riscoAgressaoFinal === "ALTO") {
      medidasRecomendadas.push(
        "Reforçar escolta com três ou mais agentes e monitoramento visual contínuo",
        "Revista integral antes e depois da movimentação",
        "Bloquear rotas simultâneas com adolescentes conflitados"
      );
    }

    if (adolescente.alertaRiscoSuicidio || riscoAutolesaoFinal === "ALTO") {
      medidasRecomendadas.push(
        "Designar profissional de referência em saúde mental durante todo o trajeto",
        "Remover objetos cortantes ou cabos que possibilitem autolesão",
        "Manter vigilância ostensiva sem deixar o adolescente sozinho"
      );
    }

    if (destinoContexto.conflitoTerritorial) {
      medidasRecomendadas.push(
        "Acionar núcleo de inteligência territorial antes da saída",
        "Evitar paradas em regiões com vínculos conflituosos",
        "Registrar no CI de viagem os bairros monitorados"
      );
    }

    medidasRecomendadas.push(
      "Comunicar imediatamente qualquer intercorrência ao plantão da direção",
      "Atualizar histórico operacional ao final da escolta"
    );

    const historicoSugerido: string[] = [];
    if (cisRecentes > 0) {
      historicoSugerido.push(
        `Envolvido em ${cisRecentes} CI(s) recente(s) registrados no sistema`
      );
    }
    if (totalConflitosAtivos > 0) {
      historicoSugerido.push(
        `Conflitos ativos com ${totalConflitosAtivos} adolescente(s)`
      );
    }
    if (adolescente.alertasAtivos.length > 0) {
      historicoSugerido.push(
        `${adolescente.alertasAtivos.length} alerta(s) de segurança vigentes`
      );
    }
    historicoSugerido.push(
      `Fase atual da internação: ${
        adolescente.faseInternacaoAtual?.nomeFase ?? "não informada"
      }`
    );

    return NextResponse.json({
      adolescente: {
        id: adolescente.id,
        nomeCompleto: adolescente.nomeCompleto,
        numeroSms: adolescente.numeroSms,
        numeroProcesso: adolescente.numeroProcesso,
        atoInfracionalAtual: adolescente.atoInfracionalAtual,
        faccao: adolescente.faccao?.nomeFaccao ?? null,
        bairroOrigem: descreverBairro(origemBairro),
      },
      analiseRisco: {
        riscoFuga: riscoFugaFinal,
        riscoAgressao: riscoAgressaoFinal,
        riscoAutolesao: riscoAutolesaoFinal,
        pontuacoes: {
          fuga: pontuacaoRiscoFuga,
          agressao: pontuacaoRiscoAgressao,
          autolesao: pontuacaoRiscoAutolesao,
        },
      },
      fatoresAgravantes,
      fundamentacaoLegal: fundamentacaoLegalBase,
      medidasSegurancaRecomendadas: medidasRecomendadas,
      historicoComportamentalSugerido: historicoSugerido.join("; "),
      dadosComplementares: {
        totalConflitosAtivos,
        totalComunicadosInternos: cisRecentes,
        totalAlertasAtivos: adolescente.alertasAtivos.length,
        totalTatuagens: adolescente.tatuagens.length,
        totalHistoricoInfracional: adolescente.historicoInfracional.length,
        alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
        atoInfracionalGravidade: adolescente.atoInfracionalGravidade,
      },
      contextoMovimentacao: destinoContexto,
      observacao:
        "Análise consolidada automaticamente pelo Sistema de Inteligência do CENSE Maringá. O operador deve complementar com detalhes específicos da movimentação (rota, equipe e ocorrências).",
    });
  } catch (error) {
    console.error("Erro na análise de risco:", error);
    return NextResponse.json(
      { erro: "Erro ao realizar análise de risco" },
      { status: 500 }
    );
  }
}
