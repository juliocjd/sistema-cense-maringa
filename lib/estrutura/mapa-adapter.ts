import type { EstruturaSnapshot } from "@/lib/estrutura/snapshot";
import type { Adolescente, Casa } from "@/types";
import type { ResultadoRisco } from "@/lib/riscos/calcular";

type SnapshotCasa = EstruturaSnapshot["casas"][number];
type SnapshotAlojamento = SnapshotCasa["alojamentos"][number];
type SnapshotOcupante = SnapshotAlojamento["ocupante"];
type DocumentoTipo =
  Casa["alojamentos"][number]["interdicaoDocumentoTipo"];

const TIPOS_DOCUMENTO_VALIDOS = ["CI", "DECISAO_JUDICIAL", "OUTRO"] as const;

const normalizarDocumentoInterdicao = (
  valor: unknown
): DocumentoTipo => {
  if (valor === null || valor === undefined) {
    return null;
  }
  const texto = String(valor).toUpperCase();
  return TIPOS_DOCUMENTO_VALIDOS.includes(
    texto as (typeof TIPOS_DOCUMENTO_VALIDOS)[number]
  )
    ? (texto as DocumentoTipo)
    : null;
};

const mapearOcupanteParaAdolescente = (
  ocupante: NonNullable<SnapshotOcupante>,
  alojamentoId?: string
): Adolescente => {
  const bairroFonte = ocupante.bairro_origem as
    | { id: string; nome?: string | null; nomeBairro?: string | null; cidade?: string | null }
    | null
    | undefined;
  const faccaoFonte = ocupante.faccao as
    | { id: string; nome?: string | null; nomeFaccao?: string | null }
    | null
    | undefined;
  const historico =
    (ocupante as Record<string, any>).historicoInfracional ?? [];
  const tecnicosReferencia =
    (ocupante as Record<string, any>).tecnicosReferencia ??
    ((ocupante as Record<string, any>).tecnicoReferencia
      ? [(ocupante as Record<string, any>).tecnicoReferencia]
      : []);

  return {
    id: ocupante.id,
    nomeCompleto: ocupante.nome_completo,
    nomeSocial: ocupante.nome_social ?? undefined,
    numeroSms: ocupante.numero_sms ?? undefined,
    fotoUrl: ocupante.foto_url ?? null,
    alojamentoAtualId: alojamentoId ?? null,
    statusUnidade: (ocupante.status_unidade ?? "ATIVO") as Adolescente["statusUnidade"],
    alertaRiscoSuicidio: ocupante.alerta_risco_suicidio ?? false,
    alertaPerfilMapeado: ocupante.alerta_perfil_mapeado ?? false,
    alertaSaudeConfidencial: ocupante.alerta_saude_confidencial ?? false,
    alertaSaudeDetalhes: null,
    bairroOrigemId: ocupante.bairro_origem_id ?? null,
    bairroOrigem: bairroFonte
      ? {
          id: bairroFonte.id,
          nome:
            bairroFonte.nome ??
            bairroFonte.nomeBairro ??
            "",
          cidade: bairroFonte.cidade ?? "",
        }
      : null,
    faccaoGrupoId: ocupante.faccao_grupo_id ?? null,
    faccao: faccaoFonte
      ? {
          id: faccaoFonte.id,
          nome: faccaoFonte.nome ?? faccaoFonte.nomeFaccao ?? "",
        }
      : null,
    conflitosA: (ocupante.conflitosA ?? [])
      .filter((c: any) => (c?.status ?? "").toUpperCase() === "ATIVO") as unknown as Adolescente["conflitosA"],
    conflitosB: (ocupante.conflitosB ?? [])
      .filter((c: any) => (c?.status ?? "").toUpperCase() === "ATIVO") as unknown as Adolescente["conflitosB"],
    conflitosResolvidos: (ocupante.conflitosResolvidos ?? []) as unknown as Adolescente["conflitosResolvidos"],
    atoInfracionalGravidade: false,
    tatuagens: [],
    historicoInfracional: historico,
    grupos: [],
    riscoFuga: null,
    tecnicosReferencia: Array.isArray(tecnicosReferencia)
      ? tecnicosReferencia.map((tec: any) => ({
          id: tec.id,
          nome: tec.nome,
          atividade: tec.atividade ?? null,
          email: tec.email,
          telefone: tec.telefone ?? null,
        }))
      : [],
    faccaoFuncao: null,
    faccaoInformacaoOrigem: null,
    faccaoInformacaoDetalhe: null,
    vulgo: null,
    faseInternacaoAtualId: (ocupante as Record<string, any>).fase_internacao_atual_id ?? null,
    dataDesinternacao: (ocupante as Record<string, any>).data_desinternacao ?? null,
    prazoOperacionalAtual:
      (ocupante as Record<string, any>).prazo_operacional_atual
        ? {
            destinacao: (ocupante as Record<string, any>).prazo_operacional_atual
              .destinacao,
            prazoMaximoDias: (ocupante as Record<string, any>)
              .prazo_operacional_atual.prazo_maximo_dias,
            dataInicio: (ocupante as Record<string, any>).prazo_operacional_atual
              .data_inicio,
            dataLimite: (ocupante as Record<string, any>).prazo_operacional_atual
              .data_limite,
            diasPermanencia: (ocupante as Record<string, any>)
              .prazo_operacional_atual.dias_permanencia,
            vencido: Boolean(
              (ocupante as Record<string, any>).prazo_operacional_atual.vencido,
            ),
            diasAtraso:
              (ocupante as Record<string, any>).prazo_operacional_atual
                .dias_atraso ?? 0,
          }
        : null,
  };
};

