"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Home,
  Bed,
  AlertCircle,
  User,
  Loader2,
  AlertTriangle,
  Lock,
  Activity,
  ChevronDown,
} from "lucide-react";
import { InicializarEstruturaButton } from "./inicializar-button";
import { ModalAlocacao } from "@/components/mapa/modal-alocacao";
import ModalAlojamentoDetalhes from "@/components/mapa/modal-alojamento-detalhes";
import { ModalAnaliseImpacto } from "@/components/estrutura/modal-analise-impacto";
import type {
  Casa,
  Alojamento,
  Adolescente as AdolescenteTipo,
} from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type ResultadoRisco,
} from "@/lib/riscos/calcular";

type VisaoGeralTabProps = {
  casas: Casa[];
  totalAlojamentos: number;
};

interface ModalDetalhesState {
  aberto: boolean;
  alojamento: (Alojamento & { casa?: Casa }) | null;
  avaliacao: (ResultadoRisco & { corClass: string }) | null;
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

const obterNomeResumido = (nome?: string | null) => {
  if (!nome) return null;
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : null;
  return { primeiro, ultimo };
};

const renderIconesAlerta = (
  alojamento: Alojamento,
  temConflitos: boolean,
  onClickConflito?: () => void,
  avaliacaoRisco?: { ambiental?: { ativo: boolean } | null }
): React.ReactElement | null => {
  const ocupante = alojamento.adolescentes?.[0];
  const temAliados = avaliacaoRisco?.ambiental?.ativo ?? false;

  if (!ocupante && !temAliados) return null;

  return (
    <div className="absolute -top-1 -right-1 z-10 flex gap-0.5">
      {ocupante?.alertaRiscoSuicidio && (
        <div className="rounded-full bg-orange-500 p-0.5" title="Risco de suicidio">
          <AlertTriangle size={10} className="text-white" />
        </div>
      )}
      {ocupante?.alertaPerfilMapeado && (
        <div className="rounded-full bg-purple-500 p-0.5" title="Perfil mapeado">
          <Lock size={10} className="text-white" />
        </div>
      )}
      {ocupante?.alertaSaudeConfidencial && (
        <div className="rounded-full bg-blue-500 p-0.5" title="Alerta de saude">
          <Activity size={10} className="text-white" />
        </div>
      )}
      {temAliados && (
        <div
          className="rounded-full bg-amber-500/70 px-1.5 py-0.5 text-[8px] font-semibold text-white border border-amber-300"
          title="Aliados do rival na casa"
        >
          A
        </div>
      )}
      {/*
        REMOVIDO: Ícone vermelho de conflito
        As cores de nível de risco e os ícones específicos já indicam os conflitos.
      */}
    </div>
  );
};

export function VisaoGeralTab({ casas: casasIniciais, totalAlojamentos }: VisaoGeralTabProps) {
  const searchParams = useSearchParams();
  const casaNumeroFromUrl = searchParams.get("casa");
  const [casaHighlighted, setCasaHighlighted] = useState<number | null>(null);

  const [casas, setCasas] = useState<Casa[]>(casasIniciais ?? []);
  const [adolescentes, setAdolescentes] = useState<AdolescenteTipo[]>([]);
  const [conflitosExternos, setConflitosExternos] = useState<
    Record<string, ImpactoConflitoExterno[]>
  >({});
  const [conflitosInternos, setConflitosInternos] = useState<
    Record<string, Array<{ id: string; adversario: { id: string; nome: string } }>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalAlocacaoAberto, setModalAlocacaoAberto] = useState(false);
  const [alojamentoSelecionado, setAlojamentoSelecionado] = useState<
    (Alojamento & { casa?: Casa }) | null
  >(null);
  const [modalDetalhes, setModalDetalhes] = useState<ModalDetalhesState>({
    aberto: false,
    alojamento: null,
    avaliacao: null,
  });

  const [modalAnaliseImpacto, setModalAnaliseImpacto] = useState<{
    aberto: boolean;
    adolescenteId: string | null;
    adolescenteNome: string | null;
    adolescenteAlocado: boolean;
    conflitos: Array<{ id: string; adversario: { id: string; nome: string } }>;
  }>({
    aberto: false,
    adolescenteId: null,
    adolescenteNome: null,
    adolescenteAlocado: false,
    conflitos: [],
  });

