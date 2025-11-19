"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Mail, Phone, Briefcase, Search } from "lucide-react";
import FormTecnico from "./form-tecnico";

interface Tecnico {
  id: string;
  nome: string;
  atividade?: string | null;
  email: string;
  telefone?: string | null;
}

const extraiIniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();

const normalizaTexto = (valor?: string | null) =>
  typeof valor === "string" ? valor.trim().toLowerCase() : "";

export function ListagemTecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const carregarTecnicos = useCallback(async () => {
    try {
      setCarregando(true);
      setErroCarregamento(null);
      const resposta = await fetch("/api/tecnicos", { cache: "no-store" });
      if (!resposta.ok) {
        throw new Error(`Falha ao buscar técnicos (${resposta.status})`);
      }
      const payload = (await resposta.json()) as {
        data?: Tecnico[];
      };
      setTecnicos(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      console.error("Erro ao carregar técnicos:", error);
      setErroCarregamento(
        "Não foi possível carregar os técnicos. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarTecnicos();
  }, [carregarTecnicos]);

  const tecnicosFiltrados = tecnicos.filter((tecnico) => {
    if (!busca.trim()) return true;
    const termo = normalizaTexto(busca);
    return (
      normalizaTexto(tecnico.nome).includes(termo) ||
      normalizaTexto(tecnico.email).includes(termo) ||
      normalizaTexto(tecnico.atividade).includes(termo) ||
      normalizaTexto(tecnico.telefone).includes(termo)
    );
  });

  if (carregando && tecnicos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-gray-600">
        Carregando técnicos...
      </div>
    );
  }

  if (erroCarregamento && tecnicos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="text-red-600 font-semibold">{erroCarregamento}</div>
        <button
          type="button"
          onClick={carregarTecnicos}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Técnicos de Referência
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              {tecnicosFiltrados.length} técnico(s) encontrado(s)
              {carregando && (
                <span className="text-xs font-semibold text-indigo-600">
                  Atualizando...
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <UserPlus size={18} />
            {mostrarFormulario ? "Fechar formulário" : "Novo cadastro"}
          </button>
        </div>
      </header>

      {erroCarregamento && tecnicos.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col gap-3 text-rose-700">
          <div className="font-semibold">{erroCarregamento}</div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Os dados exibidos abaixo podem estar desatualizados. Clique em
              atualizar para tentar novamente.
            </span>
            <button
              type="button"
              onClick={carregarTecnicos}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 font-semibold hover:bg-rose-100 transition-colors"
            >
              Atualizar lista
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <FormTecnico onSuccess={() => {
            carregarTecnicos();
            setMostrarFormulario(false);
          }} />
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, email, atividade ou telefone..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </div>
      </section>

      {tecnicosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-500">
          <p className="text-lg font-semibold">
            Nenhum técnico encontrado
          </p>
          <p className="text-sm mt-2">
            {busca.trim()
              ? "Tente ajustar os filtros de busca"
              : "Cadastre o primeiro técnico clicando no botão acima"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tecnicosFiltrados.map((tecnico) => (
            <div
              key={tecnico.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold flex-shrink-0">
                  {extraiIniciais(tecnico.nome)}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {tecnico.nome}
                    </h3>
                    {tecnico.atividade && (
                      <p className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                        <Briefcase size={14} />
                        {tecnico.atividade}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="flex items-center gap-2 truncate">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={tecnico.email}>
                        {tecnico.email}
                      </span>
                    </p>
                    {tecnico.telefone && (
                      <p className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                        {tecnico.telefone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
