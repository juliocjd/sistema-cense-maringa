"use client";

import { useState, useEffect } from "react";
import { Settings, Save, AlertCircle, CheckCircle, Calendar, Users, Clock, Home } from "lucide-react";

type Configuracao = {
  id: string | null;
  diasPermitidos: number[];
  limiteAdultosPadrao: number;
  limiteCriancasPadrao: number;
  habilitarRegraSegundoSabado: boolean;
  limiteAdultosSegundoSab: number;
  limiteCriancasSegundoSab: number;
  permitirAlternativa: boolean;
  idadeLimiteCrianca: number;
  periodosPorCasa: Record<string, "MANHA" | "TARDE">;
  janelaIdentificacaoManhaInicio: string;
  janelaIdentificacaoManhaFim: string;
  janelaIdentificacaoTardeInicio: string;
  janelaIdentificacaoTardeFim: string;
  horarioManhaInicio: string;
  horarioManhaFim: string;
  horarioTardeInicio: string;
  horarioTardeFim: string;
  quantidadeVisitasMensal: number;
  duracaoVisitaMinutos: number;
  ativo: boolean;
};

type CampoHorario =
  | "janelaIdentificacaoManhaInicio"
  | "janelaIdentificacaoManhaFim"
  | "janelaIdentificacaoTardeInicio"
  | "janelaIdentificacaoTardeFim"
  | "horarioManhaInicio"
  | "horarioManhaFim"
  | "horarioTardeInicio"
  | "horarioTardeFim";

const DIAS_SEMANA = [
  { valor: 0, nome: "Domingo" },
  { valor: 1, nome: "Segunda" },
  { valor: 2, nome: "Terça" },
  { valor: 3, nome: "Quarta" },
  { valor: 4, nome: "Quinta" },
  { valor: 5, nome: "Sexta" },
  { valor: 6, nome: "Sábado" },
];