  const [dropdownConflitosAberto, setDropdownConflitosAberto] = useState(false);

  const totalCasas = casas.length;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adolescentesResponse = await fetch("/api/adolescentes");
      if (!adolescentesResponse.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }
      const payload = await adolescentesResponse.json();
      const adolescentesData: AdolescenteTipo[] = Array.isArray(payload?.data)
        ? payload.data
        : [];
      setAdolescentes(adolescentesData);

      const casasResponse = await fetch("/api/casas/status");
      if (!casasResponse.ok) {
        throw new Error("Erro ao carregar dados das casas");
      }
      const casasData = await casasResponse.json();
      const casasFormatadas: Casa[] = casasData.casas.map((casa: any) => ({
        id: casa.id,
        numero: casa.numero,
        nome: casa.nome,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((aloj: any) => {
          const ocupanteBruto = aloj.ocupante;
          let adolescenteCompleto: AdolescenteTipo | null = null;
          if (ocupanteBruto) {
            adolescenteCompleto =
              adolescentesData.find((a) => a.id === ocupanteBruto.id) ?? null;
          }
          const adolescenteFallback =
            !adolescenteCompleto && ocupanteBruto
              ? ({
                  id: ocupanteBruto.id,
                  nomeCompleto: ocupanteBruto.nome_completo,
                  nomeSocial: ocupanteBruto.nome_social ?? undefined,
                  numeroSms: ocupanteBruto.numero_sms ?? undefined,
                  fotoUrl: ocupanteBruto.foto_url ?? null,
                  alojamentoAtualId: aloj.id,
                  statusUnidade: ocupanteBruto.status_unidade ?? "ATIVO",
                  atoInfracionalGravidade: Boolean(ocupanteBruto.ato_infracional_gravidade ?? false),
                  alertaRiscoSuicidio:
                    ocupanteBruto.alerta_risco_suicidio ?? false,
                  alertaPerfilMapeado:
                    ocupanteBruto.alerta_perfil_mapeado ?? false,
                  alertaSaudeConfidencial:
                    ocupanteBruto.alerta_saude_confidencial ?? false,
                  bairroOrigemId: ocupanteBruto.bairro_origem_id ?? null,
                  bairroOrigem: ocupanteBruto.bairro_origem
                    ? {
                        id: ocupanteBruto.bairro_origem.id,
                        nome:
                          ocupanteBruto.bairro_origem.nome ??
                          ocupanteBruto.bairro_origem.nomeBairro,
                        cidade: ocupanteBruto.bairro_origem.cidade,
                      }
                    : null,
                  faccaoGrupoId: ocupanteBruto.faccao_grupo_id ?? null,
                  faccao: ocupanteBruto.faccao
                    ? {
                        id: ocupanteBruto.faccao.id,
                        nome:
                          ocupanteBruto.faccao.nome ??
                          ocupanteBruto.faccao.nomeFaccao,
                      }
                    : null,
                  grupos: [],
                  tatuagens: [],
                  conflitosA: ocupanteBruto.conflitosA ?? [],
                  conflitosB: ocupanteBruto.conflitosB ?? [],
                  conflitosResolvidos: ocupanteBruto.conflitosResolvidos ?? [],
                  historicoInfracional: ocupanteBruto.historicoInfracional ?? [],
                } satisfies AdolescenteTipo)
              : null;

          const adolescenteParaMapa =
            adolescenteCompleto || adolescenteFallback;

          return {
            id: aloj.id,
            casaId: casa.id,
            numeroAlojamento: aloj.numero,
            ala: aloj.ala,
            statusManutencao: aloj.status_manutencao,
            alojamentoFrontalId: aloj.alojamento_frontal_id,
            corRisco: aloj.cor_risco,
            nivelRisco: aloj.nivel_risco,
            alertas: aloj.alertas ?? [],
            icones: aloj.icones ?? [],
            adolescentes: adolescenteParaMapa ? [adolescenteParaMapa] : [],
          } as Alojamento;
        }),
      }));
      setCasas(casasFormatadas);

