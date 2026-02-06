"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Lock, Activity, Shield } from "lucide-react";
import { ModalAlocacao } from "./modal-alocacao";
import ModalAlojamentoDetalhes from "./modal-alojamento-detalhes";
import type { Alojamento, Casa, Adolescente } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type AdolescenteRisco,
  type AlojamentoRisco,
  type CasaRisco,
  type ResultadoRisco,
} from "@/lib/riscos/calcular";

type AvaliacaoAmbiental = {
  ativo: boolean;
  nivel: number;
  motivos: string[];
};

type AvaliacaoRiscoAlojamento = ResultadoRisco & {
  corClass: string;
};

interface MapaInterativoProps {
  casas: Casa[];
  adolescentes: Adolescente[];
  avaliacoes?: Record<string, ResultadoRisco>;
  conflitosExternos?: Record<string, ImpactoConflitoExterno[]>;
  onAlocar: (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string,
    motivoTransferencia?: string,
    motivoTransferenciaObrigatorio?: boolean
  ) => Promise<void>;
  onDesalocar: (
    alojamentoId: string,
    adolescenteId: string,
    motivo?: string
  ) => Promise<string>;
  onDesinternar: (adolescenteId: string) => Promise<void>;
  onTransferir: (
    adolescente: Adolescente,
    destinoAlojamentoId: string,
    justificativa?: string,
    motivoOperador?: string,
    motivoObrigatorio?: boolean
  ) => Promise<void>;
  onAlterarStatusAlojamento: (
    alojamentoId: string,
    status: "LIVRE" | "INTERDITADO",
    justificativa: string,
    documentoTipo: "CI" | "DECISAO_JUDICIAL" | "OUTRO",
    documentoReferencia: string
  ) => Promise<void>;
}

const riscoClasses = {
  livre: "bg-gray-50 border-gray-300 hover:bg-gray-100",
  nivel1: "bg-green-100 border-green-400 shadow-lg shadow-green-200",
  nivel2: "bg-lime-100 border-lime-400 shadow-lg shadow-lime-200",
  nivel3: "bg-yellow-100 border-yellow-400 shadow-lg shadow-yellow-200",
  nivel4: "bg-orange-100 border-orange-400 shadow-lg shadow-orange-200",
  nivel5: "bg-red-100 border-red-400 shadow-lg shadow-red-200",
  interditado: "bg-gray-400 border-gray-600",
};

const classePorNivel: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: riscoClasses.livre,
  1: riscoClasses.nivel1,
  2: riscoClasses.nivel2,
  3: riscoClasses.nivel3,
  4: riscoClasses.nivel4,
  5: riscoClasses.nivel5,
};

const formatarLocalReferencia = (
  casa?: Pick<Casa, "nome"> | null,
  alojamento?: Pick<Alojamento, "numeroAlojamento" | "ala"> | null
) => {
  const partes: string[] = [];
  if (casa?.nome) {
    partes.push(casa.nome);
  }
  if (alojamento?.numeroAlojamento) {
    partes.push(`Aloj. ${alojamento.numeroAlojamento}`);
  }
  return partes.length > 0 ? partes.join(", ") : null;
};

const mapearAdolescenteRisco = (
  adolescente: Adolescente
): AdolescenteRisco => ({
  id: adolescente.id,
  nomeCompleto: adolescente.nomeCompleto,
  bairroOrigemId: adolescente.bairroOrigemId ?? null,
  faccaoGrupoId: adolescente.faccaoGrupoId ?? null,
  alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
  alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
  alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,
  alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes ?? null,
  alertaRiscoSuicidioNivel: adolescente.alertaRiscoSuicidioNivel ?? null,
  atoInfracionalVinculos:
    (adolescente.atoInfracionalVinculos ?? [])
      .map((item: any) => ({
        id: item?.id ?? item?.vinculoId ?? item?.vinculo?.id ?? "",
        descricao: item?.descricao ?? item?.vinculo?.descricao ?? null,
      }))
      .filter((item: any) => item.id),
  faccao: adolescente.faccao
    ? { id: adolescente.faccao.id ?? null, nome: adolescente.faccao.nome ?? null }
    : null,
  conflitosA: adolescente.conflitosA ?? [],
  conflitosB: adolescente.conflitosB ?? [],
});

