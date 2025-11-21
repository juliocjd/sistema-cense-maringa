"use client";

import { useState, useEffect, useCallback } from "react";
import { MapaInterativo } from "@/components/mapa/mapa-interativo";

import type { Casa, Adolescente, Conflito } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";

export default function MapaPage() {
  // Estados
  const [casas, setCasas] = useState<Casa[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflitosExternos, setConflitosExternos] = useState<
    Record<string, ImpactoConflitoExterno[]>
  >({});

  // Carregar dados do banco
  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // PASSO 1: Carregar TODOS os adolescentes com conflitos primeiro
      const adolescentesResponse = await fetch("/api/adolescentes");

      if (!adolescentesResponse.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const payload = await adolescentesResponse.json();
      const adolescentesLista: any[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      // Transformar dados dos adolescentes
      const adolescentesFormatados: Adolescente[] = adolescentesLista.map(
        (a: any) => ({
          id: a.id,
          nomeCompleto: a.nomeCompleto,
          nomeSocial: a.nomeSocial ?? undefined,
          numeroSms: a.numeroSms ?? undefined,
          fotoUrl: a.fotoUrl ?? null,
          vulgo: a.vulgo ?? null,
          alojamentoAtualId:
            a.alojamentoAtualId ?? a.alojamentoAtual?.id ?? null,
          statusUnidade: a.statusUnidade,
          alertaRiscoSuicidio: Boolean(a.alertaRiscoSuicidio),
          alertaPerfilMapeado: Boolean(a.alertaPerfilMapeado),
          alertaSaudeConfidencial: Boolean(a.alertaSaudeConfidencial),
          alertaSaudeDetalhes: a.alertaSaudeDetalhes ?? null,
          bairroOrigemId:
            a.bairroOrigemId ??
            a.bairroOrigem?.id ??
            null,
          bairroOrigem: a.bairroOrigem
            ? {
                id: a.bairroOrigem.id,
                nome:
                  a.bairroOrigem.nome ??
                  a.bairroOrigem.nomeBairro,
                cidade: a.bairroOrigem.cidade,
              }
            : null,
          faccaoGrupoId: a.faccaoGrupoId ?? null,
          faccaoFuncao: a.faccaoFuncao ?? null,
          faccaoInformacaoOrigem: a.faccaoInformacaoOrigem ?? null,
          faccaoInformacaoDetalhe: a.faccaoInformacaoDetalhe ?? null,
          faccao: a.faccao
            ? {
                id: a.faccao.id,
                nome: a.faccao.nome ?? a.faccao.nomeFaccao,
              }
            : null,
          conflitosA: (a.conflitosA || []) as Conflito[],
          conflitosB: (a.conflitosB || []) as Conflito[],
          riscoFuga: a.riscoFuga ?? null,
          tecnicoReferenciaId: a.tecnicoReferenciaId ?? null,
          tecnicoReferencia: a.tecnicoReferencia
            ? {
                id: a.tecnicoReferencia.id,
                nome: a.tecnicoReferencia.nome,
                atividade: a.tecnicoReferencia.atividade ?? null,
                email: a.tecnicoReferencia.email,
                telefone: a.tecnicoReferencia.telefone ?? null,
              }
            : null,
          atoInfracionalGravidade: Boolean(a.atoInfracionalGravidade ?? false),
          grupos: a.grupos ?? [],
          tatuagens: a.tatuagens ?? [],
          historicoInfracional: a.historicoInfracional ?? [],
          conflitosResolvidos: a.conflitosResolvidos ?? [],
          faseInternacaoAtualId: a.faseInternacaoAtualId ?? null,
          dataDesinternacao: a.dataDesinternacao ?? null,
        })
      );

      setAdolescentes(adolescentesFormatados);

      // PASSO 2: Carregar casas e alojamentos
      const casasResponse = await fetch("/api/casas/status");

      if (!casasResponse.ok) {
        throw new Error("Erro ao carregar dados das casas");
      }

      const casasData = await casasResponse.json();

      // PASSO 3: Transformar dados das casas USANDO os adolescentes completos com conflitos
      const casasFormatadas: Casa[] = casasData.casas.map((casa: any) => ({
        id: casa.id,
        numero: casa.numero,
        nome: casa.nome,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((aloj: any) => {
          const ocupanteBruto = aloj.ocupante;

          // Se tem ocupante, buscar dados completos do adolescente
          let adolescenteCompleto = null;
          if (ocupanteBruto) {
            adolescenteCompleto = adolescentesFormatados.find(
              (a) => a.id === ocupanteBruto.id
            );
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
                  alertaRiscoSuicidio:
                    ocupanteBruto.alerta_risco_suicidio ?? false,
                  alertaPerfilMapeado:
                    ocupanteBruto.alerta_perfil_mapeado ?? false,
                  alertaSaudeConfidencial:
                    ocupanteBruto.alerta_saude_confidencial ?? false,
                  alertaSaudeDetalhes: ocupanteBruto.alerta_saude_detalhes ?? null,
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
                  conflitosA: (ocupanteBruto.conflitosA ?? []) as Conflito[],
                  conflitosB: (ocupanteBruto.conflitosB ?? []) as Conflito[],
                  conflitosResolvidos: (ocupanteBruto.conflitosResolvidos ?? []) as Conflito[],
                  atoInfracionalGravidade: Boolean(ocupanteBruto.ato_infracional_gravidade ?? false),
                  tecnicoReferenciaId: ocupanteBruto.tecnico_referencia_id ?? null,
                  tecnicoReferencia: ocupanteBruto.tecnicoReferencia
                    ? {
                        id: ocupanteBruto.tecnicoReferencia.id,
                        nome: ocupanteBruto.tecnicoReferencia.nome,
                        atividade: ocupanteBruto.tecnicoReferencia.atividade ?? null,
                        email: ocupanteBruto.tecnicoReferencia.email,
                        telefone: ocupanteBruto.tecnicoReferencia.telefone ?? null,
                      }
                    : null,
                  grupos: [],
                  tatuagens: [],
                  historicoInfracional: ocupanteBruto.historicoInfracional ?? [],
                  riscoFuga: ocupanteBruto.risco_fuga ?? null,
                  faseInternacaoAtualId: ocupanteBruto.fase_internacao_atual_id ?? null,
                  dataDesinternacao: ocupanteBruto.data_desinternacao ?? null,
                } satisfies Adolescente)
              : null;

          const adolescenteParaMapa = adolescenteCompleto || adolescenteFallback;

          return {
            id: aloj.id,
            casaId: casa.id,
            numeroAlojamento: aloj.numero,
            ala: aloj.ala,
            statusManutencao: aloj.status_manutencao,
            alojamentoFrontalId: aloj.alojamento_frontal_id,
            corRisco: aloj.cor_risco,
            nivelRisco: aloj.nivel_risco,
            icones: aloj.icones || [],
            alertas: aloj.alertas || [],
            // Usar dados completos com conflitos; fallback com dados da API de casas
            adolescentes: adolescenteParaMapa ? [adolescenteParaMapa] : [],
          };
        }),
      }));

      let mapaImpactos: Record<string, ImpactoConflitoExterno[]> = {};
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
          mapaImpactos = lista.reduce(
            (acc, impacto) => {
              const adolescenteId = impacto?.adolescente?.id;
              if (!adolescenteId) {
                return acc;
              }
              if (!acc[adolescenteId]) {
                acc[adolescenteId] = [];
              }
              acc[adolescenteId].push(impacto);
              return acc;
            },
            {} as Record<string, ImpactoConflitoExterno[]>
          );
        }
      } catch (erroImpacto) {
        console.warn("[Mapa geral] Falha ao carregar conflitos externos:", erroImpacto);
      }

      setCasas(casasFormatadas);
      setConflitosExternos(mapaImpactos);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    let isActive = true;
    let eventSource: EventSource | null = null;

    const connect = () => {
      if (!isActive) return;
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
          // ignorar eventos invalidos
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        if (isActive) {
          setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isActive = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [carregarDados]);

  const handleDesalocar = async (
    alojamentoId: string,
    adolescenteId: string
  ): Promise<string> => {
    try {
      const response = await fetch("/api/alocar", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId,
          alojamentoId,
          motivo: "Desalocacao manual via mapa interativo",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao desalocar adolescente");
      }

      const data = await response.json();
      await carregarDados();
      return data.mensagem || "Adolescente removido do alojamento com sucesso!";
    } catch (error) {
      console.error("Erro ao desalocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(errorMessage);
    }
  };

  // Handler de alocação com tipos corretos
  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ): Promise<void> => {
    try {
      // Chamar API com campos CORRETOS
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
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao alocar adolescente");
      }

      const data = await response.json();

      // Mostrar notificação de sucesso com detalhes
      alert(
        `✅ Adolescente alocado com sucesso!\n\nNível de risco: ${data.nivel_risco || "BAIXO"}\nAlertas processados: ${data.alertas_processados || 0}`
      );

      // ✅ Recarregar dados do banco para atualizar o mapa
      await carregarDados();
    } catch (error) {
      console.error("Erro ao alocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`❌ Erro ao realizar alocação:\n${errorMessage}`);
    }
  };

  const handleDesinternar = async (adolescenteId: string): Promise<void> => {
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
    adolescente: Adolescente,
    destinoAlojamentoId: string,
    justificativa?: string
  ): Promise<void> => {
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
  ): Promise<void> => {
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-rose-200 border-t-rose-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">
            Carregando dados do mapa...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Buscando informações das casas e adolescentes
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-l-4 border-red-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Erro ao Carregar Dados
            </h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={carregarDados}
              className="w-full bg-rose-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-rose-700 transition-colors"
            >
              Tentar Novamente
            </button>
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-semibold">Possíveis causas:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Banco de dados não está rodando</li>
                <li>Execute: npx prisma db push</li>
                <li>
                  Execute: POST /api/estrutura/inicializar (para criar casas)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mapa normal
  return (
    <div>
      <MapaInterativo
        casas={casas}
        adolescentes={adolescentes}
        conflitosExternos={conflitosExternos}
        onAlocar={handleAlocar}
        onDesalocar={handleDesalocar}
        onDesinternar={handleDesinternar}
        onTransferir={handleTransferir}
        onAlterarStatusAlojamento={handleAlterarStatusAlojamento}
      />
    </div>
  );
}
