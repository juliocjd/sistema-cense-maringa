"use client";

import { useState, useEffect } from "react";
import { X, QrCode, Download, RefreshCw, Calendar, CheckCircle } from "lucide-react";

type QRCodeData = {
  id: string;
  codigoQr: string;
  qrCodeImage: string;
  dataGeracao: string;
  dataExpiracao: string | null;
  ativo: boolean;
  visitante: {
    id: string;
    nomeCompleto: string;
  };
  mensagem?: string;
};

type Props = {
  visitanteId: string;
  visitanteNome: string;
  onClose: () => void;
};

export function ModalQRCode({ visitanteId, visitanteNome, onClose }: Props) {
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarQRCode = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/visitantes/${visitanteId}/qrcode`);
      if (response.ok) {
        const data = await response.json();
        setQrCode(data);
      } else if (response.status === 404) {
        // Não tem QR Code, vai precisar gerar
        setQrCode(null);
      } else {
        const errorData = await response.json();
        setErro(errorData.erro || "Erro ao carregar QR Code");
      }
    } catch (error) {
      console.error("Erro ao carregar QR Code:", error);
      setErro("Erro ao carregar QR Code");
    } finally {
      setCarregando(false);
    }
  };

  const gerarQRCode = async () => {
    setGerando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/visitantes/${visitanteId}/qrcode`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data);
      } else {
        const errorData = await response.json();
        setErro(errorData.erro || "Erro ao gerar QR Code");
      }
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      setErro("Erro ao gerar QR Code");
    } finally {
      setGerando(false);
    }
  };

  const baixarQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.href = qrCode.qrCodeImage;
    link.download = `qrcode-${visitanteNome.replace(/\s+/g, "-")}-${qrCode.codigoQr}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    carregarQRCode();
  }, [visitanteId]);

  const diasParaExpirar = qrCode?.dataExpiracao
    ? Math.ceil(
        (new Date(qrCode.dataExpiracao).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <QrCode size={28} />
            <div>
              <h2 className="text-xl font-bold">QR Code do Visitante</h2>
              <p className="text-indigo-100 text-sm">{visitanteNome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-gray-600">Carregando QR Code...</p>
            </div>
          ) : erro ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-medium">{erro}</p>
            </div>
          ) : qrCode ? (
            <div>
              {/* Mensagem de retorno */}
              {qrCode.mensagem && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-blue-700 text-sm">{qrCode.mensagem}</p>
                </div>
              )}

              {/* QR Code Image */}
              <div className="flex flex-col items-center mb-6">
                <div className="bg-white border-4 border-indigo-200 rounded-2xl p-6 shadow-lg">
                  <img
                    src={qrCode.qrCodeImage}
                    alt="QR Code"
                    className="w-80 h-80"
                  />
                </div>
                <p className="mt-4 text-sm font-mono text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                  {qrCode.codigoQr}
                </p>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-gray-600" size={18} />
                    <span className="font-semibold text-gray-700">Gerado em</span>
                  </div>
                  <p className="text-gray-900">
                    {new Date(qrCode.dataGeracao).toLocaleString("pt-BR")}
                  </p>
                </div>

                {qrCode.dataExpiracao && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="text-gray-600" size={18} />
                      <span className="font-semibold text-gray-700">Expira em</span>
                    </div>
                    <p className="text-gray-900">
                      {new Date(qrCode.dataExpiracao).toLocaleString("pt-BR")}
                    </p>
                    {diasParaExpirar > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        ({diasParaExpirar} {diasParaExpirar === 1 ? "dia" : "dias"} restantes)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="mb-6">
                {qrCode.ativo ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-green-700">QR Code Ativo</span>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-gray-700">QR Code Inativo</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={baixarQRCode}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
                >
                  <Download size={20} />
                  Baixar QR Code
                </button>
                <button
                  onClick={gerarQRCode}
                  disabled={gerando}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={20} className={gerando ? "animate-spin" : ""} />
                  Gerar Novo
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-700 text-lg mb-2">
                Nenhum QR Code ativo encontrado
              </p>
              <p className="text-gray-600 mb-6">
                Gere um QR Code para facilitar o registro de visitas
              </p>
              <button
                onClick={gerarQRCode}
                disabled={gerando}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <QrCode size={20} />
                {gerando ? "Gerando..." : "Gerar QR Code"}
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t">
          <p className="text-sm text-gray-600">
            <strong>Importante:</strong> O QR Code facilita a identificação do visitante na portaria.
            Apresente o código na entrada da unidade para agilizar o processo de visita.
          </p>
        </div>
      </div>
    </div>
  );
}
