"use client";

import { useState } from "react";
import { X, UserCheck, AlertCircle, CheckCircle } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
};

type VinculoVisitante = {
  id: string;
  adolescente: Adolescente;
  parentesco: string | null;
  autorizado: boolean;
};

interface ModalRegistrarVisitaProps {
  visitanteId: string;
  visitanteNome: string;
  adolescentes: Adolescente[];
  onClose: () => void;
  onSucesso?: () => void;
}

export function ModalRegistrarVisita({
  visitanteId,
  visitanteNome,
  adolescentes,
  onClose,
  onSucesso,
}: ModalRegistrarVisitaProps) {
  const [adolescenteSelecionado, setAdolescenteSelecionado] = useState<string>("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState(false);
  const [justificativaHorario, setJustificativaHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleRegistrarVisita = async () => {
    if (!adolescenteSelecionado) {
      setErro("Selecione um adolescente");
      return;
    }

    setProcessando(true);
    setErro(null);
    setErros([]);
    setAlertas([]);

    try {
      const response = await fetch(`/api/visitantes/${visitanteId}/visitas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId: adolescenteSelecionado,
          quantidadeAdultos: 1,
          quantidadeCriancas: 0,
          observacoes: observacoes || null,
          justificativaHorario: justificativaHorario || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Exibir erros de validação
        if (data.erros && Array.isArray(data.erros)) {
          setErros(data.erros);
        }
        if (data.alertas && Array.isArray(data.alertas)) {
          setAlertas(data.alertas);
        }
        if (!data.erros && data.erro) {
          setErro(data.erro);
        }
        return;
      }

      // Visita registrada com sucesso
      if (data.alertas && Array.isArray(data.alertas) && data.alertas.length > 0) {
        setAlertas(data.alertas);
      }

      setSucesso(true);

      // Aguardar 2 segundos antes de fechar para mostrar mensagem de sucesso
      setTimeout(() => {
        if (onSucesso) {
          onSucesso();
        }
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Erro ao registrar visita:", err);
      setErro(err instanceof Error ? err.message : "Erro ao registrar visita");
    } finally {
      setProcessando(false);
    }
  };

  const adolescenteDetalhes = adolescentes.find((a) => a.id === adolescenteSelecionado);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <UserCheck className="text-indigo-600" size={32} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Registrar Visita</h2>
              <p className="text-gray-600">{visitanteNome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processando}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sucesso ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="text-green-600 mb-4" size={64} />
              <h3 className="text-2xl font-bold text-green-700 mb-2">
                Visita Registrada com Sucesso!
              </h3>
              <p className="text-gray-600">Redirecionando...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Selecione o adolescente a ser visitado:
                </label>

                {adolescentes.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800">
                      Este visitante não possui vínculos autorizados com adolescentes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adolescentes.map((adolescente) => (
                      <label
                        key={adolescente.id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          adolescenteSelecionado === adolescente.id
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="adolescente"
                          value={adolescente.id}
                          checked={adolescenteSelecionado === adolescente.id}
                          onChange={(e) => {
                            setAdolescenteSelecionado(e.target.value);
                            setErro(null);
                          }}
                          className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="ml-3">
                          <p className="font-semibold text-gray-900">
                            {adolescente.nomeSocial || adolescente.nomeCompleto}
                          </p>
                          {adolescente.nomeSocial && adolescente.nomeCompleto && (
                            <p className="text-sm text-gray-600">
                              Nome completo: {adolescente.nomeCompleto}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Informações adicionais */}
              {adolescenteDetalhes && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Visitante:</strong> {visitanteNome}
                    <br />
                    <strong>Irá visitar:</strong>{" "}
                    {adolescenteDetalhes.nomeSocial || adolescenteDetalhes.nomeCompleto}
                  </p>
                </div>
              )}

              {/* Campos Adicionais */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    placeholder="Ex: Visitante chegou com criança de colo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Justificativa de Horário (se necessário)
                  </label>
                  <textarea
                    value={justificativaHorario}
                    onChange={(e) => setJustificativaHorario(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    placeholder="Ex: Visitante trabalha e só pode no período da tarde"
                  />
                </div>
              </div>

              {/* Alertas (avisos não-bloqueantes) */}
              {alertas.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-800 mb-2">ALERTAS</h4>
                      <ul className="space-y-1">
                        {alertas.map((alerta, index) => (
                          <li key={index} className="text-sm text-amber-800">
                            • {alerta}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Erros (bloqueantes) */}
              {erros.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-800 mb-2">ERROS - Entrada Bloqueada</h4>
                      <ul className="space-y-1">
                        {erros.map((erro, index) => (
                          <li key={index} className="text-sm text-red-800">
                            • {erro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Erro único */}
              {erro && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                  <p className="text-red-700">{erro}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-4">
                <button
                  onClick={handleRegistrarVisita}
                  disabled={processando || adolescentes.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                >
                  {processando ? "Registrando..." : "Confirmar Entrada"}
                </button>
                <button
                  onClick={onClose}
                  disabled={processando}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors font-semibold shadow-md"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
