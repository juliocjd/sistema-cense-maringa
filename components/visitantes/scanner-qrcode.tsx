"use client";

import { useState } from "react";
import { QrCode, X, Search } from "lucide-react";

type Props = {
  onScan: (codigo: string) => void;
  onCancel: () => void;
  processando?: boolean;
};

export function ScannerQRCode({ onScan, onCancel, processando = false }: Props) {
  const [codigoManual, setCodigoManual] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoManual.trim()) {
      onScan(codigoManual.trim());
      setCodigoManual("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <QrCode size={28} />
            <h2 className="text-xl font-bold">Escanear QR Code</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={processando}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-6 bg-purple-50 rounded-full mb-4">
              <QrCode className="text-purple-600" size={80} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Escaneie o QR Code do Visitante
            </h3>
            <p className="text-gray-600">
              Use um leitor de QR Code ou digite o código manualmente
            </p>
          </div>

          {/* Input Manual */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código do QR Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={codigoManual}
                  onChange={(e) => setCodigoManual(e.target.value)}
                  placeholder="VIS-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  disabled={processando}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm disabled:opacity-50"
                  autoFocus
                />
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                O código começa com "VIS-" seguido de 32 caracteres
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!codigoManual.trim() || processando}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={20} />
                {processando ? "Verificando..." : "Buscar Visitante"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={processando}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> Use um aplicativo leitor de QR Code no celular para escanear
              o código do visitante. O código será automaticamente copiado e você pode colá-lo
              no campo acima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
