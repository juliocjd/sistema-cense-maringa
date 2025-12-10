"use client";

import { useState, useEffect } from "react";
import { X, Search, AlertTriangle, Bell } from "lucide-react";
import { TIPO_CI_OPTIONS, TIPO_CI_MAP } from "@/lib/comunicados/tipos";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  numeroSms: string | null;
  fotoUrl: string | null;
  statusUnidade: string;
};

type ModalNovoAlertaProps = {
  onClose: () => void;
  onSucesso: () => void;
};

type NivelRisco = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";

const NIVEIS_RISCO: NivelRisco[] = ["CRITICO", "ALTO", "MEDIO", "BAIXO"];

const DESCRICOES_TIPO: Record<string, string> = {
  DISCIPLINAR: "Conduta que exige acompanhamento de comportamento.",
  CONFLITO: "Conflito mapeado envolvendo o adolescente.",
  AUTORIZACAO_ESPECIAL:
    "Permissao controlada de item nao autorizado (ex.: caneta, material de estudo), com justificativa e validade.",
  SAUDE_CONFIDENCIAL:
    "Informacao de saude sensivel que impacta cuidados e seguranca.",
  RISCO_SUICIDIO: "Risco de suicidio identificado.",
  PERFIL_MAPEADO: "Protecao por ato infracional que exige sigilo.",
  FUGA: "Risco ou registro de fuga/plano de fuga/evasao.",
  AGRESSAO: "Registro de agressao ou risco iminente.",
  AMEACA_SERVIDOR: "Ameaca direta contra servidor.",
  OUTROS: "Outros alertas relevantes para a operacao.",
};

