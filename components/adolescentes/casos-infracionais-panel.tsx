"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import type { Adolescente } from "@/types";
import {
  listarResumoTipificacoes,
  type CasoInfracionalNormalizado,
  normalizarCasoInfracional,
  obterCasoAtual,
  obterCasosHistoricos,
  obterTituloCaso,
} from "@/lib/adolescentes/casos-infracionais";

type Props = {
  adolescente: Adolescente;
  titulo?: string;
  descricao?: string;
  modo?: "painel" | "pagina";
  showLinkPagina?: boolean;
};

type CasoItem = NonNullable<Adolescente["casosInfracionais"]>[number];

const truncarTexto = (texto: string, limite = 320) => {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite).trim()}...`;
};

export function CasosInfracionaisPanel({
  adolescente,
  titulo = "Casos Infracionais",
  descricao,
  modo = "painel",
  showLinkPagina = false,
}: Props) {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const isCasoNormalizado = (
    caso: ReturnType<typeof normalizarCasoInfracional<CasoItem>>,
  ): caso is CasoItem & CasoInfracionalNormalizado =>
    Boolean(caso);

  const casos = (adolescente.casosInfracionais ?? [])
    .map((caso) => normalizarCasoInfracional(caso))
    .filter(isCasoNormalizado);
  const casoAtual =
    normalizarCasoInfracional(adolescente.casoInfracionalAtual) ??
    obterCasoAtual(casos) ??
    null;
  const casosHistoricos = obterCasosHistoricos(casos, casoAtual?.id ?? null);
  const fallbackHistorico = adolescente.historicoInfracional ?? [];
  const possuiEstruturado = casos.length > 0;

  const toggleExpandido = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resumoAtual = useMemo(() => {
    if (!casoAtual) return null;
    return {
      titulo: obterTituloCaso(casoAtual) ?? "Caso atual",
      processo: casoAtual.numeroProcesso ?? null,
      ano: casoAtual.anoFato ?? null,
      comarca: casoAtual.comarca ?? null,
      narrativa: casoAtual.narrativa ?? null,
      tipificacoes: listarResumoTipificacoes(casoAtual),
    };
  }, [casoAtual]);

  const renderCaso = (
    caso: NonNullable<typeof casoAtual>,
    chaveBase: string,
    fallbackTitulo: string,
  ) => {
    const expandido = Boolean(expandidos[chaveBase]);
    const narrativa = caso.narrativa ?? "";
    const tipificacoes = listarResumoTipificacoes(caso);
    const temNarrativaLonga = narrativa.length > 320;

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {caso.status ?? "ATUAL"}
          </span>
          <p className="font-semibold text-slate-900">
            {obterTituloCaso(caso) ?? fallbackTitulo}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Processo: {caso.numeroProcesso || "-"} | Ano: {caso.anoFato ?? "-"}
          {caso.comarca ? ` | Comarca: ${caso.comarca}` : ""}
        </p>
        {tipificacoes.length > 0 && (
          <p className="mt-2 text-sm text-slate-700">
            {tipificacoes.join(" | ")}
          </p>
        )}
        {narrativa && (
          <div className="mt-3">
            <p className="whitespace-pre-line text-sm text-slate-700">
              {expandido ? narrativa : truncarTexto(narrativa)}
            </p>
            {temNarrativaLonga && (
              <button
                type="button"
                onClick={() => toggleExpandido(chaveBase)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-600"
              >
                {expandido ? (
                  <>
                    <ChevronUp size={14} />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Expandir
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={modo === "pagina" ? "space-y-6" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
          {descricao && (
            <p className="mt-1 text-sm text-slate-600">{descricao}</p>
          )}
        </div>
        {showLinkPagina && (
          <Link
            href={`/adolescentes/${adolescente.id}/casos-infracionais`}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <ExternalLink size={16} />
            Abrir tela completa
          </Link>
        )}
      </div>

      {possuiEstruturado ? (
        <div className="space-y-4">
          {resumoAtual &&
            casoAtual &&
            renderCaso(
              casoAtual,
              `caso-atual-${casoAtual.id ?? "sem-id"}`,
              "Caso atual",
            )}

          {casosHistoricos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Casos historicos
              </h3>
              {casosHistoricos.map((caso, indice) =>
                renderCaso(
                  caso,
                  `caso-historico-${caso.id ?? indice}`,
                  `Caso historico ${indice + 1}`,
                ),
              )}
            </div>
          )}
        </div>
      ) : fallbackHistorico.length > 0 ? (
        <div className="space-y-3">
          {fallbackHistorico.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border-l-4 border-slate-400 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-800">{item.descricao}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {item.comarca ?? item.unidadeInternacao ?? "-"} |{" "}
                {item.ano ?? "-"}
                {item.processo ? ` | Processo: ${item.processo}` : ""}
              </p>
              {item.observacoes && (
                <p className="mt-2 text-xs text-slate-600">{item.observacoes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-500">
          <FileText size={48} className="mx-auto mb-2 text-slate-400" />
          <p>Nenhum caso infracional registrado</p>
        </div>
      )}
    </div>
  );
}
