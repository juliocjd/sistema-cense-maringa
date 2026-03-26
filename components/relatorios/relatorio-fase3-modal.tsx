"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Search,
  Shield,
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

type ConflitoResumo = {
  id: string;
  tipo: string | null;
  status: string | null;
  descricao: string | null;
  criadoEm: string | null;
  resolvidoEm: string | null;
  lado: "LADO_1" | "LADO_2";
  adversario: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
    alojamento: string | null;
  } | null;
};

type AlertaResumo = {
  id: string;
  tipo: string | null;
  tipoLabel: string;
  descricao: string;
  nivel: string | null;
  criadoEm: string;
  encerradoEm: string | null;
};

type AlertaFugaResumo = {
  id: string;
  ativo: boolean;
  criadoEm: string;
  encerradoEm: string | null;
  descricao: string;
  nivel: string | null;
};

type Casa08Ocupante = {
  alojamentoId: string;
  numero: string | null;
  lado: string | null;
  adolescente: {
    id: string;
    nome: string;
    status: string | null;
    faccao: string | null;
  };
  conflitos: ConflitoResumo[];
};

type RelatorioFase3Response = {
  adolescente: {
    id: string;
    nome: string;
    numeroSms: string | null;
    status: string;
    faccao: string | null;
    fase: string | null;
    alojamentoAtual: string | null;
    riscoFuga: string | null;
  };
  casa08: {
    nome: string | null;
    numero?: number | null;
    etiqueta?: string | null;
    riscoMaximoPermitido?: number | null;
    ocupantes: Casa08Ocupante[];
  };
  protocoloRiscoSuicidio?: {
    ativo: boolean;
    nivelAtual: string | null;
    ultimaEntrada: { data: string; descricao: string | null } | null;
    ultimaAlta: { data: string; descricao: string | null } | null;
  } | null;
  conflitosCasa08: ConflitoResumo[];
  conflitosOutros: ConflitoResumo[];
  conflitos: ConflitoResumo[];
  alertas: {
    ativos: AlertaResumo[];
    historico: AlertaResumo[];
    fuga: AlertaFugaResumo[];
  };
  riscoFugaOrigem: {
    descricao: string;
    registradoEm: string | null;
    referenciaTipo: string | null;
    referenciaId: string | null;
  } | null;
  avaliacao: {
    apto: boolean;
    impeditivos: string[];
    observacoes: string[];
  };
};

