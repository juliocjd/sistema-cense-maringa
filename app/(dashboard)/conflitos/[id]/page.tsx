"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DetalhesConflito } from "@/components/conflitos/detalhes-conflito";

type Participante = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string | null;
  lado?: string | null;
};

type Conflito = {
  id: string;
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  origem: string;
  descricao?: string;
  criadoEm: string;
  resolvidoEm?: string;
  participantes?: Participante[];
  adolescenteA: Participante;
  adolescenteB: Participante;
};

type ApiParticipante = {
  id: string;
  nomeCompleto?: string | null;
  nomeSocial?: string | null;
  numeroSms?: string | null;
  alojamento?: string | null;
  alojamentoAtual?: {
    descricao?: string | null;
    casa?: string | null;
    numero?: string | number | null;
    ala?: string | null;
  } | null;
  lado?: string | null;
};

type ApiConflito = {
  id: string;
  tipo?: string;
  tipoConflito?: string;
  status: "ATIVO" | "RESOLVIDO";
  descricao?: string;
  dataRegistro: string;
  dataResolucao?: string | null;
  participantes?: Array<
    ApiParticipante & {
      numeroSms?: string | null;
      alojamentoAtual?: { descricao?: string | null } | null;
    }
  >;
  ciOrigem?: {
    numero: string;
    ano: string;
  } | null;
  adolescenteA: ApiParticipante & {
    alojamentoAtual?: {
      casa?: string | null;
      numero?: string | number | null;
      ala?: string | null;
    } | null;
  };
  adolescenteB: ApiParticipante & {
    alojamentoAtual?: {
      casa?: string | null;
      numero?: string | number | null;
      ala?: string | null;
    } | null;
  };
};

const formatarNome = (dados: ApiParticipante) =>
  dados.nomeCompleto || dados.nomeSocial || "Adolescente sem nome";

const formatarAlojamento = (
  alojamento?:
    | string
    | null
    | {
        descricao?: string | null;
        casa?: string | null;
        numero?: string | number | null;
        ala?: string | null;
      }
) => {
  if (!alojamento) return undefined;
  if (typeof alojamento === "string") return alojamento;
  if (alojamento.descricao) return alojamento.descricao;

  const partes: string[] = [];
  if (alojamento.casa) partes.push(alojamento.casa);
  if (alojamento.numero) partes.push(`Aloj ${alojamento.numero}`);
  if (alojamento.ala) partes.push(`Ala ${alojamento.ala}`);
  return partes.length ? partes.join(" - ") : undefined;
};

const mapearParticipante = (dados: ApiParticipante): Participante => ({
  id: dados.id,
  nome: formatarNome(dados),
  numeroSms: dados.numeroSms ?? "",
  alojamento: formatarAlojamento(dados.alojamento ?? dados.alojamentoAtual),
  lado: dados.lado ?? null,
});

const normalizarConflito = (dados: ApiConflito): Conflito => ({
  id: dados.id,
  tipoConflito: dados.tipo ?? dados.tipoConflito ?? "N/A",
  status: dados.status,
  origem: dados.ciOrigem
    ? `CI ${dados.ciOrigem.numero}/${dados.ciOrigem.ano}`
    : "Registro direto",
  descricao: dados.descricao,
  criadoEm: dados.dataRegistro,
  resolvidoEm: dados.dataResolucao ?? undefined,
  participantes: dados.participantes?.map((p) =>
    mapearParticipante({
      ...p,
      alojamentoAtual: p.alojamentoAtual,
    })
  ),
  adolescenteA: mapearParticipante(dados.adolescenteA),
  adolescenteB: mapearParticipante(dados.adolescenteB),
});

type Mediacao = {
  id: string;
  dataTentativa: string;
  profissionalResponsavel: string;
  tipoIntervencao: string;
  resultado: string;
  observacoes: string;
  proximaAcaoRecomendada?: string;
  dataProximaAvaliacao?: string;
};