      let impactos: Record<string, ImpactoConflitoExterno[]> = {};
      try {
        const impactosResponse = await fetch(
          "/api/inteligencia/conflitos/impacto?status=ATIVO"
        );
        if (impactosResponse.ok) {
          const impactosData = await impactosResponse.json();
          const lista: ImpactoConflitoExterno[] = Array.isArray(
            impactosData?.impactos
          )
            ? impactosData.impactos
            : [];
          impactos = lista.reduce((acc, impacto) => {
            const adolescenteId = impacto?.adolescente?.id;
            if (!adolescenteId) return acc;
            if (!acc[adolescenteId]) {
              acc[adolescenteId] = [];
            }
            acc[adolescenteId].push(impacto);
            return acc;
          }, {} as Record<string, ImpactoConflitoExterno[]>);
        }
      } catch (impactoErro) {
        console.warn("Falha ao carregar conflitos externos:", impactoErro);
      }
      setConflitosExternos(impactos);

      // Carregar conflitos internos
      let conflitosMap: Record<string, Array<{ id: string; adversario: { id: string; nome: string } }>> = {};
      try {
        const conflitosResponse = await fetch("/api/conflitos?status=ATIVO");
        if (conflitosResponse.ok) {
          const conflitosData = await conflitosResponse.json();
          if (Array.isArray(conflitosData)) {
            conflitosData.forEach((conflito: any) => {
              const adolescenteAId = conflito.adolescenteA?.id;
              const adolescenteBId = conflito.adolescenteB?.id;

              if (adolescenteAId) {
                if (!conflitosMap[adolescenteAId]) {
                  conflitosMap[adolescenteAId] = [];
                }
                conflitosMap[adolescenteAId].push({
                  id: conflito.id,
                  adversario: {
                    id: adolescenteBId,
                    nome: conflito.adolescenteB?.nome || "Desconhecido",
                  },
                });
              }

              if (adolescenteBId) {
                if (!conflitosMap[adolescenteBId]) {
                  conflitosMap[adolescenteBId] = [];
                }
                conflitosMap[adolescenteBId].push({
                  id: conflito.id,
                  adversario: {
                    id: adolescenteAId,
                    nome: conflito.adolescenteA?.nome || "Desconhecido",
                  },
                });
              }
            });
          }
        }
      } catch (conflitosErro) {
        console.warn("Falha ao carregar conflitos internos:", conflitosErro);
      }
      setConflitosInternos(conflitosMap);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setError(
        erro instanceof Error ? erro.message : "Erro ao carregar dados"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;

    const connect = () => {
      if (!active) return;
      eventSource = new EventSource("/api/mapa/events");
      eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (
            payload?.tipo === "alocacao" ||
            payload?.tipo === "desalocacao" ||
            payload?.tipo === "refresh"
          ) {
            carregarDados();
          }
        } catch {
          /* ignore */
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        if (active) {
          setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      active = false;
      eventSource?.close();
    };
  }, [carregarDados]);

  // Auto-scroll para casa específica quando vem da URL
  useEffect(() => {
    if (casaNumeroFromUrl && casas.length > 0) {
      const casaNumero = parseInt(casaNumeroFromUrl, 10);

      // Aguardar um pouco para garantir que o DOM foi renderizado
      setTimeout(() => {
        const elemento = document.getElementById(`casa-${casaNumero}`);
        if (elemento) {
          elemento.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

          // Adicionar highlight temporário
          setCasaHighlighted(casaNumero);

          // Remover highlight após 3 segundos
          setTimeout(() => {
            setCasaHighlighted(null);
          }, 3000);
        }
      }, 300);
    }
  }, [casaNumeroFromUrl, casas]);

