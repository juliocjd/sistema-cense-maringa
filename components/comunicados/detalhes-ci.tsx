"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Download,
  AlertTriangle,
  Swords,
  Plus,
  CheckCircle,
} from "lucide-react";

type ComunicadoInterno = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi: string;
  resumoCi: string;
  caminhoPdf?: string;
  operador: {
    id: string;
    nome: string;
  };
  adolescentes: Array<{
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  }>;
  criadoEm: string;
  conflitosGerados: Array<{
    id: string;
    adolescenteA: string;
    adolescenteB: string;
  }>;
  alertasGerados: Array<{
    id: string;
    adolescente: string;
    tipo: string;
  }>;
};

interface DetalhesCIProps {
  ci: ComunicadoInterno;
  onCriarConflito: (dados: any) => Promise<void>;
  onCriarAlerta: (dados: any) => Promise<void>;
}

export function DetalhesCI({
  ci,
  onCriarConflito,
  onCriarAlerta,
}: DetalhesCIProps) {
  const [mostrarModalConflito, setMostrarModalConflito] = useState(false);
  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form de conflito
  const [conflitoPar, setConflitoPar] = useState<{
    adolescenteA: string;
    adolescenteB: string;
  }>({ adolescenteA: "", adolescenteB: "" });
  const [tipoConflito, setTipoConflito] = useState("");
  const [descricaoConflito, setDescricaoConflito] = useState("");

  // Form de alerta
  const [alertaAdolescente, setAlertaAdolescente] = useState("");
  const [tipoAlerta, setTipoAlerta] = useState("");
  const [descricaoAlerta, setDescricaoAlerta] = useState("");

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { cor: string; texto: string }> = {
      DISCIPLINAR: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Disciplinar",
      },
      CONFLITO: {
        cor: "bg-orange-100 text-orange-800 border-orange-300",
        texto: "Conflito",
      },
      AUTORIZACAO_ESPECIAL: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "AutorizaÃ§Ã£o",
      },
      SAUDE: {
        cor: "bg-purple-100 text-purple-800 border-purple-300",
        texto: "SaÃºde",
      },
      OUTROS: {
        cor: "bg-gray-100 text-gray-800 border-gray-300",
        texto: "Outros",
      },
    };
    return badges[tipo] || badges.OUTROS;
  };

  const handleCriarConflito = async () => {
    if (
      !conflitoPar.adolescenteA ||
      !conflitoPar.adolescenteB ||
      !tipoConflito
    ) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    try {
      await onCriarConflito({
        adolescenteAId: conflitoPar.adolescenteA,
        adolescenteBId: conflitoPar.adolescenteB,
        tipoConflito,
        origem: `CI ${ci.numero}/${ci.ano}`,
        ciOrigemId: ci.id,
        descricao: descricaoConflito,
      });

      alert("âœ… Conflito criado com sucesso!");
      setMostrarModalConflito(false);
      // Recarregar pÃ¡gina ou atualizar dados
      window.location.reload();
    } catch (error) {
      alert("âŒ Erro ao criar conflito.");
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAlerta = async () => {
    if (!alertaAdolescente || !tipoAlerta) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    try {
      await onCriarAlerta({
        adolescenteId: alertaAdolescente,
        tipoAlerta,
        descricaoAlerta,
        ciOrigemId: ci.id,
      });

      alert("âœ… Alerta criado com sucesso!");
      setMostrarModalAlerta(false);
      window.location.reload();
    } catch (error) {
      alert("âŒ Erro ao criar alerta.");
    } finally {
      setLoading(false);
    }
  };

  const badge = getTipoBadge(ci.tipoCi);

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

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              CI {ci.numero}/{ci.ano}
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold border ${badge.cor}`}
              >
                {badge.texto}
              </span>
            </div>
          </div>

          {ci.caminhoPdf && (
            <a
              href={ci.caminhoPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Download size={20} />
              Baixar PDF
            </a>
          )}
        </div>
      </div>

      {/* InformaÃ§Ãµes Principais */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          InformaÃ§Ãµes do CI
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">NÃºmero</p>
            <p className="text-2xl font-bold text-gray-800">
              {ci.numero}/{ci.ano}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <Calendar size={14} />
              Data do Fato
            </p>
            <p className="font-bold text-gray-800">
              {new Date(ci.dataFato).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <User size={14} />
              Operador ResponsÃ¡vel
            </p>
            <p className="font-bold text-gray-800">{ci.operador.nome}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Resumo:</p>
          <p className="text-gray-800 leading-relaxed">{ci.resumoCi}</p>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <span className="font-semibold">Registrado em:</span>{" "}
            {new Date(ci.criadoEm).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Adolescentes Envolvidos */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Adolescentes Envolvidos ({ci.adolescentes.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ci.adolescentes.map((adolescente) => (
            <Link
              key={adolescente.id}
              href={`/adolescentes/${adolescente.id}`}
              className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors"
            >
              <p className="font-bold text-gray-800 mb-1">{adolescente.nome}</p>
              <p className="text-sm text-gray-600">
                SMS: {adolescente.numeroSms}
              </p>
              {adolescente.alojamento && (
                <p className="text-sm text-gray-600">
                  ðŸ“ {adolescente.alojamento}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Gatilhos AutomÃ¡ticos */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Gatilhos AutomÃ¡ticos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Criar Conflito */}
          <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Swords size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Criar Conflito</h3>
                <p className="text-sm text-gray-600">
                  Registrar conflito baseado neste CI
                </p>
              </div>
            </div>

            {ci.conflitosGerados.length > 0 && (
              <div className="mb-3 p-3 bg-white rounded border border-orange-300">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Conflitos gerados ({ci.conflitosGerados.length}):
                </p>
                {ci.conflitosGerados.map((conflito) => (
                  <p key={conflito.id} className="text-sm text-gray-600">
                    â€¢ {conflito.adolescenteA} Ã— {conflito.adolescenteB}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setMostrarModalConflito(true)}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo Conflito
            </button>
          </div>

          {/* Criar Alerta */}
          <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Criar Alerta</h3>
                <p className="text-sm text-gray-600">
                  Ativar alerta para adolescente
                </p>
              </div>
            </div>

            {ci.alertasGerados.length > 0 && (
              <div className="mb-3 p-3 bg-white rounded border border-purple-300">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Alertas gerados ({ci.alertasGerados.length}):
                </p>
                {ci.alertasGerados.map((alerta) => (
                  <p key={alerta.id} className="text-sm text-gray-600">
                    â€¢ {alerta.adolescente} - {alerta.tipo}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setMostrarModalAlerta(true)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo Alerta
            </button>
          </div>
        </div>
      </div>

      {/* VisualizaÃ§Ã£o do PDF */}
      {ci.caminhoPdf && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Documento PDF
          </h2>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <iframe
              src={ci.caminhoPdf}
              className="w-full h-[600px]"
              title="PDF do CI"
            />
          </div>
        </div>
      )}

      {/* Modal de Criar Conflito */}
      {mostrarModalConflito && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMostrarModalConflito(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Criar Conflito a partir do CI {ci.numero}/{ci.ano}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adolescente A *
                  </label>
                  <select
                    value={conflitoPar.adolescenteA}
                    onChange={(e) =>
                      setConflitoPar({
                        ...conflitoPar,
                        adolescenteA: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {ci.adolescentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} (SMS: {a.numeroSms})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adolescente B *
                  </label>
                  <select
                    value={conflitoPar.adolescenteB}
                    onChange={(e) =>
                      setConflitoPar({
                        ...conflitoPar,
                        adolescenteB: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {ci.adolescentes
                      .filter((a) => a.id !== conflitoPar.adolescenteA)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome} (SMS: {a.numeroSms})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Conflito *
                  </label>
                  <select
                    value={tipoConflito}
                    onChange={(e) => setTipoConflito(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="FACCAO">FacÃ§Ãµes rivais</option>
                    <option value="TERRITORIAL">Territorial</option>
                    <option value="PESSOAL">Pessoal</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    DescriÃ§Ã£o
                  </label>
                  <textarea
                    value={descricaoConflito}
                    onChange={(e) => setDescricaoConflito(e.target.value)}
                    rows={3}
                    placeholder="Detalhes adicionais..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMostrarModalConflito(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarConflito}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
                >
                  {loading ? "Criando..." : "Criar Conflito"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Criar Alerta */}
      {mostrarModalAlerta && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMostrarModalAlerta(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Criar Alerta a partir do CI {ci.numero}/{ci.ano}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adolescente *
                  </label>
                  <select
                    value={alertaAdolescente}
                    onChange={(e) => setAlertaAdolescente(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {ci.adolescentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} (SMS: {a.numeroSms})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Alerta *
                  </label>
                  <select
                    value={tipoAlerta}
                    onChange={(e) => setTipoAlerta(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="MANUSEIO">Alerta de Manuseio</option>
                    <option value="SAUDE">Alerta de SaÃºde</option>
                    <option value="COMPORTAMENTAL">Comportamental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    DescriÃ§Ã£o *
                  </label>
                  <textarea
                    value={descricaoAlerta}
                    onChange={(e) => setDescricaoAlerta(e.target.value)}
                    rows={3}
                    placeholder="Descreva o alerta..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMostrarModalAlerta(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarAlerta}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? "Criando..." : "Criar Alerta"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
