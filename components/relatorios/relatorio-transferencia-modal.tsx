"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search, User, X } from "lucide-react";
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
  criadoEm: string;
  resolvidoEm: string | null;
  descricao: string | null;
  origem?: { id: string; numero: number; ano: number } | null;
  adversario: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
    faccaoId: string | null;
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
};

type TransferenciaMetricas = {
  totalConflitos: number;
  conflitosAtivos: number;
  conflitosResolvidos: number;
  faccoesEnvolvidas: string[];
  alojamentosEnvolvidos: string[];
  alertasTotais: number;
  alertasGraves: number;
  ultimaOcorrenciaConflito: string | null;
  ultimaOcorrenciaAlertaGrave: string | null;
};

type RelatorioTransferencia = {
  adolescente: {
    id: string;
    nome: string;
    numeroSms: string | null;
    status: string;
    faccao: string | null;
    faccaoId: string | null;
    bairro: string | null;
    alojamento: string | null;
  };
  conflitos: RelatorioConflito[];
  alertas: RelatorioAlerta[];
  metricas: TransferenciaMetricas;
  protocoloRiscoSuicidio?: {
    ativo: boolean;
    nivelAtual: string | null;
    ultimaEntrada: { data: string; descricao: string | null } | null;
    ultimaAlta: { data: string; descricao: string | null } | null;
  };
};

type AdversarioResumo = {
  id: string;
  nome: string;
  faccao: string | null;
  faccaoId: string | null;
  alojamento: string | null;
};

type ConflitoAgrupado = {
  id: string;
  referencia: string;
  criadoEm: string;
  tipo: string | null;
  descricao: string | null;
  status: string[];
  adversarios: AdversarioResumo[];
};

type FaccaoDetalhada = {
  nome: string;
  interna: boolean;
  adversarios: string[];
  contextos: Array<{ titulo: string; detalhe: string }>;
};

