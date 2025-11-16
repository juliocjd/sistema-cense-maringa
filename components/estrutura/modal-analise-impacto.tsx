"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Info, Home, TrendingUp } from "lucide-react";

type TipoInternacao = "PROVISORIA" | "DEFINITIVA";

type ModalAnaliseImpactoProps = {
  isOpen: boolean;
  onClose: () => void;
  adolescenteId: string;
  adolescenteNome: string;
  adolescenteAlocado: boolean;
  conflitos?: Array<{
    id: string;
    adversario: { id: string; nome: string };
  }>;
};

type ResultadoAnalise = {
  conflito: {
    id: string;
    tipo: string;
    status: string;
    descricao?: string;
  };
  adolescenteA: {
    id: string;
    nome: string;
    sms: string | null;
    alocado: boolean;
    alojamento?: {
      id: string;
      numero: string;
      ala: string;
      casa: string;
    } | null;
  };
  adolescenteB: {
    id: string;
    nome: string;
    sms: string | null;
    alocado: boolean;
    alojamento?: {
      id: string;
      numero: string;
      ala: string;
      casa: string;
    } | null;
  };
  risco: string;
  requerAcao: boolean;
  mensagem: string;
  analiseProximidade?: {
    mesmaCasa: boolean;
    mesmaAla: boolean;
    saoFrontais: boolean;
    proximidade: string;
  } | null;
  sugestoes?: Array<{
    alojamento: {
      id: string;
      numero: string;
      ala: string;
      casa: string;
    };
    nivelRisco: number;
    categoria: string;
    motivos: string[];
  }>;
};

