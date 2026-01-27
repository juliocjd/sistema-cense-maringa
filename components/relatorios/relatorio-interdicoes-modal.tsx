"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AlojamentoInterditado = {
  id: string;
  casa: {
    id: string;
    nome: string | null;
    numero: number | null;
    label: string;
  };
  numero: string;
  ala: string | null;
  justificativa: string | null;
  documentoTipo: "CI" | "DECISAO_JUDICIAL" | "OUTRO" | null;
  documentoTipoLabel: string;
  documentoReferencia: string | null;
};

type RelatorioInterdicoesResponse = {
  total: number;
  alojamentos: AlojamentoInterditado[];
};

const formatarDataAtual = () =>
  new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const montarLocal = (item: AlojamentoInterditado) => {
  const casaNome = item.casa.nome ?? `Casa ${item.casa.numero ?? "?"}`;
  const ala = item.ala ? ` - Ala ${item.ala}` : "";
  return `${casaNome} - Aloj. ${item.numero}${ala}`;
};

export function RelatorioInterdicoesModalTrigger() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<RelatorioInterdicoesResponse | null>(null);

  useEffect(() => {
    if (!aberto) return;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const response = await fetch("/api/relatorios/alojamentos/interditados");
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.erro ?? "Falha ao carregar relatorio");
        }
        const json = (await response.json()) as RelatorioInterdicoesResponse;
        setDados(json);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Erro inesperado");
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [aberto]);

  const resumo = useMemo(() => {
    const total = dados?.total ?? 0;
    const porCasa = new Map<string, number>();
    (dados?.alojamentos ?? []).forEach((item) => {
      const chave = item.casa.label;
      porCasa.set(chave, (porCasa.get(chave) ?? 0) + 1);
    });
    const casas = Array.from(porCasa.entries())
      .map(([casa, quantidade]) => `${casa}: ${quantidade}`)
      .join(" | ");
    return { total, casas };
  }, [dados]);

  const gerarPdf = () => {
    if (!dados) return;

    setBaixando(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Relatorio de Alojamentos Interditados", pageWidth / 2, 16, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Emitido em: ${formatarDataAtual()}`, 14, 24);
      doc.text(`Total de alojamentos interditados: ${resumo.total}`, 14, 30);
      if (resumo.casas) {
        const linhasCasas = doc.splitTextToSize(
          `Distribuicao por casa: ${resumo.casas}`,
          pageWidth - 28
        );
        doc.text(linhasCasas, 14, 36);
      }

      const startY = resumo.casas ? 44 : 38;

      autoTable(doc, {
        startY,
        margin: { left: 14, right: 14 },
        head: [[
          "Local",
          "Justificativa",
          "Tipo de documento",
          "Referencia",
        ]],
        body:
          dados.alojamentos.length > 0
            ? dados.alojamentos.map((item) => [
                montarLocal(item),
                item.justificativa ?? "Nao informada",
                item.documentoTipoLabel,
                item.documentoReferencia ?? "Nao informada",
              ])
            : [["Nenhum alojamento interditado", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 2.5,
          overflow: "linebreak",
          valign: "top",
        },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 82 },
          2: { cellWidth: 32 },
          3: { cellWidth: 30 },
        },
        didDrawPage: () => {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(
            `Pagina ${doc.getNumberOfPages()}`,
            pageWidth - 14,
            doc.internal.pageSize.getHeight() - 6,
            { align: "right" }
          );
          doc.setTextColor(0);
        },
      });

      doc.save("relatorio-alojamentos-interditados.pdf");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Abrir relatorio
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAberto(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Estrutura · Interdicoes
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Alojamentos interditados
                  </h2>
                  <p className="text-sm text-slate-600">
                    Justificativas e documentos vinculados a cada interdição ativa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {carregando && (
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando alojamentos interditados...
                  </div>
                )}

                {!carregando && erro && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {erro}
                  </div>
                )}

                {!carregando && !erro && dados && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white p-2 text-slate-600">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Total interditados</p>
                          <p className="text-3xl font-bold text-slate-900">{resumo.total}</p>
                          {resumo.casas && (
                            <p className="text-xs text-slate-500">{resumo.casas}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100">
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <th className="px-4 py-3">Local</th>
                            <th className="px-4 py-3">Justificativa</th>
                            <th className="px-4 py-3">Tipo de documento</th>
                            <th className="px-4 py-3">Referencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {dados.alojamentos.length === 0 ? (
                            <tr>
                              <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                                Nenhum alojamento interditado no momento.
                              </td>
                            </tr>
                          ) : (
                            dados.alojamentos.map((item) => (
                              <tr key={item.id} className="align-top">
                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {montarLocal(item)}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {item.justificativa ?? "Nao informada"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {item.documentoTipoLabel}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {item.documentoReferencia ?? "Nao informada"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {dados && !erro && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    O PDF inclui justificativa, tipo de documento e referencia por alojamento.
                  </p>
                  <button
                    type="button"
                    onClick={gerarPdf}
                    disabled={baixando}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={16} />}
                    {baixando ? "Gerando..." : "Gerar PDF"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
