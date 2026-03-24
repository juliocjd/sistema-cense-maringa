"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Search,
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

type ConflitoDetalhe = {
  id: string;
  tipo: string | null;
  status: string | null;
  descricao: string | null;
  criadoEm: string | null;
  resolvidoEm: string | null;
  origem: "CI_ORIGEM" | "CI_OCORRENCIA" | "AVULSO";
  adversario: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
    alojamento: string | null;
  } | null;
};

type AlertaDetalhe = {
  id: string;
  tipo: string | null;
  descricao: string;
  nivelRisco: string | null;
  criadoEm: string | null;
  desativadoEm: string | null;
  origem: "CI_ORIGEM" | "AVULSO";
};

type LinhaTimeline = {
  id: string;
  tipo: "CI" | "CONFLITO" | "ALERTA";
  dataReferencia: string | null;
  titulo: string;
  resumo: string | null;
  status: string;
  ci: {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    resumo: string;
    situacao: string;
  } | null;
  conflito: ConflitoDetalhe | null;
  alerta: AlertaDetalhe | null;
  conflitosDerivados: ConflitoDetalhe[];
  alertasDerivados: AlertaDetalhe[];
};

type MesTimeline = {
  chaveMes: string;
  label: string;
  totais: {
    linhas: number;
    ci: number;
    conflitosAvulsos: number;
    alertasAvulsos: number;
    conflitosDerivados: number;
    alertasDerivados: number;
  };
  linhas: LinhaTimeline[];
};

type RelatorioProcesso = {
  adolescente: {
    id: string;
    nome: string;
    numeroSms: string | null;
    status: string;
    faccao: string | null;
    faccaoId: string | null;
    bairro: string | null;
    alojamento: string | null;
    dataEntrada: string | null;
    dataDesinternacao: string | null;
  };
  resumo: {
    totalMeses: number;
    totalLinhas: number;
    totalCi: number;
    totalConflitosAvulsos: number;
    totalAlertasAvulsos: number;
    totalConflitosDerivados: number;
    totalAlertasDerivados: number;
    totalConflitosComDesinternados: number;
  };
  meses: MesTimeline[];
  geradoEm: string;
};

type RelatorioProcessoSocioeducativoModalTriggerProps = {
  adolescenteInicial?: AdolescenteResultado | null;
  buttonLabel?: string;
  buttonClassName?: string;
};

const BOTAO_PADRAO_CLASS =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100";

const formatDate = (value?: string | null) => {
  if (!value) return "Nao informado";
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "Nao informado";
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleDateString("pt-BR", { dateStyle: "short" });
};

const textoCompletoPdf = (texto?: string | null) => {
  if (!texto) return "-";
  const normalizado = texto.trim();
  return normalizado.length > 0 ? normalizado : "-";
};