  const adolescentesLookup = useMemo(() => {
    const mapa = new Map<string, AdolescenteTipo>();
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

  const slotsPorAdolescente = useMemo(
    () => criarMapaSlots(casasNormalizadas),
    [casasNormalizadas]
  );

  const avaliarRiscoAlojamento = useCallback(
    (alojamento: Alojamento) => {
      const resultado = calcularRiscoAlojamento({
        alojamento,
        casaAtual: casasNormalizadas.find((casa) => casa.id === alojamento.casaId),
        casas: casasNormalizadas,
        slots: slotsPorAdolescente,
        conflitosExternos,
      });

      const corClass =
        resultado.categoria === "INTERDITADO"
          ? riscoClasses.interditado
          : classePorNivel[resultado.nivel] ?? riscoClasses.livre;

      return {
        ...resultado,
        corClass,
      };
    },
    [casasNormalizadas, conflitosExternos, slotsPorAdolescente]
  );

  // Mapa de níveis de risco por adolescente (para filtrar dropdown)
  const riscosPorAdolescente = useMemo(() => {
    const mapa = new Map<string, number>();

    casasNormalizadas.forEach((casa) => {
      casa.alojamentos.forEach((aloj) => {
        const ocupante = aloj.adolescentes[0];
        if (ocupante) {
          const avaliacao = avaliarRiscoAlojamento(aloj);
          mapa.set(ocupante.id, avaliacao.nivel);
        }
      });
    });

    return mapa;
  }, [casasNormalizadas, avaliarRiscoAlojamento]);

  const abrirModalAlocacao = (alojamento: Alojamento & { casa?: Casa }) => {
    setAlojamentoSelecionado(alojamento);
    setModalAlocacaoAberto(true);
  };

  const fecharModalDetalhes = () =>
    setModalDetalhes({ aberto: false, alojamento: null, avaliacao: null });

  const handleCliqueAlojamento = (casa: Casa, alojamento: Alojamento) => {
    const avaliacao = avaliarRiscoAlojamento(alojamento);

    // Sempre abre o modal de detalhes (ocupado ou vazio)
    setModalDetalhes({
      aberto: true,
      alojamento: { ...alojamento, casa },
      avaliacao,
    });
  };

  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ) => {
    const response = await fetch("/api/alocar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adolescenteId,
        alojamentoId,
        justificativa,
        medidas_adicionais: [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.erro || "Erro ao alocar adolescente");
    }

    await response.json();
    setModalAlocacaoAberto(false);
    setAlojamentoSelecionado(null);
    await carregarDados();
  };

  const handleDesalocar = async (
    alojamentoId: string,
    adolescenteId: string,
    motivo?: string
  ): Promise<string> => {
    const response = await fetch("/api/alocar", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adolescenteId,
        alojamentoId,
        motivo: motivo ?? "Desalocacao manual via visao geral",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.erro || "Erro ao desalocar adolescente");
    }

    const data = await response.json();
    await carregarDados();
    return data.mensagem || "Adolescente removido do alojamento";
  };

  const handleDesinternar = async (adolescenteId: string) => {
    const response = await fetch(`/api/adolescentes/${adolescenteId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statusUnidade: "LIBERADO",
        alojamentoAtualId: null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.erro || "Erro ao desinternar adolescente");
    }

    await response.json();
    await carregarDados();
  };

  const handleTransferir = async (
    adolescente: AdolescenteTipo,
    destinoAlojamentoId: string,
    justificativa?: string
  ) => {
    const response = await fetch("/api/alocar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adolescenteId: adolescente.id,
        alojamentoId: destinoAlojamentoId,
        justificativa,
        medidas_adicionais: [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.erro || "Erro ao transferir adolescente");
    }

    await response.json();
    await carregarDados();
  };

  const handleAlterarStatusAlojamento = async (
    alojamentoId: string,
    status: "LIVRE" | "INTERDITADO",
    justificativa: string,
    numeroCi: string
  ) => {
    const response = await fetch(`/api/alojamentos?id=${alojamentoId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statusManutencao: status,
        justificativa,
        numeroCi,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.erro || "Erro ao atualizar alojamento");
    }

    await response.json();
    await carregarDados();
  };

