"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Save, X, Search, AlertTriangle } from "lucide-react";
import {
  TIPO_CI_OPTIONS,
  TIPOS_CONFLITO_AUTOMATICO,
  TIPOS_ALERTA_AUTOMATICO,
} from "@/lib/comunicados/tipos";

const NIVEIS_RISCO = ["CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
type NivelRisco = (typeof NIVEIS_RISCO)[number];

const DESCRICOES_TIPO: Record<string, string> = {
  DISCIPLINAR: "Conduta que exige acompanhamento de comportamento.",
  CONFLITO: "Conflito mapeado envolvendo adolescentes.",
  AUTORIZACAO_ESPECIAL:
    "Permissao controlada de item nao autorizado (ex.: caneta/material de estudo).",
  SAUDE_CONFIDENCIAL:
    "Informacao de saude sensivel que impacta cuidados e seguranca.",
  RISKO_SUICIDIO: "Risco de suicidio identificado.",
  PERFIL_MAPEADO: "Protecao por ato infracional que exige sigilo.",
  FUGA: "Risco ou registro de fuga/plano de fuga/evasao.",
  AGRESSAO: "Registro de agressao ou risco iminente.",
  AMEACA_SERVIDOR: "Ameaca direta contra servidor.",
  OUTROS: "Outros alertas relevantes para a operacao.",
};

const sugerirNivelPorTipo = (tipo: string): NivelRisco => {
  if (tipo === "RISKO_SUICIDIO" || tipo === "RISCO_SUICIDIO") return "CRITICO";
  if (
    tipo === "FUGA" ||
    tipo === "SAUDE_CONFIDENCIAL" ||
    tipo === "AGRESSAO" ||
    tipo === "AMEACA_SERVIDOR"
  ) {
    return "ALTO";
  }
  return "MEDIO";
};

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  fotoUrl?: string | null;
  alojamento?: string;
};

interface RegistroCIProps {
  adolescentes: Adolescente[];
  onSalvar: (ci: any) => Promise<void>;
}

