"use client";

import { useState, useEffect } from "react";
import {
  X,
  QrCode,
  RefreshCw,
  CheckCircle,
  IdCard,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import { VisitanteCarteirinha } from "@/components/visitantes/carteirinha-visitante";

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

type VisitanteDetalhes = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;
  email?: string | null;
  telefones?: string[];
  enderecoCompleto?: string | null;
  fotoUrl?: string | null;
};

export function ModalQRCode({ visitanteId, visitanteNome, onClose }: Props) {
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [visitanteDetalhes, setVisitanteDetalhes] =
    useState<VisitanteDetalhes | null>(null);
  const [carregandoVisitante, setCarregandoVisitante] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

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

  useEffect(() => {
    carregarQRCode();
    const carregarVisitante = async () => {
      setCarregandoVisitante(true);
      try {
        const response = await fetch(`/api/visitantes/${visitanteId}`);
        if (response.ok) {
          const data = await response.json();
          setVisitanteDetalhes({
            id: data.id,
            nomeCompleto: data.nomeCompleto,
            cpf: data.cpf ?? null,
            email: data.email ?? null,
            telefones: Array.isArray(data.telefones) ? data.telefones : [],
            enderecoCompleto: data.enderecoCompleto ?? null,
            fotoUrl: data.fotoUrl ?? null,
          });
        } else {
          setVisitanteDetalhes(null);
        }
      } catch {
        setVisitanteDetalhes(null);
      } finally {
        setCarregandoVisitante(false);
      }
    };

    carregarVisitante();
  }, [visitanteId]);

  const carregarImagemComoDataUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erro ao converter imagem:", error);
      return null;
    }
  };

  const salvarComoPdf = async () => {
    if (!qrCode || !visitanteDetalhes) return;
    setGerandoPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const cardWidth = 150;
      const cardHeight = 90;
      const leftX = (pageWidth - cardWidth) / 2;
      const topFront = 15;

      const desenharFrente = async (top: number) => {
        doc.setFillColor(249, 250, 253);
        doc.rect(leftX, top, cardWidth, cardHeight, "F");
        doc.setDrawColor(223, 226, 233);
        doc.roundedRect(leftX, top, cardWidth, cardHeight, 12, 12);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 36, 56);
        doc.text("CARTEIRA DE VISITANTE", leftX + 10, top + 15);
        doc.setFontSize(17);
        doc.text(
          doc.splitTextToSize(visitanteDetalhes.nomeCompleto, cardWidth * 0.7),
          leftX + 10,
          top + 30,
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(76, 86, 106);
        doc.text(
          `CPF: ${visitanteDetalhes.cpf ?? "Nao informado"}`,
          leftX + 10,
          top + 40,
        );
        doc.text(
          `Email: ${visitanteDetalhes.email ?? "Nao informado"}`,
          leftX + 10,
          top + 46,
        );
        doc.text(
          `Telefone: ${visitanteDetalhes.telefones?.[0] ?? "Nao informado"}`,
          leftX + 10,
          top + 52,
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 36, 56);
        doc.text("Validade", leftX + 10, top + cardHeight - 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.text(
          qrCode.dataExpiracao
            ? new Date(qrCode.dataExpiracao).toLocaleDateString("pt-BR")
            : "Sem validade",
          leftX + 10,
          top + cardHeight - 7,
        );

        const fotoLarg = 50;
        const fotoAlt = 42;
        const fotoX = leftX + cardWidth - fotoLarg - 15;
        const fotoY = top + 18;
        if (visitanteDetalhes.fotoUrl) {
          const foto = await carregarImagemComoDataUrl(
            visitanteDetalhes.fotoUrl,
          );
          if (foto) {
            doc.addImage(
              foto,
              "JPEG",
              fotoX,
              fotoY,
              fotoLarg,
              fotoAlt,
              undefined,
              "FAST",
            );
          }
        } else {
          doc.setDrawColor(200, 204, 215);
          doc.rect(fotoX, fotoY, fotoLarg, fotoAlt);
        }
      };

      const desenharVerso = () => {
        const top = topFront + cardHeight + 10;
        doc.setFillColor(249, 250, 253);
        doc.rect(leftX, top, cardWidth, cardHeight, "F");
        doc.setDrawColor(223, 226, 233);
        doc.roundedRect(leftX, top, cardWidth, cardHeight, 12, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(76, 86, 106);
        doc.text(
          "Apresente este QR Code na portaria para agilizar o acesso.",
          leftX + 10,
          top + 15,
        );

        const qrSize = 50;
        const qrX = leftX + (cardWidth - qrSize) / 2;
        const qrY = top + 22;
        doc.setDrawColor(190, 196, 213);
        // @ts-ignore - setLineDash exists in jsPDF but types are incomplete
        doc.setLineDash([1.5, 1.5], 0);
        doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8, 8);
        // @ts-ignore - setLineDashPattern exists in jsPDF but types are incomplete
        doc.setLineDashPattern([], 0);
        doc.addImage(qrCode.qrCodeImage, "PNG", qrX, qrY, qrSize, qrSize);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(89, 104, 129);
        doc.text(qrCode.codigoQr, leftX + 10, top + cardHeight - 10);
      };

      await desenharFrente(topFront);
      desenharVerso();

      // @ts-ignore - setLineDash exists in jsPDF but types are incomplete
      doc.setLineDash([3, 3], 0);
      doc.setDrawColor(200, 204, 215);
      const linhaY = topFront + cardHeight + 5;
      doc.line(leftX, linhaY, leftX + cardWidth, linhaY);
      // @ts-ignore - setLineDashPattern exists in jsPDF but types are incomplete
      doc.setLineDashPattern([], 0);

      const slug = visitanteDetalhes.nomeCompleto
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");
      doc.save(`carteirinha-${slug}.pdf`);
    } catch (error) {
      console.error("Erro ao salvar PDF:", error);
      setErro("Nao foi possivel gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <QrCode size={28} />
            <div>
              <h2 className="text-xl font-bold">Carteirinha do Visitante</h2>
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
              <RefreshCw
                className="animate-spin text-indigo-600 mb-4"
                size={48}
              />
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
                  <CheckCircle
                    className="text-blue-600 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className="text-blue-700 text-sm">{qrCode.mensagem}</p>
                </div>
              )}

              {/* Status */}
              <div className="mb-6">
                {qrCode.ativo ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-green-700">
                      Carteirinha ativa
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-gray-700">
                      Carteirinha inativa
                    </span>
                  </div>
                )}
              </div>

              {/* Acoes */}
              <div className="flex gap-3">
                <button
                  onClick={salvarComoPdf}
                  disabled={gerandoPdf || !visitanteDetalhes}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileDown
                    size={20}
                    className={gerandoPdf ? "animate-pulse" : ""}
                  />
                  {gerandoPdf ? "Gerando PDF..." : "Salvar PDF"}
                </button>
                <button
                  onClick={gerarQRCode}
                  disabled={gerando}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={20}
                    className={gerando ? "animate-spin" : ""}
                  />
                  Atualizar Carteirinha
                </button>
              </div>

              {/* Carteirinha digital */}
              {/* Carteirinha digital */}
              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <IdCard size={16} />
                  Carteira Digital do Visitante
                </div>
                {carregandoVisitante ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Carregando dados do visitante...
                  </div>
                ) : visitanteDetalhes ? (
                  <VisitanteCarteirinha
                    visitante={{
                      nome: visitanteDetalhes.nomeCompleto,
                      cpf: visitanteDetalhes.cpf,
                      email: visitanteDetalhes.email,
                      telefone: visitanteDetalhes.telefones?.[0] ?? null,
                      endereco: visitanteDetalhes.enderecoCompleto ?? undefined,
                      fotoUrl: visitanteDetalhes.fotoUrl ?? undefined,
                    }}
                    codigoQr={qrCode.codigoQr}
                    qrCodeImage={qrCode.qrCodeImage}
                    validade={qrCode.dataExpiracao}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Nao foi possivel carregar os dados do visitante para gerar a
                    carteirinha.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-700 text-lg mb-2">
                Nenhuma carteirinha ativa encontrada
              </p>
              <p className="text-gray-600 mb-6">
                Gere uma carteirinha para agilizar o registro de visitas
              </p>
              <button
                onClick={gerarQRCode}
                disabled={gerando}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <QrCode size={20} />
                {gerando ? "Gerando..." : "Gerar Carteirinha"}
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t">
          <p className="text-sm text-gray-600">
            <strong>Importante:</strong> O QR Code facilita a identificação do
            visitante na portaria. Apresente o código na entrada da unidade para
            agilizar o processo de visita.
          </p>
        </div>
      </div>
    </div>
  );
}
