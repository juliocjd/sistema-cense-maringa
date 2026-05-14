"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Bed,
  AlertCircle,
  User,
  Loader2,
  AlertTriangle,
  Lock,
  Activity,
  Link2,
  Move,
  Users,
} from "lucide-react";
import { InicializarEstruturaButton } from "./inicializar-button";
import { ModalAlocacao } from "@/components/mapa/modal-alocacao";
import ModalAlojamentoDetalhes from "@/components/mapa/modal-alojamento-detalhes";
import { ModalAnaliseImpacto } from "@/components/estrutura/modal-analise-impacto";
import type { Casa, Alojamento, Adolescente as AdolescenteTipo } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type AdolescenteRisco,
  type AlojamentoRisco,
  type CasaRisco,
  type ResultadoRisco,
} from "@/lib/riscos/calcular";
import {
  normalizarDestinacaoOperacionalCasa,
  obterEtiquetaCasaOperacional,
} from "@/lib/casas/configuracao-operacional";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

type VisaoGeralTabProps = {
  casas: Casa[];
  totalAlojamentos: number;
};

type StatusSaidaUnidade = "TRANSFERIDO" | "LIBERADO" | "EVADIDO";

const STATUS_SAIDA_UNIDADE_LABEL: Record<StatusSaidaUnidade, string> = {
  TRANSFERIDO: "Transferido",
  LIBERADO: "Liberado",
  EVADIDO: "Evadido",
};

interface ModalDetalhesState {
  aberto: boolean;
  alojamento: (Alojamento & { casa?: Casa }) | null;
  avaliacao: (ResultadoRisco & { corClass: string }) | null;
}

type AdolescenteArrastado = {
  id: string;
  nome: string;
  origemAlojamentoId: string | null;
};

const DRAG_ADOLESCENTE_MIME = "application/x-cense-adolescente";

const VISIBILITY_REFRESH_COOLDOWN_MS = 60000;
const IMPACTOS_EXTERNOS_TTL_MS = 120000;
const FETCH_TIMEOUT_MS = 15000;

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

const obterClassesDestinacao = (destinacao?: string | null) => {
  const normalizada = normalizarDestinacaoOperacionalCasa(destinacao);
  if (normalizada === "PROVISORIA") {
    return "bg-sky-100 text-sky-700";
  }
  if (normalizada === "ABRIGAMENTO") {
    return "bg-amber-100 text-amber-700";
  }
  if (normalizada === "FASE_EXCLUSIVA") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-emerald-100 text-emerald-700";
};

const obterNomeResumido = (nome?: string | null) => {
  if (!nome) return null;
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : null;
  return { primeiro, ultimo };
};

const construirMapaConflitosInternos = (
  lista: AdolescenteTipo[],
): Record<
  string,
  Array<{ id: string; adversario: { id: string; nome: string } }>
> => {
  const mapa: Record<
    string,
    Array<{ id: string; adversario: { id: string; nome: string } }>
  > = {};

  lista.forEach((adolescente) => {
    if (!adolescente?.id) return;
    const vistos = new Set<string>();

    const adicionarConflito = (conflito: any) => {
      if (!conflito?.id || vistos.has(conflito.id)) {
        return;
      }
      vistos.add(conflito.id);

      const adversarioId =
        conflito?.adversario?.id ??
        conflito?.adolescenteAId ??
        conflito?.adolescenteBId ??
        "";
      const adversarioNome =
        conflito?.adversario?.nomeCompleto ??
        conflito?.adversario?.nome ??
        "Desconhecido";

      if (!mapa[adolescente.id]) {
        mapa[adolescente.id] = [];
      }
      mapa[adolescente.id].push({
        id: conflito.id,
        adversario: {
          id: adversarioId,
          nome: adversarioNome,
        },
      });
    };

    (adolescente.conflitosA ?? []).forEach(adicionarConflito);
    (adolescente.conflitosB ?? []).forEach(adicionarConflito);
  });

  return mapa;
};

const mapearAdolescenteRisco = (
  adolescente: AdolescenteTipo,
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
  atoInfracionalVinculos: (adolescente.atoInfracionalVinculos ?? [])
    .map((item: any) => ({
      id: item?.id ?? item?.vinculoId ?? item?.vinculo?.id ?? "",
      descricao: item?.descricao ?? item?.vinculo?.descricao ?? null,
    }))
    .filter((item: any) => item.id),
  faccao: adolescente.faccao
    ? {
        id: adolescente.faccao.id ?? null,
        nome: adolescente.faccao.nome ?? null,
      }
    : null,
  conflitosA: adolescente.conflitosA ?? [],
  conflitosB: adolescente.conflitosB ?? [],
});

const extrairIdsVinculosMesmoAto = (
  adolescente?: Pick<AdolescenteTipo, "atoInfracionalVinculos"> | null,
): string[] =>
  (adolescente?.atoInfracionalVinculos ?? [])
    .map((item: any) => item?.id ?? item?.vinculoId ?? item?.vinculo?.id ?? "")
    .filter((id: string) => Boolean(id));

