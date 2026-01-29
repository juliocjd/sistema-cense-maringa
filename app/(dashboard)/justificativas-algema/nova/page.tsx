"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  User,
  Clock,
  Truck,
  CheckSquare,
  ArrowLeft,
  Save,
  Search,
  TrendingUp,
  Brain,
  AlertCircle,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import PermissionGuard from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface Adolescente {
  id: string;
  nomeCompleto: string;
  numeroSms: string | null;
  numeroProcesso: string | null;
  atoInfracionalAtual: string | null;
  riscoFuga: string | null;
}

interface AnaliseRisco {
  adolescente: {
    id: string;
    nomeCompleto: string;
    numeroSms: string | null;
    numeroProcesso: string | null;
    atoInfracionalAtual: string | null;
    faccao: string | null;
    bairroOrigem: string | null;
  };
  analiseRisco: {
    riscoFuga: string;
    riscoAgressao: string;
    riscoAutolesao: string;
    pontuacoes: {
      fuga: number;
      agressao: number;
      autolesao: number;
    };
  };
  fatoresAgravantes: string[];
  fundamentacaoLegal: string;
  medidasSegurancaRecomendadas: string[];
  historicoComportamentalSugerido: string;
  dadosComplementares: {
    totalConflitosAtivos: number;
    totalComunicadosInternos: number;
    totalAlertasAtivos: number;
    totalTatuagens: number;
    totalHistoricoInfracional: number;
    alertaRiscoSuicidio: boolean;
    atoInfracionalGravidade: boolean;
  };
  suicidioContexto?: {
    altaRecente: boolean;
    ultimoEventoTipo: string | null;
  };
  observacao: string;
  contextoMovimentacao?: {
    bairroOrigem: { id: string; nome: string; cidade: string | null } | null;
    bairroDestino: { id: string; nome: string; cidade: string | null } | null;
    destinoDescricao: string | null;
    conflitoTerritorial: {
      id: string;
      status: string;
      origem: string;
      destino: string;
    } | null;
  };
}

interface BairroReferencia {
  id: string;
  nomeBairro: string;
  cidade: string;
}

const MOTIVOS = [
  { value: "TRANSFERENCIA_JUDICIAL", label: "Transferência Judicial" },
  { value: "AUDIENCIA", label: "Audiência no Fórum" },
  { value: "ATENDIMENTO_EXTERNO", label: "Atendimento Médico/Hospitalar Externo" },
  { value: "FUGA_TENTATIVA", label: "Tentativa de Fuga" },
  { value: "AGRESSAO_GRAVE", label: "Agressão Grave ou Risco Iminente" },
  { value: "OUTRO", label: "Outro Motivo" },
];