export function RegistroCI({ adolescentes, onSalvar }: RegistroCIProps) {
  const [numero, setNumero] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [dataFato, setDataFato] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tipoCi, setTipoCi] = useState("");
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>("MEDIO");
  const [resumoCi, setResumoCi] = useState("");
  const [adolescentesSelecionados, setAdolescentesSelecionados] = useState<
    Adolescente[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [gerarConflito, setGerarConflito] = useState(false);
  const [gerarAlerta, setGerarAlerta] = useState(false);
  const [enviarEmailTecnicos, setEnviarEmailTecnicos] = useState(false);
  const [tipoConflitoGerado, setTipoConflitoGerado] =
    useState<string>("PESSOAL");
  const [ladoA, setLadoA] = useState<Adolescente[]>([]);
  const [ladoB, setLadoB] = useState<Adolescente[]>([]);
  const [buscaLadoA, setBuscaLadoA] = useState("");
  const [buscaLadoB, setBuscaLadoB] = useState("");
  const [mostrarListaLadoA, setMostrarListaLadoA] = useState(false);
  const [mostrarListaLadoB, setMostrarListaLadoB] = useState(false);

  useEffect(() => {
    setGerarConflito(TIPOS_CONFLITO_AUTOMATICO.has(tipoCi));
    setGerarAlerta(TIPOS_ALERTA_AUTOMATICO.has(tipoCi));
    if (tipoCi) {
      setNivelRisco(sugerirNivelPorTipo(tipoCi));
    }
  }, [tipoCi]);

  const modoConflito = tipoCi === "CONFLITO";

  useEffect(() => {
    if (modoConflito) {
      setAdolescentesSelecionados([]);
      setTipoConflitoGerado("PESSOAL");
    } else {
      setLadoA([]);
      setLadoB([]);
    }
  }, [modoConflito]);

  // Busca de adolescentes
  const [buscaAdolescente, setBuscaAdolescente] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  const adolescentesFiltrados = adolescentes.filter(
    (a) =>
      !adolescentesSelecionados.find((sel) => sel.id === a.id) &&
      (a.nomeCompleto.toLowerCase().includes(buscaAdolescente.toLowerCase()) ||
        a.numeroSms.includes(buscaAdolescente))
  );

  const adicionarAdolescente = (adolescente: Adolescente) => {
    setAdolescentesSelecionados([...adolescentesSelecionados, adolescente]);
    setBuscaAdolescente("");
    setMostrarLista(false);
  };

  const removerAdolescente = (id: string) => {
    setAdolescentesSelecionados(
      adolescentesSelecionados.filter((a) => a.id !== id)
    );
  };
  const participantesConflitoIds = useMemo(() => {
    const ids = new Set<string>();
    ladoA.forEach((item) => ids.add(item.id));
    ladoB.forEach((item) => ids.add(item.id));
    return ids;
  }, [ladoA, ladoB]);

  const candidatosLadoA = useMemo(() => {
    const termo = buscaLadoA.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (participantesConflitoIds.has(alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaLadoA && alvo.numeroSms.includes(buscaLadoA))
      );
    });
  }, [adolescentes, buscaLadoA, participantesConflitoIds]);

  const candidatosLadoB = useMemo(() => {
    const termo = buscaLadoB.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (participantesConflitoIds.has(alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaLadoB && alvo.numeroSms.includes(buscaLadoB))
      );
    });
  }, [adolescentes, buscaLadoB, participantesConflitoIds]);

  const adicionarAoLado = (lado: "A" | "B", adolescente: Adolescente) => {
    if (lado === "A") {
      setLadoA((lista) => [...lista, adolescente]);
      setBuscaLadoA("");
      setMostrarListaLadoA(false);
    } else {
      setLadoB((lista) => [...lista, adolescente]);
      setBuscaLadoB("");
      setMostrarListaLadoB(false);
    }
  };

  const removerDoLado = (lado: "A" | "B", id: string) => {
    if (lado === "A") {
      setLadoA((lista) => lista.filter((item) => item.id !== id));
    } else {
      setLadoB((lista) => lista.filter((item) => item.id !== id));
    }
  };

  const selecionadosParaEnvio = modoConflito
    ? [...ladoA, ...ladoB]
    : adolescentesSelecionados;
  const adolescenteDestaque = selecionadosParaEnvio[0];

  const handleSalvar = async () => {
    // Valida??es
    if (!numero || !ano || !dataFato || !tipoCi || !resumoCi) {
      alert("Preencha todos os campos obrigat?rios!");
      return;
    }

    if (selecionadosParaEnvio.length === 0) {
      alert("Selecione pelo menos um adolescente!");
      return;
    }

    if (modoConflito && (ladoA.length === 0 || ladoB.length === 0)) {
      alert("Selecione pelo menos um adolescente em cada lado.");
      return;
    }

    setLoading(true);
    try {
      // Preparar dados
      const formData = new FormData();
      formData.append("numero", numero);
      formData.append("ano", ano);
      formData.append("dataFato", dataFato);
      formData.append("tipoCi", tipoCi);
      formData.append("resumoCi", resumoCi);
      formData.append(
        "adolescentesIds",
        JSON.stringify(selecionadosParaEnvio.map((a) => a.id))
      );
      if (modoConflito) {
        formData.append(
          "ladoAIds",
          JSON.stringify(ladoA.map((participante) => participante.id))
        );
        formData.append(
          "ladoBIds",
          JSON.stringify(ladoB.map((participante) => participante.id))
        );
        formData.append("tipoConflitoGerado", tipoConflitoGerado);
      }
      formData.append("gerarConflito", gerarConflito ? "true" : "false");
      formData.append("gerarAlerta", gerarAlerta ? "true" : "false");
      formData.append("nivelRiscoAlerta", nivelRisco);
      formData.append(
        "enviarEmailTecnicos",
        enviarEmailTecnicos ? "true" : "false"
      );

      await onSalvar(formData);

      alert("CI registrado com sucesso!");
      // Limpar formul?rio ou redirecionar
    } catch (error) {
      alert("Erro ao registrar CI. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-blue-600">
        <Link
          href="/comunicados"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Registrar Novo Comunicado Interno
            </h1>
            <p className="text-gray-600 mt-2">
              Preencha as informações do CI e vincule os adolescentes envolvidos
            </p>
          </div>
          {null}
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          {/* Alerta */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">Importante</p>
                <p className="text-sm text-blue-800">
                  Após salvar, você poderá criar conflitos ou alertas
                  automaticamente baseados neste CI.
                </p>
              </div>
            </div>
          </div>

          {/* Número e Ano */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número do CI *
              </label>
              <input
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 145"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ano *
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                placeholder="Ex: 2025"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data do Fato *
              </label>
              <input
                type="date"
                value={dataFato}
                onChange={(e) => setDataFato(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Tipo de CI */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de CI *
            </label>
            <select
              value={tipoCi}
              onChange={(e) => setTipoCi(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            >
              <option value="">Selecione o tipo...</option>
              {TIPO_CI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {tipoCi && (
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {DESCRICOES_TIPO[tipoCi] && <p>{DESCRICOES_TIPO[tipoCi]}</p>}
                {!modoConflito && gerarAlerta && (
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-gray-700">
                      Nivel sugerido:
                    </label>
                    <select
                      value={nivelRisco}
                      onChange={(e) => setNivelRisco(e.target.value as NivelRisco)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      {NIVEIS_RISCO.map((nivel) => (
                        <option key={nivel} value={nivel}>
                          {nivel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Acoes automaticas */}
          {(TIPOS_CONFLITO_AUTOMATICO.has(tipoCi) || TIPOS_ALERTA_AUTOMATICO.has(tipoCi)) && (
            <div className="mt-2 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {TIPOS_CONFLITO_AUTOMATICO.has(tipoCi) && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={gerarConflito}
                    onChange={(e) => setGerarConflito(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Gerar <strong>CONFLITOS</strong> automaticamente entre os adolescentes vinculados.
                  </span>
                </label>
              )}
              {modoConflito && gerarConflito && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo do conflito gerado (padrão: PESSOAL)
                  </label>
                  <select
                    value={tipoConflitoGerado}
                    onChange={(e) => setTipoConflitoGerado(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="PESSOAL">Conflito pessoal</option>
                    <option value="FACCAO">Conflito por facção</option>
                    <option value="TERRITORIAL">Conflito territorial</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
              )}
              {TIPOS_ALERTA_AUTOMATICO.has(tipoCi) && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={gerarAlerta}
                    onChange={(e) => setGerarAlerta(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Gerar <strong>ALERTAS</strong> automaticamente para os adolescentes deste CI.
                  </span>
                </label>
              )}
            </div>
          )}
          <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enviarEmailTecnicos}
                onChange={(e) => setEnviarEmailTecnicos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Enviar este comunicado e os registros gerados por email para os
                tecnicos de referencia.
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              O email inclui o resumo do CI, participantes vinculados e alertas
              ou conflitos gerados automaticamente.
            </p>
          </div>


          {/* Sele??o de Adolescentes */}
          {modoConflito ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-800">Lado 1</p>
                      <p className="text-xs text-gray-500">
                        Integrantes deste lado nao geram alertas entre si.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {ladoA.length} selecionado(s)
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={buscaLadoA}
                      onChange={(event) => setBuscaLadoA(event.target.value)}
                      onFocus={() => setMostrarListaLadoA(true)}
                      placeholder="Buscar por nome ou SMS"
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    {mostrarListaLadoA && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {candidatosLadoA.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">
                            Nenhum adolescente disponivel para este lado.
                          </p>
                        ) : (
                          candidatosLadoA.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => adicionarAoLado("A", item)}
                              className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
                            >
                              <span className="font-semibold text-gray-800">
                                {item.nomeCompleto}
                              </span>
                              <span className="text-xs text-gray-500">SMS: {item.numeroSms}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                    {ladoA.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ladoA.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700"
                          >
                            {item.fotoUrl ? (
                              <span className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold">
                                <img
                                  src={item.fotoUrl}
                                  alt={item.nomeCompleto}
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : (
                              <span
                                title="Sem foto cadastrada"
                                className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold"
                              >
                                {item.nomeCompleto?.trim().charAt(0) ?? "?"}
                              </span>
                            )}
                            <span>{item.nomeCompleto}</span>
                            <button
                              type="button"
                              onClick={() => removerDoLado("A", item.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-800">Lado 2</p>
                      <p className="text-xs text-gray-500">
                        Estes adolescentes serao avaliados contra o lado 1.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {ladoB.length} selecionado(s)
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={buscaLadoB}
                      onChange={(event) => setBuscaLadoB(event.target.value)}
                      onFocus={() => setMostrarListaLadoB(true)}
                      placeholder="Buscar por nome ou SMS"
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    {mostrarListaLadoB && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {candidatosLadoB.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">
                            Nenhum adolescente disponivel para este lado.
                          </p>
                        ) : (
                          candidatosLadoB.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => adicionarAoLado("B", item)}
                              className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
                            >
                              <span className="font-semibold text-gray-800">
                                {item.nomeCompleto}
                              </span>
                              <span className="text-xs text-gray-500">SMS: {item.numeroSms}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                    {ladoB.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ladoB.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700"
                          >
                            {item.fotoUrl ? (
                              <span className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold">
                                <img
                                  src={item.fotoUrl}
                                  alt={item.nomeCompleto}
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : (
                              <span
                                title="Sem foto cadastrada"
                                className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold"
                              >
                                {item.nomeCompleto?.trim().charAt(0) ?? "?"}
                              </span>
                            )}
                            <span>{item.nomeCompleto}</span>
                            <button
                              type="button"
                              onClick={() => removerDoLado("B", item.id)}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adolescentes Envolvidos *
              </label>

              {/* Campo de Busca */}
              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  value={buscaAdolescente}
                  onChange={(e) => {
                    setBuscaAdolescente(e.target.value);
                    setMostrarLista(true);
                  }}
                  onFocus={() => setMostrarLista(true)}
                  placeholder="Buscar adolescente por nome ou SMS..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />

                {/* Lista de Resultados */}
                {mostrarLista &&
                  buscaAdolescente &&
                  adolescentesFiltrados.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMostrarLista(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {adolescentesFiltrados.slice(0, 5).map((adolescente) => (
                          <button
                            key={adolescente.id}
                            onClick={() => adicionarAdolescente(adolescente)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0"
                          >
                            <p className="font-semibold text-gray-800">
                              {adolescente.nomeCompleto}
                            </p>
                            <p className="text-sm text-gray-600">
                              SMS: {adolescente.numeroSms}
                              {adolescente.alojamento && (
                                <> ? {adolescente.alojamento}</>
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
              </div>

              {/* Adolescentes Selecionados */}
              {adolescentesSelecionados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Selecionados ({adolescentesSelecionados.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {adolescentesSelecionados.map((adolescente) => (
                      <div
                        key={adolescente.id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg border border-blue-300"
                      >
                        {adolescente.fotoUrl ? (
                          <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                            <img
                              src={adolescente.fotoUrl}
                              alt={adolescente.nomeCompleto}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            title="Sem foto cadastrada"
                            className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0"
                          >
                            {adolescente.nomeCompleto?.trim().charAt(0) ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">
                            {adolescente.nomeCompleto}
                          </p>
                          <p className="text-xs">SMS: {adolescente.numeroSms}</p>
                        </div>
                        <button
                          onClick={() => removerAdolescente(adolescente.id)}
                          className="p-1 hover:bg-blue-200 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Resumo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resumo do CI *
            </label>
            <textarea
              value={resumoCi}
              onChange={(e) => setResumoCi(e.target.value)}
              rows={4}
              placeholder="Descreva resumidamente o ocorrido..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
            />
          </div>

        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200">
          <Link
            href="/comunicados"
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSalvar}
            disabled={
              loading ||
              !numero ||
              !ano ||
              !dataFato ||
              !tipoCi ||
              !resumoCi ||
              selecionadosParaEnvio.length === 0
            }
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={20} />
                Registrar CI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

