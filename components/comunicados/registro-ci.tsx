"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Search,
  AlertTriangle,
  FileText,
} from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
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
  const [resumoCi, setResumoCi] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [adolescentesSelecionados, setAdolescentesSelecionados] = useState<
    Adolescente[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Busca de adolescentes
  const [buscaAdolescente, setBuscaAdolescente] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  const adolescentesFiltrados = adolescentes.filter(
    (a) =>
      !adolescentesSelecionados.find((sel) => sel.id === a.id) &&
      (a.nomeCompleto.toLowerCase().includes(buscaAdolescente.toLowerCase()) ||
        a.numeroSms.includes(buscaAdolescente))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
      } else {
        alert("Por favor, selecione um arquivo PDF");
      }
    }
  };

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

  const handleSalvar = async () => {
    // ValidaÃ§Ãµes
    if (!numero || !ano || !dataFato || !tipoCi || !resumoCi) {
      alert("Preencha todos os campos obrigatÃ³rios!");
      return;
    }

    if (adolescentesSelecionados.length === 0) {
      alert("Selecione pelo menos um adolescente!");
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
        JSON.stringify(adolescentesSelecionados.map((a) => a.id))
      );

      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      await onSalvar(formData);

      alert("âœ… CI registrado com sucesso!");
      // Limpar formulÃ¡rio ou redirecionar
    } catch (error) {
      alert("âŒ Erro ao registrar CI. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-800">
          Registrar Novo Comunicado Interno
        </h1>
        <p className="text-gray-600 mt-2">
          Preencha as informaÃ§Ãµes do CI e vincule os adolescentes envolvidos
        </p>
      </div>

      {/* FormulÃ¡rio */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          {/* Alerta */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">Importante</p>
                <p className="text-sm text-blue-800">
                  ApÃ³s salvar, vocÃª poderÃ¡ criar conflitos ou alertas
                  automaticamente baseados neste CI.
                </p>
              </div>
            </div>
          </div>

          {/* NÃºmero e Ano */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NÃºmero do CI *
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
              <option value="DISCIPLINAR">Disciplinar</option>
              <option value="CONFLITO">Conflito</option>
              <option value="AUTORIZACAO_ESPECIAL">AutorizaÃ§Ã£o Especial</option>
              <option value="SAUDE">SaÃºde</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

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

          {/* Upload PDF */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload do PDF (Opcional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-all">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {pdfFile ? (
                  <>
                    <FileText size={48} className="text-blue-600" />
                    <p className="font-semibold text-gray-800">
                      {pdfFile.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setPdfFile(null);
                      }}
                      className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                    >
                      Remover arquivo
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={48} className="text-gray-400" />
                    <p className="font-semibold text-gray-700">
                      Clique para fazer upload do PDF
                    </p>
                    <p className="text-sm text-gray-500">
                      ou arraste o arquivo aqui
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* SeleÃ§Ã£o de Adolescentes */}
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
                              <> â€¢ {adolescente.alojamento}</>
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
        </div>

        {/* BotÃµes */}
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
              adolescentesSelecionados.length === 0
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