export default function NovaJustificativaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buscaAdolescente, setBuscaAdolescente] = useState("");
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [buscandoAdolescentes, setBuscandoAdolescentes] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Dados do formulário
  const [adolescenteId, setAdolescenteId] = useState("");
  const [adolescenteSelecionado, setAdolescenteSelecionado] = useState<Adolescente | null>(null);
  const [dataHoraOcorrencia, setDataHoraOcorrencia] = useState("");
  const [motivoPrincipal, setMotivoPrincipal] = useState("");
  const [destinoMovimentacao, setDestinoMovimentacao] = useState("");
  const [bairroDestinoId, setBairroDestinoId] = useState("");

  const [bairrosReferencia, setBairrosReferencia] = useState<BairroReferencia[]>([]);
  const [carregandoBairros, setCarregandoBairros] = useState(false);
  const [erroBairros, setErroBairros] = useState<string | null>(null);

  // Análise Inteligente
  const [analiseRisco, setAnaliseRisco] = useState<AnaliseRisco | null>(null);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);

  // Campos editáveis (com valores da análise como padrão)
  const [fundamentacaoLegal, setFundamentacaoLegal] = useState("");
  const [riscoFuga, setRiscoFuga] = useState("");
  const [riscoAgressao, setRiscoAgressao] = useState("");
  const [riscoAutolesao, setRiscoAutolesao] = useState("");
  const [historicoComportamental, setHistoricoComportamental] = useState("");

  const [medidasSeguranca, setMedidasSeguranca] = useState<string[]>([]);
  const [diretorAtualUnidade, setDiretorAtualUnidade] = useState("");
  const [veiculoUtilizado, setVeiculoUtilizado] = useState("");
  const [observacoesAdicionais, setObservacoesAdicionais] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  const bairroDestinoSelecionado = useMemo(
    () => bairrosReferencia.find((bairro) => bairro.id === bairroDestinoId) ?? null,
    [bairrosReferencia, bairroDestinoId]
  );
  const contextoMovimentacao = analiseRisco?.contextoMovimentacao;
  const conflitoTerritorialDetectado = contextoMovimentacao?.conflitoTerritorial;
  useEffect(() => {
    let ativo = true;
    const carregarBairros = async () => {
      try {
        setCarregandoBairros(true);
        const resposta = await fetch("/api/bairros");
        if (!resposta.ok) {
          throw new Error("Falha ao carregar bairros");
        }
        const payload = await resposta.json();
        if (!ativo) return;
        setBairrosReferencia(
          Array.isArray(payload?.bairros) ? payload.bairros : []
        );
        setErroBairros(null);
      } catch (error) {
        if (!ativo) return;
        console.error("Erro ao carregar bairros:", error);
        setErroBairros("Não foi possível carregar os bairros monitorados.");
      } finally {
        if (ativo) {
          setCarregandoBairros(false);
        }
      }
    };

    carregarBairros();
    return () => {
      ativo = false;
    };
  }, []);

  // Buscar adolescentes
  const buscarAdolescentes = useCallback(async () => {
    try {
      setBuscandoAdolescentes(true);
      const response = await fetch(
        `/api/adolescentes?busca=${encodeURIComponent(buscaAdolescente)}&limit=10`
      );

      if (response.ok) {
        const result = await response.json();
        setAdolescentes(result.data || []);
        setMostrarResultados(true);
      }
    } catch (error) {
      console.error("Erro ao buscar adolescentes:", error);
    } finally {
      setBuscandoAdolescentes(false);
    }
  }, [buscaAdolescente]);

  useEffect(() => {
    if (buscaAdolescente.length >= 3) {
      const timer = setTimeout(() => {
        buscarAdolescentes();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAdolescentes([]);
      setMostrarResultados(false);
    }
  }, [buscaAdolescente, buscarAdolescentes]);

  const buscarAnaliseRisco = useCallback(
    async (overrideId?: string) => {
      const alvoId = overrideId ?? adolescenteId;
      if (!alvoId) return;
      try {
        setCarregandoAnalise(true);
        const params = new URLSearchParams({ adolescenteId: alvoId });
        if (bairroDestinoId) {
          params.set("bairroDestinoId", bairroDestinoId);
        }
        const destinoLimpo = destinoMovimentacao.trim();
        if (destinoLimpo.length > 0) {
          params.set("destinoDescricao", destinoLimpo);
        }

        const response = await fetch(
          `/api/justificativas-algema/analise-risco?${params.toString()}`
        );

        if (response.ok) {
          const analise: AnaliseRisco = await response.json();
          setAnaliseRisco(analise);
          setRiscoFuga(analise.analiseRisco.riscoFuga);
          setRiscoAgressao(analise.analiseRisco.riscoAgressao);
          setRiscoAutolesao(analise.analiseRisco.riscoAutolesao);
          setFundamentacaoLegal(analise.fundamentacaoLegal);
          setHistoricoComportamental(analise.historicoComportamentalSugerido);
          setMedidasSeguranca([]);
        } else {
          alert("Erro ao carregar análise de risco do adolescente");
        }
      } catch (error) {
        console.error("Erro ao buscar análise de risco:", error);
        alert("Erro ao carregar análise automática");
      } finally {
        setCarregandoAnalise(false);
      }
    },
    [adolescenteId, bairroDestinoId, destinoMovimentacao]
  );

  const selecionarAdolescente = async (adolescente: Adolescente) => {
    setAdolescenteId(adolescente.id);
    setAdolescenteSelecionado(adolescente);
    setBuscaAdolescente(adolescente.nomeCompleto);
    setMostrarResultados(false);

    await buscarAnaliseRisco(adolescente.id);
  };

  const toggleMedida = (medida: string) => {
    setMedidasSeguranca((prev) =>
      prev.includes(medida) ? prev.filter((m) => m !== medida) : [...prev, medida]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!adolescenteId) {
      alert("Selecione um adolescente");
      return;
    }

    if (!dataHoraOcorrencia) {
      alert("Informe a data e hora da ocorrência");
      return;
    }

    if (!motivoPrincipal) {
      alert("Selecione o motivo principal");
      return;
    }

    if (fundamentacaoLegal.length < 50) {
      alert("A fundamentação legal deve ter no mínimo 50 caracteres");
      return;
    }

    if (medidasSeguranca.length === 0) {
      alert("Selecione ao menos uma medida de segurança");
      return;
    }

    const diretorAtual = diretorAtualUnidade.trim();
    if (!diretorAtual) {
      alert("Informe o atual diretor da unidade");
      return;
    }

    try {
      setLoading(true);

      // Buscar ID do operador (assumindo sessão)
      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();

      if (!session.user) {
        alert("Usuário não autenticado");
        return;
      }

      // Garantir formato datetime correto com timezone (ISO 8601)
      const dataHoraOcorrenciaFormatada = new Date(dataHoraOcorrencia).toISOString();

      const horaInicioFormatada = horaInicio && horaInicio.length === 5
        ? new Date(`${dataHoraOcorrencia.split('T')[0]}T${horaInicio}:00`).toISOString()
        : horaInicio ? new Date(horaInicio).toISOString() : undefined;

      const horaFimFormatada = horaFim && horaFim.length === 5
        ? new Date(`${dataHoraOcorrencia.split('T')[0]}T${horaFim}:00`).toISOString()
        : horaFim ? new Date(horaFim).toISOString() : undefined;

      const payload = {
        adolescenteId,
        operadorResponsavelId: session.user.id,
        dataHoraOcorrencia: dataHoraOcorrenciaFormatada,
        motivoPrincipal,
        destinoMovimentacao,
        fundamentacaoLegal,
        atoInfracionalBase: adolescenteSelecionado?.atoInfracionalAtual || undefined,
        numeroProcesso: adolescenteSelecionado?.numeroProcesso || undefined,
        riscoFuga,
        riscoAgressao,
        riscoAutolesao,
        historicoComportamental,
        medidasSeguranca,
        atualDiretorUnidade: diretorAtual,
        veiculoUtilizado,
        observacoesAdicionais,
        horaInicio: horaInicioFormatada,
        horaFim: horaFimFormatada,

        // Dados da análise automática
        fatoresAgravantes: analiseRisco?.fatoresAgravantes || [],
        pontuacaoRiscoFuga: analiseRisco?.analiseRisco.pontuacoes.fuga,
        pontuacaoRiscoAgressao: analiseRisco?.analiseRisco.pontuacoes.agressao,
        pontuacaoRiscoAutolesao: analiseRisco?.analiseRisco.pontuacoes.autolesao,
        fundamentacaoAutomatica: analiseRisco?.fundamentacaoLegal,
      };

      const response = await fetch("/api/justificativas-algema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Justificativa ${data.numeroDocumento} criada com sucesso!`);
        router.push("/justificativas-algema");
      } else {
        const error = await response.json();
        if (error.detalhes) {
          const errosFormatados = error.detalhes.map((d: any) => `${d.campo}: ${d.mensagem}`).join('\n');
          alert(`Erro: ${error.erro}\n\n${errosFormatados}`);
        } else {
          alert(`Erro: ${error.erro || "Erro ao criar justificativa"}`);
        }
      }
    } catch (error) {
      console.error("Erro ao criar justificativa:", error);
      alert("Erro ao criar justificativa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard required={PERMISSIONS.JUSTIFICATIVAS_ALGEMA_VIEW}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-indigo-600">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Shield className="text-indigo-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Nova Justificativa de Uso de Algema
              </h1>
              <p className="text-slate-600 mt-1">
                Sistema Inteligente de Análise de Risco e Fundamentação Legal
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. BUSCA E SELEÇÃO DO ADOLESCENTE */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
              <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                <User className="text-indigo-600" size={22} />
                1. Buscar Adolescente
              </h2>

              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="text"
                  value={buscaAdolescente}
                  onChange={(e) => setBuscaAdolescente(e.target.value)}
                  placeholder="Digite o nome, SMS ou processo..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                />
                {buscandoAdolescentes && (
                  <div className="absolute right-4 top-3.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>

              {mostrarResultados && adolescentes.length > 0 && (
                <div className="mt-3 bg-white rounded-lg shadow-lg border-2 border-indigo-200 max-h-64 overflow-y-auto">
                  {adolescentes.map((adol) => (
                    <button
                      key={adol.id}
                      type="button"
                      onClick={() => selecionarAdolescente(adol)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-slate-200 last:border-none transition"
                    >
                      <div className="font-semibold text-slate-900">{adol.nomeCompleto}</div>
                      <div className="text-sm text-slate-600">
                        SMS: {adol.numeroSms || "N/A"} | Processo: {adol.numeroProcesso || "N/A"}
                      </div>
                      {adol.atoInfracionalAtual && (
                        <div className="text-xs text-red-600 mt-1">
                          Ato: {adol.atoInfracionalAtual}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {adolescenteSelecionado && (
                <div className="mt-4 bg-white rounded-lg p-4 border-2 border-green-300">
                  <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                    <CheckCircle2 size={20} />
                    Adolescente Selecionado
                  </div>
                  <div className="text-slate-900 font-semibold text-lg">
                    {adolescenteSelecionado.nomeCompleto}
                  </div>
                  <div className="text-sm text-slate-600">
                    SMS: {adolescenteSelecionado.numeroSms} | Processo:{" "}
                    {adolescenteSelecionado.numeroProcesso}
                  </div>
                </div>
              )}
            </div>

            {/* ANÁLISE INTELIGENTE */}
            {carregandoAnalise && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 border-2 border-purple-300">
                <div className="flex items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
                  <div>
                    <p className="font-bold text-purple-900 text-lg">Analisando dados do adolescente...</p>
                    <p className="text-purple-700 text-sm mt-1">
                      Processando histórico, conflitos, tatuagens, alertas e fatores de risco
                    </p>
                  </div>
                </div>
              </div>
            )}

            {analiseRisco && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-300">
                <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                  <Brain className="text-purple-600" size={24} />
                  Análise Inteligente do Sistema
                </h2>

                {/* Resumo de Risco */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className={`p-4 rounded-lg text-center ${
                    analiseRisco.analiseRisco.riscoFuga === "ALTO"
                      ? "bg-red-100 border-2 border-red-400"
                      : analiseRisco.analiseRisco.riscoFuga === "MEDIO"
                      ? "bg-yellow-100 border-2 border-yellow-400"
                      : "bg-green-100 border-2 border-green-400"
                  }`}>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Risco de Fuga</div>
                    <div className="text-2xl font-bold">
                      {analiseRisco.analiseRisco.riscoFuga}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Pontuação: {analiseRisco.analiseRisco.pontuacoes.fuga}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    analiseRisco.analiseRisco.riscoAgressao === "ALTO"
                      ? "bg-red-100 border-2 border-red-400"
                      : analiseRisco.analiseRisco.riscoAgressao === "MEDIO"
                      ? "bg-yellow-100 border-2 border-yellow-400"
                      : "bg-green-100 border-2 border-green-400"
                  }`}>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Risco de Agressão</div>
                    <div className="text-2xl font-bold">
                      {analiseRisco.analiseRisco.riscoAgressao}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Pontuação: {analiseRisco.analiseRisco.pontuacoes.agressao}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    analiseRisco.analiseRisco.riscoAutolesao === "ALTO"
                      ? "bg-red-100 border-2 border-red-400"
                      : analiseRisco.analiseRisco.riscoAutolesao === "MEDIO"
                      ? "bg-yellow-100 border-2 border-yellow-400"
                      : "bg-green-100 border-2 border-green-400"
                  }`}>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Risco de Autolesão</div>
                    <div className="text-2xl font-bold">
                      {analiseRisco.analiseRisco.riscoAutolesao}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Pontuação: {analiseRisco.analiseRisco.pontuacoes.autolesao}
                    </div>
                  </div>
                </div>

                {/* Fatores Agravantes */}
                {analiseRisco.fatoresAgravantes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="text-red-600" size={20} />
                      Fatores Agravantes Identificados
                    </h3>
                    <div className="space-y-2">
                      {analiseRisco.fatoresAgravantes.map((fator, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 bg-white p-3 rounded-lg border border-red-200"
                        >
                          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                          <span className="text-sm text-slate-700">{fator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dados Complementares */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">Conflitos Ativos</div>
                    <div className="text-xl font-bold text-slate-900">
                      {analiseRisco.dadosComplementares.totalConflitosAtivos}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">Alertas Ativos</div>
                    <div className="text-xl font-bold text-slate-900">
                      {analiseRisco.dadosComplementares.totalAlertasAtivos}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">Tatuagens Catalogadas</div>
                    <div className="text-xl font-bold text-slate-900">
                      {analiseRisco.dadosComplementares.totalTatuagens}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">CIs Recentes</div>
                    <div className="text-xl font-bold text-slate-900">
                      {analiseRisco.dadosComplementares.totalComunicadosInternos}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-slate-600">Histórico Infracional</div>
                    <div className="text-xl font-bold text-slate-900">
                      {analiseRisco.dadosComplementares.totalHistoricoInfracional}
                    </div>
                  </div>
                  {analiseRisco.dadosComplementares.alertaRiscoSuicidio && (
                    <div className="bg-red-100 p-3 rounded-lg border-2 border-red-400">
                      <div className="text-xs font-bold text-red-800">⚠ ALERTA CRÍTICO</div>
                      <div className="text-sm font-bold text-red-900">Risco de Suicídio</div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Observação:</strong> {analiseRisco.observacao}
                  </p>
                </div>
              </div>
            )}

            {/* 2. DADOS DA OCORRÊNCIA */}
            {adolescenteSelecionado && (
              <>
                <div>
                  <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                    <Clock className="text-indigo-600" size={22} />
                    2. Dados da Ocorrência
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data e Hora da Ocorrência *
                      </label>
                      <input
                        type="datetime-local"
                        value={dataHoraOcorrencia}
                        onChange={(e) => setDataHoraOcorrencia(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Motivo Principal *
                      </label>
                      <select
                        value={motivoPrincipal}
                        onChange={(e) => setMotivoPrincipal(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      >
                        <option value="">Selecione o motivo</option>
                        {MOTIVOS.map((motivo) => (
                          <option key={motivo.value} value={motivo.value}>
                            {motivo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Destino (bairros monitorados pela inteligência)
                      </label>
                      <div className="flex flex-col gap-3 md:flex-row">
                        <select
                          value={bairroDestinoId}
                          onChange={(e) => setBairroDestinoId(e.target.value)}
                          disabled={carregandoBairros}
                          className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition bg-white"
                        >
                          <option value="">
                            {carregandoBairros
                              ? "Carregando bairros..."
                              : "Selecione um bairro monitorado"}
                          </option>
                          {bairrosReferencia.map((bairro) => (
                            <option key={bairro.id} value={bairro.id}>
                              {bairro.nomeBairro} • {bairro.cidade}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => buscarAnaliseRisco()}
                          disabled={!adolescenteId || carregandoAnalise}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <RefreshCw
                            size={18}
                            className={carregandoAnalise ? "animate-spin" : ""}
                          />
                          <span>Atualizar análise</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Use os bairros cadastrados em <strong>Inteligência &gt; Conflitos</strong> para que o sistema identifique riscos territoriais automaticamente.
                      </p>
                      {erroBairros && (
                        <p className="text-sm text-red-600 mt-1">{erroBairros}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Destino da Movimentação (texto livre)
                      </label>
                      <input
                        type="text"
                        value={destinoMovimentacao}
                        onChange={(e) => setDestinoMovimentacao(e.target.value)}
                        placeholder="Ex: Fórum Criminal de Maringá, Hospital Universitário..."
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Esse campo aparece no documento final. Clique em <em>Atualizar análise</em> para que o destino seja considerado na fundamentação automática.
                      </p>
                    </div>

                    {contextoMovimentacao && (
                      <div
                        className={`md:col-span-2 rounded-xl border p-4 ${
                          conflitoTerritorialDetectado
                            ? "border-red-200 bg-red-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <MapPin
                            size={18}
                            className={
                              conflitoTerritorialDetectado ? "text-red-600" : "text-indigo-600"
                            }
                          />
                          <span>Contexto territorial analisado</span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <p>
                            <strong>Origem monitorada:</strong>{" "}
                            {contextoMovimentacao.bairroOrigem
                              ? `${contextoMovimentacao.bairroOrigem.nome}${
                                  contextoMovimentacao.bairroOrigem.cidade
                                    ? ` - ${contextoMovimentacao.bairroOrigem.cidade}`
                                    : ""
                                }`
                              : "Não informado"}
                          </p>
                          <p>
                            <strong>Destino monitorado:</strong>{" "}
                            {contextoMovimentacao.bairroDestino
                              ? `${contextoMovimentacao.bairroDestino.nome}${
                                  contextoMovimentacao.bairroDestino.cidade
                                    ? ` - ${contextoMovimentacao.bairroDestino.cidade}`
                                    : ""
                                }`
                              : "Não selecionado"}
                          </p>
                          <p>
                            <strong>Destino informado:</strong>{" "}
                            {contextoMovimentacao.destinoDescricao || "Não informado"}
                          </p>
                        </div>
                        {conflitoTerritorialDetectado ? (
                          <div className="mt-3 flex items-start gap-2 text-sm text-red-700">
                            <AlertTriangle size={16} className="mt-0.5" />
                            <span>
                              Conflito territorial ativo identificado entre{" "}
                              {conflitoTerritorialDetectado.origem} e{" "}
                              {conflitoTerritorialDetectado.destino}. Reforce os registros e avalie rota alternativa.
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-start gap-2 text-sm text-emerald-700">
                            <CheckCircle2 size={16} className="mt-0.5" />
                            <span>Nenhum conflito territorial mapeado para essa combinação.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. MEDIDAS DE SEGURANÇA */}
                <div>
                  <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                    <CheckSquare className="text-indigo-600" size={22} />
                    3. Medidas de Segurança (Recomendadas pelo Sistema)
                  </h2>

                  <div className="space-y-2">
                    {analiseRisco?.medidasSegurancaRecomendadas.map((medida) => (
                      <label
                        key={medida}
                        className="flex items-start gap-3 p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={medidasSeguranca.includes(medida)}
                          onChange={() => toggleMedida(medida)}
                          className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">{medida}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. DIRETOR DA UNIDADE */}
                <div>
                  <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                    <User className="text-indigo-600" size={22} />
                    4. Atual Diretor da Unidade *
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome do Diretor *
                    </label>
                    <input
                      type="text"
                      value={diretorAtualUnidade}
                      onChange={(e) => setDiretorAtualUnidade(e.target.value)}
                      placeholder="Digite o nome completo do diretor da unidade"
                      required
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* 5. INFORMAÇÕES COMPLEMENTARES */}
                <div>
                  <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                    <Truck className="text-indigo-600" size={22} />
                    5. Informações Complementares
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Veículo Utilizado
                      </label>
                      <input
                        type="text"
                        value={veiculoUtilizado}
                        onChange={(e) => setVeiculoUtilizado(e.target.value)}
                        placeholder="Ex: Viatura CENSE - Placa ABC-1234"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Hora de Aplicação da Algema
                        </label>
                        <input
                          type="datetime-local"
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Hora de Retirada da Algema
                        </label>
                        <input
                          type="datetime-local"
                          value={horaFim}
                          onChange={(e) => setHoraFim(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Observações Adicionais
                      </label>
                      <textarea
                        value={observacoesAdicionais}
                        onChange={(e) => setObservacoesAdicionais(e.target.value)}
                        placeholder="Informações adicionais relevantes..."
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* BOTÃO DE ENVIO */}
                <div className="flex gap-4 pt-6 border-t-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Gerando Justificativa...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Emitir Justificativa
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* AVISO LEGAL */}
        <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">Importante - Súmula Vinculante 11/STF</h3>
              <p className="text-sm text-yellow-800">
                O uso de algemas só é permitido quando houver resistência, fundado receio de fuga ou perigo à
                integridade física do preso ou de terceiros. A ausência de fundamentação pode acarretar
                responsabilidade disciplinar, civil e penal do agente ou da autoridade.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