type AlojamentoImpactado = {
  local: string;
  adversarios: string[];
  faccoes: string[];
  tipos: string[];
  ultimaData: string | null;
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

const formatDateOnly = (value?: string | null) => {
  if (!value) return "Nao informado";
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleDateString("pt-BR", { dateStyle: "short" });
};

const normalizarTexto = (texto?: string | null) =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const gerarChaveConflito = (conflito: RelatorioConflito) => {
  if (conflito.origem?.id) return conflito.origem.id;
  const dataIso = new Date(conflito.criadoEm).toISOString();
  const descricaoBase = normalizarTexto(conflito.descricao).slice(0, 120);
  return `${dataIso}|${conflito.tipo ?? "SEM_TIPO"}|${descricaoBase}`;
};

export function RelatorioTransferenciaModalTrigger() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<AdolescenteResultado[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioTransferencia | null>(null);
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
        const response = await fetch(`/api/search?q=${encodeURIComponent(termo)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Falha ao buscar adolescentes");
        }
        const json = await response.json();
        setResultados(json.resultados?.adolescentes ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
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
        `/api/relatorios/adolescentes/${adolescenteId}/transferencia`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao gerar relatorio");
      }
      const json = (await response.json()) as RelatorioTransferencia;
      setRelatorio(json);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro inesperado ao gerar relatorio"
      );
    } finally {
      setCarregando(false);
    }
  };

  const oponentesAtivos = useMemo(
    () =>
      relatorio?.conflitos.filter(
        (conflito) => conflito.status?.toUpperCase() === "ATIVO"
      ) ?? [],
    [relatorio]
  );

  const conflitosAgrupados = useMemo<ConflitoAgrupado[]>(() => {
    if (!relatorio) return [];
    const grupos = new Map<
      string,
      ConflitoAgrupado & { statusSet: Set<string> }
    >();
    relatorio.conflitos.forEach((conflito) => {
      const chave = gerarChaveConflito(conflito);
      const referencia = conflito.origem
        ? `CI ${conflito.origem.numero}/${conflito.origem.ano}`
        : "Registro";
      const adversario = conflito.adversario
        ? {
            id: conflito.adversario.id,
            nome: conflito.adversario.nome,
            faccao: conflito.adversario.faccao,
            faccaoId: conflito.adversario.faccaoId,
            alojamento: conflito.adversario.alojamento,
        }
        : null;
      const existente = grupos.get(chave);
      if (!existente) {
        grupos.set(chave, {
          id: chave,
          referencia,
          criadoEm: conflito.criadoEm,
          tipo: conflito.tipo,
          descricao: conflito.descricao,
          adversarios: adversario ? [adversario] : [],
          status: [],
          statusSet: new Set([conflito.status ?? "SEM STATUS"]),
        });
      } else {
        if (!existente.descricao && conflito.descricao) {
          existente.descricao = conflito.descricao;
        }
        if (
          adversario &&
          !existente.adversarios.some((item) => item.id === adversario.id)
        ) {
          existente.adversarios.push(adversario);
        }
        existente.statusSet.add(conflito.status ?? "SEM STATUS");
      }
    });
    return Array.from(grupos.values())
      .map(({ statusSet, ...resto }) => ({
        ...resto,
        status: Array.from(statusSet),
      }))
      .sort(
        (a, b) =>
          new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
  }, [relatorio]);

  const detalhesFaccoes = useMemo<FaccaoDetalhada[]>(() => {
    if (!relatorio) return [];
    const mapa = new Map<
      string,
      {
        interna: boolean;
        adversarios: Set<string>;
        contextos: Array<{ titulo: string; detalhe: string }>;
      }
    >();
    conflitosAgrupados.forEach((grupo) => {
      grupo.adversarios.forEach((adv) => {
        if (!adv.faccao) return;
        if (!mapa.has(adv.faccao)) {
          mapa.set(adv.faccao, {
            interna: relatorio.adolescente.faccao === adv.faccao,
            adversarios: new Set<string>(),
            contextos: [],
          });
        }
        const item = mapa.get(adv.faccao)!;
        item.adversarios.add(adv.nome);
        const titulo = grupo.tipo ?? "Sem classificacao";
        const detalheBase = `Registrado em ${formatDate(
          grupo.criadoEm
        )} contra ${adv.nome}`;
        const detalhe =
          relatorio.adolescente.faccao === adv.faccao
            ? `${detalheBase} (membro da mesma faccao).`
            : `${detalheBase}.`;
        item.contextos.push({ titulo, detalhe });
      });
    });

    return Array.from(mapa.entries())
      .map(([nome, detalhe]) => ({
        nome,
        interna: detalhe.interna,
        adversarios: Array.from(detalhe.adversarios),
        contextos: detalhe.contextos,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [relatorio, conflitosAgrupados]);

  const alojamentosImpactados = useMemo<AlojamentoImpactado[]>(() => {
    if (!relatorio) return [];
    const mapa = new Map<
      string,
      {
        adversarios: Set<string>;
        faccoes: Set<string>;
        tipos: Set<string>;
        ultimaData: string | null;
      }
    >();

    relatorio.conflitos.forEach((conflito) => {
      const local = conflito.adversario?.alojamento;
      if (!local) return;
      if (!mapa.has(local)) {
        mapa.set(local, {
          adversarios: new Set<string>(),
          faccoes: new Set<string>(),
          tipos: new Set<string>(),
          ultimaData: null,
        });
      }
      const item = mapa.get(local)!;
      if (conflito.adversario?.nome) {
        item.adversarios.add(conflito.adversario.nome);
      }
      if (conflito.adversario?.faccao) {
        item.faccoes.add(conflito.adversario.faccao);
      }
      if (conflito.tipo) {
        item.tipos.add(conflito.tipo);
      }
      if (
        !item.ultimaData ||
        new Date(conflito.criadoEm) > new Date(item.ultimaData)
      ) {
        item.ultimaData = conflito.criadoEm;
      }
    });

    return Array.from(mapa.entries())
      .map(([local, detalhe]) => ({
        local,
        adversarios: Array.from(detalhe.adversarios),
        faccoes: Array.from(detalhe.faccoes),
        tipos: Array.from(detalhe.tipos),
        ultimaData: detalhe.ultimaData,
      }))
      .sort((a, b) => {
        const aTime = a.ultimaData ? new Date(a.ultimaData).getTime() : 0;
        const bTime = b.ultimaData ? new Date(b.ultimaData).getTime() : 0;
        return bTime - aTime;
      });
  }, [relatorio]);

  const formatarRotuloConflito = (grupo: ConflitoAgrupado) =>
    grupo.referencia === "Registro"
      ? `Registro ${formatDate(grupo.criadoEm)}`
      : `${grupo.referencia} - ${formatDate(grupo.criadoEm)}`;

  const exportarPdf = () => {
    if (!relatorio) return;
    const doc = new jsPDF();
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    const titulo = "Relatorio de Pedido de Transferencia Judicial";
    doc.text(titulo, 105, 16, { align: "center" as const });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const cabecalhoInfo = [
      {
        label: "Adolescente",
        value: `${relatorio.adolescente.nome} (SMS: ${
          relatorio.adolescente.numeroSms ?? "Nao informado"
        })`,
      },
      { label: "Status atual", value: relatorio.adolescente.status },
      {
        label: "Alojamento atual",
        value: relatorio.adolescente.alojamento ?? "Nao informado",
      },
      {
        label: "Facção declarada",
        value: relatorio.adolescente.faccao ?? "Nao informada",
      },
      relatorio.adolescente.bairro
        ? { label: "Origem", value: relatorio.adolescente.bairro }
        : null,
      {
        label: "Emitido em",
        value: formatDate(new Date().toISOString()),
      },
      relatorio.protocoloRiscoSuicidio
        ? {
            label: "Protocolo suicidio",
            value: relatorio.protocoloRiscoSuicidio.ativo
              ? `Ativo (nivel ${
                  relatorio.protocoloRiscoSuicidio.nivelAtual ?? "N/I"
                })`
              : "Sem protocolo ativo",
          }
        : null,
      relatorio.protocoloRiscoSuicidio?.ultimaAlta
        ? {
            label: "Alta medica protocolo",
            value: `${formatDate(
              relatorio.protocoloRiscoSuicidio.ultimaAlta.data
            )}${
              relatorio.protocoloRiscoSuicidio.ultimaAlta.descricao
                ? ` - ${relatorio.protocoloRiscoSuicidio.ultimaAlta.descricao}`
                : ""
            }`,
          }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;
    let cursorY = 24;

    const ensureBreak = (espaco = 10) => {
      if (cursorY + espaco > 285) {
        doc.addPage();
        cursorY = 20;
      }
    };

    const addKeyValue = (label: string, value: string, indent = 0) => {
      const startX = 14 + indent;
      const valueX = startX + 42;
      const linhas = doc.splitTextToSize(value, 160 - indent);
      ensureBreak(linhas.length * 5 + 4);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, startX, cursorY);
      doc.setFont("helvetica", "normal");
      doc.text(linhas, valueX, cursorY);
      cursorY += linhas.length * 5 + 4;
    };

    const addSectionTitle = (titulo: string) => {
      ensureBreak(18);
      doc.setFillColor(99, 102, 241);
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(14, cursorY, 182, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(titulo, 18, cursorY + 5.5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      cursorY += 12;
    };

    const addParagraph = (texto: string, indent = 0) => {
      const largura = 180 - indent;
      const linhas = doc.splitTextToSize(texto, largura);
      ensureBreak(linhas.length * 5 + 4);
      doc.text(linhas, 14 + indent, cursorY);
      cursorY += linhas.length * 5 + 4;
    };

    cabecalhoInfo.forEach((info) => addKeyValue(info.label, info.value));
    cursorY += 2;

    const metricas = relatorio.metricas;
    autoTable(doc, {
      startY: cursorY,
      head: [["Indicador", "Valor"]],
      body: [
        ["Conflitos ativos", `${metricas.conflitosAtivos} de ${metricas.totalConflitos}`],
        ["Alertas graves", `${metricas.alertasGraves} de ${metricas.alertasTotais}`],
        ["Ultimo conflito", formatDate(metricas.ultimaOcorrenciaConflito)],
        ["Ultimo alerta grave", formatDate(metricas.ultimaOcorrenciaAlertaGrave)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    });
    cursorY =
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? cursorY) + 8;

    addSectionTitle("Conflitos ativos mapeados");
    if (oponentesAtivos.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [["Registrado em", "Tipo", "Adversario", "Facção do rival", "Status"]],
        body: oponentesAtivos.map((conflito) => [
          formatDate(conflito.criadoEm),
          conflito.tipo ?? "Nao informado",
          conflito.adversario?.nome ?? "Desconhecido",
          conflito.adversario?.faccao ?? "Nao informada",
          conflito.status ?? "SEM STATUS",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      });
      cursorY =
        ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY ?? cursorY) + 8;
    } else {
      addParagraph(
        "Nao existem conflitos ativos registrados no momento.",
        2
      );
    }

    addSectionTitle("Faccoes adversarias e aliancas identificadas");
    if (detalhesFaccoes.length === 0) {
      addParagraph(
        "Os registros nao possuem faccoes adversarias descritas para os rivais.",
        2
      );
    } else {
      detalhesFaccoes.forEach((detalhe) => {
        const titulo = detalhe.interna
          ? `${detalhe.nome} (conflito interno / alianca forte)`
          : detalhe.nome;
        ensureBreak(8);
        doc.setFont("helvetica", "bold");
        doc.text(titulo, 16, cursorY);
        doc.setFont("helvetica", "normal");
        cursorY += 5;
        const adversarios = detalhe.adversarios.join(", ");
        addParagraph(
          `Adversarios envolvidos: ${adversarios}. ${
            detalhe.interna
              ? "A rivalidade ocorre dentro da mesma faccao, exigindo segregacao e vigilancia especial."
              : "Ha conflito direto com integrantes dessa faccao."
          }`,
          6
        );
        detalhe.contextos.forEach((ctx) => {
          const texto = `${ctx.titulo.toUpperCase()}: ${ctx.detalhe}`;
          addParagraph(texto, 10);
        });
      });
    }

    addSectionTitle("Casas e alojamentos impactados");
    if (alojamentosImpactados.length === 0) {
      addParagraph(
        "Nenhum alojamento rival foi citado como risco direto para este interno.",
        2
      );
    } else {
      alojamentosImpactados.forEach((item) => {
        ensureBreak(8);
        doc.setFont("helvetica", "bold");
        doc.text(item.local, 16, cursorY);
        doc.setFont("helvetica", "normal");
        cursorY += 5;
        const adversarios = item.adversarios.join(", ");
        const faccoes = item.faccoes.length
          ? item.faccoes.join(", ")
          : "Nao informadas";
        const tipos = item.tipos.length
          ? item.tipos.join(", ")
          : "Sem classificacao registrada";
        const ultima = formatDate(item.ultimaData);
        addParagraph(
          `Ocupado por ${adversarios}. Tipos de conflito: ${tipos}. Faccoes presentes: ${faccoes}. Ultimo registro em ${ultima}. A permanencia do adolescente em frente ou nas proximidades desse local gera risco de novo confronto.`,
          6
        );
      });
    }

    addSectionTitle("Narrativa consolidada dos conflitos");
    if (conflitosAgrupados.length === 0) {
      addParagraph("Nao ha conflitos registrados.", 2);
    } else {
      conflitosAgrupados.forEach((grupo, index) => {
        ensureBreak(12);
        const rotulo = `${index + 1}. ${formatarRotuloConflito(grupo)}`;
        doc.setFont("helvetica", "bold");
        doc.text(rotulo, 16, cursorY);
        doc.setFont("helvetica", "normal");
        cursorY += 4;

        if (grupo.adversarios.length > 0) {
          const envolvidos = grupo.adversarios
            .map((adv) =>
              adv.faccao ? `${adv.nome} (${adv.faccao})` : adv.nome
            )
            .join(", ");
          const linhas = doc.splitTextToSize(
            `Adversarios: ${envolvidos}.`,
            170
          );
          doc.text(linhas, 20, cursorY);
          cursorY += linhas.length * 4;
        }

        const descricao = doc.splitTextToSize(
          `Descricao: ${grupo.descricao ?? "Nao informada"}.`,
          170
        );
        doc.text(descricao, 20, cursorY);
        cursorY += descricao.length * 4 + 2;
      });
    }

    const nomeArquivo = relatorio.adolescente.nome
      .toLowerCase()
      .replace(/\s+/g, "-");
    doc.save(`relatorio-transferencia-${nomeArquivo}.pdf`);
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
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Relatorio interno
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Pedido de transferencia judicial
                  </h2>
                  <p className="text-sm text-slate-600">
                    Utilize o relatorio para embasar solicitacoes de transferencia.
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
                          <p className="text-sm font-semibold text-slate-900">{ado.nome}</p>
                          <p className="text-xs text-slate-500">
                            SMS: {ado.numeroSms ?? "Nao informado"} • Status: {ado.status ?? "?"}
                          </p>
                          {ado.alojamento && (
                            <p className="text-xs text-slate-500">{ado.alojamento}</p>
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
                    <span>Compilando informacoes...</span>
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
                            SMS: {relatorio.adolescente.numeroSms ?? "Nao informado"} • Status:{" "}
                            {relatorio.adolescente.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            {relatorio.adolescente.alojamento ?? "Alojamento nao informado"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Faccao: {relatorio.adolescente.faccao ?? "Nao informada"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {relatorio.protocoloRiscoSuicidio && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-900">
                        <p className="text-sm font-semibold text-rose-800">
                          Protocolo de risco de suicidio
                        </p>
                        <p className="text-xs">
                          {relatorio.protocoloRiscoSuicidio.ativo
                            ? `Ativo (nivel ${relatorio.protocoloRiscoSuicidio.nivelAtual ?? "N/I"})`
                            : "Sem protocolo ativo"}
                        </p>
                        {relatorio.protocoloRiscoSuicidio.ultimaEntrada && (
                          <p className="text-xs">
                            Inserido em{" "}
                            {formatDate(relatorio.protocoloRiscoSuicidio.ultimaEntrada.data)}
                            {relatorio.protocoloRiscoSuicidio.ultimaEntrada.descricao
                              ? ` — ${relatorio.protocoloRiscoSuicidio.ultimaEntrada.descricao}`
                              : ""}
                          </p>
                        )}
                        {relatorio.protocoloRiscoSuicidio.ultimaAlta && (
                          <p className="text-xs">
                            Alta medica em{" "}
                            {formatDate(relatorio.protocoloRiscoSuicidio.ultimaAlta.data)}
                            {relatorio.protocoloRiscoSuicidio.ultimaAlta.descricao
                              ? ` — ${relatorio.protocoloRiscoSuicidio.ultimaAlta.descricao}`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Intensidade dos conflitos
                        </p>
                        <p className="text-3xl font-bold text-slate-900">
                          {relatorio.metricas.conflitosAtivos} ativos
                        </p>
                        <p className="text-sm text-slate-500">
                          Total acumulado: {relatorio.metricas.totalConflitos} registros.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Alertas graves
                        </p>
                        <p className="text-3xl font-bold text-slate-900">
                          {relatorio.metricas.alertasGraves}
                        </p>
                        <p className="text-sm text-slate-500">
                          {relatorio.metricas.alertasTotais} alertas emitidos no total.
                        </p>
                      </div>
                    </div>

                    <section className="rounded-2xl border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold uppercase text-slate-500">
                        Pontos criticos para o pedido
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                        <li>
                          Conflitos ativos com{" "}
                          <strong>{relatorio.metricas.conflitosAtivos}</strong> adversarios
                          diretos.
                        </li>
                        {relatorio.metricas.faccoesEnvolvidas.length > 0 && (
                          <li>
                            Faccoes adversarias:{" "}
                            <strong>
                              {relatorio.metricas.faccoesEnvolvidas.join(", ")}
                            </strong>
                            .
                          </li>
                        )}
                        {relatorio.metricas.alojamentosEnvolvidos.length > 0 && (
                          <li>
                            Ambientes impactados:{" "}
                            <strong>
                              {relatorio.metricas.alojamentosEnvolvidos.join(", ")}
                            </strong>
                            .
                          </li>
                        )}
                        <li>
                          Alertas de risco em nivel alto/critico:{" "}
                          <strong>{relatorio.metricas.alertasGraves}</strong>.
                        </li>
                        {relatorio.metricas.ultimaOcorrenciaAlertaGrave && (
                          <li>
                            Ultimo alerta grave em{" "}
                            {formatDate(relatorio.metricas.ultimaOcorrenciaAlertaGrave)}.
                          </li>
                        )}
                      </ul>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4">
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                        Conflitos ativos
                      </h3>
                      {oponentesAtivos.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum conflito ativo.</p>
                      ) : (
                        <div className="space-y-3">
                          {oponentesAtivos.map((conflito) => (
                            <div
                              key={conflito.id}
                              className="rounded-xl border border-slate-200 p-3"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {conflito.tipo ?? "Sem classificacao"} •{" "}
                                {conflito.adversario?.nome ?? "Oponente desconhecido"}
                              </p>
                              {conflito.adversario?.faccao && (
                                <p className="text-xs text-slate-500">
                                  Faccao: {conflito.adversario.faccao}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Em aberto desde {formatDate(conflito.criadoEm)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4">
                      <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                        Alertas registrados
                      </h3>
                      {relatorio.alertas.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum alerta cadastrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {relatorio.alertas.map((alerta) => (
                            <div
                              key={alerta.id}
                              className="rounded-xl border border-slate-200 p-3"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  Nivel {alerta.nivelRisco ?? "Nao informado"} •{" "}
                                  {formatDate(alerta.criadoEm)}
                                </span>
                                {alerta.desativadoEm && (
                                  <span>Encerrado {formatDate(alerta.desativadoEm)}</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {alerta.tipo ?? "Tipo nao informado"}
                              </p>
                              <p className="text-sm text-slate-600">{alerta.descricao}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                      <h3 className="text-sm font-semibold uppercase text-indigo-700">
                        Faccoes adversarias e aliancas fortes
                      </h3>
                      {detalhesFaccoes.length === 0 ? (
                        <p className="mt-2 text-sm text-indigo-900">
                          Nao ha faccoes rivais identificadas nos registros consultados.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {detalhesFaccoes.map((item) => (
                            <div
                              key={item.nome}
                              className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm"
                            >
                              <p className="text-sm font-semibold text-indigo-900">
                                {item.nome}{" "}
                                {item.interna && (
                                  <span className="ml-1 inline-flex rounded-full bg-rose-100 px-2 text-xs font-bold uppercase text-rose-700">
                                    Conflito interno
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-indigo-700">
                                Adversarios diretos: {item.adversarios.join(", ")}
                              </p>
                              <ul className="mt-2 space-y-1 pl-4 text-xs text-indigo-800">
                                {item.contextos.map((contexto, idx) => (
                                  <li key={idx} className="list-disc">
                                    <span className="font-semibold uppercase text-indigo-900">
                                      {contexto.titulo}
                                    </span>
                                    : {contexto.detalhe}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <h3 className="text-sm font-semibold uppercase text-amber-700">
                        Casas e alojamentos impactados
                      </h3>
                      {alojamentosImpactados.length === 0 ? (
                        <p className="mt-2 text-sm text-amber-900">
                          Nao foram citados alojamentos rivais que ampliem o risco imediato.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {alojamentosImpactados.map((item) => (
                            <div
                              key={item.local}
                              className="rounded-xl border border-amber-100 bg-white/90 p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs text-amber-700">
                                <span className="font-semibold text-amber-900">
                                  {item.local}
                                </span>
                                <span>Ultimo registro: {formatDate(item.ultimaData)}</span>
                              </div>
                              <p className="text-sm text-slate-700">
                                Ocupado por: {item.adversarios.join(", ")}
                              </p>
                              <p className="text-xs text-slate-500">
                                Faccoes presentes:{" "}
                                {item.faccoes.length ? item.faccoes.join(", ") : "Nao informadas"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Tipos de conflito:{" "}
                                {item.tipos.length ? item.tipos.join(", ") : "Nao classificados"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
                      <h3 className="text-sm font-semibold uppercase text-purple-700">
                        Narrativa consolidada dos conflitos
                      </h3>
                      {conflitosAgrupados.length === 0 ? (
                        <p className="mt-2 text-sm text-purple-900">
                          Historico nao encontrado para o periodo analisado.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {conflitosAgrupados.map((grupo, index) => (
                            <div
                              key={grupo.id}
                              className="rounded-xl border border-purple-100 bg-white/90 p-4 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-purple-700">
                                <span>
                                  {index + 1}. {formatarRotuloConflito(grupo)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {grupo.tipo ?? "Conflito sem classificacao"}
                              </p>
                              {grupo.adversarios.length > 0 && (
                                <p className="text-xs text-slate-600">
                                  Adversarios:{" "}
                                  {grupo.adversarios
                                    .map((adv) =>
                                      adv.faccao ? `${adv.nome} (${adv.faccao})` : adv.nome
                                    )
                                    .join(", ")}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Status registrados: {grupo.status.join(", ")}
                              </p>
                              <p className="mt-2 text-sm text-slate-700">
                                {grupo.descricao ?? "Descricao nao informada."}
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
                  <div className="text-sm text-slate-500">
                    <p>
                      Ultimo conflito: {formatDate(relatorio.metricas.ultimaOcorrenciaConflito)}
                    </p>
                    <p>
                      Ultimo alerta grave:{" "}
                      {formatDate(relatorio.metricas.ultimaOcorrenciaAlertaGrave)}
                    </p>
                  </div>
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
