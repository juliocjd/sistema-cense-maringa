"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { ImpactoConflitoPayload } from "@/types/inteligencia";

interface RelatorioImpactoCardProps {
  resumo: ImpactoConflitoPayload;
  conflitoIdDefault?: string | null;
  id?: string;
}

type TipoFiltro = "TERRITORIAL" | "FACCAO" | "TODOS";
type StatusFiltro = "ATIVO" | "INATIVO" | "TODOS";

export default function RelatorioImpactoCard({
  resumo,
  conflitoIdDefault,
  id,
}: RelatorioImpactoCardProps) {
  const [dados, setDados] = useState<ImpactoConflitoPayload>(resumo);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>(resumo.filtros.tipo);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>(
    resumo.filtros.status
  );
  const [conflitoId, setConflitoId] = useState(conflitoIdDefault ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const impactosOrdenados = useMemo(() => {
    return [...dados.impactos].sort((a, b) =>
      a.adolescente.nome.localeCompare(b.adolescente.nome)
    );
  }, [dados]);

  const gerarRelatorio = async (overrideConflitoId?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set("tipo", tipoFiltro);
      params.set("status", statusFiltro);
      const idAlvo = overrideConflitoId ?? conflitoId;
      if (idAlvo.trim()) {
        params.set("conflitoId", idAlvo.trim());
      }

      const resposta = await fetch(
        `/api/inteligencia/conflitos/impacto?${params.toString()}`
      );
      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao gerar relatorio");
      }
      const payload = (await resposta.json()) as ImpactoConflitoPayload;
      setDados(payload);
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPdf = () => {
    if (dados.impactos.length === 0) {
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Internos impactados por conflitos", 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Gerado em ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`,
      14,
      24
    );
    doc.text(
      `Total de registros: ${dados.totalRegistros} | Tipo filtro: ${dados.filtros.tipo}`,
      14,
      30
    );
    doc.text(
      `Status filtro: ${dados.filtros.status} ${
        dados.filtros.conflitoId
          ? `| Conflito selecionado: ${dados.filtros.conflitoId}`
          : ""
      }`,
      14,
      36
    );

    autoTable(doc, {
      startY: 42,
      head: [["Nome", "Status", "Tipo", "Origem", "Destino", "Risco"]],
      body: dados.impactos.map((item) => [
        item.adolescente.nome,
        item.adolescente.status,
        item.conflitoTipo,
        item.conflitoOrigem.nome,
        item.conflitoDestino.nome,
        item.risco,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save("internos-impactados-conflitos.pdf");
  };

  useEffect(() => {
    if (conflitoIdDefault) {
      setConflitoId(conflitoIdDefault);
      gerarRelatorio(conflitoIdDefault);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflitoIdDefault]);

  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-indigo-500">
          Internos impactados por conflitos
        </p>
        <h3 className="text-xl font-semibold text-slate-900">
          {dados.totalRegistros} apontamentos
        </h3>
        <p className="text-xs text-slate-500">
          Ultima geracao:{" "}
          {new Date(dados.geradoEm).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
      </header>

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={tipoFiltro}
            onChange={(event) => setTipoFiltro(event.target.value as TipoFiltro)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="TODOS">Todos os tipos</option>
            <option value="TERRITORIAL">Territorial</option>
            <option value="FACCAO">Faccao</option>
          </select>
          <select
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusFiltro)
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="TODOS">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Encerrado</option>
          </select>
          <input
            type="text"
            value={conflitoId}
            onChange={(event) => setConflitoId(event.target.value)}
            placeholder="Filtrar por id do conflito"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {erro && <p className="text-xs text-rose-600">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => gerarRelatorio()}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            <RefreshCw size={14} />
            {loading ? "Atualizando..." : "Gerar relatorio"}
          </button>
          <button
            type="button"
            onClick={exportarPdf}
            disabled={dados.impactos.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <Download size={14} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
        {dados.impactos.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            Nenhum adolescente impactado para os filtros atuais.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Adolescente</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Origem</th>
                <th className="px-3 py-2 font-semibold">Destino</th>
                <th className="px-3 py-2 font-semibold">Risco</th>
              </tr>
            </thead>
            <tbody>
              {impactosOrdenados.map((item) => (
                <tr key={`${item.conflitoId}-${item.adolescente.id}`}>
                  <td className="border-t border-slate-100 px-3 py-2">
                    <div className="font-semibold text-slate-800">
                      {item.adolescente.nome}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.adolescente.status} •{" "}
                      {item.adolescente.bairro?.nome ??
                        item.adolescente.faccao?.nome ??
                        "Sem referencia"}
                    </div>
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-xs font-semibold">
                    {item.conflitoTipo === "BAIRRO" ? "Territorial" : "Faccao"}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-xs">
                    {item.conflitoOrigem.nome}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-xs">
                    {item.conflitoDestino.nome}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-xs font-semibold">
                    {item.risco}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