export function MapaInterativo({
  casas,
  adolescentes,
  avaliacoes,
  conflitosExternos = {},
  onAlocar,
  onDesalocar,
  onDesinternar,
  onTransferir,
  onAlterarStatusAlojamento,
}: MapaInterativoProps) {
  const [modalAlocacaoAberto, setModalAlocacaoAberto] = useState(false);
  const [alojamentoSelecionado, setAlojamentoSelecionado] =
    useState<Alojamento | null>(null);
  const [modalDetalhes, setModalDetalhes] = useState<{
    aberto: boolean;
    alojamento: (Alojamento & { casa?: Casa }) | null;
    avaliacao: AvaliacaoRiscoAlojamento | null;
  }>({ aberto: false, alojamento: null, avaliacao: null });

  const fecharModalDetalhes = () =>
    setModalDetalhes({ aberto: false, alojamento: null, avaliacao: null });

  const abrirModalAlocacao = (alojamento: Alojamento & { casa?: Casa }) => {
    setAlojamentoSelecionado(alojamento);
    setModalAlocacaoAberto(true);
  };

  const adolescentesLookup = useMemo(() => {
    const mapa = new Map<string, Adolescente>();
    adolescentes.forEach((item) => {
      if (item?.id) {
        mapa.set(item.id, item);
      }
    });
    return mapa;
  }, [adolescentes]);

  const casasNormalizadas = useMemo(() => {
    return casas.map((casa) => ({
      ...casa,
      alojamentos: casa.alojamentos.map((alojamento) => {
        const lista = Array.isArray(alojamento.adolescentes)
          ? alojamento.adolescentes
          : [];
        const ocupante = lista[0];
        if (!ocupante) {
          return { ...alojamento, adolescentes: [] };
        }

        const detalhado = adolescentesLookup.get(ocupante.id) ?? ocupante;
        return {
          ...alojamento,
          adolescentes: [detalhado],
        };
      }),
    }));
  }, [casas, adolescentesLookup]);

  const casasParaCalculo = useMemo<CasaRisco[]>(
    () =>
      casasNormalizadas.map((casa) => ({
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((alojamento) => ({
          ...alojamento,
          adolescentes: (alojamento.adolescentes ?? []).map(mapearAdolescenteRisco),
        })),
      })),
    [casasNormalizadas]
  );

  const alojamentosPorId = useMemo(() => {
    const mapa = new Map<string, AlojamentoRisco>();
    casasParaCalculo.forEach((casa) => {
      casa.alojamentos.forEach((alojamento) => {
        mapa.set(alojamento.id, alojamento);
      });
    });
    return mapa;
  }, [casasParaCalculo]);

  const slotsPorAdolescente = useMemo(
    () => criarMapaSlots(casasParaCalculo),
    [casasParaCalculo]
  );

  const avaliarRiscoAlojamento = useCallback(
    (alojamento: Alojamento): AvaliacaoRiscoAlojamento => {
      const casaAtual =
        casasParaCalculo.find((casa) => casa.id === alojamento.casaId) ?? null;
      const alojamentoRisco =
        alojamentosPorId.get(alojamento.id) ??
        (alojamento as unknown as AlojamentoRisco);

      const resultadoBase =
        avaliacoes?.[alojamento.id] ??
        calcularRiscoAlojamento({
          alojamento: alojamentoRisco,
          casaAtual,
          casas: casasParaCalculo,
          slots: slotsPorAdolescente,
          conflitosExternos,
        });

      const nivelSeguro = Math.max(
        0,
        Math.min(5, Math.round(resultadoBase.nivel ?? 0))
      ) as 0 | 1 | 2 | 3 | 4 | 5;

      const corClass =
        resultadoBase.categoria === "INTERDITADO"
          ? riscoClasses.interditado
          : classePorNivel[nivelSeguro] ?? riscoClasses.livre;

      return {
        ...resultadoBase,
        corClass,
      };
    },
    [
      avaliacoes,
      casasParaCalculo,
      alojamentosPorId,
      slotsPorAdolescente,
      conflitosExternos,
    ]
  );

  function getIconesAlerta(alojamento: Alojamento) {
    const ocupante = alojamento.adolescentes[0];
    if (!ocupante) return null;

    return (
      <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
        {ocupante.alertaRiscoSuicidio && (
          <div className="bg-orange-500 rounded-full p-0.5">
            <AlertTriangle size={12} className="text-white" />
          </div>
        )}
        {ocupante.alertaPerfilMapeado && (
          <div className="bg-purple-500 rounded-full p-0.5">
            <Lock size={12} className="text-white" />
          </div>
        )}
        {ocupante.alertaSaudeConfidencial && (
          <div className="bg-blue-500 rounded-full p-0.5">
            <Activity size={12} className="text-white" />
          </div>
        )}
      </div>
    );
  }

  const getAlojamento = (casa: Casa, numero: string) => {
    return casa.alojamentos.find((a) => a.numeroAlojamento === numero);
  };

  const handleDesalocarDoDetalhe = async (
    alojamentoId: string,
    adolescenteId: string,
    motivo?: string
  ) => {
    try {
      const mensagem = await onDesalocar(alojamentoId, adolescenteId, motivo);
      alert(mensagem || "Adolescente removido do alojamento.");
      fecharModalDetalhes();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao remover adolescente:\n${errorMessage}`);
    }
  };

  const handleTransferirDoDetalhe = async (
    adolescente: Adolescente,
    destinoAlojamentoId: string,
    justificativa?: string,
    motivoOperador?: string,
    motivoObrigatorio?: boolean
  ) => {
    try {
      await onTransferir(
        adolescente,
        destinoAlojamentoId,
        justificativa,
        motivoOperador,
        motivoObrigatorio
      );
      fecharModalDetalhes();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao transferir adolescente:\n${errorMessage}`);
    }
  };

  const handleAlterarStatusDoDetalhe = async (
    alojamentoId: string,
    status: "LIVRE" | "INTERDITADO",
    justificativa: string,
    documentoTipo: "CI" | "DECISAO_JUDICIAL" | "OUTRO",
    documentoReferencia: string
  ) => {
    await onAlterarStatusAlojamento(
      alojamentoId,
      status,
      justificativa,
      documentoTipo,
      documentoReferencia
    );
  };

  const handleDesinternarDoDetalhe = async (adolescenteId: string) => {
    await onDesinternar(adolescenteId);
    fecharModalDetalhes();
  };

  const AlojamentoCard = ({ numero, casa }: { numero: string; casa: Casa }) => {
    const aloj = getAlojamento(casa, numero);
    if (!aloj) return null;

    const avaliacao = avaliarRiscoAlojamento(aloj);
    const ocupante = aloj.adolescentes[0];

    const nomeResumido =
      ocupante && ocupante.nomeCompleto
        ? (() => {
            const partes = ocupante.nomeCompleto.trim().split(/\s+/);
            const primeiro = partes[0];
            const ultimo = partes.length > 1 ? partes[partes.length - 1] : null;
            return { primeiro, ultimo };
          })()
        : null;

    const corClass = avaliacao.corClass;

    const handleClick = () => {
      setModalDetalhes({
        aberto: true,
        alojamento: { ...aloj, casa } as Alojamento & { casa?: Casa },
        avaliacao,
      });
    };

    return (
      <button
        onClick={handleClick}
        className={`${corClass} relative rounded-lg border-2 p-3 flex flex-col items-center justify-center hover:scale-105 transition-all group cursor-pointer`}
        title={
          aloj.statusManutencao === "INTERDITADO"
            ? "Alojamento Interditado"
            : ocupante
            ? `${ocupante.nomeCompleto} - Clique para visualizar detalhes`
            : "Clique para visualizar acoes e alocar"
        }
      >
        {getIconesAlerta(aloj)}
        <span className="font-bold text-xl text-gray-800">{numero}</span>
        {nomeResumido && (
          <div className="mt-1 px-1 text-[8px] sm:text-[11px] text-gray-800 font-semibold leading-tight text-center w-full flex flex-col items-center">
            <span className="w-full break-words whitespace-normal">{nomeResumido.primeiro}</span>
            {nomeResumido.ultimo && (
              <span className="text-slate-700 font-medium text-[7px] sm:text-[10px] w-full break-words whitespace-normal">
                {nomeResumido.ultimo}
              </span>
            )}
            {ocupante.faccao?.nome && (
              <span className="inline-flex items-center gap-1 text-[6.5px] sm:text-[9px] font-medium text-indigo-600 mt-0.5">
                <Shield size={8} className="flex-shrink-0" />
                <span className="truncate max-w-[60px] sm:max-w-full">
                  {ocupante.faccao.nome}
                </span>
              </span>
            )}
          </div>
        )}
        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 shadow-xl">
          {ocupante?.nomeCompleto || "Clique para alocar"}
        </div>
      </button>
    );
  };

  const CasaPadrao = ({ casa }: { casa: Casa }) => (
    <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-rose-600 hover:shadow-rose-200 transition-shadow">
      <div className="flex items-center justify-center mb-4 pb-3 border-b-2 border-rose-200">
        <h3 className="font-bold text-rose-700 text-lg">{casa.nome}</h3>
        {casa.isolada && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
            Isolada
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs font-bold text-orange-600 bg-orange-50 rounded-lg py-1 px-3">
            Ala B
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AlojamentoCard numero="08" casa={casa} />
            <AlojamentoCard numero="07" casa={casa} />
            <AlojamentoCard numero="09" casa={casa} />
            <AlojamentoCard numero="10" casa={casa} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs font-bold text-blue-600 bg-blue-50 rounded-lg py-1 px-3">
            Ala A
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AlojamentoCard numero="04" casa={casa} />
            <AlojamentoCard numero="03" casa={casa} />
            <AlojamentoCard numero="05" casa={casa} />
            <AlojamentoCard numero="02" casa={casa} />
            <AlojamentoCard numero="06" casa={casa} />
            <AlojamentoCard numero="01" casa={casa} />
          </div>
        </div>
      </div>
    </div>
  );

  const CasaFaseTres = ({ casa }: { casa: Casa }) => {
    const ordenar = [...casa.alojamentos].sort((a, b) => {
      const toNumber = (valor: string) =>
        parseInt(valor.replace(/\D/g, ""), 10) || Number.MAX_SAFE_INTEGER;
      return toNumber(a.numeroAlojamento) - toNumber(b.numeroAlojamento);
    });

    const ladoDireito = ordenar.filter((aloj) => {
      const numero = parseInt(aloj.numeroAlojamento.replace(/\D/g, ""), 10);
      return numero >= 1 && numero <= 4;
    });
    const ladoEsquerdo = ordenar.filter((aloj) => {
      const numero = parseInt(aloj.numeroAlojamento.replace(/\D/g, ""), 10);
      return numero > 4 || isNaN(numero);
    });

    const renderColuna = (
      lista: typeof ordenar,
      titulo: string,
      alinhamento: "left" | "right"
    ) => (
      <div className="flex-1 flex flex-col gap-2">
        <div
          className={`text-xs font-bold ${
            alinhamento === "left"
              ? "text-indigo-600"
              : "text-orange-600 text-right"
          }`}
        >
          {titulo}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {lista.slice(0, 4).map((aloj) => (
            <AlojamentoCard
              key={aloj.id}
              numero={aloj.numeroAlojamento}
              casa={casa}
            />
          ))}
        </div>
      </div>
    );

    return (
      <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-indigo-600 hover:shadow-indigo-200 transition-shadow">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-indigo-200">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-indigo-700 text-lg">{casa.nome}</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold">
              Fase 3
            </span>
          </div>
          {casa.isolada && (
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
              Isolada
            </span>
          )}
        </div>
        <div className="flex gap-4">
          {renderColuna(ladoEsquerdo, "Lado esquerdo", "left")}
          {renderColuna(ladoDireito, "Lado direito", "right")}
        </div>
      </div>
    );
  };

  const casa01 = casasNormalizadas.find((c) => c.numero === 1);
  const casa02 = casasNormalizadas.find((c) => c.numero === 2);
  const casa03 = casasNormalizadas.find((c) => c.numero === 3);
  const casa04 = casasNormalizadas.find((c) => c.numero === 4);
  const casa05 = casasNormalizadas.find((c) => c.numero === 5);
  const casa06 = casasNormalizadas.find((c) => c.numero === 6);
  const casa07 = casasNormalizadas.find((c) => c.numero === 7);
  const casa08 = casasNormalizadas.find((c) => c.numero === 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow p-4 border border-gray-200 text-xs">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800 leading-tight">
                  Legenda de risco (niveis 0 a 5)
                </p>
                <p className="text-[11px] text-slate-500">
                  Use as cores para priorizar intervencoes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-red-100 border border-red-400"></span>
                  <span>Nivel 5</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-orange-100 border border-orange-400"></span>
                  <span>Nivel 4</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-yellow-100 border border-yellow-400"></span>
                  <span>Nivel 3</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-lime-100 border border-lime-400"></span>
                  <span>Nivel 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-green-100 border border-green-400"></span>
                  <span>Nivel 1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-gray-100 border border-gray-300"></span>
                  <span>Livre / desocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-gray-400 border border-gray-600"></span>
                  <span>Interditado</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <div className="flex items-center gap-1">
                <span className="bg-orange-500 rounded-full p-1">
                  <AlertTriangle size={12} className="text-white" />
                </span>
                Risco de suicidio
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-purple-500 rounded-full p-1">
                  <Lock size={12} className="text-white" />
                </span>
                Perfil mapeado
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-blue-500 rounded-full p-1">
                  <Activity size={12} className="text-white" />
                </span>
                Alerta de saude
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <div className="flex flex-col gap-6">
            {casa01 && <CasaPadrao casa={casa01} />}
            {casa02 && <CasaPadrao casa={casa02} />}
            {casa03 && <CasaPadrao casa={casa03} />}
          </div>
          <div className="flex flex-col gap-6">
            {casa08 && (
              <CasaFaseTres casa={casa08} />
            )}
            <div className="flex-1"></div>
            {casa04 && <CasaPadrao casa={casa04} />}
          </div>
          <div className="flex flex-col gap-6">
            {casa07 && <CasaPadrao casa={casa07} />}
            {casa06 && <CasaPadrao casa={casa06} />}
            {casa05 && <CasaPadrao casa={casa05} />}
          </div>
        </div>
      </div>

      <ModalAlojamentoDetalhes
        isOpen={modalDetalhes.aberto}
        alojamento={modalDetalhes.alojamento}
        avaliacaoRisco={modalDetalhes.avaliacao}
        onClose={fecharModalDetalhes}
        casas={casasNormalizadas}
        conflitosExternos={conflitosExternos}
        onDesalocar={handleDesalocarDoDetalhe}
        onDesinternar={handleDesinternarDoDetalhe}
        onTransferir={handleTransferirDoDetalhe}
        onSolicitarAlocacao={() => {
          if (modalDetalhes.alojamento) {
            abrirModalAlocacao(modalDetalhes.alojamento as Alojamento & { casa?: Casa });
          }
        }}
        onInterditar={(alojamentoId, justificativa, documentoTipo, documentoReferencia) =>
          handleAlterarStatusDoDetalhe(
            alojamentoId,
            "INTERDITADO",
            justificativa,
            documentoTipo,
            documentoReferencia
          )
        }
        onLiberarInterdicao={(alojamentoId, justificativa, documentoTipo, documentoReferencia) =>
          handleAlterarStatusDoDetalhe(
            alojamentoId,
            "LIVRE",
            justificativa,
            documentoTipo,
            documentoReferencia
          )
        }
      />

      <ModalAlocacao
        isOpen={modalAlocacaoAberto}
        onClose={() => {
          setModalAlocacaoAberto(false);
          setAlojamentoSelecionado(null);
        }}
        alojamento={alojamentoSelecionado}
        adolescentes={adolescentes}
        onAlocar={onAlocar}
      />
    </div>
  );
}
