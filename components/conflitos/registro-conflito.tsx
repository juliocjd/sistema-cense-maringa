"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Search, AlertTriangle } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  alojamento?: string;
};

interface RegistroConflitoProps {
  adolescentes: Adolescente[];
  onSalvar: (conflito: any) => Promise<void>;
}

export function RegistroConflito({
  adolescentes,
  onSalvar,
}: RegistroConflitoProps) {
  const [adolescenteA, setAdolescenteA] = useState<Adolescente | null>(null);
  const [adolescenteB, setAdolescenteB] = useState<Adolescente | null>(null);
  const [tipoConflito, setTipoConflito] = useState("");
  const [origem, setOrigem] = useState("");
  const [ciOrigem, setCiOrigem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const [buscaA, setBuscaA] = useState("");
  const [buscaB, setBuscaB] = useState("");
  const [mostrarListaA, setMostrarListaA] = useState(false);
  const [mostrarListaB, setMostrarListaB] = useState(false);

  const adolescentesFiltradosA = adolescentes.filter(
    (a) =>
      a.id !== adolescenteB?.id &&
      (a.nomeCompleto.toLowerCase().includes(buscaA.toLowerCase()) ||
        a.numeroSms.includes(buscaA))
  );

  const adolescentesFiltradosB = adolescentes.filter(
    (a) =>
      a.id !== adolescenteA?.id &&
      (a.nomeCompleto.toLowerCase().includes(buscaB.toLowerCase()) ||
        a.numeroSms.includes(buscaB))
  );

  const handleSalvar = async () => {
    // ValidaÃ§Ãµes
    if (!adolescenteA || !adolescenteB) {
      alert("Selecione os dois adolescentes envolvidos!");
      return;
    }

    if (!tipoConflito) {
      alert("Selecione o tipo de conflito!");
      return;
    }

    if (!origem) {
      alert("Informe a origem do conflito!");
      return;
    }

    setLoading(true);
    try {
      await onSalvar({
        adolescenteAId: adolescenteA.id,
        adolescenteBId: adolescenteB.id,
        tipoConflito,
        origem,
        ciOrigem: ciOrigem || undefined,
        descricao: descricao || undefined,
      });

      alert("âœ… Conflito registrado com sucesso!");
      // Limpar formulÃ¡rio ou redirecionar
    } catch (error) {
      alert("âŒ Erro ao registrar conflito. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
        <Link
          href="/conflitos"
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold mb-4"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          Registrar Novo Conflito
        </h1>
        <p className="text-gray-600 mt-2">
          Preencha as informaÃ§Ãµes sobre o conflito entre os adolescentes
        </p>
      </div>

      {/* FormulÃ¡rio */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          {/* Alerta */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900 mb-1">
                  AtenÃ§Ã£o ao registrar conflitos
                </p>
                <p className="text-sm text-orange-800">
                  O registro de conflito ativarÃ¡ alertas automÃ¡ticos no sistema
                  de alocaÃ§Ã£o e impedirÃ¡ que os adolescentes sejam colocados em
                  alojamentos frontais ou mesma ala.
                </p>
              </div>
            </div>
          </div>

          {/* SeleÃ§Ã£o de Adolescentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Adolescente A */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adolescente A *
              </label>
              <div className="relative">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={adolescenteA ? adolescenteA.nomeCompleto : buscaA}
                    onChange={(e) => {
                      setBuscaA(e.target.value);
                      setAdolescenteA(null);
                      setMostrarListaA(true);
                    }}
                    onFocus={() => setMostrarListaA(true)}
                    placeholder="Buscar por nome ou SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>

                {mostrarListaA &&
                  !adolescenteA &&
                  adolescentesFiltradosA.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMostrarListaA(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {adolescentesFiltradosA
                          .slice(0, 5)
                          .map((adolescente) => (
                            <button
                              key={adolescente.id}
                              onClick={() => {
                                setAdolescenteA(adolescente);
                                setMostrarListaA(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                            >
                              <p className="font-semibold text-gray-800">
                                {adolescente.nomeCompleto}
                              </p>
                              <p className="text-sm text-gray-600">
                                SMS: {adolescente.numeroSms}
                                {adolescente.alojamento && (
                                  <> â€¢ {adolescente.alojamento}</>
                                )}
                              </p>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
              </div>
              {adolescenteA && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-gray-800">
                    {adolescenteA.nomeCompleto}
                  </p>
                  <p className="text-sm text-gray-600">
                    SMS: {adolescenteA.numeroSms}
                    {adolescenteA.alojamento && (
                      <> â€¢ {adolescenteA.alojamento}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Adolescente B */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adolescente B *
              </label>
              <div className="relative">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={adolescenteB ? adolescenteB.nomeCompleto : buscaB}
                    onChange={(e) => {
                      setBuscaB(e.target.value);
                      setAdolescenteB(null);
                      setMostrarListaB(true);
                    }}
                    onFocus={() => setMostrarListaB(true)}
                    placeholder="Buscar por nome ou SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>

                {mostrarListaB &&
                  !adolescenteB &&
                  adolescentesFiltradosB.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMostrarListaB(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {adolescentesFiltradosB
                          .slice(0, 5)
                          .map((adolescente) => (
                            <button
                              key={adolescente.id}
                              onClick={() => {
                                setAdolescenteB(adolescente);
                                setMostrarListaB(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                            >
                              <p className="font-semibold text-gray-800">
                                {adolescente.nomeCompleto}
                              </p>
                              <p className="text-sm text-gray-600">
                                SMS: {adolescente.numeroSms}
                                {adolescente.alojamento && (
                                  <> â€¢ {adolescente.alojamento}</>
                                )}
                              </p>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
              </div>
              {adolescenteB && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-gray-800">
                    {adolescenteB.nomeCompleto}
                  </p>
                  <p className="text-sm text-gray-600">
                    SMS: {adolescenteB.numeroSms}
                    {adolescenteB.alojamento && (
                      <> â€¢ {adolescenteB.alojamento}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Conflito */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Conflito *
            </label>
            <select
              value={tipoConflito}
              onChange={(e) => setTipoConflito(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
            >
              <option value="">Selecione o tipo...</option>
              <option value="FACCAO">FacÃ§Ãµes rivais</option>
              <option value="TERRITORIAL">
                Territorial (bairros em conflito)
              </option>
              <option value="PESSOAL">Rivalidade pessoal</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          {/* Origem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Origem do Registro *
              </label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              >
                <option value="">Selecione...</option>
                <option value="CI">Comunicado Interno (CI)</option>
                <option value="OBSERVACAO">ObservaÃ§Ã£o direta</option>
                <option value="DENUNCIA">DenÃºncia</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {origem === "CI" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  NÃºmero do CI
                </label>
                <input
                  type="text"
                  value={ciOrigem}
                  onChange={(e) => setCiOrigem(e.target.value)}
                  placeholder="Ex: 145/2025"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* DescriÃ§Ã£o */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DescriÃ§Ã£o do Conflito
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder="Descreva os detalhes do conflito, como foi identificado, circunstÃ¢ncias, etc..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* BotÃµes */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200">
          <Link
            href="/conflitos"
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSalvar}
            disabled={
              loading ||
              !adolescenteA ||
              !adolescenteB ||
              !tipoConflito ||
              !origem
            }
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={20} />
                Registrar Conflito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