  if (loading && casas.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 border-2 border-blue-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Home className="text-blue-600" size={24} />
            <p className="text-sm font-semibold text-blue-700">Total de Casas</p>
          </div>
          <p className="text-4xl font-bold text-blue-900">{totalCasas}</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 border-2 border-green-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Bed className="text-green-600" size={24} />
            <p className="text-sm font-semibold text-green-700">Total de Alojamentos</p>
          </div>
          <p className="text-4xl font-bold text-green-900">{totalAlojamentos}</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 border-2 border-purple-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <User className="text-purple-600" size={24} />
            <p className="text-sm font-semibold text-purple-700">Adolescentes ativos</p>
          </div>
          <p className="text-4xl font-bold text-purple-900">
            {adolescentes.length}
          </p>
        </div>
      </div>

      {/* Legenda de risco e ícones de alerta */}
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
                <span>Nivel 0</span>
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
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-amber-500/70 px-2 py-0.5 text-[10px] font-semibold text-white border border-amber-300">
                Aliados
              </span>
              Aliados do rival na casa
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {totalCasas === 0 ? (
        <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="font-bold text-xl text-yellow-900 mb-2">
                Estrutura nao inicializada
              </h3>
              <p className="text-yellow-800 mb-4">
                Crie as 8 casas e 78 alojamentos antes de iniciar as operacoes.
              </p>
              <InicializarEstruturaButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {loading && casas.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-inner">
              <div className="flex items-center gap-3 text-indigo-700 font-semibold bg-white/90 px-4 py-2 rounded-full shadow">
                <Loader2 className="animate-spin" size={20} />
                <span>Sincronizando dados com o servidor...</span>
              </div>
            </div>
          )}
        <div className={`space-y-4 ${loading ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                Estrutura das Casas
              </h2>
              <p className="text-sm text-gray-600">
                Clique em um alojamento para ver detalhes ou realizar acoes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {loading && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm">Atualizando...</span>
                </div>
              )}
              {(() => {
                // Combinar IDs de adolescentes com conflitos internos OU externos
                const idsComConflitosInternos = new Set(Object.keys(conflitosInternos));
                const idsComConflitosExternos = new Set(Object.keys(conflitosExternos));
                const todosIdsComConflitos = new Set([...idsComConflitosInternos, ...idsComConflitosExternos]);

                // Filtrar apenas adolescentes com nível de risco >= 2 (MONITORAR ou superior)
                const idsComRiscoRelevante = Array.from(todosIdsComConflitos).filter((id) => {
                  const nivelRisco = riscosPorAdolescente.get(id) ?? 0;
                  return nivelRisco >= 2;
                });

                return idsComRiscoRelevante.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setDropdownConflitosAberto(!dropdownConflitosAberto)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md"
                    >
                      <AlertTriangle size={18} />
                      <span>Analisar Conflitos ({idsComRiscoRelevante.length})</span>
                      <ChevronDown size={16} className={`transition-transform ${dropdownConflitosAberto ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownConflitosAberto && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b border-gray-200 bg-gray-50">
                          <p className="text-sm font-semibold text-gray-700">Selecione o adolescente para análise:</p>
                        </div>
                        <div className="py-1">
                          {idsComRiscoRelevante.map((adolescenteId) => {
                            const adolescente = adolescentes.find(a => a.id === adolescenteId);
                            const numConflitosInternos = conflitosInternos[adolescenteId]?.length || 0;
                            const numConflitosExternos = conflitosExternos[adolescenteId]?.length || 0;
                            const numConflitosTotal = numConflitosInternos + numConflitosExternos;
                            const alojamento = adolescente?.alojamentoAtualId
                              ? casas.flatMap(c => c.alojamentos).find(a => a.id === adolescente.alojamentoAtualId)
                              : null;
                            const casa = alojamento
                              ? casas.find(c => c.alojamentos.some(a => a.id === alojamento.id))
                              : null;

                            return (
                              <button
                                key={adolescenteId}
                                onClick={() => {
                                  if (adolescente) {
                                    setModalAnaliseImpacto({
                                      aberto: true,
                                      adolescenteId: adolescente.id,
                                      adolescenteNome: adolescente.nomeCompleto || "Desconhecido",
                                      adolescenteAlocado: !!adolescente.alojamentoAtualId,
                                      conflitos: conflitosInternos[adolescente.id] || [],
                                    });
                                    setDropdownConflitosAberto(false);
                                  }
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{adolescente?.nomeCompleto || "Desconhecido"}</p>
                                    <p className="text-sm text-gray-600">SMS: {adolescente?.numeroSms || "N/A"}</p>
                                    {alojamento && casa ? (
                                      <p className="text-xs text-blue-600 mt-1">
                                        {casa.nome} - Aloj {alojamento.numeroAlojamento} (Ala {alojamento.ala})
                                      </p>
                                    ) : (
                                      <p className="text-xs text-orange-600 mt-1 font-medium">Não alocado</p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                      {numConflitosTotal}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Adolescentes com conflitos não alocados */}
          {/*
            REGRA DE NEGÓCIO: Conflitos e status de internação

            1. Apenas adolescentes com status ATIVO/INTERNADO devem aparecer em listas de conflitos
            2. Adolescentes TRANSFERIDOS, LIBERADOS ou EVADIDOS não devem aparecer
            3. Quando um adolescente é desinternado:
               - O conflito direto com ele deixa de existir (não está mais no sistema)
               - MAS o risco pode permanecer entre o adolescente que ainda está internado
                 e os ALIADOS do adolescente desinternado (mesmo bairro/facção)
            4. Conflitos internos: registros diretos na tabela Conflito
            5. Conflitos externos: rivalidades de bairro/facção detectadas pela inteligência
          */}
          {(() => {
            const adolescentesComConflitosNaoAlocados = adolescentes.filter(
              (a) =>
                !a.alojamentoAtualId &&
                a.statusUnidade === "ATIVO" &&
                (conflitosInternos[a.id]?.length > 0 ||
                  conflitosExternos[a.id]?.length > 0)
            );

            if (adolescentesComConflitosNaoAlocados.length === 0) return null;

            return (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-red-900">
                      Adolescentes com Conflitos Não Alocados
                    </h3>
                    <p className="text-sm text-red-700">
                      {adolescentesComConflitosNaoAlocados.length} adolescente(s)
                      aguardando alocação com conflitos ativos
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adolescentesComConflitosNaoAlocados.map((adolescente) => (
                    <button
                      key={adolescente.id}
                      onClick={() =>
                        setModalAnaliseImpacto({
                          aberto: true,
                          adolescenteId: adolescente.id,
                          adolescenteNome:
                            adolescente.nomeCompleto || "Desconhecido",
                          adolescenteAlocado: !!adolescente.alojamentoAtualId,
                          conflitos: conflitosInternos[adolescente.id] || [],
                        })
                      }
                      className="bg-white border-2 border-red-300 rounded-lg p-4 hover:shadow-lg hover:border-red-400 transition-all text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">
                            {adolescente.nomeCompleto}
                          </h4>
                          {adolescente.numeroSms && (
                            <p className="text-xs text-gray-600">
                              SMS: {adolescente.numeroSms}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          {conflitosInternos[adolescente.id]?.length || 0}{" "}
                          conflito(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <AlertCircle size={14} />
                        <span>Clique para analisar e sugerir alocação</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid gap-4">
            {casasNormalizadas.map((casa) => (
              <div
                key={casa.id}
                id={`casa-${casa.numero}`}
                className={`rounded-xl bg-white border-2 shadow-md hover:shadow-lg transition-all duration-500 p-6 ${
                  casaHighlighted === casa.numero
                    ? 'border-indigo-500 ring-4 ring-indigo-300 ring-opacity-50 animate-pulse'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Building2 className="text-indigo-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-800">
                      {casa.nome}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {casa.alojamentos.length} alojamentos
                      {casa.isolada && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Isolada
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {casa.alojamentos.map((aloj) => {
                    const avaliacao = avaliarRiscoAlojamento(aloj);
                    const ocupante = aloj.adolescentes[0];
                    const interditado = aloj.statusManutencao === "INTERDITADO";
                    const nomePreferencial =
                      ocupante?.nomeSocial || ocupante?.nomeCompleto || "";
                    const nomeResumido = obterNomeResumido(nomePreferencial);
                    const temConflitos = ocupante
                      ? ((conflitosInternos[ocupante.id]?.length || 0) > 0 ||
                         (conflitosExternos[ocupante.id]?.length || 0) > 0)
                      : false;

                    const handleClickConflito = () => {
                      if (ocupante) {
                        setModalAnaliseImpacto({
                          aberto: true,
                          adolescenteId: ocupante.id,
                          adolescenteNome: ocupante.nomeCompleto || "Desconhecido",
                          adolescenteAlocado: !!ocupante.alojamentoAtualId,
                          conflitos: conflitosInternos[ocupante.id] || [],
                        });
                      }
                    };

                    const handleClick = () => {
                      handleCliqueAlojamento(casa, aloj);
                    };

                    return (
                      <button
                        key={aloj.id}
                        onClick={handleClick}
                        disabled={loading}
                        className={`
                          relative p-3 rounded-lg text-xs font-bold
                          transition-all hover:scale-105 border-2 h-full
                          flex flex-col items-center justify-center gap-1
                          ${avaliacao.corClass}
                          ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                        `}
                        title={
                          interditado
                            ? `Alojamento ${aloj.numeroAlojamento} - Interditado`
                            : ocupante && temConflitos
                            ? `${ocupante.nomeCompleto} - Clique para visualizar | Clique no ícone vermelho para analisar conflitos`
                            : ocupante
                            ? `${ocupante.nomeCompleto} - Clique para visualizar`
                            : `Alojamento ${aloj.numeroAlojamento} - Clique para alocar`
                        }
                      >
                        {renderIconesAlerta(aloj, temConflitos, handleClickConflito, avaliacao)}
                        <span className="text-base font-extrabold text-gray-800">
                          {aloj.numeroAlojamento}
                        </span>
                        {ocupante ? (
                          <div className="text-center text-[10px] font-semibold leading-tight text-gray-800 max-w-[4.25rem]">
                            <span className="block truncate">
                              {nomeResumido?.primeiro ?? nomePreferencial}
                            </span>
                            {nomeResumido?.ultimo && (
                              <span className="block truncate text-[9px] font-medium text-gray-600">
                                {nomeResumido.ultimo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold ${
                              interditado ? "text-red-600" : "text-gray-500"
                            }`}
                          >
                            {interditado ? "Interditado" : "Livre"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      <ModalAlojamentoDetalhes
        isOpen={modalDetalhes.aberto}
        alojamento={modalDetalhes.alojamento}
        avaliacaoRisco={modalDetalhes.avaliacao}
        onClose={fecharModalDetalhes}
        casas={casasNormalizadas}
        conflitosExternos={conflitosExternos}
        onDesalocar={async (alojamentoId, adolescenteId, motivo) => {
          await handleDesalocar(alojamentoId, adolescenteId, motivo);
        }}
        onDesinternar={handleDesinternar}
        onTransferir={handleTransferir}
        onSolicitarAlocacao={() => {
          if (modalDetalhes.alojamento) {
            abrirModalAlocacao(modalDetalhes.alojamento);
          }
          fecharModalDetalhes();
        }}
        onInterditar={(alojamentoId, justificativa, numeroCi) =>
          handleAlterarStatusAlojamento(
            alojamentoId,
            "INTERDITADO",
            justificativa,
            numeroCi
          )
        }
        onLiberarInterdicao={(alojamentoId, justificativa, numeroCi) =>
          handleAlterarStatusAlojamento(
            alojamentoId,
            "LIVRE",
            justificativa,
            numeroCi
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
        onAlocar={handleAlocar}
      />

      <ModalAnaliseImpacto
        isOpen={modalAnaliseImpacto.aberto}
        onClose={() => setModalAnaliseImpacto({
          aberto: false,
          adolescenteId: null,
          adolescenteNome: null,
          adolescenteAlocado: false,
          conflitos: [],
        })}
        adolescenteId={modalAnaliseImpacto.adolescenteId || ""}
        adolescenteNome={modalAnaliseImpacto.adolescenteNome || ""}
        adolescenteAlocado={modalAnaliseImpacto.adolescenteAlocado}
        conflitos={modalAnaliseImpacto.conflitos}
      />
    </div>
  );
}