export default function ConflitoPorIdPage() {
  const params = useParams();
  const router = useRouter();
  const conflitoId = params.id as string;

  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [mediacoes, setMediacoes] = useState<Mediacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mensagemEdicao, setMensagemEdicao] = useState<{
    tipo: "erro" | "sucesso";
    texto: string;
  } | null>(null);
  const [edicaoConflito, setEdicaoConflito] = useState({
    tipoConflito: "FACCAO",
    status: "ATIVO" as "ATIVO" | "RESOLVIDO",
    descricao: "",
  });

  const carregarDados = useCallback(async () => {
    try {
      // Chamar API
      const [conflitoRes, mediacoesRes] = await Promise.all([
        fetch(`/api/conflitos/${conflitoId}`),
        fetch(`/api/conflitos/${conflitoId}/mediacoes`),
      ]);

      if (!conflitoRes.ok) {
        throw new Error("Erro ao carregar conflito");
      }

      const conflitoData: ApiConflito = await conflitoRes.json();
      const mediacoesData = await mediacoesRes.json();

      setConflito(normalizarConflito(conflitoData));
      setMediacoes(mediacoesData);
    } catch (error) {
      console.error("Erro:", error);
      setErro(true);

      // Mock de dados para desenvolvimento
      const mockConflito: Conflito = {
        id: conflitoId,
        adolescenteA: {
          id: "adol-001",
          nome: "João da Silva Santos",
          numeroSms: "12345",
          alojamento: "Casa 02 - Aloj 05",
        },
        adolescenteB: {
          id: "adol-002",
          nome: "Pedro Henrique Oliveira",
          numeroSms: "12347",
          alojamento: "Casa 02 - Aloj 06",
        },
        tipoConflito: "FACCAO",
        status: "ATIVO",
        origem: "CI 145/2025",
        descricao:
          "Facções rivais. Adolescentes apresentaram comportamento agressivo durante atividade em grupo.",
        criadoEm: "2025-10-20T10:30:00",
      };

      const mockMediacoes: Mediacao[] = [
        {
          id: "med-001",
          dataTentativa: "2025-10-25",
          profissionalResponsavel: "Maria Santos - Psicóloga",
          tipoIntervencao: "MEDIACAO",
          resultado: "EM_ANDAMENTO",
          observacoes:
            "Primeira sessão de mediação. Adolescentes demonstraram resistência inicial, mas concordaram em participar do processo. Foram estabelecidas regras de convivência básicas.",
          proximaAcaoRecomendada: "Segunda sessão de mediação em grupo",
          dataProximaAvaliacao: "2025-11-08",
        },
        {
          id: "med-002",
          dataTentativa: "2025-11-01",
          profissionalResponsavel: "João Costa - Assistente Social",
          tipoIntervencao: "ATENDIMENTO_INDIVIDUAL",
          resultado: "EM_ANDAMENTO",
          observacoes:
            "Atendimento individual com João. Adolescente relatou histórico de conflito com a facção rival desde antes da internação. Demonstrou vontade de resolver a situação.",
          proximaAcaoRecomendada: "Atendimento individual com Pedro",
          dataProximaAvaliacao: "2025-11-05",
        },
      ];

      setConflito({
        ...mockConflito,
        participantes: [
          { ...mockConflito.adolescenteA, lado: "Lado 1" },
          { ...mockConflito.adolescenteB, lado: "Lado 2" },
        ],
      });
      setMediacoes(mockMediacoes);
    } finally {
      setLoading(false);
    }
  }, [conflitoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (conflito) {
      setEdicaoConflito({
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao ?? "",
      });
    }
  }, [conflito]);

  const handleSalvarEdicao = async () => {
    if (!conflito) return;
    setMensagemEdicao(null);
    setSalvandoEdicao(true);
    try {
      const response = await fetch(`/api/conflitos/${conflitoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipoConflito: edicaoConflito.tipoConflito,
          status: edicaoConflito.status,
          descricao: edicaoConflito.descricao?.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao atualizar conflito.");
      }

      setMensagemEdicao({
        tipo: "sucesso",
        texto: payload?.mensagem ?? "Conflito atualizado com sucesso.",
      });
      await carregarDados();
    } catch (error) {
      setMensagemEdicao({
        tipo: "erro",
        texto:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao atualizar conflito.",
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleAdicionarMediacao = async (mediacao: any) => {
    try {
      const response = await fetch(`/api/conflitos/${conflitoId}/mediacoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mediacao),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar mediação");
      }

      // Recarregar dados
      await carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      throw error; // Re-throw para o componente tratar
    }
  };

  const handleResolverConflito = async () => {
    try {
      const response = await fetch(`/api/conflitos/${conflitoId}/resolver`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Erro ao resolver conflito");
      }

      // Recarregar dados
      await carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      throw error; // Re-throw para o componente tratar
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando conflito...</p>
        </div>
      </div>
    );
  }

  if (erro && !conflito) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Conflito não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O conflito com ID {conflitoId} não foi encontrado no sistema.
          </p>
          <button
            onClick={() => router.push("/conflitos")}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  if (!conflito) {
    return null;
  }

  const tipoConflitoOptions = [
    { value: "FACCAO", label: "Conflito por faccao" },
    { value: "TERRITORIAL", label: "Conflito territorial" },
    { value: "PESSOAL", label: "Conflito pessoal" },
    { value: "OUTROS", label: "Outros" },
  ];

  const statusOptions: Array<"ATIVO" | "RESOLVIDO"> = ["ATIVO", "RESOLVIDO"];

  const quickEditSlot = (
    <section className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
      <div className="flex flex-col gap-2 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
          Edicao rapida
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            Atualizar dados do conflito
          </h2>
          <p className="text-sm text-gray-600">
            Ajuste a classificacao, o status e os registros de observacao
            conforme a evolucao das evidencias.
          </p>
        </div>

        {mensagemEdicao && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
              mensagemEdicao.tipo === "sucesso"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {mensagemEdicao.texto}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de conflito
            </label>
            <select
              value={edicaoConflito.tipoConflito}
              onChange={(event) => {
                setMensagemEdicao(null);
                setEdicaoConflito((prev) => ({
                  ...prev,
                  tipoConflito: event.target.value,
                }));
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white"
            >
              {tipoConflitoOptions.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={edicaoConflito.status}
              onChange={(event) => {
                setMensagemEdicao(null);
                setEdicaoConflito((prev) => ({
                  ...prev,
                  status: event.target.value as "ATIVO" | "RESOLVIDO",
                }));
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ATIVO" ? "Ativo" : "Resolvido"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Observacoes / descricao
          </label>
          <textarea
            value={edicaoConflito.descricao}
            onChange={(event) => {
              setMensagemEdicao(null);
              setEdicaoConflito((prev) => ({
                ...prev,
                descricao: event.target.value,
              }));
            }}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
            placeholder="Descreva novas evidencias, acordos ou orientacoes para a equipe."
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSalvarEdicao}
            disabled={salvandoEdicao}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
          >
            {salvandoEdicao ? "Salvando..." : "Salvar alteracoes"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!conflito) return;
              setMensagemEdicao(null);
              setEdicaoConflito({
                tipoConflito: conflito.tipoConflito,
                status: conflito.status,
                descricao: conflito.descricao ?? "",
              });
            }}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:border-gray-400"
          >
            Desfazer alteracoes
          </button>
        </div>
      </section>
  );

  return (
    <DetalhesConflito
      conflito={conflito}
      mediacoes={mediacoes}
      onAdicionarMediacao={handleAdicionarMediacao}
      onResolverConflito={handleResolverConflito}
      quickEditSlot={quickEditSlot}
    />
  );
}
