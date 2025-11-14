"use client";

import { Shield, MapPin, AlertTriangle, FileText } from "lucide-react";

interface Tatuagem {
  id?: string;
  catalogoId?: string;
  tatuagemCatalogo?: {
    id: string;
    nomeSimbolo: string;
    significadoAssociado: string | null;
    nivelRisco: "ALTO" | "MEDIO" | "BAIXO" | null;
  };
  localCorpo: string;
  observacoes?: string | null;
  significadoPessoal?: string | null;
}

interface SecaoTatuagensProps {
  tatuagens: Tatuagem[];
}

export function SecaoTatuagens({ tatuagens }: SecaoTatuagensProps) {
  const getNivelRiscoColor = (nivel: "ALTO" | "MEDIO" | "BAIXO" | null) => {
    switch (nivel) {
      case "ALTO":
        return "bg-red-100 text-red-800 border-red-300";
      case "MEDIO":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "BAIXO":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  const getNivelRiscoLabel = (nivel: "ALTO" | "MEDIO" | "BAIXO" | null) => {
    return nivel || "Não classificado";
  };

  const tatuagensComRiscoAlto = tatuagens.filter(
    (t) => t.tatuagemCatalogo?.nivelRisco === "ALTO"
  );

  const tatuagensComRiscoMedio = tatuagens.filter(
    (t) => t.tatuagemCatalogo?.nivelRisco === "MEDIO"
  );

  if (tatuagens.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma tatuagem registrada
          </h3>
          <p className="text-sm text-gray-500">
            Este adolescente não possui tatuagens catalogadas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Riscos */}
      {(tatuagensComRiscoAlto.length > 0 || tatuagensComRiscoMedio.length > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-5 border-2 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">
                Atenção: Tatuagens de Risco Identificadas
              </h4>
              <div className="space-y-1 text-sm text-orange-800">
                {tatuagensComRiscoAlto.length > 0 && (
                  <p>
                    <span className="font-semibold">{tatuagensComRiscoAlto.length}</span>{" "}
                    tatuagem(ns) de <span className="font-semibold">risco alto</span>
                  </p>
                )}
                {tatuagensComRiscoMedio.length > 0 && (
                  <p>
                    <span className="font-semibold">{tatuagensComRiscoMedio.length}</span>{" "}
                    tatuagem(ns) de <span className="font-semibold">risco médio</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-orange-700 mt-2">
                Considere estas informações ao realizar alocações e monitoramentos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contador */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Tatuagens Identificadas ({tatuagens.length})
        </h3>
      </div>

      {/* Grid de Tatuagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tatuagens.map((tatuagem, index) => {
          const catalogo = tatuagem.tatuagemCatalogo;

          return (
            <div
              key={tatuagem.id || index}
              className={`rounded-xl p-5 border-2 transition-all ${
                catalogo?.nivelRisco === "ALTO"
                  ? "bg-red-50 border-red-200 hover:border-red-300"
                  : catalogo?.nivelRisco === "MEDIO"
                  ? "bg-yellow-50 border-yellow-200 hover:border-yellow-300"
                  : "bg-white border-gray-200 hover:border-indigo-300"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {catalogo?.nomeSimbolo || "Tatuagem sem classificação"}
                  </h4>
                  {catalogo?.nivelRisco && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getNivelRiscoColor(
                        catalogo.nivelRisco
                      )}`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Risco: {getNivelRiscoLabel(catalogo.nivelRisco)}
                    </span>
                  )}
                </div>
              </div>

              {/* Significado Catalogado */}
              {catalogo?.significadoAssociado && (
                <div className="mb-3 p-3 bg-white bg-opacity-60 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Significado Catalogado
                      </p>
                      <p className="text-sm text-gray-600">
                        {catalogo.significadoAssociado}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-declaração do Adolescente */}
              {tatuagem.significadoPessoal && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800 mb-1">
                        Auto-declaração do Adolescente
                      </p>
                      <p className="text-sm text-blue-700 italic">
                        &ldquo;{tatuagem.significadoPessoal}&rdquo;
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Significado pessoal declarado pelo adolescente
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Local do Corpo */}
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Local:</span>
                  <span className="text-gray-900">{tatuagem.localCorpo}</span>
                </div>
              </div>

              {/* Observações */}
              {tatuagem.observacoes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Observações
                  </p>
                  <p className="text-sm text-gray-700">{tatuagem.observacoes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer com dicas */}
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-semibold text-indigo-900 mb-1 text-sm">
              Informações sobre Tatuagens
            </h5>
            <ul className="text-xs text-indigo-700 space-y-1">
              <li>
                • Tatuagens de <span className="font-semibold">risco alto</span> podem indicar
                vinculações faccionais ou territoriais
              </li>
              <li>
                • Use estas informações para avaliar compatibilidade de alojamento
              </li>
              <li>
                • Documente novas tatuagens identificadas durante o período de internação
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