export function ModalAnaliseImpacto({
  isOpen,
  onClose,
  adolescenteId,
  adolescenteNome,
  adolescenteAlocado,
  conflitos = [],
}: ModalAnaliseImpactoProps) {
  const [tipoInternacao, setTipoInternacao] = useState<TipoInternacao | null>(null);
  const [casaEspecifica, setCasaEspecifica] = useState<number | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoAnalise[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Limpar state quando o modal abre com um novo adolescente
  useEffect(() => {
    if (isOpen) {
      setTipoInternacao(null);
      setCasaEspecifica(null);
      setAnalisando(false);
      setResultados([]);
      setErro(null);
    }
  }, [isOpen, adolescenteId]);

  if (!isOpen) return null;

  const handleAnalisar = async () => {
    if (!tipoInternacao) {
      setErro("Por favor, selecione o tipo de internação");
      return;
    }

    setAnalisando(true);
    setErro(null);
    setResultados([]);

    try {
      let resultadosRaw: any[];

      if (adolescenteAlocado) {
        // CASO 1: Adolescente JÁ está alocado
        // Usar motor centralizado para analisar risco do alojamento atual

        // 1. Buscar informações do adolescente
        const adolescenteResponse = await fetch(`/api/adolescentes/${adolescenteId}`);
        if (!adolescenteResponse.ok) {
          throw new Error("Erro ao buscar dados do adolescente");
        }
        const adolescente = await adolescenteResponse.json();

        if (!adolescente.alojamentoAtualId) {
          throw new Error("Adolescente não possui alojamento atual");
        }

        // 2. Analisar risco do alojamento ATUAL usando motor completo
        const riscoAtualResponse = await fetch(
          `/api/verificar-alocacao?adolescenteId=${adolescenteId}&alojamentoId=${adolescente.alojamentoAtualId}`,
          { method: "GET" }
        );

        if (!riscoAtualResponse.ok) {
          throw new Error("Erro ao analisar risco do alojamento atual");
        }

        const riscoAtual = await riscoAtualResponse.json();

        // 3. Buscar casas para avaliar opções de realocação
        const casasResponse = await fetch("/api/casas/status");
        if (!casasResponse.ok) {
          throw new Error("Erro ao buscar casas");
        }
        const casasData = await casasResponse.json();
        const casas = casasData.casas || [];

        // 4. Encontrar todos os alojamentos vagos
        const alojamentosVagos: any[] = [];
        casas.forEach((casa: any) => {
          casa.alojamentos?.forEach((aloj: any) => {
            // API retorna status_manutencao em snake_case
            const statusManutencao = aloj.status_manutencao || aloj.statusManutencao;
            if (
              statusManutencao !== "INTERDITADO" &&
              aloj.id !== adolescente.alojamentoAtualId && // Excluir alojamento atual
              (!aloj.ocupante && !aloj.adolescentes ||
               (Array.isArray(aloj.adolescentes) && aloj.adolescentes.length === 0))
            ) {
              alojamentosVagos.push({
                ...aloj,
                casa: { id: casa.id, nome: casa.nome, numero: casa.numero },
              });
            }
          });
        });

        // 5. Se risco atual >= 3 (ATENÇÃO), avaliar opções de realocação
        let sugestoes: any[] = [];
          if (riscoAtual.nivel_numerico >= 3) {
            const batchResponse = await fetch(
              "/api/verificar-alocacao/batch",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  adolescenteId,
                  alojamentoIds: alojamentosVagos.map((aloj) => aloj.id),
                }),
              }
            );

            if (!batchResponse.ok) {
              const erroBatch = await batchResponse.json().catch(() => null);
              throw new Error(
                erroBatch?.erro ||
                  "Erro ao avaliar alojamentos para realocação"
              );
            }

            const batchData = await batchResponse.json();

            const resultadosBatch: Array<{
              alojamentoId: string;
              sucesso: boolean;
              erro?: string;
              dados?: any;
            }> = Array.isArray(batchData?.resultados)
              ? batchData.resultados
              : [];

            const avaliacoes = resultadosBatch.map((item) => {
              const aloj = alojamentosVagos.find((a) => a.id === item.alojamentoId);
              if (!item.sucesso || !item.dados || !aloj) {
                return null;
              }

              return {
                alojamento: {
                  id: aloj.id,
                  numero: aloj.numero || aloj.numeroAlojamento,
                  ala: aloj.ala,
                  casa:
                    aloj.casa.nome ||
                    `Casa ${String(aloj.casa.numero).padStart(2, "0")}`,
                  casaNumero: aloj.casa.numero,
                },
                nivelRisco: item.dados.nivel_numerico ?? 3,
                categoria: item.dados.nivel_risco ?? "DESCONHECIDO",
                motivos: item.dados.motivos ?? [],
                permiteAlocacao: item.dados.permite_alocacao ?? false,
              };
            });

          // Filtrar sugestões válidas que melhoram o risco atual
          let sugestoesValidas = avaliacoes.filter(
            (a): a is NonNullable<typeof a> =>
              a !== null &&
              a.permiteAlocacao &&
              a.nivelRisco < riscoAtual.nivel_numerico
          );

          // Aplicar filtro de casa
          if (casaEspecifica !== null) {
            sugestoesValidas = sugestoesValidas.filter(
              (a) => a.alojamento.casaNumero === casaEspecifica
            );
          } else {
            // Aplicar regras de casa padrão (mesmo em realocação)
            if (tipoInternacao === "PROVISORIA") {
              sugestoesValidas = sugestoesValidas.filter(
                (a) => a.alojamento.casaNumero === 1
              );
            } else if (tipoInternacao === "DEFINITIVA") {
              sugestoesValidas = sugestoesValidas.filter((a) => {
                const casaNum = a.alojamento.casaNumero;

                // Casas 02-07: sempre permitidas
                if (casaNum >= 2 && casaNum <= 7) {
                  return true;
                }

                // Casa 08: apenas se não houver conflitos (Fase 3)
                if (casaNum === 8) {
                  return a.nivelRisco <= 1; // Apenas LIVRE ou SEGURO
                }

                // Casa 01: excluir (é provisória)
                return false;
              });
            }
          }

          // Separar seguras e arriscadas
          const sugestoesSeguras = sugestoesValidas
            .filter((a) => a.nivelRisco <= 3)
            .sort((a, b) => a.nivelRisco - b.nivelRisco);

          const sugestoesArriscadas = sugestoesValidas
            .filter((a) => a.nivelRisco >= 4)
            .sort((a, b) => a.nivelRisco - b.nivelRisco);

          // Determinar quantas sugestões mostrar
          const limiteSugestoesRealocar = casaEspecifica !== null ? 3 : 10;

          // Priorizar seguras, mas mostrar arriscadas se não houver alternativas
          sugestoes =
            sugestoesSeguras.length > 0
              ? sugestoesSeguras.slice(0, limiteSugestoesRealocar)
              : sugestoesArriscadas.slice(0, 3).map((sug) => ({
                  ...sug,
                  motivos: [
                    "⚠️ AVISO: Não há realocações seguras disponíveis. Esta é a opção MENOS ARRISCADA.",
                    ...sug.motivos,
                  ],
                }));
        }

        // 6. Criar resultado com análise completa do alojamento atual
        resultadosRaw = [
          {
            conflito: {
              id: "analise-atual",
              tipo: "ANALISE_ALOCACAO_ATUAL",
              status: riscoAtual.nivel_numerico >= 3 ? "ALERTA" : "OK",
              descricao: `Análise de risco para ${adolescenteNome}`,
            },
            adolescenteA: {
              id: adolescente.id,
              nome: adolescente.nomeCompleto,
              sms: adolescente.numeroSms,
              alocado: true,
              alojamento: {
                id: adolescente.alojamentoAtualId,
                numero: riscoAtual.alojamento?.numero || "?",
                ala: riscoAtual.alojamento?.ala || "?",
                casa: riscoAtual.alojamento?.casa || "?",
              },
            },
            adolescenteB: {
              id: "",
              nome: "",
              sms: null,
              alocado: false,
            },
            risco: riscoAtual.nivel_risco || "DESCONHECIDO",
            requerAcao: riscoAtual.nivel_numerico >= 3,
            mensagem: riscoAtual.nivel_numerico >= 3
              ? `ATENÇÃO: Risco ${riscoAtual.nivel_risco} detectado no alojamento atual (${riscoAtual.alertas?.length || 0} alerta(s))`
              : `Situação sob controle - Risco ${riscoAtual.nivel_risco}`,
            analiseProximidade: null,
            sugestoes,
            alertasDetalhados: riscoAtual.alertas || [],
          },
        ];
      } else {
        // CASO 2: Adolescente NÃO está alocado
        // Buscar alojamentos vagos e avaliar risco para cada um
        const casasResponse = await fetch("/api/casas/status");
        if (!casasResponse.ok) {
          throw new Error("Erro ao buscar casas");
        }
        const casasData = await casasResponse.json();
        const casas = casasData.casas || [];

        // Encontrar todos os alojamentos vagos
        const alojamentosVagos: any[] = [];
        casas.forEach((casa: any) => {
          casa.alojamentos?.forEach((aloj: any) => {
            // API retorna status_manutencao em snake_case
            const statusManutencao = aloj.status_manutencao || aloj.statusManutencao;
            if (
              statusManutencao !== "INTERDITADO" &&
              (!aloj.ocupante && !aloj.adolescentes ||
               (Array.isArray(aloj.adolescentes) && aloj.adolescentes.length === 0))
            ) {
              alojamentosVagos.push({
                ...aloj,
                casa: { id: casa.id, nome: casa.nome, numero: casa.numero },
              });
            }
          });
        });

        type AvaliacaoSugestao = {
          alojamento: {
            id: string;
            numero: string | number;
            ala: string | null;
            casa: string;
            casaNumero: number;
          };
          nivelRisco: number;
          categoria: string;
          motivos: string[];
          permiteAlocacao: boolean;
        };

        let avaliacoes: AvaliacaoSugestao[] = [];

        if (alojamentosVagos.length > 0) {
          const batchResponse = await fetch("/api/verificar-alocacao/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adolescenteId,
              alojamentoIds: alojamentosVagos.map((aloj) => aloj.id),
            }),
          });

          if (!batchResponse.ok) {
            throw new Error("Erro ao avaliar alojamentos vagos");
          }

          const batchData = await batchResponse.json();
          const resultados = Array.isArray(batchData.resultados)
            ? batchData.resultados
            : [];
          const mapaAlojamentos = new Map(
            alojamentosVagos.map((aloj) => [aloj.id, aloj])
          );

          avaliacoes = resultados
            .map((resultado: any): AvaliacaoSugestao | null => {
              const aloj = mapaAlojamentos.get(resultado.alojamentoId);
              if (!aloj || !resultado?.sucesso || !resultado?.dados) {
                return null;
              }

              return {
                alojamento: {
                  id: aloj.id,
                  numero: aloj.numero || aloj.numeroAlojamento,
                  ala: aloj.ala,
                  casa:
                    aloj.casa.nome ||
                    `Casa ${String(aloj.casa.numero).padStart(2, "0")}`,
                  casaNumero: aloj.casa.numero,
                },
                nivelRisco: resultado.dados.nivel_numerico ?? 3,
                categoria: resultado.dados.nivel_risco ?? "DESCONHECIDO",
                motivos: resultado.dados.motivos ?? [],
                permiteAlocacao: resultado.dados.permite_alocacao ?? false,
              };
            })
            .filter(
              (avaliacao: AvaliacaoSugestao | null): avaliacao is AvaliacaoSugestao =>
                avaliacao !== null
            );
        }

        // Filtrar sugestões por tipo de internação
        let sugestoesValidas = avaliacoes.filter(
          (a): a is NonNullable<typeof a> => a !== null && a.permiteAlocacao
        );

        // Se uma casa específica foi selecionada, filtrar apenas por ela
        if (casaEspecifica !== null) {
          sugestoesValidas = sugestoesValidas.filter(
            (a) => a.alojamento.casaNumero === casaEspecifica
          );
        } else {
          // REGRA 1: Internação Provisória = APENAS Casa 01
          // REGRA 2: Internação Definitiva = Casas 02-07
          // REGRA 3: Casa 08 (Fase 3) = Apenas sem conflitos ativos
          if (tipoInternacao === "PROVISORIA") {
            sugestoesValidas = sugestoesValidas.filter(
              (a) => a.alojamento.casaNumero === 1
            );
          } else if (tipoInternacao === "DEFINITIVA") {
            sugestoesValidas = sugestoesValidas.filter((a) => {
              const casaNum = a.alojamento.casaNumero;

              // Casas 02-07: sempre permitidas
              if (casaNum >= 2 && casaNum <= 7) {
                return true;
              }

              // Casa 08: apenas se não houver conflitos
              // (Fase 3 é para progressão positiva, sem conflitos ativos)
              if (casaNum === 8) {
                // Verificar se adolescente tem conflitos
                // Se chegou aqui com nível <= 3, significa sem conflitos graves
                return a.nivelRisco <= 1; // Apenas LIVRE ou SEGURO
              }

              // Casa 01: excluir (é provisória)
              return false;
            });
          }
        }

        // Separar sugestões seguras (0-3) e arriscadas (4-5)
        const sugestoesSeguras = sugestoesValidas
          .filter((a) => a.nivelRisco <= 3)
          .sort((a, b) => a.nivelRisco - b.nivelRisco);

        const sugestoesArriscadas = sugestoesValidas
          .filter((a) => a.nivelRisco >= 4)
          .sort((a, b) => a.nivelRisco - b.nivelRisco);

        // Determinar quantas sugestões mostrar
        const limitesugestoes = casaEspecifica !== null ? 3 : 10;

        // Se não há opções seguras, mostrar as menos arriscadas com aviso
        const sugestoes =
          sugestoesSeguras.length > 0
            ? sugestoesSeguras.slice(0, limitesugestoes)
            : sugestoesArriscadas.slice(0, 3).map((sug) => ({
                ...sug,
                motivos: [
                  "⚠️ AVISO: Não há alojamentos seguros disponíveis. Esta é a opção MENOS ARRISCADA.",
                  ...sug.motivos,
                ],
              }));

        // Criar um resultado fictício que contém as sugestões
        resultadosRaw = [
          {
            conflito: {
              id: "sugestao-alocacao",
              tipo: "SUGESTAO_ALOCACAO",
              status: "PENDENTE",
              descricao: `Sugestões de alocação para ${adolescenteNome}`,
            },
            adolescenteA: {
              id: adolescenteId,
              nome: adolescenteNome,
              sms: null,
              alocado: false,
            },
            adolescenteB: {
              id: "",
              nome: "",
              sms: null,
              alocado: false,
            },
            risco: sugestoes.length > 0 ? sugestoes[0].categoria : "DESCONHECIDO",
            requerAcao: true,
            mensagem:
              sugestoes.length > 0
                ? `Encontradas ${sugestoes.length} opções seguras de alocação`
                : "Nenhuma opção segura de alocação disponível",
            sugestoes,
          },
        ];
      }

      // Filtrar sugestões baseadas no tipo de internação
      const resultadosFiltrados = resultadosRaw.map((resultado) => {
        if (!resultado.sugestoes || resultado.sugestoes.length === 0) {
          return resultado;
        }

        // Aplicar filtros baseados no tipo de internação
        let sugestoesFiltradas = [...resultado.sugestoes];

        if (tipoInternacao === "PROVISORIA") {
          // Priorizar Casa 01
          sugestoesFiltradas = sugestoesFiltradas.sort((a, b) => {
            const aCasa01 = a.alojamento.casa.includes("Casa 01") || a.alojamento.casa.includes("Casa 1");
            const bCasa01 = b.alojamento.casa.includes("Casa 01") || b.alojamento.casa.includes("Casa 1");

            if (aCasa01 && !bCasa01) return -1;
            if (!aCasa01 && bCasa01) return 1;

            // Se nenhum é Casa 01, priorizar Casa 02 e 03
            const aCasa0203 = a.alojamento.casa.includes("Casa 02") ||
                             a.alojamento.casa.includes("Casa 2") ||
                             a.alojamento.casa.includes("Casa 03") ||
                             a.alojamento.casa.includes("Casa 3");
            const bCasa0203 = b.alojamento.casa.includes("Casa 02") ||
                             b.alojamento.casa.includes("Casa 2") ||
                             b.alojamento.casa.includes("Casa 03") ||
                             b.alojamento.casa.includes("Casa 3");

            if (aCasa0203 && !bCasa0203) return -1;
            if (!aCasa0203 && bCasa0203) return 1;

            return a.nivelRisco - b.nivelRisco;
          });

          // Adicionar alertas se sugerindo fora da Casa 01
          sugestoesFiltradas = sugestoesFiltradas.map((sug) => {
            const ehCasa01 = sug.alojamento.casa.includes("Casa 01") || sug.alojamento.casa.includes("Casa 1");
            if (!ehCasa01) {
              return {
                ...sug,
                motivos: [
                  "⚠️ ATENÇÃO: Internação Provisória geralmente deve ser na Casa 01",
                  "Recomendado apenas devido ao alto risco na Casa 01",
                  ...sug.motivos,
                ],
              };
            }
            return sug;
          });
        } else if (tipoInternacao === "DEFINITIVA") {
          // Evitar Casa 01
          sugestoesFiltradas = sugestoesFiltradas.sort((a, b) => {
            const aCasa01 = a.alojamento.casa.includes("Casa 01") || a.alojamento.casa.includes("Casa 1");
            const bCasa01 = b.alojamento.casa.includes("Casa 01") || b.alojamento.casa.includes("Casa 1");

            if (aCasa01 && !bCasa01) return 1;
            if (!aCasa01 && bCasa01) return -1;

            return a.nivelRisco - b.nivelRisco;
          });

          // Adicionar alertas se sugerindo Casa 01
          sugestoesFiltradas = sugestoesFiltradas.map((sug) => {
            const ehCasa01 = sug.alojamento.casa.includes("Casa 01") || sug.alojamento.casa.includes("Casa 1");
            if (ehCasa01) {
              return {
                ...sug,
                motivos: [
                  "⚠️ ATENÇÃO: Casa 01 é para Internação Provisória",
                  "Recomendado apenas devido aos riscos extremamente altos em outros locais",
                  ...sug.motivos,
                ],
              };
            }
            return sug;
          });
        }

        return {
          ...resultado,
          sugestoes: sugestoesFiltradas,
        };
      });

      setResultados(resultadosFiltrados);
    } catch (error) {
      console.error("Erro ao analisar impacto:", error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao analisar impacto dos conflitos"
      );
    } finally {
      setAnalisando(false);
    }
  };

  const getNivelRiscoCor = (risco: string) => {
    switch (risco) {
      case "CRITICO":
        return "text-red-600 bg-red-50 border-red-200";
      case "ALTO":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "MEDIO":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "BAIXO":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getCategoriaCor = (categoria: string) => {
    switch (categoria) {
      case "SEGURO":
        return "bg-green-100 text-green-800";
      case "MONITORAR":
        return "bg-blue-100 text-blue-800";
      case "ATENCAO":
        return "bg-yellow-100 text-yellow-800";
      case "ALTO":
        return "bg-orange-100 text-orange-800";
      case "CRITICO":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <AlertTriangle size={28} />
              Análise de Impacto de Conflitos
            </h2>
            <p className="text-indigo-100 mt-1">
              Adolescente: {adolescenteNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Seleção de Tipo de Internação */}
          {!resultados.length && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Tipo de Internação
                    </h3>
                    <p className="text-sm text-blue-700">
                      Selecione o tipo de internação do adolescente para receber
                      recomendações adequadas de alocação:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                      <li>
                        <strong>Internação Provisória:</strong> Prioriza Casa 01
                        (exceto em casos de alto risco)
                      </li>
                      <li>
                        <strong>Internação Definitiva:</strong> Evita Casa 01
                        (reservada para provisórios)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTipoInternacao("PROVISORIA")}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    tipoInternacao === "PROVISORIA"
                      ? "border-indigo-600 bg-indigo-50 shadow-lg"
                      : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Home
                      size={24}
                      className={
                        tipoInternacao === "PROVISORIA"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }
                    />
                    <h3
                      className={`font-bold text-lg ${
                        tipoInternacao === "PROVISORIA"
                          ? "text-indigo-900"
                          : "text-gray-700"
                      }`}
                    >
                      Internação Provisória
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prazo máximo de 45 dias. Prioridade na Casa 01.
                  </p>
                </button>

                <button
                  onClick={() => setTipoInternacao("DEFINITIVA")}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    tipoInternacao === "DEFINITIVA"
                      ? "border-indigo-600 bg-indigo-50 shadow-lg"
                      : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp
                      size={24}
                      className={
                        tipoInternacao === "DEFINITIVA"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }
                    />
                    <h3
                      className={`font-bold text-lg ${
                        tipoInternacao === "DEFINITIVA"
                          ? "text-indigo-900"
                          : "text-gray-700"
                      }`}
                    >
                      Internação Definitiva
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sentença judicial. Evitar Casa 01 (reservada para provisórios).
                  </p>
                </button>
              </div>

              {/* Seleção de Casa Específica (Opcional) */}
              {tipoInternacao && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Home className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-1">
                        Filtro por Casa Específica (Opcional)
                      </h3>
                      <p className="text-sm text-amber-700 mb-2">
                        Selecione uma casa para ver apenas os 3 melhores alojamentos disponíveis nessa casa, ordenados por nível de risco.
                      </p>
                      {tipoInternacao === "DEFINITIVA" && (
                        <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1 mt-2">
                          <strong>★ Casa 08 (Fase 3):</strong> Aceita apenas adolescentes SEM conflitos ativos (nível 0-1)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setCasaEspecifica(null)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        casaEspecifica === null
                          ? "border-amber-600 bg-amber-100 text-amber-900"
                          : "border-gray-300 bg-white text-gray-700 hover:border-amber-400"
                      }`}
                    >
                      Automático
                    </button>
                    {tipoInternacao === "PROVISORIA" ? (
                      <button
                        onClick={() => setCasaEspecifica(1)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          casaEspecifica === 1
                            ? "border-amber-600 bg-amber-100 text-amber-900"
                            : "border-gray-300 bg-white text-gray-700 hover:border-amber-400"
                        }`}
                      >
                        Casa 01
                      </button>
                    ) : (
                      <>
                        {[2, 3, 4, 5, 6, 7, 8].map((casa) => (
                          <button
                            key={casa}
                            onClick={() => setCasaEspecifica(casa)}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              casaEspecifica === casa
                                ? "border-amber-600 bg-amber-100 text-amber-900"
                                : "border-gray-300 bg-white text-gray-700 hover:border-amber-400"
                            } ${casa === 8 ? 'border-purple-300 bg-purple-50 hover:border-purple-400' : ''}`}
                            title={casa === 8 ? 'Casa 08 - Fase 3 (apenas sem conflitos)' : ''}
                          >
                            Casa {String(casa).padStart(2, '0')}
                            {casa === 8 && <span className="ml-1 text-xs text-purple-600">★</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {erro && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{erro}</p>
                </div>
              )}
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="space-y-6">
              {resultados.map((resultado, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Status do Conflito */}
                  <div
                    className={`p-4 border-b ${getNivelRiscoCor(resultado.risco)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">
                          Conflito: {resultado.adolescenteB.nome}
                        </h3>
                        <p className="text-sm mt-1">{resultado.mensagem}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-2xl">
                          {resultado.risco}
                        </span>
                        <p className="text-xs">Nível de Risco</p>
                      </div>
                    </div>
                  </div>

                  {/* Análise de Proximidade */}
                  {resultado.analiseProximidade && (
                    <div className="p-4 bg-gray-50 border-b">
                      <h4 className="font-semibold mb-3">
                        Análise de Proximidade
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Mesma Casa:</span>{" "}
                          <strong>
                            {resultado.analiseProximidade.mesmaCasa ? "SIM" : "NÃO"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-600">Mesma Ala:</span>{" "}
                          <strong>
                            {resultado.analiseProximidade.mesmaAla ? "SIM" : "NÃO"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-600">Frontais:</span>{" "}
                          <strong>
                            {resultado.analiseProximidade.saoFrontais ? "SIM" : "NÃO"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sugestões */}
                  {resultado.sugestoes && resultado.sugestoes.length > 0 && (
                    <div className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="text-green-600" size={18} />
                        Sugestões de Realocação
                      </h4>
                      <div className="space-y-3">
                        {resultado.sugestoes.slice(0, 3).map((sug, sugIdx) => (
                          <div
                            key={sugIdx}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-gray-900">
                                  {sug.alojamento.casa} - Alojamento{" "}
                                  {sug.alojamento.numero} (Ala {sug.alojamento.ala})
                                </h5>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoriaCor(
                                  sug.categoria
                                )}`}
                              >
                                {sug.categoria}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p className="mb-1">
                                <strong>Nível de Risco:</strong> {sug.nivelRisco}
                              </p>
                              <ul className="list-disc ml-5 space-y-1">
                                {sug.motivos.map((motivo, mIdx) => (
                                  <li key={mIdx}>{motivo}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sem sugestões */}
                  {(!resultado.sugestoes || resultado.sugestoes.length === 0) &&
                    resultado.requerAcao && (
                      <div className="p-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800 text-sm">
                            ⚠️ Não foram encontradas sugestões de realocação segura.
                            Considere revisar manualmente as opções disponíveis.
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {conflitos.length} conflito(s) ativo(s)
          </div>
          <div className="flex gap-3">
            {!resultados.length && (
              <button
                onClick={handleAnalisar}
                disabled={!tipoInternacao || analisando}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {analisando ? "Analisando..." : "Analisar Conflitos"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
