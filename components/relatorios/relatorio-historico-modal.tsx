"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Search,
  ShieldAlert,
  Swords,
  User,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AdolescenteResultado = {
  id: string;
  nome: string;
  numeroSms?: string | null;
  status?: string | null;
  alojamento?: string | null;
};

type RelatorioConflito = {
  id: string;
  tipo: string | null;
  status: string | null;
  descricao: string | null;
  criadoEm: string;
  resolvidoEm: string | null;
  origem?: { id: string; numero: number; ano: number } | null;
  lado: "LADO_1" | "LADO_2";
  adversario: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
    alojamento: string | null;
  } | null;
};

type RelatorioAlerta = {
  id: string;
  tipo: string | null;
  descricao: string;
  nivelRisco: string | null;
  criadoEm: string;
  desativadoEm: string | null;
  origem?: { id: string; numero: number; ano: number } | null;
};

type RelatorioInterno = {
  adolescente: {
    id: string;
    nome: string;
    numeroSms: string | null;
    status: string;
    faccao: string | null;
    bairro: string | null;
    alojamento: string | null;
  };
  conflitos: RelatorioConflito[];
  alertas: RelatorioAlerta[];
  protocoloRiscoSuicidio?: {
    ativo: boolean;
    nivelAtual: string | null;
    ultimaEntrada: { data: string; descricao: string | null } | null;
    ultimaAlta: { data: string; descricao: string | null } | null;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "Nao informado";
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const gerarTextoHistorico = (relatorio: RelatorioInterno) => {
  const linhas: string[] = [];
  linhas.push(
    `Relatorio de conflitos e alertas - ${relatorio.adolescente.nome}`,
  );
  linhas.push(
    `Status: ${relatorio.adolescente.status} | SMS: ${
      relatorio.adolescente.numeroSms ?? "Nao informado"
    }`,
  );
  linhas.push(
    `Alojamento: ${relatorio.adolescente.alojamento ?? "Nao informado"}`,
  );
  linhas.push(
    `Faccao: ${relatorio.adolescente.faccao ?? "Nao informada"} | Bairro: ${
      relatorio.adolescente.bairro ?? "Nao informado"
    }`,
  );
  if (relatorio.protocoloRiscoSuicidio) {
    const bloco = relatorio.protocoloRiscoSuicidio;
    const status = bloco.ativo
      ? `Protocolo ativo (nivel ${bloco.nivelAtual ?? "N/I"})`
      : "Protocolo encerrado";
    linhas.push("");
    linhas.push(`Risco de suicídio: ${status}`);
    if (bloco.ultimaEntrada) {
      linhas.push(
        `- Inserido em ${formatDate(
          bloco.ultimaEntrada.data,
        )}${bloco.ultimaEntrada.descricao ? ` (${bloco.ultimaEntrada.descricao})` : ""}`,
      );
    }
    if (bloco.ultimaAlta) {
      linhas.push(
        `- Alta medica em ${formatDate(
          bloco.ultimaAlta.data,
        )}${bloco.ultimaAlta.descricao ? ` (${bloco.ultimaAlta.descricao})` : ""}`,
      );
    }
  }
  linhas.push("");
  linhas.push(`Conflitos registrados (${relatorio.conflitos.length}):`);
  relatorio.conflitos.forEach((conflito, index) => {
    const adversario = conflito.adversario
      ? `${conflito.adversario.nome}${
          conflito.adversario.faccao ? ` (${conflito.adversario.faccao})` : ""
        }`
      : "Nao informado";
    linhas.push(
      `${index + 1}. [${conflito.status ?? "DESCONHECIDO"}] ${
        conflito.tipo ?? "Sem tipo"
      } contra ${adversario} - criado em ${formatDate(
        conflito.criadoEm,
      )}${conflito.resolvidoEm ? `, resolvido em ${formatDate(conflito.resolvidoEm)}` : ""}`,
    );
    if (conflito.descricao) {
      linhas.push(`    Observacao: ${conflito.descricao}`);
    }
  });
  linhas.push("");
  linhas.push(`Alertas emitidos (${relatorio.alertas.length}):`);
  relatorio.alertas.forEach((alerta, index) => {
    linhas.push(
      `${index + 1}. [${alerta.nivelRisco ?? "NIVEL NAO INFORMADO"}] ${
        alerta.tipo ?? "TIPO DESCONHECIDO"
      } - criado em ${formatDate(alerta.criadoEm)}${
        alerta.desativadoEm
          ? `, encerrado em ${formatDate(alerta.desativadoEm)}`
          : ""
      }`,
    );
    linhas.push(`    Detalhes: ${alerta.descricao}`);
  });

  return linhas.join("\n");
};

export function RelatorioHistoricoModalTrigger() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<AdolescenteResultado[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioInterno | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(termo)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar adolescentes");
        }
        const json = await response.json();
        setResultados(json.resultados?.adolescentes ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error(error);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [aberto, busca]);

  const carregarRelatorio = async (adolescenteId: string) => {
    setCarregando(true);
    setErro(null);
    setRelatorio(null);
    try {
      const response = await fetch(
        `/api/relatorios/adolescentes/${adolescenteId}/conflitos-alertas`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao gerar relatorio");
      }
      const json = (await response.json()) as RelatorioInterno;
      setRelatorio(json);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao gerar relatorio",
      );
    } finally {
      setCarregando(false);
    }
  };

  const exportarPdf = () => {
    if (!relatorio) return;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Relatorio de conflitos e alertas", 14, 16);
    doc.setFontSize(10);
    doc.text(`Adolescente: ${relatorio.adolescente.nome}`, 14, 24);
    doc.text(
      `Status: ${relatorio.adolescente.status} | SMS: ${
        relatorio.adolescente.numeroSms ?? "Nao informado"
      }`,
      14,
      30,
    );
    doc.text(
      `Alojamento: ${relatorio.adolescente.alojamento ?? "Nao informado"}`,
      14,
      36,
    );
    let blocoResumoY = 42;
    if (relatorio.protocoloRiscoSuicidio) {
      const status = relatorio.protocoloRiscoSuicidio.ativo
        ? `Protocolo ativo (nivel ${
            relatorio.protocoloRiscoSuicidio.nivelAtual ?? "N/I"
          })`
        : "Protocolo encerrado";
      doc.text(status, 14, blocoResumoY);
      blocoResumoY += 6;
      if (relatorio.protocoloRiscoSuicidio.ultimaEntrada) {
        doc.text(
          `Ingresso: ${formatDate(relatorio.protocoloRiscoSuicidio.ultimaEntrada.data)}`,
          14,
          blocoResumoY,
        );
        blocoResumoY += 6;
      }
      if (relatorio.protocoloRiscoSuicidio.ultimaAlta) {
        doc.text(
          `Alta medica: ${formatDate(relatorio.protocoloRiscoSuicidio.ultimaAlta.data)}`,
          14,
          blocoResumoY,
        );
        blocoResumoY += 6;
      }
      blocoResumoY += 2;
    }

    autoTable(doc, {
      startY: blocoResumoY,
      head: [["Data", "Tipo", "Status", "Adversario", "Resumo"]],
      body: relatorio.conflitos.map((conflito) => [
        formatDate(conflito.criadoEm),
        conflito.tipo ?? "Nao informado",
        conflito.status ?? "SEM STATUS",
        conflito.adversario?.nome ?? "Desconhecido",
        conflito.descricao ?? "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 81, 191] },
    });

    const finalConflitos =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 42;

    autoTable(doc, {
      startY: finalConflitos + 8,
      head: [["Data", "Tipo", "Nivel", "Situacao"]],
      body: relatorio.alertas.map((alerta) => [
        formatDate(alerta.criadoEm),
        alerta.tipo ?? "Nao informado",
        alerta.nivelRisco ?? "Nao definido",
        alerta.desativadoEm
          ? `Encerrado em ${formatDate(alerta.desativadoEm)}`
          : "Ativo",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    const nomeArquivo = relatorio.adolescente.nome
      .toLowerCase()
      .replace(/\s+/g, "-");
    doc.save(`relatorio-conflitos-alertas-${nomeArquivo}.pdf`);
  };

  const totalConflitosAtivos = useMemo(
    () =>
      relatorio?.conflitos.filter((c) => c.status?.toUpperCase() === "ATIVO")
        .length ?? 0,
    [relatorio],
  );

  const totalAlertasGraves = useMemo(
    () =>
      relatorio?.alertas.filter((a) =>
        ["ALTO", "CRITICO"].includes((a.nivelRisco ?? "").toUpperCase()),
      ).length ?? 0,
    [relatorio],
  );

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
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Relatorio interno
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Conflitos e alertas do adolescente
                  </h2>
                  <p className="text-sm text-slate-600">
                    Pesquise pelo adolescente para visualizar o historico
                    completo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    setBusca("");
                    setResultados([]);
                    setRelatorio(null);
                    setErro(null);
                  }}
                  className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Buscar adolescente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Digite nome, SMS ou processo"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                {busca.trim().length > 1 && resultados.length > 0 && (
                  <ul className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {resultados.map((ado) => (
                      <li
                        key={ado.id}
                        className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {ado.nome}
                          </p>
                          <p className="text-xs text-slate-500">
                            SMS: {ado.numeroSms ?? "Nao informado"} • Status:{" "}
                            {ado.status ?? "?"}
                          </p>
                          {ado.alojamento && (
                            <p className="text-xs text-slate-500">
                              {ado.alojamento}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => carregarRelatorio(ado.id)}
                          className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Gerar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {carregando && (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Montando relatorio...</span>
                  </div>
                )}

                {!carregando && erro && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {erro}
                  </div>
                )}

                {!carregando && !erro && !relatorio && (
                  <p className="text-center text-sm text-slate-500">
                    Digite para buscar um adolescente e gerar o relatorio.
                  </p>
                )}

                {relatorio && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white p-2">
                          <User className="text-indigo-600" size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            {relatorio.adolescente.nome}
                          </p>
                          <p className="text-xs text-slate-500">
                            SMS:{" "}
                            {relatorio.adolescente.numeroSms ?? "Nao informado"}{" "}
                            • Status: {relatorio.adolescente.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            {relatorio.adolescente.alojamento ??
                              "Alojamento nao informado"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Faccao:{" "}
                            {relatorio.adolescente.faccao ?? "Nao informada"} •
                            Origem:{" "}
                            {relatorio.adolescente.bairro ?? "Nao informada"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {relatorio.protocoloRiscoSuicidio && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
                        <p className="text-sm font-semibold text-rose-800">
                          Protocolo de risco de suicídio
                        </p>
                        <p className="text-xs text-rose-700">
                          {relatorio.protocoloRiscoSuicidio.ativo
                            ? `Ativo (nivel ${relatorio.protocoloRiscoSuicidio.nivelAtual ?? "N/I"})`
                            : "Sem protocolo ativo"}
                        </p>
                        {relatorio.protocoloRiscoSuicidio.ultimaEntrada && (
                          <p className="text-xs text-rose-700">
                            Inserido em{" "}
                            {formatDate(
                              relatorio.protocoloRiscoSuicidio.ultimaEntrada
                                .data,
                            )}
                            {relatorio.protocoloRiscoSuicidio.ultimaEntrada
                              .descricao
                              ? ` — ${relatorio.protocoloRiscoSuicidio.ultimaEntrada.descricao}`
                              : ""}
                          </p>
                        )}
                        {relatorio.protocoloRiscoSuicidio.ultimaAlta && (
                          <p className="text-xs text-rose-700">
                            Alta medica em{" "}
                            {formatDate(
                              relatorio.protocoloRiscoSuicidio.ultimaAlta.data,
                            )}
                            {relatorio.protocoloRiscoSuicidio.ultimaAlta
                              .descricao
                              ? ` — ${relatorio.protocoloRiscoSuicidio.ultimaAlta.descricao}`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center gap-2 text-slate-700">
                          <Swords size={18} className="text-orange-500" />
                          <div>
                            <p className="text-xs uppercase text-slate-500">
                              Conflitos registrados
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                              {relatorio.conflitos.length}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">
                          {totalConflitosAtivos} conflito(s) ativo(s) no
                          momento.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center gap-2 text-slate-700">
                          <ShieldAlert size={18} className="text-red-500" />
                          <div>
                            <p className="text-xs uppercase text-slate-500">
                              Alertas registrados
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                              {relatorio.alertas.length}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">
                          {totalAlertasGraves} alerta(s) em nivel alto ou
                          critico.
                        </p>
                      </div>
                    </div>

                    <section>
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                        Conflitos detalhados
                      </h3>
                      {relatorio.conflitos.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhum conflito registrado.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {relatorio.conflitos.map((conflito) => (
                            <div
                              key={conflito.id}
                              className="rounded-xl border border-slate-200 p-3"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-indigo-600">
                                    {conflito.status ?? "Sem status"}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    Criado em {formatDate(conflito.criadoEm)}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {conflito.tipo ?? "Sem classificacao"} •{" "}
                                  {conflito.adversario?.nome ??
                                    "Oponente desconhecido"}
                                </p>
                                {conflito.adversario?.faccao && (
                                  <p className="text-xs text-slate-500">
                                    Faccao adversaria:{" "}
                                    {conflito.adversario.faccao}
                                  </p>
                                )}
                                {conflito.descricao && (
                                  <p className="text-xs text-slate-600">
                                    {conflito.descricao}
                                  </p>
                                )}
                                {conflito.resolvidoEm && (
                                  <p className="text-xs text-slate-500">
                                    Resolvido em{" "}
                                    {formatDate(conflito.resolvidoEm)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                        Alertas registrados
                      </h3>
                      {relatorio.alertas.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhum alerta cadastrado.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {relatorio.alertas.map((alerta) => (
                            <div
                              key={alerta.id}
                              className="rounded-xl border border-slate-200 p-3"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  Registrado em {formatDate(alerta.criadoEm)} •
                                  Nivel {alerta.nivelRisco ?? "Nao informado"}
                                </span>
                                {alerta.desativadoEm && (
                                  <span>
                                    Encerrado em{" "}
                                    {formatDate(alerta.desativadoEm)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {alerta.tipo ?? "Tipo nao informado"}
                              </p>
                              <p className="text-sm text-slate-600">
                                {alerta.descricao}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>

              {relatorio && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    Relatorio atualizado em{" "}
                    {formatDate(new Date().toISOString())}
                  </p>
                  <button
                    type="button"
                    onClick={exportarPdf}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={16} />
                    Gerar PDF
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
