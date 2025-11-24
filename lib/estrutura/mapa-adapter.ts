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
  const tecnicoReferencia = (ocupante as Record<string, any>)
    .tecnicoReferencia;

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
    conflitosA: (ocupante.conflitosA ?? []) as unknown as Adolescente["conflitosA"],
    conflitosB: (ocupante.conflitosB ?? []) as unknown as Adolescente["conflitosB"],
    conflitosResolvidos: (ocupante.conflitosResolvidos ?? []) as unknown as Adolescente["conflitosResolvidos"],
    atoInfracionalGravidade: false,
    tatuagens: [],
    historicoInfracional: historico,
    grupos: [],
    riscoFuga: null,
    tecnicoReferenciaId: (ocupante as Record<string, any>).tecnico_referencia_id ?? null,
    tecnicoReferencia: tecnicoReferencia
      ? {
          id: tecnicoReferencia.id,
          nome: tecnicoReferencia.nome,
          atividade: tecnicoReferencia.atividade ?? null,
          email: tecnicoReferencia.email,
          telefone: tecnicoReferencia.telefone ?? null,
        }
      : null,
    faccaoFuncao: null,
    faccaoInformacaoOrigem: null,
    faccaoInformacaoDetalhe: null,
    vulgo: null,
    faseInternacaoAtualId: (ocupante as Record<string, any>).fase_internacao_atual_id ?? null,
    dataDesinternacao: (ocupante as Record<string, any>).data_desinternacao ?? null,
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
    alojamentos: casa.alojamentos.map((aloj) => {
      const avaliacao = aloj.avaliacao_risco;
      avaliacoes[aloj.id] = avaliacao;

      const ocupanteDetalhado =
        aloj.ocupante &&
        (lookup.get(aloj.ocupante.id) ||
          mapearOcupanteParaAdolescente(aloj.ocupante, aloj.id));

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
        adolescentes: ocupanteDetalhado ? [ocupanteDetalhado] : [],
      };
    }),
  }));

  return { casas, avaliacoes };
}