const temInterseccaoVinculos = (idsA: Set<string>, idsB: Set<string>) => {
  if (idsA.size === 0 || idsB.size === 0) {
    return false;
  }
  const [menor, maior] = idsA.size <= idsB.size ? [idsA, idsB] : [idsB, idsA];
  for (const id of menor) {
    if (maior.has(id)) {
      return true;
    }
  }
  return false;
};

const renderIconesAlerta = (
  alojamento: Alojamento,
  temConflitos: boolean,
  onClickConflito?: () => void,
  avaliacaoRisco?: { ambiental?: { ativo: boolean } | null },
  temMesmoAtoInfracional = false,
): React.ReactElement | null => {
  const ocupante = alojamento.adolescentes?.[0];
  const temAliados = avaliacaoRisco?.ambiental?.ativo ?? false;

  if (!ocupante && !temAliados && !temMesmoAtoInfracional) return null;

  return (
    <div className="absolute -top-1 -right-1 z-10 flex gap-0.5">
      {ocupante?.alertaRiscoSuicidio && (
        <div
          className="rounded-full bg-orange-500 p-0.5"
          title="Risco de suicídio"
        >
          <AlertTriangle size={10} className="text-white" />
        </div>
      )}
      {ocupante?.alertaPerfilMapeado && (
        <div
          className="rounded-full bg-purple-500 p-0.5"
          title="Perfil mapeado"
        >
          <Lock size={10} className="text-white" />
        </div>
      )}
      {ocupante?.alertaSaudeConfidencial && (
        <div className="rounded-full bg-blue-500 p-0.5" title="Alerta de saude">
          <Activity size={10} className="text-white" />
        </div>
      )}
      {ocupante && temMesmoAtoInfracional && (
        <div
          className="rounded-full bg-cyan-500 p-0.5"
          title="Mesmo Ato Infracional"
        >
          <Link2 size={10} className="text-white" />
        </div>
      )}
      {/*
        REMOVIDO: Ícone vermelho de conflito
        As cores de ní­vel de risco e os Í­cones específicos já indicam os conflitos.
      */}
    </div>
  );
};