const statusBadgeClass = (status?: string | null) => {
  const valor = (status ?? "").toUpperCase();
  if (valor === "ATIVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (valor === "LIBERADO" || valor === "TRANSFERIDO" || valor === "EVADIDO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (valor === "DESATIVADO" || valor === "SUSPENSO_STATUS") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (valor === "ENCERRADO") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-indigo-200 bg-indigo-50 text-indigo-700";
};

const tipoLinhaClass = (tipo: LinhaTimeline["tipo"]) => {
  if (tipo === "CI") {
    return "border-indigo-200 bg-indigo-50/60";
  }
  if (tipo === "CONFLITO") {
    return "border-rose-200 bg-rose-50/60";
  }
  return "border-orange-200 bg-orange-50/60";
};

const normalizarResultado = (item: any): AdolescenteResultado => {
  const casa = item?.alojamentoAtual?.casa?.nome;
  const numero = item?.alojamentoAtual?.numero;
  const ala = item?.alojamentoAtual?.ala;
  const alojamento =
    casa || numero
      ? `${casa ?? "Casa"}${numero ? ` - Aloj. ${numero}` : ""}${
          ala ? ` (Ala ${ala})` : ""
        }`
      : null;

  return {
    id: item?.id,
    nome: item?.nomeCompleto ?? "Nao informado",
    numeroSms: item?.numeroSms ?? null,
    status: item?.statusUnidade ?? null,
    alojamento,
  };
};

export function RelatorioProcessoSocioeducativoModalTrigger({
  adolescenteInicial = null,
  buttonLabel = "Abrir relatorio",
  buttonClassName = BOTAO_PADRAO_CLASS,
}: RelatorioProcessoSocioeducativoModalTriggerProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<AdolescenteResultado[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioProcesso | null>(null);
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
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/adolescentes?modo=lista&limit=20&ignorar_acentos=true&busca=${encodeURIComponent(
            termo,
          )}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar adolescentes");
        }
        const payload = await response.json().catch(() => null);
        const lista = Array.isArray(payload?.data)
          ? payload.data.map(normalizarResultado)
          : [];
        setResultados(lista);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResultados([]);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [aberto, busca]);

  const carregarRelatorio = async (adolescenteId: string) => {
    setCarregando(true);
    setErro(null);
    setRelatorio(null);
    try {
      const response = await fetch(
        `/api/relatorios/adolescentes/${adolescenteId}/processo-socioeducativo`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao gerar relatorio");
      }
      const json = (await response.json()) as RelatorioProcesso;
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

  const abrir = () => {
    setAberto(true);
    setErro(null);
    setResultados([]);
    setBusca("");
    if (adolescenteInicial?.id) {
      void carregarRelatorio(adolescenteInicial.id);
    } else {
      setRelatorio(null);
    }
  };

  const fechar = () => {
    setAberto(false);
    setBusca("");
    setResultados([]);
    setErro(null);
    setCarregando(false);
    setRelatorio(null);
  };

  const totalConflitosDerivados = relatorio?.resumo.totalConflitosDerivados ?? 0;
  const totalAlertasDerivados = relatorio?.resumo.totalAlertasDerivados ?? 0;
  const totalAvulsos =
    (relatorio?.resumo.totalConflitosAvulsos ?? 0) +
    (relatorio?.resumo.totalAlertasAvulsos ?? 0);

  const linhasPdf = useMemo(() => {
    if (!relatorio) return [];
    const rows: string[][] = [];
    relatorio.meses.forEach((mes) => {
      mes.linhas.forEach((linha) => {
        const desdobramentos =
          linha.tipo === "CI"
            ? `${linha.conflitosDerivados.length} conflito(s), ${linha.alertasDerivados.length} alerta(s)`
            : "-";
        rows.push([
          mes.label,
          formatDateOnly(linha.dataReferencia),
          linha.tipo,
          linha.titulo,
          desdobramentos,
        ]);
      });
    });
    return rows;
  }, [relatorio]);

  const detalhamentoPdf = useMemo(() => {
    if (!relatorio) {
      return {
        ciRows: [] as string[][],
        alertaRows: [] as string[][],
        conflitoRows: [] as string[][],
      };
    }

    const ciRows: string[][] = [];
    const ciVistas = new Set<string>();

    const alertasMap = new Map<
      string,
      {
        data: string | null;
        tipo: string;
        nivel: string;
        status: string;
        descricao: string;
        origens: Set<string>;
      }
    >();

    const conflitosMap = new Map<
      string,
      {
        data: string | null;
        tipo: string;
        status: string;
        adversario: string;
        descricao: string;
        origens: Set<string>;
      }
    >();

    const registrarAlerta = (
      alerta: AlertaDetalhe,
      origemLabel: string,
      dataReferencia?: string | null,
    ) => {
      const existente = alertasMap.get(alerta.id);
      if (existente) {
        existente.origens.add(origemLabel);
        return;
      }
      alertasMap.set(alerta.id, {
        data: alerta.criadoEm ?? dataReferencia ?? null,
        tipo: alerta.tipo ?? "Sem tipo",
        nivel: alerta.nivelRisco ?? "Nao informado",
        status: alerta.desativadoEm ? "ENCERRADO" : "ATIVO",
        descricao: textoCompletoPdf(alerta.descricao),
        origens: new Set([origemLabel]),
      });
    };

    const registrarConflito = (
      conflito: ConflitoDetalhe,
      origemLabel: string,
      dataReferencia?: string | null,
    ) => {
      const existente = conflitosMap.get(conflito.id);
      if (existente) {
        existente.origens.add(origemLabel);
        return;
      }
      conflitosMap.set(conflito.id, {
        data: conflito.criadoEm ?? dataReferencia ?? null,
        tipo: conflito.tipo ?? "Nao classificado",
        status: conflito.status ?? "NAO INFORMADO",
        adversario: conflito.adversario?.nome ?? "Nao identificado",
        descricao: textoCompletoPdf(conflito.descricao),
        origens: new Set([origemLabel]),
      });
    };

    relatorio.meses.forEach((mes) => {
      mes.linhas.forEach((linha) => {
        if (linha.tipo === "CI" && linha.ci) {
          if (!ciVistas.has(linha.ci.id)) {
            ciVistas.add(linha.ci.id);
            ciRows.push([
              formatDateOnly(linha.dataReferencia),
              `${linha.ci.numero}/${linha.ci.ano}`,
              linha.ci.tipo,
              linha.ci.situacao,
              `${linha.conflitosDerivados.length} conflito(s) | ${linha.alertasDerivados.length} alerta(s)`,
              textoCompletoPdf(linha.ci.resumo),
            ]);
          }

          const origemCi = `CI ${linha.ci.numero}/${linha.ci.ano}`;
          linha.alertasDerivados.forEach((alerta) =>
            registrarAlerta(alerta, origemCi, linha.dataReferencia),
          );
          linha.conflitosDerivados.forEach((conflito) =>
            registrarConflito(conflito, origemCi, linha.dataReferencia),
          );
          return;
        }

        if (linha.tipo === "ALERTA" && linha.alerta) {
          registrarAlerta(linha.alerta, "AVULSO", linha.dataReferencia);
          return;
        }

        if (linha.tipo === "CONFLITO" && linha.conflito) {
          registrarConflito(linha.conflito, "AVULSO", linha.dataReferencia);
        }
      });
    });

    const alertaRows = Array.from(alertasMap.values()).map((item) => [
      formatDateOnly(item.data),
      item.tipo,
      item.nivel,
      item.status,
      Array.from(item.origens).join(" | "),
      item.descricao,
    ]);

    const conflitoRows = Array.from(conflitosMap.values()).map((item) => [
      formatDateOnly(item.data),
      item.tipo,
      item.status,
      item.adversario,
      Array.from(item.origens).join(" | "),
      item.descricao,
    ]);

    return { ciRows, alertaRows, conflitoRows };
  }, [relatorio]);

  const exportarPdf = () => {
    if (!relatorio) return;
    const doc = new jsPDF();
    const docComTabela = doc as jsPDF & {
      lastAutoTable?: { finalY?: number };
    };
    doc.setFontSize(14);
    doc.text("Relatorio do Processo Socioeducativo", 14, 16);
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
    doc.text(
      `Resumo: ${relatorio.resumo.totalCi} CI(s), ${relatorio.resumo.totalConflitosDerivados} conflito(s) derivados, ${relatorio.resumo.totalAlertasDerivados} alerta(s) derivados`,
      14,
      42,
    );

    autoTable(doc, {
      startY: 48,
      head: [["Mes", "Data", "Tipo", "Evento", "Desdobramentos"]],
      body: linhasPdf,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 81, 191] },
    });

    doc.addPage();
    let cursorY = 16;
    doc.setFontSize(13);
    doc.text("Detalhamento Consolidado sem Duplicidade", 14, cursorY);
    cursorY += 6;
    doc.setFontSize(9);
    doc.text(
      "Cada CI, alerta e conflito aparece uma unica vez, com suas origens vinculadas.",
      14,
      cursorY,
    );
    cursorY += 6;

    const adicionarSecao = (titulo: string, linhas: string[][], cabecalho: string[]) => {
      if (cursorY > 250) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFontSize(11);
      doc.text(titulo, 14, cursorY);
      cursorY += 2;

      autoTable(doc, {
        startY: cursorY + 2,
        head: [cabecalho],
        body:
          linhas.length > 0
            ? linhas
            : [[
                "-",
                "-",
                "-",
                "-",
                "-",
                "Nenhum registro nesta secao",
              ]],
        styles: { fontSize: 7.5, cellPadding: 1.6 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      cursorY = (docComTabela.lastAutoTable?.finalY ?? cursorY + 12) + 7;
    };

    adicionarSecao("CIs", detalhamentoPdf.ciRows, [
      "Data",
      "CI",
      "Tipo",
      "Situacao",
      "Derivados",
      "Resumo",
    ]);
    adicionarSecao("Alertas", detalhamentoPdf.alertaRows, [
      "Data",
      "Tipo",
      "Nivel",
      "Status",
      "Origens",
      "Descricao",
    ]);
    adicionarSecao("Conflitos", detalhamentoPdf.conflitoRows, [
      "Data",
      "Tipo",
      "Status",
      "Adversario",
      "Origens",
      "Descricao",
    ]);

    const nomeArquivo = relatorio.adolescente.nome
      .toLowerCase()
      .replace(/\s+/g, "-");
    doc.save(`relatorio-processo-socioeducativo-${nomeArquivo}.pdf`);
  };

  return (
    <>
      <button type="button" onClick={abrir} className={buttonClassName}>
        {buttonLabel}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40" onClick={fechar} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Relatorio interno
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Historico do Processo Socioeducativo
                  </h2>
                  <p className="text-sm text-slate-600">
                    Consolidado por mes, com CI como evento mestre para evitar
                    duplicidade.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fechar}
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
                    placeholder="Digite nome, SMS, processo ou numero interno"
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
                            SMS: {ado.numeroSms ?? "Nao informado"} | Status:{" "}
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
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
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
                    Selecione um adolescente para gerar o historico consolidado.
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
                            SMS: {relatorio.adolescente.numeroSms ?? "Nao informado"}{" "}
                            | Status: {relatorio.adolescente.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            {relatorio.adolescente.alojamento ??
                              "Alojamento nao informado"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Faccao: {relatorio.adolescente.faccao ?? "Nao informada"} |
                            Bairro: {relatorio.adolescente.bairro ?? "Nao informado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase text-slate-500">
                          Linhas do historico
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {relatorio.resumo.totalLinhas}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase text-slate-500">
                          CIs mestres
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {relatorio.resumo.totalCi}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase text-slate-500">
                          Derivados de CI
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {totalConflitosDerivados + totalAlertasDerivados}
                        </p>
                        <p className="text-xs text-slate-500">
                          {totalConflitosDerivados} conflitos e{" "}
                          {totalAlertasDerivados} alertas
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase text-slate-500">
                          Eventos avulsos
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {totalAvulsos}
                        </p>
                        <p className="text-xs text-slate-500">
                          Conflitos/alertas sem CI de origem
                        </p>
                      </div>
                    </div>

                    {relatorio.resumo.totalConflitosComDesinternados > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Foram identificados{" "}
                        <span className="font-semibold">
                          {relatorio.resumo.totalConflitosComDesinternados}
                        </span>{" "}
                        conflito(s) com envolvidos nao ativos
                        (liberado/transferido/evadido), mantidos no historico para
                        analise de convivencia.
                      </div>
                    )}

                    <section className="space-y-4">
                      {relatorio.meses.map((mes) => (
                        <article
                          key={mes.chaveMes}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                {mes.label}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {mes.totais.linhas} linha(s) | {mes.totais.ci} CI(s)
                                mestre(s)
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
                                Derivados: {mes.totais.conflitosDerivados} conflito(s),{" "}
                                {mes.totais.alertasDerivados} alerta(s)
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-700">
                                Avulsos: {mes.totais.conflitosAvulsos + mes.totais.alertasAvulsos}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {mes.linhas.map((linha) => (
                              <div
                                key={linha.id}
                                className={`rounded-xl border p-3 ${tipoLinhaClass(
                                  linha.tipo,
                                )}`}
                              >
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                      {linha.tipo}
                                    </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                                        linha.status,
                                      )}`}
                                    >
                                      {linha.status}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {formatDate(linha.dataReferencia)}
                                  </span>
                                </div>

                                <p className="text-sm font-semibold text-slate-900">
                                  {linha.titulo}
                                </p>
                                {linha.resumo && (
                                  <div className="mt-2 rounded-lg border border-slate-200 bg-white/85 p-2">
                                    <p className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-xs leading-relaxed text-slate-700">
                                      {linha.resumo}
                                    </p>
                                  </div>
                                )}

                                {linha.tipo === "CI" && (
                                  <details className="mt-2 rounded-lg border border-indigo-100 bg-white/80 p-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-indigo-700">
                                      Ver desdobramentos ({linha.conflitosDerivados.length} conflito(s),{" "}
                                      {linha.alertasDerivados.length} alerta(s))
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {linha.conflitosDerivados.map((conflito) => (
                                        <div
                                          key={`ci-conf-${linha.id}-${conflito.id}`}
                                          className="rounded-lg border border-rose-100 bg-rose-50/60 p-2"
                                        >
                                          <p className="text-xs font-semibold text-rose-800">
                                            Conflito {conflito.tipo ?? "nao classificado"}
                                          </p>
                                          <p className="text-xs text-slate-700">
                                            Adversario: {conflito.adversario?.nome ?? "Nao identificado"}{" "}
                                            {conflito.adversario?.status && (
                                              <span
                                                className={`ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(
                                                  conflito.adversario.status,
                                                )}`}
                                              >
                                                {conflito.adversario.status}
                                              </span>
                                            )}
                                          </p>
                                          {conflito.adversario?.alojamento && (
                                            <p className="text-xs text-slate-600">
                                              {conflito.adversario.alojamento}
                                            </p>
                                          )}
                                          {conflito.descricao && (
                                            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-rose-100 bg-white/80 p-2 text-xs leading-relaxed text-slate-600">
                                              {conflito.descricao}
                                            </p>
                                          )}
                                        </div>
                                      ))}

                                      {linha.alertasDerivados.map((alerta) => (
                                        <div
                                          key={`ci-alert-${linha.id}-${alerta.id}`}
                                          className="rounded-lg border border-orange-100 bg-orange-50/60 p-2"
                                        >
                                          <p className="text-xs font-semibold text-orange-800">
                                            Alerta {alerta.tipo ?? "sem tipo"}
                                          </p>
                                          <p className="text-xs text-slate-700">
                                            Nivel: {alerta.nivelRisco ?? "Nao informado"} |
                                            Criado em {formatDate(alerta.criadoEm)}
                                          </p>
                                          <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-orange-100 bg-white/80 p-2 text-xs leading-relaxed text-slate-600">
                                            {alerta.descricao}
                                          </p>
                                        </div>
                                      ))}

                                      {linha.conflitosDerivados.length === 0 &&
                                        linha.alertasDerivados.length === 0 && (
                                          <p className="text-xs text-slate-500">
                                            Sem desdobramentos registrados para este CI.
                                          </p>
                                        )}
                                    </div>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </section>
                  </div>
                )}
              </div>

              {relatorio && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    Relatorio atualizado em {formatDate(relatorio.geradoEm)}
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

export default RelatorioProcessoSocioeducativoModalTrigger;
