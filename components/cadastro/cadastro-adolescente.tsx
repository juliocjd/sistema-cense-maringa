"use client";

import { useState } from "react";
import {
  User,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  Camera,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import type { Adolescente } from "@/types";

interface CadastroAdolescenteProps {
  onSalvar: (adolescente: Partial<Adolescente>) => Promise<void>;
  onCancelar: () => void;
}

export function CadastroAdolescente({
  onSalvar,
  onCancelar,
}: CadastroAdolescenteProps) {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [loading, setLoading] = useState(false);

  // Estados do formulário
  const [dadosPessoais, setDadosPessoais] = useState({
    nomeCompleto: "",
    nomeSocial: "",
    dataNascimento: "",
    numeroSms: "",
    numeroProcesso: "",
    dataEntrada: new Date().toISOString().split("T")[0],
  });

  const [atoInfracional, setAtoInfracional] = useState({
    atoAtual: "",
    historico: [] as { descricao: string; unidade: string; ano: string }[],
  });

  const [vinculacoes, setVinculacoes] = useState({
    faccaoId: "",
    numeroMembro: "",
    bairroId: "",
    riscoFuga: "BAIXO" as "BAIXO" | "MÉDIO" | "ALTO",
  });

  const [tatuagens, setTatuagens] = useState<
    { catalogoId: string; localCorpo: string; observacoes: string }[]
  >([]);

  const [alertas, setAlertas] = useState({
    riscoSuicidio: false,
    perfilMapeado: false,
    saudeConfidencial: false,
    detalheSaude: "",
  });

  const [foto, setFoto] = useState<string | null>(null);

  // Mock de opções (substituir por dados da API)
  const faccoes = [
    { id: "fac-1", nome: "Sem Facção" },
    { id: "fac-2", nome: "Grupo A" },
    { id: "fac-3", nome: "Grupo B" },
  ];

  const bairros = [
    { id: "bai-1", nome: "Centro", cidade: "Maringá" },
    { id: "bai-2", nome: "Zona 7", cidade: "Maringá" },
    { id: "bai-3", nome: "Jardim Alvorada", cidade: "Maringá" },
  ];

  const catalogoTatuagens = [
    { id: "tat-1", nome: "Cruz", significado: "Religioso" },
    { id: "tat-2", nome: "Palhaço", significado: "Assassino de policial" },
    { id: "tat-3", nome: "Aranha", significado: "Traficante" },
  ];

  // Etapas do cadastro
  const etapas = [
    { numero: 1, titulo: "Dados Pessoais", icone: User },
    { numero: 2, titulo: "Ato Infracional", icone: FileText },
    { numero: 3, titulo: "Vinculações", icone: Users },
    { numero: 4, titulo: "Tatuagens", icone: Camera },
    { numero: 5, titulo: "Alertas", icone: AlertTriangle },
  ];

  const proximaEtapa = () => {
    if (etapaAtual < 5) setEtapaAtual(etapaAtual + 1);
  };

  const etapaAnterior = () => {
    if (etapaAtual > 1) setEtapaAtual(etapaAtual - 1);
  };

  const handleSalvar = async () => {
    // Validação básica
    if (!dadosPessoais.nomeCompleto.trim()) {
      alert("Nome completo é obrigatório!");
      setEtapaAtual(1);
      return;
    }

    setLoading(true);
    try {
      const adolescente: Partial<Adolescente> = {
        nomeCompleto: dadosPessoais.nomeCompleto,
        nomeSocial: dadosPessoais.nomeSocial || undefined,
        dataNascimento: dadosPessoais.dataNascimento || undefined,
        numeroSms: dadosPessoais.numeroSms || undefined,
        numeroProcesso: dadosPessoais.numeroProcesso || undefined,
        dataEntrada: dadosPessoais.dataEntrada || undefined,
        atoInfracionalAtual: atoInfracional.atoAtual || undefined,
        fotoUrl: foto,
        alertaRiscoSuicidio: alertas.riscoSuicidio,
        alertaPerfilMapeado: alertas.perfilMapeado,
        alertaSaudeConfidencial: alertas.saudeConfidencial,
        statusUnidade: "ATIVO",
        conflitosA: [],
        conflitosB: [],
      };

      await onSalvar(adolescente);
      alert("✅ Adolescente cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("❌ Erro ao salvar adolescente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const adicionarHistoricoInfracional = () => {
    setAtoInfracional({
      ...atoInfracional,
      historico: [
        ...atoInfracional.historico,
        { descricao: "", unidade: "", ano: "" },
      ],
    });
  };

  const removerHistoricoInfracional = (index: number) => {
    setAtoInfracional({
      ...atoInfracional,
      historico: atoInfracional.historico.filter((_, i) => i !== index),
    });
  };

  const adicionarTatuagem = () => {
    setTatuagens([
      ...tatuagens,
      { catalogoId: "", localCorpo: "", observacoes: "" },
    ]);
  };

  const removerTatuagem = (index: number) => {
    setTatuagens(tatuagens.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-b-4 border-indigo-600">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Cadastro de Adolescente
          </h1>
          <p className="text-gray-600">
            Preencha todas as informações necessárias para o dossiê completo
          </p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {etapas.map((etapa, index) => (
              <div key={etapa.numero} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      etapa.numero === etapaAtual
                        ? "bg-indigo-600 text-white scale-110"
                        : etapa.numero < etapaAtual
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {etapa.numero < etapaAtual ? (
                      <CheckCircle size={24} />
                    ) : (
                      <etapa.icone size={24} />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-semibold text-center ${
                      etapa.numero === etapaAtual
                        ? "text-indigo-600"
                        : etapa.numero < etapaAtual
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    {etapa.titulo}
                  </span>
                </div>
                {index < etapas.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all ${
                      etapa.numero < etapaAtual ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ETAPA 1: Dados Pessoais */}
          {etapaAtual === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User className="text-indigo-600" />
                Dados Pessoais
              </h2>

              {/* Upload de Foto */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-indigo-200">
                    {foto ? (
                      <img
                        src={foto}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={48} className="text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeCompleto}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeCompleto: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: João da Silva Santos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Social
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeSocial}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeSocial: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: João"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={dadosPessoais.dataNascimento}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        dataNascimento: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número SMS
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.numeroSms}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        numeroSms: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número do Processo
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.numeroProcesso}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        numeroProcesso: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: 0001234-56.2024.8.16.0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={dadosPessoais.dataEntrada}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        dataEntrada: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: Ato Infracional */}
          {etapaAtual === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Ato Infracional
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ato Infracional Atual
                </label>
                <textarea
                  value={atoInfracional.atoAtual}
                  onChange={(e) =>
                    setAtoInfracional({
                      ...atoInfracional,
                      atoAtual: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                  placeholder="Ex: Análogo a roubo qualificado (art. 157, §2º, CP)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Histórico Infracional
                  </h3>
                  <button
                    type="button"
                    onClick={adicionarHistoricoInfracional}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                  >
                    + Adicionar
                  </button>
                </div>

                {atoInfracional.historico.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText
                      size={48}
                      className="mx-auto mb-2 text-gray-400"
                    />
                    <p>Nenhum histórico registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atoInfracional.historico.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].descricao = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Descrição do ato"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.unidade}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].unidade = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Unidade"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.ano}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].ano = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Ano"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={() => removerHistoricoInfracional(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-semibold"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 3: Vinculações */}
          {etapaAtual === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-indigo-600" />
                Vinculações
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facção/Grupo
                  </label>
                  <select
                    value={vinculacoes.faccaoId}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        faccaoId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {faccoes.map((faccao) => (
                      <option key={faccao.id} value={faccao.id}>
                        {faccao.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Membro
                  </label>
                  <input
                    type="text"
                    value={vinculacoes.numeroMembro}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        numeroMembro: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bairro de Origem
                  </label>
                  <select
                    value={vinculacoes.bairroId}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        bairroId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {bairros.map((bairro) => (
                      <option key={bairro.id} value={bairro.id}>
                        {bairro.nome} - {bairro.cidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Risco de Fuga
                  </label>
                  <select
                    value={vinculacoes.riscoFuga}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        riscoFuga: e.target.value as "BAIXO" | "MÉDIO" | "ALTO",
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="BAIXO">Baixo</option>
                    <option value="MÉDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: Tatuagens */}
          {etapaAtual === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Camera className="text-indigo-600" />
                Tatuagens
              </h2>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Registre as tatuagens identificadas no adolescente
                </p>
                <button
                  type="button"
                  onClick={adicionarTatuagem}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                >
                  + Adicionar Tatuagem
                </button>
              </div>

              {tatuagens.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Camera size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhuma tatuagem registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tatuagens.map((tatuagem, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Símbolo/Tipo
                          </label>
                          <select
                            value={tatuagem.catalogoId}
                            onChange={(e) => {
                              const novo = [...tatuagens];
                              novo[index].catalogoId = e.target.value;
                              setTatuagens(novo);
                            }}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm"
                          >
                            <option value="">Selecione...</option>
                            {catalogoTatuagens.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.nome} - {cat.significado}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Local do Corpo
                          </label>
                          <input
                            type="text"
                            value={tatuagem.localCorpo}
                            onChange={(e) => {
                              const novo = [...tatuagens];
                              novo[index].localCorpo = e.target.value;
                              setTatuagens(novo);
                            }}
                            placeholder="Ex: Braço direito"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Observações
                          </label>
                          <input
                            type="text"
                            value={tatuagem.observacoes}
                            onChange={(e) => {
                              const novo = [...tatuagens];
                              novo[index].observacoes = e.target.value;
                              setTatuagens(novo);
                            }}
                            placeholder="Detalhes adicionais"
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerTatuagem(index)}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm font-semibold"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 5: Alertas */}
          {etapaAtual === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-indigo-600" />
                Alertas Especiais
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <input
                    type="checkbox"
                    id="riscoSuicidio"
                    checked={alertas.riscoSuicidio}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        riscoSuicidio: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="riscoSuicidio"
                      className="font-semibold text-orange-900 cursor-pointer"
                    >
                      ⚠️ Risco de Suicídio
                    </label>
                    <p className="text-sm text-orange-700 mt-1">
                      Adolescente apresenta histórico ou comportamento de risco
                      para autolesão
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <input
                    type="checkbox"
                    id="perfilMapeado"
                    checked={alertas.perfilMapeado}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        perfilMapeado: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="perfilMapeado"
                      className="font-semibold text-purple-900 cursor-pointer"
                    >
                      🔒 Perfil Mapeado (Proteção)
                    </label>
                    <p className="text-sm text-purple-700 mt-1">
                      Ato infracional que necessita sigilo e proteção especial
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <input
                    type="checkbox"
                    id="saudeConfidencial"
                    checked={alertas.saudeConfidencial}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        saudeConfidencial: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="saudeConfidencial"
                      className="font-semibold text-blue-900 cursor-pointer"
                    >
                      ⚕️ Alerta de Saúde Confidencial
                    </label>
                    <p className="text-sm text-blue-700 mt-1">
                      Condição de saúde que requer atenção especial
                    </p>
                  </div>
                </div>

                {alertas.saudeConfidencial && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Detalhes da Condição de Saúde (Confidencial)
                    </label>
                    <textarea
                      value={alertas.detalheSaude}
                      onChange={(e) =>
                        setAlertas({
                          ...alertas,
                          detalheSaude: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                      placeholder="Descreva a condição de saúde que requer atenção..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="text-sm text-gray-600 font-semibold">
              Etapa {etapaAtual} de {etapas.length}
            </div>

            {etapaAtual < 5 ? (
              <button
                type="button"
                onClick={proximaEtapa}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Próxima
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSalvar}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Salvar Cadastro
                  </>
                )}
              </button>
            )}
          </div>

          {/* Botão Cancelar */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancelar}
              className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
            >
              Cancelar cadastro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
