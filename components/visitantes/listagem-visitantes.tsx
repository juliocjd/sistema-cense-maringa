"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Camera, Trash2, Edit, IdCard } from "lucide-react";
import { FormVisitante } from "./form-visitante";
import { ModalQRCode } from "./modal-qrcode";

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
  const [modalQRCode, setModalQRCode] = useState<{ id: string; nome: string } | null>(null);

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
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
          <Users className="text-indigo-600 w-8 h-8 md:w-9 md:h-9" />
          <span className="hidden sm:inline">Gestão de Visitantes</span>
          <span className="sm:hidden">Visitantes</span>
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Cadastro de visitantes com reconhecimento facial
        </p>
      </div>

      {/* Barra de Ações */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handleNovo}
          className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Novo Visitante</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Lista de Visitantes */}
      {carregando ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-sm md:text-base">Carregando visitantes...</p>
        </div>
      ) : visitantesFiltrados.length === 0 ? (
        <div className="text-center py-8 md:py-12 bg-gray-50 rounded-lg">
          <Users className="mx-auto text-gray-400 mb-4 w-12 h-12 md:w-16 md:h-16" />
          <p className="text-gray-600 text-base md:text-lg">
            {busca
              ? "Nenhum visitante encontrado"
              : "Nenhum visitante cadastrado"}
          </p>
          {!busca && (
            <button
              onClick={handleNovo}
              className="mt-4 px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm md:text-base"
            >
              Cadastrar Primeiro Visitante
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {visitantesFiltrados.map((visitante) => (
            <div
              key={visitante.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              {/* Foto */}
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                {visitante.fotoUrl ? (
                  <img
                    src={visitante.fotoUrl}
                    alt={visitante.nomeCompleto}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-indigo-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <Users className="text-gray-400 w-7 h-7 md:w-8 md:h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base md:text-lg text-gray-900 truncate">
                    {visitante.nomeCompleto}
                  </h3>
                  {visitante.cpf && (
                    <p className="text-xs md:text-sm text-gray-600 truncate">CPF: {visitante.cpf}</p>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4">
                {visitante.dataNascimento && (
                  <p className="text-xs md:text-sm text-gray-700">
                    <strong>Nascimento:</strong>{" "}
                    {new Date(visitante.dataNascimento).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {visitante.telefones.length > 0 && (
                  <p className="text-xs md:text-sm text-gray-700">
                    <strong>Telefone:</strong> {visitante.telefones[0]}
                  </p>
                )}
                {visitante.enderecoCompleto && (
                  <p className="text-xs md:text-sm text-gray-700 truncate">
                    <strong>Endereço:</strong> {visitante.enderecoCompleto}
                  </p>
                )}
              </div>

              {/* Status Reconhecimento Facial */}
              <div className="mb-3 md:mb-4">
                {visitante.temFaceCadastrada ? (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">
                      Face Cadastrada
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs md:text-sm">Sem face cadastrada</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-1.5 md:gap-2">
                <button
                  onClick={() => handleEditar(visitante)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium"
                >
                  <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Editar
                </button>
                <button
                  onClick={() =>
                    setModalQRCode({ id: visitante.id, nome: visitante.nomeCompleto })
                  }
                  className="px-2.5 md:px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                  title="Gerar carteirinha"
                >
                  <IdCard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-semibold hidden sm:inline">Carteirinha</span>
                </button>
                <button
                  onClick={() => handleExcluir(visitante.id)}
                  className="px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal QR Code */}
      {modalQRCode && (
        <ModalQRCode
          visitanteId={modalQRCode.id}
          visitanteNome={modalQRCode.nome}
          onClose={() => setModalQRCode(null)}
        />
      )}
    </div>
  );
}