const formatarData = (valor?: string | null) => {
  if (!valor) return "Nao informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatarListaCelula = (itens: string[], fallback: string) =>
  itens.length ? itens.join("\n") : fallback;

const StatusPill = ({ ativo }: { ativo: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${
      ativo
        ? "bg-red-100 text-red-700 border border-red-200"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
    }`}
  >
    {ativo ? "Ativo" : "Encerrado"}
  </span>
);

export function RelatorioFase3ModalTrigger() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<AdolescenteResultado[]>([]);
  const [selecionado, setSelecionado] = useState<AdolescenteResultado | null>(
    null,
  );
  const [analise, setAnalise] = useState<RelatorioFase3Response | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const conflitosOutros = analise?.conflitosOutros ?? [];
  const nomeCasa = analise?.casa08?.nome ?? "Casa de fase";
  const etiquetaCasa =
    analise?.casa08?.etiqueta ?? analise?.adolescente?.fase ?? "Fase exclusiva";

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
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [aberto, busca]);

  const resetar = () => {
    setResultados([]);
    setAnalise(null);
    setSelecionado(null);
    setBusca("");
    setErro(null);
  };

  const fechar = () => {
    setAberto(false);
    setTimeout(resetar, 300);
  };

  const carregarAnalise = async (adolescente: AdolescenteResultado) => {
    setCarregando(true);
    setErro(null);
    setAnalise(null);
    setSelecionado(adolescente);
    try {
      const response = await fetch(
        `/api/relatorios/adolescentes/${adolescente.id}/fase3`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao carregar avaliacao");
      }
      const json = (await response.json()) as RelatorioFase3Response;
      setAnalise({
        ...json,
        conflitosOutros: json.conflitosOutros ?? [],
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar dados",
      );
    } finally {
      setCarregando(false);
    }
  };

  const gerarPdf = () => {
    if (!analise) return;
    setBaixando(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Analise para ${nomeCasa} (${etiquetaCasa})`, 105, 18, {
        align: "center",
      });
      doc.setFontSize(11);
      const addLinhaRotuloValor = (
        rotulo: string,
        valor: string,
        y: number,
      ) => {
        doc.setFont("helvetica", "bold");
        doc.text(rotulo, 14, y);
        const valorX = 14 + doc.getTextWidth(rotulo) + 4;
        doc.setFont("helvetica", "normal");
        doc.text(valor, valorX, y);
      };
      addLinhaRotuloValor("Adolescente:", analise.adolescente.nome, 26);
      addLinhaRotuloValor("Status:", analise.adolescente.status, 32);
      addLinhaRotuloValor(
        "Fase atual:",
        analise.adolescente.fase ?? "Nao informada",
        38,
      );
      addLinhaRotuloValor(
        "Risco de fuga:",
        analise.adolescente.riscoFuga ?? "Nao informado",
        44,
      );
      let cursorY = 50;
      if (analise.adolescente.alojamentoAtual) {
        addLinhaRotuloValor(
          "Localizacao atual:",
          analise.adolescente.alojamentoAtual,
          50,
        );
        cursorY = 56;
      }

      const bullet = (texto: string) => `- ${texto}`;
      const larguraResumo = 174;
      const impeditivos =
        analise.avaliacao.impeditivos.length > 0
          ? analise.avaliacao.impeditivos
          : ["Sem impedimentos diretos detectados"];
      const observacoes =
        analise.avaliacao.observacoes.length > 0
          ? analise.avaliacao.observacoes
          : ["Sem observações complementares"];

      // Calcula altura dinamica do bloco para que o fundo cubra ate Observacoes.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const medirLinhas = (itens: string[]) =>
        itens.reduce(
          (total, item) =>
            total + doc.splitTextToSize(bullet(item), larguraResumo).length,
          0,
        );
      const linhasImpedimentos = medirLinhas(impeditivos);
      const linhasObservacoes = medirLinhas(observacoes);
      const alturaBase = 46;
      const alturaBloco =
        alturaBase + (linhasImpedimentos + linhasObservacoes) * 4.5;

      // Replica o resumo exibido no modal logo abaixo da localizacao atual.
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, cursorY, 182, alturaBloco, 3, 3, "FD");
      cursorY += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Resultado automatico", 105, cursorY, { align: "center" });
      cursorY += 6;

      const resultadoTitulo = analise.avaliacao.apto
        ? `Apto para ${nomeCasa}`
        : "Necessita avaliacao detalhada";
      doc.setFontSize(12);
      doc.text(resultadoTitulo, 18, cursorY);
      cursorY += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `${analise.adolescente.nome} · ${analise.adolescente.status}`,
        18,
        cursorY,
      );
      cursorY += 5;
      doc.text(
        `Fase atual: ${analise.adolescente.fase ?? "Nao informado"}`,
        18,
        cursorY,
      );
      cursorY += 7;

      doc.setFont("helvetica", "bold");
      doc.text("Impedimentos", 18, cursorY);
      cursorY += 5;
      doc.setFont("helvetica", "normal");
      impeditivos.forEach((item) => {
        const linhas = doc.splitTextToSize(bullet(item), larguraResumo);
        doc.text(linhas, 20, cursorY);
        cursorY += linhas.length * 4.5;
      });

      cursorY += 1;
      doc.setFont("helvetica", "bold");
      doc.text("Observacoes", 18, cursorY);
      cursorY += 5;
      doc.setFont("helvetica", "normal");
      observacoes.forEach((item) => {
        const linhas = doc.splitTextToSize(bullet(item), larguraResumo);
        doc.text(linhas, 20, cursorY);
        cursorY += linhas.length * 4.5;
      });

      let startY = cursorY + 4;
      if (analise.protocoloRiscoSuicidio) {
        const info = analise.protocoloRiscoSuicidio;
        const textosBase: string[] = [
          info.ativo
            ? `Protocolo ativo (nivel ${info.nivelAtual ?? "N/I"})`
            : "Protocolo sem alerta ativo atualmente",
        ];
        if (info.ultimaEntrada) {
          textosBase.push(
            `Ingresso em ${formatarData(info.ultimaEntrada.data)}${
              info.ultimaEntrada.descricao
                ? ` - ${info.ultimaEntrada.descricao}`
                : ""
            }`,
          );
        }
        if (info.ultimaAlta) {
          textosBase.push("");
          textosBase.push(
            `Alta medica em ${formatarData(info.ultimaAlta.data)}${
              info.ultimaAlta.descricao ? ` - ${info.ultimaAlta.descricao}` : ""
            }`,
          );
        }
        const textos = textosBase.flatMap((linha) =>
          doc.splitTextToSize(linha, 170),
        );
        const blocoAltura = 18 + textos.length * 5;
        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(244, 63, 94);
        doc.roundedRect(14, startY, 182, blocoAltura, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(190, 18, 60);
        doc.text("PROTOCOLO DE RISCO DE SUICÍDIO", 105, startY + 7, {
          align: "center" as const,
        });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        let linhaY = startY + 14;
        textos.forEach((linha) => {
          doc.text(linha, 20, linhaY);
          linhaY += 5;
        });
        doc.setTextColor(0, 0, 0);
        startY = startY + blocoAltura + 8;
      }

      autoTable(doc, {
        startY,
        head: [["Resultado", "Impedimentos", "Observacoes"]],
        body: [
          [
            analise.avaliacao.apto ? "Apto" : "Necessita avaliacao",
            formatarListaCelula(
              analise.avaliacao.impeditivos,
              "Nenhum impedimento direto",
            ),
            formatarListaCelula(
              analise.avaliacao.observacoes,
              "Sem observações adicionais",
            ),
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
      });

      const conflitosCasaOito =
        analise.conflitosCasa08.length > 0
          ? analise.conflitosCasa08.map((conflito) => [
              conflito.adversario?.nome ?? "Nao identificado",
              conflito.tipo ?? "Nao informado",
              conflito.status ?? "Desconhecido",
              formatarData(conflito.criadoEm),
              conflito.descricao ?? "-",
            ])
          : [["Nenhum conflito registrado", "-", "-", "-", "-"]];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [
          [
            `Conflitos com ${nomeCasa}`,
            "Tipo",
            "Status",
            "Registrado em",
            "Descricao",
          ],
        ],
        body: conflitosCasaOito,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241] },
      });

      const alertasAtivosBody = analise.alertas.ativos.length
        ? analise.alertas.ativos.map((alerta) => [
            alerta.tipoLabel,
            alerta.nivel ?? "Nao informado",
            formatarData(alerta.criadoEm),
            alerta.descricao,
          ])
        : [["Sem alertas ativos relevantes", "-", "-", "-"]];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Alertas graves ativos", "Nivel", "Criado em", "Descricao"]],
        body: alertasAtivosBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [249, 115, 22] },
      });

      const alertasHistoricoBody = analise.alertas.historico.length
        ? analise.alertas.historico.map((alerta) => [
            alerta.tipoLabel,
            alerta.nivel ?? "Nao informado",
            formatarData(alerta.criadoEm),
            formatarData(alerta.encerradoEm),
          ])
        : [["Sem historico registrado", "-", "-", "-"]];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [
          ["Alertas graves anteriores", "Nivel", "Criado em", "Encerrado em"],
        ],
        body: alertasHistoricoBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [148, 163, 184] },
      });

      const ocupantesBody = analise.casa08.ocupantes.length
        ? analise.casa08.ocupantes.map((ocupante) => [
            ocupante.adolescente.nome,
            ocupante.numero ? `Aloj. ${ocupante.numero}` : "-",
            ocupante.lado ?? "-",
            ocupante.adolescente.faccao ?? "Nao informada",
            ocupante.conflitos.length
              ? ocupante.conflitos
                  .map(
                    (conflito) =>
                      `${conflito.tipo ?? "Conflito"} (${conflito.status ?? "status?"})`,
                  )
                  .join("\n")
              : "Sem conflito direto",
          ])
        : [["Nenhum ocupante ativo encontrado", "-", "-", "-", "-"]];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [
          [
            `Ocupante ${nomeCasa}`,
            "Alojamento",
            "Lado",
            "Faccao",
            "Conflitos com avaliado",
          ],
        ],
        body: ocupantesBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      const conflitosOutrosAtual = analise.conflitosOutros ?? [];
      const conflitosOutrosBody = conflitosOutrosAtual.length
        ? conflitosOutrosAtual.map((conflito) => [
            conflito.adversario?.nome ?? "Nao identificado",
            conflito.tipo ?? "Nao informado",
            conflito.adversario?.alojamento ?? "Nao informado",
            formatarData(conflito.criadoEm),
          ])
        : [[`Sem conflitos ativos fora de ${nomeCasa}`, "-", "-", "-"]];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [
          [
            "Outros adversarios",
            "Tipo",
            "Alojamento adversario",
            "Registrado em",
          ],
        ],
        body: conflitosOutrosBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [220, 38, 38] },
      });

      doc.save(
        `relatorio-fase3-${analise.adolescente.nome.replace(/\s+/g, "-")}.pdf`,
      );
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        Abrir relatorio
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-indigo-600">
                  {nomeCasa} - {etiquetaCasa}
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  Analise de compatibilidade
                </h2>
                <p className="text-sm text-gray-600">
                  {`Verifique se o adolescente pode ingressar em ${nomeCasa} sem gerar riscos.`}
                </p>
              </div>
              <button
                onClick={fechar}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Buscar adolescente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Nome, SMS ou apelido..."
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-10 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                {busca.length > 1 && resultados.length > 0 && (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/70 p-2">
                    {resultados.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => carregarAnalise(item)}
                        className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left text-sm font-medium text-gray-800 transition hover:bg-indigo-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                          {(item.nome ?? "?").charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.nome}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.numeroSms
                              ? `SMS ${item.numeroSms}`
                              : "SMS nao informado"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {carregando && (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando dados...
                </div>
              )}

              {erro && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              {analise && (
                <div className="space-y-5">
                  <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        Resultado automatico
                      </p>
                      <h3
                        className={`text-xl font-bold ${
                          analise.avaliacao.apto
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {analise.avaliacao.apto
                          ? `Apto para ${nomeCasa}`
                          : "Necessita avaliacao detalhada"}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {analise.adolescente.nome} ·{" "}
                        {analise.adolescente.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        Fase atual:{" "}
                        {analise.adolescente.fase ?? "Nao informada"}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div>
                        <p className="font-semibold text-gray-600">
                          Impedimentos
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
                          {analise.avaliacao.impeditivos.length ? (
                            analise.avaliacao.impeditivos.map((item) => (
                              <li key={item}>{item}</li>
                            ))
                          ) : (
                            <li>Sem impedimentos diretos detectados</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-600">
                          Observacoes
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
                          {analise.avaliacao.observacoes.length ? (
                            analise.avaliacao.observacoes.map((item) => (
                              <li key={item}>{item}</li>
                            ))
                          ) : (
                            <li>Sem observações complementares</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {analise.protocoloRiscoSuicidio && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5 text-sm text-rose-900">
                      <p className="text-base font-semibold text-rose-800">
                        Protocolo de risco de suicídio
                      </p>
                      <p className="text-xs">
                        {analise.protocoloRiscoSuicidio.ativo
                          ? `Ativo (nivel ${analise.protocoloRiscoSuicidio.nivelAtual ?? "N/I"})`
                          : "Sem protocolo ativo"}
                      </p>
                      {analise.protocoloRiscoSuicidio.ultimaEntrada && (
                        <p className="text-xs">
                          Inserido em{" "}
                          {formatarData(
                            analise.protocoloRiscoSuicidio.ultimaEntrada.data,
                          )}
                          {analise.protocoloRiscoSuicidio.ultimaEntrada
                            .descricao
                            ? ` — ${analise.protocoloRiscoSuicidio.ultimaEntrada.descricao}`
                            : ""}
                        </p>
                      )}
                      {analise.protocoloRiscoSuicidio.ultimaAlta && (
                        <p className="text-xs">
                          Alta medica em{" "}
                          {formatarData(
                            analise.protocoloRiscoSuicidio.ultimaAlta.data,
                          )}
                          {analise.protocoloRiscoSuicidio.ultimaAlta.descricao
                            ? ` — ${analise.protocoloRiscoSuicidio.ultimaAlta.descricao}`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-indigo-50/60 p-5">
                    <div className="flex items-center gap-2">
                      <Shield className="text-indigo-600" size={20} />
                      <h4 className="text-base font-semibold text-indigo-800">
                        Conflitos com ocupantes
                      </h4>
                    </div>
                    {analise.conflitosCasa08.length === 0 ? (
                      <p className="text-sm text-gray-700">
                        {`Nao ha conflitos registrados com internos atualmente em ${nomeCasa}.`}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {analise.conflitosCasa08.map((conflito) => (
                          <div
                            key={conflito.id}
                            className="rounded-xl border border-indigo-100 bg-white/80 p-3 text-sm"
                          >
                            <p className="font-semibold text-gray-900">
                              {conflito.adversario?.nome ??
                                "Adolescente nao identificado"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conflito.adversario?.alojamento ??
                                "Local nao informado"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                                {conflito.tipo ?? "Tipo nao informado"}
                              </span>
                              <StatusPill
                                ativo={
                                  (conflito.status ?? "").toUpperCase() ===
                                  "ATIVO"
                                }
                              />
                              <span className="text-gray-500">
                                Registrado em {formatarData(conflito.criadoEm)}
                              </span>
                            </div>
                            {conflito.descricao && (
                              <p className="mt-2 text-xs text-gray-600">
                                {conflito.descricao}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {conflitosOutros.length > 0 && (
                    <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50/70 p-5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        <h4 className="text-base font-semibold text-red-800">
                          Outros conflitos internos ativos
                        </h4>
                      </div>
                      <p className="text-sm text-gray-700">
                        {`Mesmo fora de ${nomeCasa}, estes conflitos demonstram dificuldades de convivencia que podem repercutir na fase exclusiva.`}


                      </p>
                      <div className="space-y-2">
                        {conflitosOutros.map((conflito) => (
                          <div
                            key={conflito.id}
                            className="rounded-xl border border-red-100 bg-white/90 p-3 text-sm"
                          >
                            <p className="font-semibold text-gray-900">
                              {conflito.adversario?.nome ??
                                "Adversario nao identificado"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conflito.adversario?.alojamento ??
                                "Local nao informado"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                                {conflito.tipo ?? "Conflito"}
                              </span>
                              <span className="text-gray-600">
                                Desde {formatarData(conflito.criadoEm)}
                              </span>
                            </div>
                            {conflito.descricao && (
                              <p className="mt-2 text-xs text-gray-600">
                                {conflito.descricao}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-orange-500" size={20} />
                      <h4 className="text-base font-semibold text-orange-700">
                        Alertas relevantes
                      </h4>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                        <p className="text-xs font-semibold uppercase text-orange-600">
                          Ativos
                        </p>
                        {analise.alertas.ativos.length === 0 ? (
                          <p className="text-sm text-gray-600">
                            Nenhum alerta grave ativo detectado.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm text-gray-800">
                            {analise.alertas.ativos.map((alerta) => (
                              <li
                                key={alerta.id}
                                className="rounded-lg border border-orange-100 bg-white/90 p-2"
                              >
                                <p className="font-semibold">
                                  {alerta.tipoLabel}{" "}
                                  <span className="text-xs font-bold text-orange-600">
                                    [{alerta.nivel ?? "Nivel?"}]
                                  </span>
                                </p>
                                <p className="text-xs text-gray-600">
                                  Desde {formatarData(alerta.criadoEm)}
                                </p>
                                <p className="text-xs text-gray-700">
                                  {alerta.descricao}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase text-gray-600">
                          Historico
                        </p>
                        {analise.alertas.historico.length === 0 ? (
                          <p className="text-sm text-gray-600">
                            Sem alertas graves anteriores.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm text-gray-800">
                            {analise.alertas.historico.map((alerta) => (
                              <li
                                key={alerta.id}
                                className="rounded-lg border border-gray-200 bg-white p-2"
                              >
                                <p className="font-semibold">
                                  {alerta.tipoLabel}{" "}
                                  <span className="text-xs font-bold text-gray-500">
                                    [{alerta.nivel ?? "Nivel?"}]
                                  </span>
                                </p>
                                <p className="text-xs text-gray-600">
                                  {formatarData(alerta.criadoEm)} →{" "}
                                  {formatarData(alerta.encerradoEm)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {analise.alertas.fuga.length > 0 && (
                      <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm text-red-700">
                        <p className="font-semibold text-red-800">
                          Alertas de Fuga / Evasao
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-xs">
                          {analise.alertas.fuga.map((alerta) => (
                            <li key={alerta.id}>
                              {alerta.ativo ? "Ativo" : "Resolvido"} ·{" "}
                              {formatarData(alerta.criadoEm)} ·{" "}
                              {alerta.descricao}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <User className="text-indigo-500" size={20} />
                      <h4 className="text-base font-semibold text-indigo-900">
                        Ocupantes atuais
                      </h4>
                    </div>
                    {analise.casa08.ocupantes.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        {`Nenhum adolescente ativo em ${nomeCasa} para confronto.`}
                      </p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {analise.casa08.ocupantes.map((ocupante) => (
                          <div
                            key={ocupante.adolescente.id}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800"
                          >
                            <p className="font-semibold text-gray-900">
                              {ocupante.adolescente.nome}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ocupante.numero
                                ? `Alojamento ${ocupante.numero}`
                                : "Alojamento nao informado"}
                              {ocupante.lado ? ` · ${ocupante.lado}` : ""}
                            </p>
                            <p className="text-xs text-gray-500">
                              Facção:{" "}
                              {ocupante.adolescente.faccao ?? "Nao informada"}
                            </p>
                            {ocupante.conflitos.length > 0 ? (
                              <ul className="mt-2 list-disc pl-4 text-xs text-red-600">
                                {ocupante.conflitos.map((conflito) => (
                                  <li key={conflito.id}>
                                    {conflito.tipo ?? "Conflito"} ·{" "}
                                    {conflito.status ?? "status?"}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">
                                Sem conflitos diretos registrados
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                    <h4 className="text-base font-semibold text-amber-800">
                      Risco de fuga
                    </h4>
                    <p className="text-sm text-gray-700">
                      Nivel atual:{" "}
                      <span className="font-semibold">
                        {analise.adolescente.riscoFuga ?? "Nao informado"}
                      </span>
                    </p>
                    {analise.riscoFugaOrigem && (
                      <div className="rounded-lg border border-amber-100 bg-white/80 p-3 text-xs text-gray-700">
                        <p>
                          <span className="font-semibold">Origem:</span>{" "}
                          {analise.riscoFugaOrigem.descricao}
                        </p>
                        {analise.riscoFugaOrigem.registradoEm && (
                          <p>
                            <span className="font-semibold">
                              Registrado em:
                            </span>{" "}
                            {formatarData(analise.riscoFugaOrigem.registradoEm)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selecionado && !carregando && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center text-sm text-gray-500">
                  Busque um adolescente para iniciar a avaliacao.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={fechar}
                className="rounded-xl border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
              >
                Fechar
              </button>
              <div className="flex gap-3">
                {analise && (
                  <button
                    onClick={gerarPdf}
                    disabled={baixando}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileText size={16} />
                    {baixando ? "Gerando..." : "Gerar PDF"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