export default function ConfiguracoesVisitasPage() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Carregar configurações ao montar
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const response = await fetch("/api/configuracoes/visitas");
      if (!response.ok) {
        throw new Error("Erro ao carregar configurações");
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar configurações");
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async () => {
    if (!config) return;

    setErro(null);
    setSucesso(false);
    setSalvando(true);

    try {
      const response = await fetch("/api/configuracoes/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Erro ao salvar configurações");
      }

      setConfig(data);
      setSucesso(true);

      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setSalvando(false);
    }
  };

  const toggleDia = (dia: number) => {
    if (!config) return;
    const novosDias = config.diasPermitidos.includes(dia)
      ? config.diasPermitidos.filter((d) => d !== dia)
      : [...config.diasPermitidos, dia].sort();

    setConfig({ ...config, diasPermitidos: novosDias });
  };

  const atualizarHorario = (campo: CampoHorario, valor: string) => {
    if (!config) return;
    setConfig({ ...config, [campo]: valor || "00:00" });
  };

  const renderHorarioInput = (
    label: string,
    campo: CampoHorario,
    helper?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="time"
        value={config ? config[campo] : "00:00"}
        onChange={(e) => atualizarHorario(campo, e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando configurações...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Erro ao carregar configurações</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-indigo-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">Configurações de Visitas</h1>
          </div>
          <p className="text-gray-600">
            Configure as regras e limites para o sistema de controle de visitas
          </p>
        </div>

        {/* Mensagens de Feedback */}
        {erro && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <p className="text-red-700">{erro}</p>
          </div>
        )}

        {sucesso && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
            <p className="text-green-700">Configurações salvas com sucesso!</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Dias Permitidos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Dias da Semana Permitidos</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DIAS_SEMANA.map((dia) => (
                <label
                  key={dia.valor}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    config.diasPermitidos.includes(dia.valor)
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={config.diasPermitidos.includes(dia.valor)}
                    onChange={() => toggleDia(dia.valor)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="font-medium text-gray-900">{dia.nome}</span>
                </label>
              ))}
          </div>
        </div>

        <hr className="border-gray-200" />

          {/* Janelas de Identificacao */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Janelas de Identificação</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Configure o intervalo em que os visitantes podem passar pela portaria antes de seguir para a area de seguranca.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Periodos da manha</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderHorarioInput("Inicio", "janelaIdentificacaoManhaInicio")}
                  {renderHorarioInput("Fim", "janelaIdentificacaoManhaFim")}
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Periodos da tarde</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderHorarioInput("Inicio", "janelaIdentificacaoTardeInicio")}
                  {renderHorarioInput("Fim", "janelaIdentificacaoTardeFim")}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Janelas de Permanencia */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Permanencia na area de seguranca</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Defina o horario efetivo das visitas dentro da unidade. Fora desse intervalo o sistema exigira justificativa.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Manha</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderHorarioInput("Inicio", "horarioManhaInicio")}
                  {renderHorarioInput("Fim", "horarioManhaFim")}
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Tarde</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderHorarioInput("Inicio", "horarioTardeInicio")}
                  {renderHorarioInput("Fim", "horarioTardeFim")}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Limites Padrão */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Limites Padrão de Visitantes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Adultos
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.limiteAdultosPadrao}
                  onChange={(e) =>
                    setConfig({ ...config, limiteAdultosPadrao: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Crianças
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.limiteCriancasPadrao}
                  onChange={(e) =>
                    setConfig({ ...config, limiteCriancasPadrao: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idade Limite Criança
                </label>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={config.idadeLimiteCrianca}
                  onChange={(e) =>
                    setConfig({ ...config, idadeLimiteCrianca: parseInt(e.target.value) || 12 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Até quantos anos considera criança</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Regra Segundo Sábado */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Regra Especial: Segundo Sábado</h2>
            </div>

            <label className="flex items-center gap-3 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={config.habilitarRegraSegundoSabado}
                onChange={(e) =>
                  setConfig({ ...config, habilitarRegraSegundoSabado: e.target.checked })
                }
                className="w-5 h-5 text-purple-600"
              />
              <span className="font-medium text-gray-900">
                Habilitar regras especiais para o segundo sábado do mês
              </span>
            </label>

            {config.habilitarRegraSegundoSabado && (
              <div className="space-y-4 ml-8">
                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.permitirAlternativa}
                    onChange={(e) =>
                      setConfig({ ...config, permitirAlternativa: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-900">
                    Permitir alternativa: (2 adultos + 1 criança) OU (1 adulto + 2 crianças)
                  </span>
                </label>

                {!config.permitirAlternativa && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limite Adultos (2º Sábado)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.limiteAdultosSegundoSab}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            limiteAdultosSegundoSab: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limite Crianças (2º Sábado)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={config.limiteCriancasSegundoSab}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            limiteCriancasSegundoSab: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Períodos por Casa */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Home className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Períodos de Visita por Casa</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Selecione o período de visita (manhã ou tarde) para cada casa individualmente
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((numeroCasa) => {
                const periodo = config.periodosPorCasa[numeroCasa.toString()] || "MANHA";
                return (
                  <div key={numeroCasa} className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Casa {numeroCasa}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            periodosPorCasa: {
                              ...config.periodosPorCasa,
                              [numeroCasa.toString()]: "MANHA",
                            },
                          })
                        }
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          periodo === "MANHA"
                            ? "bg-yellow-500 text-white shadow-md"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        }`}
                      >
                        Manhã
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            periodosPorCasa: {
                              ...config.periodosPorCasa,
                              [numeroCasa.toString()]: "TARDE",
                            },
                          })
                        }
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          periodo === "TARDE"
                            ? "bg-orange-500 text-white shadow-md"
                            : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                        }`}
                      >
                        Tarde
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Limite Mensal */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Limite de Visitas Mensais</h2>
            </div>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade máxima de visitas por mês
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.quantidadeVisitasMensal}
                onChange={(e) =>
                  setConfig({ ...config, quantidadeVisitasMensal: parseInt(e.target.value) || 1 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Máximo de visitas que um visitante pode realizar no mês
              </p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Duração da Visita */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Duração da Visita</h2>
            </div>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração da visita (em minutos)
              </label>
              <input
                type="number"
                min="30"
                max="480"
                step="30"
                value={config.duracaoVisitaMinutos}
                onChange={(e) =>
                  setConfig({ ...config, duracaoVisitaMinutos: parseInt(e.target.value) || 120 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tempo máximo de duração de cada visita ({Math.floor(config.duracaoVisitaMinutos / 60)}h {config.duracaoVisitaMinutos % 60}min)
              </p>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSalvar}
              disabled={salvando || config.diasPermitidos.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
            >
              <Save size={20} />
              {salvando ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