export function VisaoGeralTab({
  casas: casasIniciais,
  totalAlojamentos,
}: VisaoGeralTabProps) {
  const searchParams = useSearchParams();
  const casaNumeroFromUrl = searchParams.get("casa");
  const [casaHighlighted, setCasaHighlighted] = useState<number | null>(null);
  const { user } = useAuth();
  const podeEditarEstrutura = useMemo(
    () => hasPermission(user?.permissions, PERMISSIONS.ESTRUTURA_EDIT),
    [user?.permissions],
  );

  const [casas, setCasas] = useState<Casa[]>(casasIniciais ?? []);
  const [adolescentes, setAdolescentes] = useState<AdolescenteTipo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, ResultadoRisco>>(
    {},
  );
  const [conflitosExternos, setConflitosExternos] = useState<
    Record<string, ImpactoConflitoExterno[]>
  >({});
  const [conflitosInternos, setConflitosInternos] = useState<
    Record<
      string,
      Array<{ id: string; adversario: { id: string; nome: string } }>
    >
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalAlocacaoAberto, setModalAlocacaoAberto] = useState(false);
  const [alojamentoSelecionado, setAlojamentoSelecionado] = useState<
    (Alojamento & { casa?: Casa }) | null
  >(null);
  const [adolescenteInicialAlocacaoId, setAdolescenteInicialAlocacaoId] =
    useState<string | null>(null);
  const [adolescenteArrastado, setAdolescenteArrastado] =
    useState<AdolescenteArrastado | null>(null);
  const [alojamentoDropAtivoId, setAlojamentoDropAtivoId] = useState<
    string | null
  >(null);
  const modalAlocacaoAbertoRef = useRef(false);
  const modalDetalhesAbertoRef = useRef(false);
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
  const modalAnaliseAbertoRef = useRef(false);
  const [desinternandoId, setDesinternandoId] = useState<string | null>(null);

  const ultimoRefreshRef = useRef(0);
  const operacaoEmAndamentoRef = useRef(false);
  const refreshPendenteRef = useRef(false);
  const refreshForcadoRef = useRef(false);
  const debounceRefreshRef = useRef<number | null>(null);
  const ultimoImpactosRef = useRef(0);
  const ultimaRequisicaoIdRef = useRef(0);

  const totalCasas = casas.length;

  const resumoAlojamentos = useMemo(() => {
    let total = 0;
    let ocupados = 0;
    let livres = 0;
    let interditados = 0;

    casas.forEach((casa) => {
      casa.alojamentos.forEach((aloj) => {
        total += 1;
        if (aloj.statusManutencao === "INTERDITADO") {
          interditados += 1;
          return;
        }
        if (aloj.adolescentes && aloj.adolescentes.length > 0) {
          ocupados += 1;
        } else {
          livres += 1;
        }
      });
    });

    return { total, ocupados, livres, interditados };
  }, [casas]);

  const totalAlojamentosCard = resumoAlojamentos.total || totalAlojamentos;

  const adolescentesAtivos = useMemo(
    () =>
      adolescentes.filter(
        (item) => (item.statusUnidade ?? "").toUpperCase() === "ATIVO",
      ),
    [adolescentes],
  );

  const adolescentesAtivosSemAlojamento = useMemo(
    () => adolescentesAtivos.filter((item) => !item.alojamentoAtualId),
    [adolescentesAtivos],
  );

  const fetchComTimeout = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        // Evita AbortError "without reason" no console e identifica timeout.
        controller.abort("timeout");
      }, FETCH_TIMEOUT_MS);
      try {
        return await fetch(input, {
          ...init,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [],
  );

  const carregarDados = useCallback(
    async (force = false) => {
      const requestId = Date.now() + Math.random();
      ultimaRequisicaoIdRef.current = requestId;
      setLoading(true);
      setError(null);
      try {
        const mapaUrl = force
          ? "/api/mapa/status?refresh=1"
          : "/api/mapa/status";
        const mapaResponse = await fetchComTimeout(mapaUrl, {
          cache: "no-store",
        });
        if (ultimaRequisicaoIdRef.current !== requestId) {
          return;
        }
        if (!mapaResponse.ok) {
          throw new Error("Erro ao carregar dados do mapa");
        }

        const mapaData = await mapaResponse.json();
        const casasRecebidas: Casa[] = Array.isArray(mapaData?.casas)
          ? mapaData.casas
          : [];
        const adolescentesRecebidos: AdolescenteTipo[] = Array.isArray(
          mapaData?.adolescentes,
        )
          ? mapaData.adolescentes
          : [];
        const avaliacoesServidor: Record<string, ResultadoRisco> =
          mapaData?.avaliacoes ?? {};

        setCasas(casasRecebidas);
        setAdolescentes(adolescentesRecebidos);
        setAvaliacoes(avaliacoesServidor);
        setConflitosInternos(
          construirMapaConflitosInternos(adolescentesRecebidos),
        );

        const agoraImpactos = Date.now();
        const deveAtualizarImpactos =
          force ||
          agoraImpactos - ultimoImpactosRef.current >
            IMPACTOS_EXTERNOS_TTL_MS ||
          Object.keys(conflitosExternos).length === 0;

        if (deveAtualizarImpactos) {
          let impactosAtualizados = false;
          let impactos: Record<string, ImpactoConflitoExterno[]> =
            conflitosExternos;
          try {
            const impactosResponse = await fetchComTimeout(
              "/api/inteligencia/conflitos/impacto?status=ATIVO",
              { cache: "no-store" },
            );
            if (ultimaRequisicaoIdRef.current !== requestId) {
              return;
            }
            if (impactosResponse.ok) {
              const impactosData = await impactosResponse.json();
              const lista: ImpactoConflitoExterno[] = Array.isArray(
                impactosData?.impactos,
              )
                ? impactosData.impactos
                : [];
              impactos = lista.reduce(
                (acc, impacto) => {
                  const adolescenteId = impacto?.adolescente?.id;
                  if (!adolescenteId) return acc;
                  if (!acc[adolescenteId]) {
                    acc[adolescenteId] = [];
                  }
                  acc[adolescenteId].push(impacto);
                  return acc;
                },
                {} as Record<string, ImpactoConflitoExterno[]>,
              );
              impactosAtualizados = true;
            }
          } catch (impactoErro) {
            console.warn("Falha ao carregar conflitos externos:", impactoErro);
          }
          if (impactosAtualizados) {
            setConflitosExternos(impactos);
            ultimoImpactosRef.current = agoraImpactos;
          }
        }
      } catch (erro) {
        if (ultimaRequisicaoIdRef.current !== requestId) {
          return;
        }
        const foiAbortTimeout =
          erro instanceof DOMException
            ? erro.name === "AbortError"
            : (erro as any) === "timeout";
        if (!foiAbortTimeout) {
          console.error("Erro ao carregar dados:", erro);
        }
        const mensagem = foiAbortTimeout
          ? "Tempo limite excedido ao carregar estrutura. Verifique a conexao e tente novamente."
          : erro instanceof Error
            ? erro.message
            : "Erro ao carregar dados";
        setError(mensagem);
      } finally {
        if (ultimaRequisicaoIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [conflitosExternos, fetchComTimeout],
  );

  const solicitarAtualizacao = useCallback(
    (force = false) => {
      const agora = Date.now();
      if (agora - ultimoRefreshRef.current < 1000) {
        return;
      }
      ultimoRefreshRef.current = agora;
      if (force) {
        refreshForcadoRef.current = false;
      }
      carregarDados(force);
    },
    [carregarDados],
  );

  const devePausarAtualizacao = useCallback(() => {
    return (
      operacaoEmAndamentoRef.current ||
      modalAlocacaoAbertoRef.current ||
      modalDetalhesAbertoRef.current ||
      modalAnaliseAbertoRef.current
    );
  }, []);

  const consumirRefreshForcado = useCallback(() => {
    const force = refreshForcadoRef.current;
    refreshForcadoRef.current = false;
    return force;
  }, []);

  const agendarAtualizacao = useCallback(
    (force = false) => {
      refreshPendenteRef.current = true;
      if (force) {
        refreshForcadoRef.current = true;
      }

      if (debounceRefreshRef.current !== null) {
        return;
      }

      debounceRefreshRef.current = window.setTimeout(() => {
        debounceRefreshRef.current = null;
        if (devePausarAtualizacao()) {
          return;
        }
        refreshPendenteRef.current = false;
        solicitarAtualizacao(consumirRefreshForcado());
      }, 800);
    },
    [consumirRefreshForcado, devePausarAtualizacao, solicitarAtualizacao],
  );

  const reforcarAtualizacaoPosOperacao = useCallback(() => {
    window.setTimeout(() => {
      agendarAtualizacao(true);
    }, 1200);
  }, [agendarAtualizacao]);

  useEffect(() => {
    solicitarAtualizacao();
  }, [solicitarAtualizacao]);

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
            agendarAtualizacao(true);
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
  }, [agendarAtualizacao]);

  const finalizarOperacao = useCallback(() => {
    operacaoEmAndamentoRef.current = false;
    if (refreshPendenteRef.current && !devePausarAtualizacao()) {
      refreshPendenteRef.current = false;
      solicitarAtualizacao(consumirRefreshForcado());
    }
  }, [consumirRefreshForcado, devePausarAtualizacao, solicitarAtualizacao]);

  const executarOperacao = useCallback(
    async <T,>(acao: () => Promise<T>): Promise<T> => {
      operacaoEmAndamentoRef.current = true;
      try {
        return await acao();
      } finally {
        finalizarOperacao();
      }
    },
    [finalizarOperacao],
  );

  useEffect(() => {
    const handleFocus = () => {
      const agora = Date.now();
      if (agora - ultimoRefreshRef.current < VISIBILITY_REFRESH_COOLDOWN_MS) {
        return;
      }
      agendarAtualizacao();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const agora = Date.now();
        if (agora - ultimoRefreshRef.current < VISIBILITY_REFRESH_COOLDOWN_MS) {
          return;
        }
        agendarAtualizacao();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [agendarAtualizacao]);

  // Auto-scroll para casa especí­fica quando vem da URL
  useEffect(() => {
    if (casaNumeroFromUrl && casas.length > 0) {
      const casaNumero = parseInt(casaNumeroFromUrl, 10);

      // Aguardar um pouco para garantir que o DOM foi renderizado
      setTimeout(() => {
        const elemento = document.getElementById(`casa-${casaNumero}`);
        if (elemento) {
          elemento.scrollIntoView({
            behavior: "smooth",
            block: "center",
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
          adolescentes: [
            {
              ...detalhado,
              prazoOperacionalAtual:
                ocupante.prazoOperacionalAtual ??
                detalhado.prazoOperacionalAtual ??
                null,
            },
          ],
        };
      }),
    }));
  }, [casas, adolescentesLookup]);

  const prazosOperacionais = useMemo(() => {
    const monitorados = casasNormalizadas.flatMap((casa) =>
      casa.alojamentos.flatMap((alojamento) => {
        const prazo = alojamento.prazoOperacional;
        const ocupante = alojamento.adolescentes?.[0];
        if (!prazo || !ocupante) {
          return [];
        }
        return [
          {
            adolescenteId: ocupante.id,
            nome: ocupante.nomeCompleto,
            casaNome: casa.nome,
            casaNumero: casa.numero,
            alojamentoNumero: alojamento.numeroAlojamento,
            ...prazo,
          },
        ];
      }),
    );

    return {
      monitorados,
      vencidos: monitorados.filter((item) => item.vencido),
      vencendoHoje: monitorados.filter((item) => {
        if (!item.dataLimite || item.vencido) {
          return false;
        }
        const limite = new Date(item.dataLimite).getTime();
        const diferenca = limite - Date.now();
        return diferenca >= 0 && diferenca <= 24 * 60 * 60 * 1000;
      }),
    };
  }, [casasNormalizadas]);

  const adolescentesMesmoAtoNaCasaIds = useMemo(() => {
    const ids = new Set<string>();

    casasNormalizadas.forEach((casa) => {
      const moradores = casa.alojamentos
        .flatMap((alojamento) =>
          (alojamento.adolescentes ?? []).map((adolescente) => ({
            adolescente,
            vinculos: new Set(extrairIdsVinculosMesmoAto(adolescente)),
          })),
        )
        .filter((item) => item.adolescente?.id);

      for (let i = 0; i < moradores.length; i += 1) {
        for (let j = i + 1; j < moradores.length; j += 1) {
          if (
            temInterseccaoVinculos(moradores[i].vinculos, moradores[j].vinculos)
          ) {
            ids.add(moradores[i].adolescente.id);
            ids.add(moradores[j].adolescente.id);
          }
        }
      }
    });

    return ids;
  }, [casasNormalizadas]);

  const casasParaCalculo = useMemo<CasaRisco[]>(
    () =>
      casasNormalizadas.map((casa) => ({
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((alojamento) => ({
          ...alojamento,
          adolescentes: (alojamento.adolescentes ?? []).map(
            mapearAdolescenteRisco,
          ),
        })),
      })),
    [casasNormalizadas],
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
    [casasParaCalculo],
  );

  const avaliarRiscoAlojamento = useCallback(
    (alojamento: Alojamento) => {
      const resultadoServidor = avaliacoes[alojamento.id];
      const alojamentoRisco =
        alojamentosPorId.get(alojamento.id) ??
        (alojamento as unknown as AlojamentoRisco);
      const casaAtual =
        casasParaCalculo.find((casa) => casa.id === alojamento.casaId) ?? null;

      const resultado =
        resultadoServidor ??
        calcularRiscoAlojamento({
          alojamento: alojamentoRisco,
          casaAtual,
          casas: casasParaCalculo,
          slots: slotsPorAdolescente,
          conflitosExternos,
        });

      const nivelSeguro = Math.max(
        0,
        Math.min(5, Math.round(resultado.nivel ?? 0)),
      ) as 0 | 1 | 2 | 3 | 4 | 5;

      const corClass =
        resultado.categoria === "INTERDITADO"
          ? riscoClasses.interditado
          : (classePorNivel[nivelSeguro] ?? riscoClasses.livre);

      return {
        ...resultado,
        corClass,
      };
    },
    [
      avaliacoes,
      alojamentosPorId,
      casasParaCalculo,
      conflitosExternos,
      slotsPorAdolescente,
    ],
  );

  // Mapa de ní­veis de risco por adolescente (para filtrar dropdown)
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

  const abrirModalAlocacao = (
    alojamento: Alojamento & { casa?: Casa },
    adolescenteInicialId?: string | null,
  ) => {
    if (!podeEditarEstrutura) {
      return;
    }
    setAlojamentoSelecionado(alojamento);
    setAdolescenteInicialAlocacaoId(adolescenteInicialId ?? null);
    setModalAlocacaoAberto(true);
    modalAlocacaoAbertoRef.current = true;
  };

  const fecharModalAlocacao = () => {
    setModalAlocacaoAberto(false);
    setAlojamentoSelecionado(null);
    setAdolescenteInicialAlocacaoId(null);
    modalAlocacaoAbertoRef.current = false;
    if (refreshPendenteRef.current && !devePausarAtualizacao()) {
      refreshPendenteRef.current = false;
      solicitarAtualizacao(consumirRefreshForcado());
    }
  };

  const fecharModalDetalhes = () => {
    setModalDetalhes({ aberto: false, alojamento: null, avaliacao: null });
    modalDetalhesAbertoRef.current = false;
    if (refreshPendenteRef.current && !devePausarAtualizacao()) {
      refreshPendenteRef.current = false;
      solicitarAtualizacao(consumirRefreshForcado());
    }
  };

  const lerAdolescenteArrastado = (
    event: React.DragEvent<HTMLElement>,
  ): AdolescenteArrastado | null => {
    const payload =
      event.dataTransfer.getData(DRAG_ADOLESCENTE_MIME) ||
      event.dataTransfer.getData("text/plain");
    if (!payload) {
      return adolescenteArrastado;
    }

    try {
      const parsed = JSON.parse(payload) as Partial<AdolescenteArrastado>;
      if (parsed?.id) {
        return {
          id: parsed.id,
          nome: parsed.nome ?? "",
          origemAlojamentoId: parsed.origemAlojamentoId ?? null,
        };
      }
    } catch {
      return {
        id: payload,
        nome: "",
        origemAlojamentoId: null,
      };
    }

    return adolescenteArrastado;
  };

  const iniciarArrasteAdolescente = (
    event: React.DragEvent<HTMLElement>,
    adolescente: Pick<AdolescenteTipo, "id" | "nomeCompleto">,
    origemAlojamentoId: string | null,
  ) => {
    if (!podeEditarEstrutura || loading) {
      event.preventDefault();
      return;
    }

    const payload: AdolescenteArrastado = {
      id: adolescente.id,
      nome: adolescente.nomeCompleto ?? "",
      origemAlojamentoId,
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_ADOLESCENTE_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", adolescente.id);
    setAdolescenteArrastado(payload);
  };

  const limparArrasteAdolescente = () => {
    setAdolescenteArrastado(null);
    setAlojamentoDropAtivoId(null);
  };

  const handleDragOverAlojamento = (
    event: React.DragEvent<HTMLButtonElement>,
    alojamento: Alojamento,
  ) => {
    if (
      !podeEditarEstrutura ||
      loading ||
      !adolescenteArrastado ||
      alojamento.statusManutencao === "INTERDITADO"
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (alojamentoDropAtivoId !== alojamento.id) {
      setAlojamentoDropAtivoId(alojamento.id);
    }
  };

  const handleDropAlojamento = (
    event: React.DragEvent<HTMLButtonElement>,
    casa: Casa,
    alojamento: Alojamento,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const payload = lerAdolescenteArrastado(event);
    limparArrasteAdolescente();

    if (
      !payload ||
      !podeEditarEstrutura ||
      loading ||
      alojamento.statusManutencao === "INTERDITADO" ||
      payload.origemAlojamentoId === alojamento.id
    ) {
      return;
    }

    const adolescente = adolescentesLookup.get(payload.id);
    if (!adolescente || adolescente.statusUnidade !== "ATIVO") {
      return;
    }

    abrirModalAlocacao({ ...alojamento, casa }, adolescente.id);
  };

  const handleCliqueAlojamento = (casa: Casa, alojamento: Alojamento) => {
    const avaliacao = avaliarRiscoAlojamento(alojamento);

    // Sempre abre o modal de detalhes (ocupado ou vazio)
    setModalDetalhes({
      aberto: true,
      alojamento: { ...alojamento, casa },
      avaliacao,
    });
    modalDetalhesAbertoRef.current = true;
  };

  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string,
    motivoTransferencia?: string,
    motivoTransferenciaObrigatorio?: boolean,
    substituirOcupanteDestino?: boolean,
  ) => {
    await executarOperacao(async () => {
      const response = await fetch("/api/alocar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId,
          alojamentoId,
          justificativa,
          motivoTransferencia,
          motivoTransferenciaObrigatorio: Boolean(
            motivoTransferenciaObrigatorio,
          ),
          substituirOcupanteDestino: Boolean(substituirOcupanteDestino),
          medidas_adicionais: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.erro || "Erro ao alocar adolescente");
      }

      await response.json();
      fecharModalAlocacao();
      await carregarDados(true);
      reforcarAtualizacaoPosOperacao();
    });
  };

  const handleDesalocar = async (
    alojamentoId: string,
    adolescenteId: string,
    motivo?: string,
  ): Promise<string> => {
    return executarOperacao(async () => {
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
      await carregarDados(true);
      reforcarAtualizacaoPosOperacao();
      return data.mensagem || "Adolescente removido do alojamento";
    });
  };

  const handleDesinternar = async (
    adolescenteId: string,
    statusSaida: StatusSaidaUnidade,
  ) => {
    await executarOperacao(async () => {
      setDesinternandoId(adolescenteId);
      try {
        const hojeISO = new Date().toISOString().split("T")[0];
        const response = await fetch(`/api/adolescentes/${adolescenteId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statusUnidade: statusSaida,
            alojamentoAtualId: null,
            dataDesinternacao: hojeISO,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.erro || "Erro ao desinternar adolescente");
        }

        await response.json();
        fecharModalDetalhes();
        await carregarDados(true);
        reforcarAtualizacaoPosOperacao();
        alert(
          `Situacao atualizada para ${STATUS_SAIDA_UNIDADE_LABEL[statusSaida]} com sucesso.`,
        );
      } finally {
        setDesinternandoId(null);
      }
    });
  };

  const handleTransferir = async (
    adolescente: AdolescenteTipo,
    destinoAlojamentoId: string,
    justificativa?: string,
    motivoTransferencia?: string,
    motivoTransferenciaObrigatorio?: boolean,
  ) => {
    const motivoLimpo = motivoTransferencia?.trim() ?? "";
    if (motivoTransferenciaObrigatorio && motivoLimpo.length === 0) {
      throw new Error("Informe o motivo da transferencia.");
    }

    await executarOperacao(async () => {
      const payload: Record<string, unknown> = {
        adolescenteId: adolescente.id,
        alojamentoId: destinoAlojamentoId,
        justificativa,
        motivoTransferencia: motivoLimpo.length > 0 ? motivoLimpo : undefined,
        motivoTransferenciaObrigatorio: Boolean(motivoTransferenciaObrigatorio),
        medidas_adicionais: [],
      };

      const response = await fetch("/api/alocar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.erro || "Erro ao transferir adolescente");
      }

      await response.json();
      await carregarDados(true);
      reforcarAtualizacaoPosOperacao();
    });
  };

  const handleAlterarStatusAlojamento = async (
    alojamentoId: string,
    status: "LIVRE" | "INTERDITADO",
    justificativa: string,
    documentoTipo: "CI" | "DECISAO_JUDICIAL" | "OUTRO",
    documentoReferencia: string,
  ) => {
    await executarOperacao(async () => {
      const response = await fetch(`/api/alojamentos?id=${alojamentoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusManutencao: status,
          interdicaoJustificativa: justificativa,
          interdicaoDocumentoTipo: documentoTipo,
          interdicaoDocumentoReferencia: documentoReferencia,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.erro || "Erro ao atualizar alojamento");
      }

      await response.json();
      await carregarDados(true);
      reforcarAtualizacaoPosOperacao();
    });
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
      <div className="mb-6 space-y-3 rounded-xl bg-white border border-gray-200 shadow p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Bed className="text-green-600" size={18} />
            <div>
              <p className="text-xs uppercase tracking-wide text-green-600 font-semibold">
                Total de alojamentos
              </p>
              <p className="text-2xl font-bold text-green-900 leading-tight">
                {totalAlojamentosCard}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-[11px] uppercase text-green-600 font-semibold">
                Disponiveis
              </p>
              <p className="text-lg font-bold text-green-800 leading-tight">
                {resumoAlojamentos.livres}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] uppercase text-emerald-600 font-semibold">
                Ocupados
              </p>
              <p className="text-lg font-bold text-emerald-800 leading-tight">
                {resumoAlojamentos.ocupados}
              </p>
            </div>
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
              <p className="text-[11px] uppercase text-gray-600 font-semibold">
                Interditados
              </p>
              <p className="text-lg font-bold text-gray-700 leading-tight">
                {resumoAlojamentos.interditados}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-purple-700 ml-auto">
            <User size={18} />
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-purple-600">
                Adolescentes ativos
              </p>
              <p className="text-2xl font-bold text-purple-900 leading-tight">
                {adolescentesAtivos.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(prazosOperacionais.vencidos.length > 0 ||
        prazosOperacionais.vencendoHoje.length > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-red-50 p-4 shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Prazos operacionais das casas
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {prazosOperacionais.vencidos.length > 0
                  ? `${prazosOperacionais.vencidos.length} adolescente(s) acima do prazo maximo configurado.`
                  : `${prazosOperacionais.vencendoHoje.length} adolescente(s) vencem hoje.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                Vencidos: {prazosOperacionais.vencidos.length}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                Vencem hoje: {prazosOperacionais.vencendoHoje.length}
              </span>
            </div>
          </div>

          {prazosOperacionais.vencidos.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {prazosOperacionais.vencidos.slice(0, 6).map((item) => (
                <div
                  key={`${item.adolescenteId}-${item.alojamentoNumero}`}
                  className="rounded-lg border border-red-200 bg-white px-4 py-3"
                >
                  <p className="font-semibold text-slate-900">{item.nome}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.casaNome} / alojamento {item.alojamentoNumero}
                  </p>
                  <p className="mt-1 text-sm font-medium text-red-700">
                    {item.diasAtraso} dia(s) acima do prazo de{" "}
                    {item.prazoMaximoDias} dia(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legenda de risco e Í­cones de alerta */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200 text-xs">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800 leading-tight">
                Legenda de risco (niveis 0 a 5)
              </p>
              <p className="text-[11px] text-slate-500">
                Use as cores para priorizar intervenções.
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
              Risco de suicÍdio
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
              <span className="bg-cyan-500 rounded-full p-1">
                <Link2 size={12} className="text-white" />
              </span>
              Mesmo Ato Infracional
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
              {podeEditarEstrutura && <InicializarEstruturaButton />}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            className={`space-y-4 ${loading ? "opacity-40 pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {loading && (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm">Atualizando...</span>
                  </div>
                )}
              </div>
              {!podeEditarEstrutura && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Acesso somente leitura
                </span>
              )}
            </div>

            {adolescentesAtivosSemAlojamento.length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 shadow">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <Users className="text-amber-700" size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-amber-950">
                        Adolescentes ativos sem alojamento
                      </h3>
                      <p className="text-sm text-amber-800">
                        {adolescentesAtivosSemAlojamento.length} pendente(s) de
                        alocacao
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                    <Move size={14} />
                    Movimentação pendente
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {adolescentesAtivosSemAlojamento.map((adolescente) => {
                    const totalConflitosInternos =
                      conflitosInternos[adolescente.id]?.length ?? 0;
                    const totalConflitosExternos =
                      conflitosExternos[adolescente.id]?.length ?? 0;
                    const totalConflitos =
                      totalConflitosInternos + totalConflitosExternos;

                    return (
                      <button
                        type="button"
                        key={adolescente.id}
                        draggable={podeEditarEstrutura && !loading}
                        onDragStart={(event) =>
                          iniciarArrasteAdolescente(event, adolescente, null)
                        }
                        onDragEnd={limparArrasteAdolescente}
                        onClick={() => {
                          if (totalConflitos === 0) return;
                          setModalAnaliseImpacto({
                            aberto: true,
                            adolescenteId: adolescente.id,
                            adolescenteNome:
                              adolescente.nomeCompleto || "Desconhecido",
                            adolescenteAlocado: false,
                            conflitos: conflitosInternos[adolescente.id] || [],
                          });
                          modalAnaliseAbertoRef.current = true;
                        }}
                        className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold shadow-sm transition-all ${
                          totalConflitos > 0
                            ? "border-red-300 bg-white text-red-800 hover:border-red-400"
                            : "border-amber-300 bg-white text-amber-900 hover:border-amber-400"
                        } ${
                          podeEditarEstrutura && !loading
                            ? "cursor-grab active:cursor-grabbing"
                            : "cursor-default"
                        }`}
                        title={
                          podeEditarEstrutura
                            ? "Arraste para um alojamento"
                            : "Acesso somente leitura"
                        }
                      >
                        <Move size={14} className="shrink-0" />
                        <span className="truncate">
                          {adolescente.nomeCompleto}
                        </span>
                        {adolescente.numeroSms && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                            SMS {adolescente.numeroSms}
                          </span>
                        )}
                        {totalConflitos > 0 && (
                          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                            {totalConflitos}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {casasNormalizadas.map((casa) => (
                <div
                  key={casa.id}
                  id={`casa-${casa.numero}`}
                  className={`rounded-xl bg-white border-2 shadow-md hover:shadow-lg transition-all duration-500 p-6 ${
                    casaHighlighted === casa.numero
                      ? "border-indigo-500 ring-4 ring-indigo-300 ring-opacity-50 animate-pulse"
                      : "border-gray-200"
                  }`}
                >
                  {(() => {
                    const etiquetaDestinacao =
                      obterEtiquetaCasaOperacional(casa);
                    const classesDestinacao = obterClassesDestinacao(
                      casa.destinacaoOperacional,
                    );

                    return (
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
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${classesDestinacao}`}
                            >
                              {etiquetaDestinacao}
                            </span>
                            {casa.isolada && (
                              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                Isolada
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {casa.alojamentos.map((aloj) => {
                      const avaliacao = avaliarRiscoAlojamento(aloj);
                      const ocupante = aloj.adolescentes[0];
                      const interditado =
                        aloj.statusManutencao === "INTERDITADO";
                      const dropAtivo = alojamentoDropAtivoId === aloj.id;
                      const nomePreferencial =
                        ocupante?.nomeSocial || ocupante?.nomeCompleto || "";
                      const nomeResumido = obterNomeResumido(nomePreferencial);
                      const temMesmoAtoInfracional = ocupante
                        ? adolescentesMesmoAtoNaCasaIds.has(ocupante.id)
                        : false;
                      const temConflitos = ocupante
                        ? (conflitosInternos[ocupante.id]?.length || 0) > 0 ||
                          (conflitosExternos[ocupante.id]?.length || 0) > 0
                        : false;

                      const handleClickConflito = () => {
                        if (ocupante) {
                          setModalAnaliseImpacto({
                            aberto: true,
                            adolescenteId: ocupante.id,
                            adolescenteNome:
                              ocupante.nomeCompleto || "Desconhecido",
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
                          draggable={
                            podeEditarEstrutura && Boolean(ocupante) && !loading
                          }
                          onDragStart={(event) => {
                            if (!ocupante) return;
                            iniciarArrasteAdolescente(event, ocupante, aloj.id);
                          }}
                          onDragEnd={limparArrasteAdolescente}
                          onDragOver={(event) =>
                            handleDragOverAlojamento(event, aloj)
                          }
                          onDragLeave={() => {
                            if (alojamentoDropAtivoId === aloj.id) {
                              setAlojamentoDropAtivoId(null);
                            }
                          }}
                          onDrop={(event) =>
                            handleDropAlojamento(event, casa, aloj)
                          }
                          disabled={loading}
                          className={`
                          relative p-3 rounded-lg text-xs font-bold
                          transition-all hover:scale-105 border-2 h-full
                          flex flex-col items-center justify-center gap-1
                          ${avaliacao.corClass}
                          ${
                            dropAtivo
                              ? "ring-4 ring-indigo-400 ring-offset-2 scale-105"
                              : ""
                          }
                          ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                        `}
                          title={
                            interditado
                              ? `Alojamento ${aloj.numeroAlojamento} - Interditado`
                              : adolescenteArrastado
                                ? `Soltar em alojamento ${aloj.numeroAlojamento}`
                                : ocupante && temConflitos
                                  ? `${ocupante.nomeCompleto} - Clique para visualizar | Clique no í­cone vermelho para analisar conflitos`
                                  : ocupante
                                    ? `${ocupante.nomeCompleto} - Clique para visualizar`
                                    : `Alojamento ${aloj.numeroAlojamento} - Clique para alocar`
                          }
                        >
                          {renderIconesAlerta(
                            aloj,
                            temConflitos,
                            handleClickConflito,
                            avaliacao,
                            temMesmoAtoInfracional,
                          )}
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

      {loading && casas.length > 0 && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 rounded-full border border-indigo-200 bg-white/95 px-4 py-3 text-sm font-semibold text-indigo-700 shadow-xl backdrop-blur">
            <Loader2 className="animate-spin" size={18} />
            <span>Sincronizando dados com o servidor...</span>
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
        readOnly={!podeEditarEstrutura}
        onDesalocar={async (alojamentoId, adolescenteId, motivo) => {
          await handleDesalocar(alojamentoId, adolescenteId, motivo);
        }}
        desinternandoId={desinternandoId}
        onDesinternar={handleDesinternar}
        onTransferir={handleTransferir}
        onSolicitarAlocacao={() => {
          if (modalDetalhes.alojamento) {
            abrirModalAlocacao(modalDetalhes.alojamento);
          }
          fecharModalDetalhes();
        }}
        onInterditar={(
          alojamentoId,
          justificativa,
          documentoTipo,
          documentoReferencia,
        ) =>
          handleAlterarStatusAlojamento(
            alojamentoId,
            "INTERDITADO",
            justificativa,
            documentoTipo,
            documentoReferencia,
          )
        }
        onLiberarInterdicao={(
          alojamentoId,
          justificativa,
          documentoTipo,
          documentoReferencia,
        ) =>
          handleAlterarStatusAlojamento(
            alojamentoId,
            "LIVRE",
            justificativa,
            documentoTipo,
            documentoReferencia,
          )
        }
      />

      <ModalAlocacao
        isOpen={modalAlocacaoAberto}
        onClose={fecharModalAlocacao}
        alojamento={alojamentoSelecionado}
        adolescentes={adolescentes}
        adolescenteInicialId={adolescenteInicialAlocacaoId}
        onAlocar={handleAlocar}
      />

      <ModalAnaliseImpacto
        isOpen={modalAnaliseImpacto.aberto}
        onClose={() => {
          setModalAnaliseImpacto({
            aberto: false,
            adolescenteId: null,
            adolescenteNome: null,
            adolescenteAlocado: false,
            conflitos: [],
          });
          modalAnaliseAbertoRef.current = false;
          if (refreshPendenteRef.current && !devePausarAtualizacao()) {
            refreshPendenteRef.current = false;
            solicitarAtualizacao(consumirRefreshForcado());
          }
        }}
        adolescenteId={modalAnaliseImpacto.adolescenteId || ""}
        adolescenteNome={modalAnaliseImpacto.adolescenteNome || ""}
        adolescenteAlocado={modalAnaliseImpacto.adolescenteAlocado}
        conflitos={modalAnaliseImpacto.conflitos}
      />
    </div>
  );
}
