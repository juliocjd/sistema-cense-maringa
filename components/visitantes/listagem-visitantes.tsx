"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Camera, Trash2, Edit } from "lucide-react";
import { FormVisitante } from "./form-visitante";

type Visitante = {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  dataNascimento: string | null;
  enderecoCompleto: string | null;
  telefones: string[];
  email: string | null;
  fotoUrl: string | null;
  consentimentoBiometria: boolean;
  temFaceCadastrada: boolean;
  criadoEm: string;
};

export function ListagemVisitantes() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [visitanteEditando, setVisitanteEditando] = useState<Visitante | null>(null);

  const carregarVisitantes = async () => {
    setCarregando(true);
    try {
      const response = await fetch("/api/visitantes");
      if (response.ok) {
        const data = await response.json();
        console.log("📥 Dados recebidos da API visitantes:", data);

        // A API retorna { total, visitantes }
        const visitantesData = data.visitantes || data;
        console.log("👥 Visitantes processados:", visitantesData);

        // O mapper já adiciona temFaceCadastrada, não precisa processar novamente
        setVisitantes(visitantesData);
      }
    } catch (error) {
      console.error("Erro ao carregar visitantes:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarVisitantes();
  }, []);

  const visitantesFiltrados = visitantes.filter((v) =>
    v.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
    (v.cpf && v.cpf.includes(busca))
  );

  const handleNovo = () => {
    setVisitanteEditando(null);
    setMostrarFormulario(true);
  };

  const handleEditar = (visitante: Visitante) => {
    setVisitanteEditando(visitante);
    setMostrarFormulario(true);
  };

  const handleSucesso = () => {
    setMostrarFormulario(false);
    setVisitanteEditando(null);
    carregarVisitantes();
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setVisitanteEditando(null);
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Deseja realmente excluir este visitante?")) return;

    try {
      const response = await fetch(`/api/visitantes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        carregarVisitantes();
      } else {
        alert("Erro ao excluir visitante");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir visitante");
    }
  };

  if (mostrarFormulario) {
    return (
      <FormVisitante
        visitante={visitanteEditando}
        onSuccess={handleSucesso}
        onCancel={handleCancelar}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="text-indigo-600" size={36} />
          Gestão de Visitantes
        </h1>
        <p className="text-gray-600 mt-2">
          Cadastro de visitantes com reconhecimento facial
        </p>
      </div>

      {/* Barra de Ações */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handleNovo}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
        >
          <Plus size={20} />
          Novo Visitante
        </button>
      </div>

      {/* Lista de Visitantes */}
      {carregando ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Carregando visitantes...</p>
        </div>
      ) : visitantesFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-lg">
            {busca
              ? "Nenhum visitante encontrado"
              : "Nenhum visitante cadastrado"}
          </p>
          {!busca && (
            <button
              onClick={handleNovo}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Cadastrar Primeiro Visitante
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visitantesFiltrados.map((visitante) => (
            <div
              key={visitante.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Foto */}
              <div className="flex items-start gap-4 mb-4">
                {visitante.fotoUrl ? (
                  <img
                    src={visitante.fotoUrl}
                    alt={visitante.nomeCompleto}
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="text-gray-400" size={32} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">
                    {visitante.nomeCompleto}
                  </h3>
                  {visitante.cpf && (
                    <p className="text-sm text-gray-600">CPF: {visitante.cpf}</p>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="space-y-2 mb-4">
                {visitante.dataNascimento && (
                  <p className="text-sm text-gray-700">
                    <strong>Nascimento:</strong>{" "}
                    {new Date(visitante.dataNascimento).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {visitante.telefones.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <strong>Telefone:</strong> {visitante.telefones[0]}
                  </p>
                )}
                {visitante.enderecoCompleto && (
                  <p className="text-sm text-gray-700 truncate">
                    <strong>Endereço:</strong> {visitante.enderecoCompleto}
                  </p>
                )}
              </div>

              {/* Status Reconhecimento Facial */}
              <div className="mb-4">
                {visitante.temFaceCadastrada ? (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                    <Camera size={16} />
                    <span className="text-sm font-medium">
                      Face Cadastrada
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    <Camera size={16} />
                    <span className="text-sm">Sem face cadastrada</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditar(visitante)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Edit size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(visitante.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