export type SnapshotMapaPayload = {
  casas: Casa[];
  avaliacoes: Record<string, ResultadoRisco>;
};

export function construirPayloadMapa({
  snapshot,
  adolescentesDetalhados = [],
}: {
  snapshot: EstruturaSnapshot;
  adolescentesDetalhados?: Adolescente[];
}): SnapshotMapaPayload {
  const lookup = new Map(adolescentesDetalhados.map((a) => [a.id, a]));
  const avaliacoes: Record<string, ResultadoRisco> = {};

  const casas: Casa[] = snapshot.casas.map((casa) => ({
    id: casa.id,
    numero: casa.numero ?? 0,
    nome: casa.nome,
    isolada: casa.isolada,
    observacoes: null,
    destinacaoOperacional:
      (casa as Record<string, any>).destinacao_operacional ?? null,
    faseExclusivaId: (casa as Record<string, any>).fase_exclusiva_id ?? null,
    faseExclusiva: (casa as Record<string, any>).fase_exclusiva ?? null,
    prazoMaximoDias: (casa as Record<string, any>).prazo_maximo_dias ?? null,
    riscoMaximoPermitido:
      (casa as Record<string, any>).risco_maximo_permitido ?? null,
    alojamentos: casa.alojamentos.map((aloj) => {
      const avaliacao = aloj.avaliacao_risco;
      avaliacoes[aloj.id] = avaliacao;

      const ocupanteDetalhadoRaw =
        aloj.ocupante &&
        (lookup.get(aloj.ocupante.id) ||
          mapearOcupanteParaAdolescente(aloj.ocupante, aloj.id));

      const ocupanteDetalhado = ocupanteDetalhadoRaw
        ? ({
            ...ocupanteDetalhadoRaw,
            prazoOperacionalAtual: aloj.ocupante?.prazo_operacional_atual
              ? {
                  destinacao: aloj.ocupante.prazo_operacional_atual.destinacao,
                  prazoMaximoDias:
                    aloj.ocupante.prazo_operacional_atual.prazo_maximo_dias,
                  dataInicio:
                    aloj.ocupante.prazo_operacional_atual.data_inicio,
                  dataLimite:
                    aloj.ocupante.prazo_operacional_atual.data_limite,
                  diasPermanencia:
                    aloj.ocupante.prazo_operacional_atual.dias_permanencia,
                  vencido: aloj.ocupante.prazo_operacional_atual.vencido,
                  diasAtraso:
                    aloj.ocupante.prazo_operacional_atual.dias_atraso,
                }
              : ocupanteDetalhadoRaw.prazoOperacionalAtual ?? null,
            conflitosA: (ocupanteDetalhadoRaw.conflitosA ?? []).filter(
              (c) => (c.status ?? "").toUpperCase() === "ATIVO"
            ),
            conflitosB: (ocupanteDetalhadoRaw.conflitosB ?? []).filter(
              (c) => (c.status ?? "").toUpperCase() === "ATIVO"
            ),
          } as Adolescente)
        : null;

      return {
        id: aloj.id,
        casaId: casa.id,
        numeroAlojamento: aloj.numero,
        ala: (aloj.ala ?? null) as Casa["alojamentos"][number]["ala"],
        statusManutencao: (aloj.status_manutencao ??
          "LIVRE") as Casa["alojamentos"][number]["statusManutencao"],
        alojamentoFrontalId: aloj.alojamento_frontal_id,
        localizacaoPreferencial: aloj.localizacao_preferencial ?? false,
        corRisco: (aloj.cor_risco as Casa["alojamentos"][number]["corRisco"]) ?? "livre",
        nivelRisco: aloj.nivel_risco ?? 0,
        icones: aloj.icones ?? [],
        alertas: aloj.alertas ?? [],
        interdicaoJustificativa: aloj.interdicao_justificativa ?? null,
        interdicaoDocumentoTipo: normalizarDocumentoInterdicao(
          aloj.interdicao_documento_tipo
        ),
        interdicaoDocumentoReferencia:
          aloj.interdicao_documento_referencia ?? null,
        prazoOperacional: aloj.prazo_operacional
          ? {
              destinacao: aloj.prazo_operacional.destinacao,
              prazoMaximoDias: aloj.prazo_operacional.prazo_maximo_dias,
              dataInicio: aloj.prazo_operacional.data_inicio,
              dataLimite: aloj.prazo_operacional.data_limite,
              diasPermanencia: aloj.prazo_operacional.dias_permanencia,
              vencido: aloj.prazo_operacional.vencido,
              diasAtraso: aloj.prazo_operacional.dias_atraso,
            }
          : null,
        adolescentes: ocupanteDetalhado ? [ocupanteDetalhado] : [],
      };
    }),
  }));

  return { casas, avaliacoes };
}
