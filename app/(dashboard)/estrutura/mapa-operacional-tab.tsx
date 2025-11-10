"use client";

import { useState, useEffect, useCallback } from "react"; 
import { MapaInterativo } from "@/components/mapa/mapa-interativo";
import { Loader2, AlertCircle } from "lucide-react";
import type { Casa, Adolescente, Conflito } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";

export function MapaOperacionalTab() {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflitosExternos, setConflitosExternos] = useState<
    Record<string, ImpactoConflitoExterno[]>
  >({});

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Carregar adolescentes com conflitos/alertas completos
      const adolescentesResponse = await fetch("/api/adolescentes");

      if (!adolescentesResponse.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const payload = await adolescentesResponse.json();
      const adolescentesLista: any[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      const adolescentesFormatados: Adolescente[] = adolescentesLista.map(
        (a: any) => ({
          id: a.id,
          nomeCompleto: a.nomeCompleto,
          nomeSocial: a.nomeSocial ?? undefined,
          numeroSms: a.numeroSms ?? undefined,
          fotoUrl: a.fotoUrl ?? null,
          alojamentoAtualId:
            a.alojamentoAtualId ??
            a.alojamentoAtual?.id ??
            null,
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
          faccaoNumeroMembro: a.faccaoNumeroMembro ?? null,
          faccao: a.faccao
            ? {
                id: a.faccao.id,
                nome: a.faccao.nome ?? a.faccao.nomeFaccao,
                numeroMembro: a.faccao.numeroMembro ?? null,
              }
            : null,
          conflitosA: (a.conflitosA || []) as Conflito[],
          conflitosB: (a.conflitosB || []) as Conflito[],
          conflitosResolvidos: (a.conflitosResolvidos || []) as Conflito[],
          riscoFuga: a.riscoFuga ?? null,
          grupos: a.grupos ?? [],
          tatuagens: a.tatuagens ?? [],
        })
      );

      setAdolescentes(adolescentesFormatados);

      // 2. Carregar casas e alojamentos usando os dados completos dos adolescentes
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

          let adolescenteCompleto: Adolescente | null = null;
          if (ocupanteBruto) {
            adolescenteCompleto =
              adolescentesFormatados.find((a) => a.id === ocupanteBruto.id) ??
              null;
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
                  conflitosResolvidos:
                    (ocupanteBruto.conflitosResolvidos ?? []) as Conflito[],
                } satisfies Adolescente)
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
            icones: aloj.icones ?? [],
            alertas: aloj.alertas ?? [],
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
        console.warn("Falha ao carregar conflitos externos:", erroImpacto);
      }

      setCasas(casasFormatadas);
      setConflitosExternos(mapaImpactos);
    } catch (error) {
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
          // ignore invalid payloads
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

  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ): Promise<void> => {
    try {
      const response = await fetch("/api/alocar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId: adolescenteId,
          alojamentoId: alojamentoId,
          justificativa: justificativa,
          medidas_adicionais: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao alocar adolescente");
      }

      const data = await response.json();

      alert(
        `Adolescente alocado com sucesso!\n\nNivel de risco: ${data.nivel_risco ?? "BAIXO"}\nAlertas processados: ${data.alertas_processados ?? 0}`
      );

      await carregarDados();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao realizar alocacao:\n${errorMessage}`);
    }
  };

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
          motivo: "Desalocacao manual via mapa operacional",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao desalocar adolescente");
      }

      const data = await response.json();
      await carregarDados();
      return data.mensagem || "Adolescente removido do alojamento";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(errorMessage);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-xl font-semibold text-gray-700">
            Carregando mapa operacional...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Buscando dados de casas e adolescentes
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-red-200 p-8">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 rounded-full p-3">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Erro ao Carregar Mapa
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={carregarDados}
              className="bg-red-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
            <div className="mt-4 text-sm text-gray-500">
              <p className="font-semibold mb-2">Possiveis causas:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Banco de dados nao conectado</li>
                <li>Execute: npx prisma db push</li>
                <li>Inicialize a estrutura na aba "Visao Geral"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MapaInterativo
        casas={casas}
        adolescentes={adolescentes}
        conflitosExternos={conflitosExternos}
        onAlocar={handleAlocar}
        onDesalocar={handleDesalocar}
      />
    </div>
  );
}