export function ModalNovoAlerta({ onClose, onSucesso }: ModalNovoAlertaProps) {
  const [etapa, setEtapa] = useState<"selecionar" | "dados">("selecionar");
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [busca, setBusca] = useState("");
  const [adolescenteSelecionado, setAdolescenteSelecionado] =
    useState<Adolescente | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregandoAdolescentes, setCarregandoAdolescentes] = useState(true);

  // Dados do alerta
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [descricaoAlerta, setDescricaoAlerta] = useState("");
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>("MEDIO");
  const [erros, setErros] = useState<Record<string, string>>({});

  const normalizarNivel = (valor?: string | null): NivelRisco => {
    if (valor && NIVEIS_RISCO.includes(valor as NivelRisco)) {
      return valor as NivelRisco;
    }
    return "MEDIO";
  };

  const sugerirNivelPorTipo = (valor: string): NivelRisco => {
    if (valor === "RISCO_SUICIDIO") return "CRITICO";
    if (
      valor === "FUGA" ||
      valor === "SAUDE_CONFIDENCIAL" ||
      valor === "AGRESSAO" ||
      valor === "AMEACA_SERVIDOR"
    ) {
      return "ALTO";
    }
    return "MEDIO";
  };

  const handleSelecionarTipo = (valor: string) => {
    setTipoSelecionado(valor);
    setNivelRisco(sugerirNivelPorTipo(valor));
  };

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const carregarAdolescentes = async () => {
    try {
      setCarregandoAdolescentes(true);
      const response = await fetch("/api/adolescentes?status=ATIVO");

      if (!response.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const data = await response.json();
      setAdolescentes(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar adolescentes:", error);
      alert("Erro ao carregar adolescentes");
    } finally {
      setCarregandoAdolescentes(false);
    }
  };

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!tipoSelecionado) {
      novosErros.tipoAlerta = "Selecione o tipo do alerta";
    }

    if (!descricaoAlerta.trim()) {
      novosErros.descricaoAlerta = "Descricao e obrigatoria";
    } else if (descricaoAlerta.trim().length < 10) {
      novosErros.descricaoAlerta = "Descricao deve ter no minimo 10 caracteres";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleCriarAlerta = async () => {
    if (!adolescenteSelecionado) return;

    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);
      const tipoParaEnvio = tipoSelecionado || null;

      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId: adolescenteSelecionado.id,
          tipoAlerta: tipoParaEnvio,
          descricaoAlerta: descricaoAlerta.trim(),
          nivelRisco,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.erro || "Erro ao criar alerta");
        return;
      }

      alert("Alerta criado com sucesso!");
      onSucesso();
    } catch (error) {
      console.error("Erro ao criar alerta:", error);
      alert("Erro ao criar alerta");
    } finally {
      setLoading(false);
    }
  };

  const adolescentesFiltrados = adolescentes.filter((adolescente) => {
    const termoBusca = busca.toLowerCase();
    return (
      adolescente.nomeCompleto.toLowerCase().includes(termoBusca) ||
      adolescente.nomeSocial?.toLowerCase().includes(termoBusca) ||
      adolescente.numeroSms?.includes(termoBusca)
    );
  });

  const corNivel: Record<NivelRisco, string> = {
    CRITICO: "bg-red-100 text-red-800 border-red-300",
    ALTO: "bg-orange-100 text-orange-800 border-orange-300",
    MEDIO: "bg-yellow-100 text-yellow-800 border-yellow-300",
    BAIXO: "bg-blue-100 text-blue-800 border-blue-300",
  };
  const tipoSelecionadoOpcao = tipoSelecionado
    ? TIPO_CI_OPTIONS.find((option) => option.value === tipoSelecionado)
    : null;
  const tipoAlertaEmUso =
    tipoSelecionadoOpcao?.label || TIPO_CI_MAP.get(tipoSelecionado) || tipoSelecionado;
  const tipoSelecionadoNivel = tipoSelecionado
    ? sugerirNivelPorTipo(tipoSelecionado)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Criar Novo Alerta</h2>
            <p className="text-sm text-gray-600 mt-1">
              {etapa === "selecionar"
                ? "Selecione o adolescente para o alerta"
                : `Alerta para ${adolescenteSelecionado?.nomeCompleto}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {etapa === "selecionar" && (
            <>
              {/* Busca */}
              <div className="mb-6">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome, nome social ou SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  />
                </div>
              </div>

              {/* Lista de Adolescentes */}
              {carregandoAdolescentes ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando adolescentes...</p>
                </div>
              ) : adolescentesFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-600">Nenhum adolescente encontrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adolescentesFiltrados.map((adolescente) => (
                    <button
                      key={adolescente.id}
                      onClick={() => {
                        setAdolescenteSelecionado(adolescente);
                        setEtapa("dados");
                      }}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold flex-shrink-0">
                        {adolescente.fotoUrl ? (
                          <img
                            src={adolescente.fotoUrl}
                            alt={adolescente.nomeCompleto}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          adolescente.nomeCompleto.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {adolescente.nomeCompleto}
                        </p>
                        {adolescente.nomeSocial && (
                          <p className="text-sm text-gray-600">
                            Nome social: {adolescente.nomeSocial}
                          </p>
                        )}
                        {adolescente.numeroSms && (
                          <p className="text-xs text-gray-500 font-mono">
                            SMS: {adolescente.numeroSms}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {etapa === "dados" && adolescenteSelecionado && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Tipo de Alerta *
                    </label>
                    <p className="text-xs text-gray-500">
                      Categorias oficiais (as mesmas de CI). O nivel sugerido e ajustado automaticamente.
                    </p>
                  </div>
                </div>
                <select
                  value={tipoSelecionado}
                  onChange={(event) => handleSelecionarTipo(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-white"
                >
                  <option value="">Selecione o tipo...</option>
                  {TIPO_CI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {erros.tipoAlerta && (
                  <p className="text-red-600 text-sm mt-1 font-semibold">
                    {erros.tipoAlerta}
                  </p>
                )}
                {tipoAlertaEmUso && (
                  <p className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                    Tipo selecionado: {tipoAlertaEmUso}
                    {tipoSelecionadoNivel && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          corNivel[tipoSelecionadoNivel]
                        }`}
                      >
                        Nivel sugerido: {tipoSelecionadoNivel}
                      </span>
                    )}
                  </p>
                )}
                {tipoSelecionado && DESCRICOES_TIPO[tipoSelecionado] && (
                  <p className="text-xs text-gray-600 mt-2">
                    {DESCRICOES_TIPO[tipoSelecionado]}
                  </p>
                )}
              </div>

              {/* Nível de Risco */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nivel de Risco *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {NIVEIS_RISCO.map((nivel) => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => setNivelRisco(nivel)}
                      className={`p-3 rounded-lg border-2 font-bold transition-all ${
                        nivelRisco === nivel
                          ? `${corNivel[nivel]} border-current`
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Descricao do Alerta *
                </label>
                <textarea
                  value={descricaoAlerta}
                  onChange={(e) => setDescricaoAlerta(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo do alerta..."
                  rows={5}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none resize-none ${
                    erros.descricaoAlerta
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-red-500 focus:ring-red-200"
                  }`}
                />
                {erros.descricaoAlerta && (
                  <p className="text-red-600 text-sm mt-1 font-semibold">
                    {erros.descricaoAlerta}
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-1">Minimo de 10 caracteres</p>
              </div>

              {/* Preview */}
              <div className={`p-4 rounded-lg border-2 ${corNivel[nivelRisco]}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">
                      Preview do Alerta - {nivelRisco}
                    </h3>
                    <p className="text-sm mb-2">
                      <strong>Adolescente:</strong>{" "}
                      {adolescenteSelecionado.nomeCompleto}
                    </p>
                    {tipoAlertaEmUso && (
                      <p className="text-sm mb-2">
                        <strong>Tipo:</strong> {tipoAlertaEmUso}
                      </p>
                    )}
                    <p className="text-sm">
                      {descricaoAlerta || "(Descricao nao informada)"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {etapa === "dados" && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">
            <button
              onClick={() => {
                setEtapa("selecionar");
                setAdolescenteSelecionado(null);
                setTipoSelecionado("");
                setDescricaoAlerta("");
                setNivelRisco("MEDIO");
                setErros({});
              }}
              className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-bold"
            >
              Voltar
            </button>
            <button
              onClick={handleCriarAlerta}
              disabled={loading || !descricaoAlerta.trim() || !tipoSelecionado}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell size={20} />
              {loading ? "Criando..." : "Criar Alerta"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
