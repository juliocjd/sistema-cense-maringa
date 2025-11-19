"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Home,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bed,
  Activity,
  Lock,
  MapPin,
  AlertCircle,
} from "lucide-react";
import type { Casa, Alojamento, Adolescente } from "@/types";

type EstatisticasTabProps = {
  casas: Casa[];
  totalAlojamentos: number;
};

export function EstatisticasTab({ casas: casasIniciais, totalAlojamentos }: EstatisticasTabProps) {
  const [casas, setCasas] = useState<Casa[]>(casasIniciais ?? []);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Carregar adolescentes
        const adolescentesResponse = await fetch("/api/adolescentes", {
          cache: "no-store",
        });
        if (adolescentesResponse.ok) {
          const payload = await adolescentesResponse.json();
          const adolescentesData: Adolescente[] = Array.isArray(payload?.data)
            ? payload.data
            : [];
          setAdolescentes(adolescentesData);
        }

        // Carregar casas atualizadas
        const casasResponse = await fetch("/api/casas/status?refresh=1", {
          cache: "no-store",
        });
        if (casasResponse.ok) {
          const casasData = await casasResponse.json();
          const casasFormatadas: Casa[] = casasData.casas.map((casa: any) => ({
            id: casa.id,
            numero: casa.numero,
            nome: casa.nome,
            isolada: casa.isolada,
            alojamentos: casa.alojamentos.map((aloj: any) => ({
              id: aloj.id,
              casaId: casa.id,
              numeroAlojamento: aloj.numero,
              ala: aloj.ala,
              statusManutencao: aloj.status_manutencao,
              nivelRisco: aloj.nivel_risco,
              adolescentes: aloj.ocupante ? [aloj.ocupante] : [],
            } as Alojamento)),
          }));
          setCasas(casasFormatadas);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const totalAlojamentosAtual = casas.reduce(
      (acc, casa) => acc + casa.alojamentos.length,
      0
    );

    const alojamentosOcupados = casas.reduce(
      (acc, casa) =>
        acc + casa.alojamentos.filter((a) => a.adolescentes && a.adolescentes.length > 0).length,
      0
    );

    const alojamentosInterditados = casas.reduce(
      (acc, casa) =>
        acc + casa.alojamentos.filter((a) => a.statusManutencao === "INTERDITADO").length,
      0
    );

    const alojamentosLivres = totalAlojamentosAtual - alojamentosOcupados - alojamentosInterditados;

    const taxaOcupacao = totalAlojamentosAtual > 0
      ? ((alojamentosOcupados / (totalAlojamentosAtual - alojamentosInterditados)) * 100).toFixed(1)
      : "0.0";

    const adolescentesAtivos = adolescentes.filter((a) => a.statusUnidade === "ATIVO").length;
    const adolescentesNaoAlocados = adolescentes.filter(
      (a) => a.statusUnidade === "ATIVO" && !a.alojamentoAtualId
    ).length;

    // Alertas
    const adolescentesComRiscoSuicidio = adolescentes.filter(
      (a) => a.statusUnidade === "ATIVO" && a.alertaRiscoSuicidio
    ).length;
    const adolescentesComPerfilMapeado = adolescentes.filter(
      (a) => a.statusUnidade === "ATIVO" && a.alertaPerfilMapeado
    ).length;
    const adolescentesComAlertaSaude = adolescentes.filter(
      (a) => a.statusUnidade === "ATIVO" && a.alertaSaudeConfidencial
    ).length;

    // Distribuição por nível de risco
    const distribuicaoRisco = casas.reduce(
      (acc, casa) => {
        casa.alojamentos.forEach((aloj) => {
          if (aloj.adolescentes && aloj.adolescentes.length > 0) {
            const nivel = aloj.nivelRisco ?? 0;
            acc[nivel] = (acc[nivel] || 0) + 1;
          }
        });
        return acc;
      },
      {} as Record<number, number>
    );

    // Distribuição por casa
    const distribuicaoPorCasa = casas.map((casa) => ({
      nome: casa.nome,
      numero: casa.numero,
      isolada: casa.isolada,
      total: casa.alojamentos.length,
      ocupados: casa.alojamentos.filter((a) => a.adolescentes && a.adolescentes.length > 0)
        .length,
      livres: casa.alojamentos.filter(
        (a) =>
          (!a.adolescentes || a.adolescentes.length === 0) &&
          a.statusManutencao !== "INTERDITADO"
      ).length,
      interditados: casa.alojamentos.filter((a) => a.statusManutencao === "INTERDITADO")
        .length,
    }));

    // Distribuição por ala
    const distribuicaoPorAla = casas.reduce(
      (acc, casa) => {
        casa.alojamentos.forEach((aloj) => {
          const ala = aloj.ala || "Sem ala";
          if (!acc[ala]) {
            acc[ala] = { total: 0, ocupados: 0, livres: 0 };
          }
          acc[ala].total++;
          if (aloj.adolescentes && aloj.adolescentes.length > 0) {
            acc[ala].ocupados++;
          } else if (aloj.statusManutencao !== "INTERDITADO") {
            acc[ala].livres++;
          }
        });
        return acc;
      },
      {} as Record<string, { total: number; ocupados: number; livres: number }>
    );

    return {
      totalAlojamentosAtual,
      alojamentosOcupados,
      alojamentosLivres,
      alojamentosInterditados,
      taxaOcupacao,
      adolescentesAtivos,
      adolescentesNaoAlocados,
      adolescentesComRiscoSuicidio,
      adolescentesComPerfilMapeado,
      adolescentesComAlertaSaude,
      distribuicaoRisco,
      distribuicaoPorCasa,
      distribuicaoPorAla,
    };
  }, [casas, adolescentes]);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bed className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600">Total Alojamentos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAlojamentosAtual}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600">Ocupados</p>
              <p className="text-3xl font-bold text-gray-900">{stats.alojamentosOcupados}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <MapPin className="text-yellow-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600">Livres</p>
              <p className="text-3xl font-bold text-gray-900">{stats.alojamentosLivres}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600">Interditados</p>
              <p className="text-3xl font-bold text-gray-900">{stats.alojamentosInterditados}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Taxa de ocupação */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-xl">
              <TrendingUp className="text-indigo-600" size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Taxa de Ocupação</h3>
              <p className="text-sm text-gray-600">
                Excluindo alojamentos interditados
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold text-indigo-900">{stats.taxaOcupacao}%</p>
            <p className="text-sm text-gray-600 mt-1">
              {stats.alojamentosOcupados} de {stats.totalAlojamentosAtual - stats.alojamentosInterditados} disponíveis
            </p>
          </div>
        </div>
      </div>

      {/* Adolescentes e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="text-purple-600" size={24} />
            Adolescentes
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Ativos na unidade</span>
              <span className="text-2xl font-bold text-purple-900">{stats.adolescentesAtivos}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Não alocados</span>
              <span className="text-2xl font-bold text-orange-900">{stats.adolescentesNaoAlocados}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={24} />
            Alertas Ativos
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-orange-600" size={16} />
                <span className="text-sm font-semibold text-gray-700">Risco de suicídio</span>
              </div>
              <span className="text-2xl font-bold text-orange-900">{stats.adolescentesComRiscoSuicidio}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="text-purple-600" size={16} />
                <span className="text-sm font-semibold text-gray-700">Perfil mapeado</span>
              </div>
              <span className="text-2xl font-bold text-purple-900">{stats.adolescentesComPerfilMapeado}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="text-blue-600" size={16} />
                <span className="text-sm font-semibold text-gray-700">Alerta de saúde</span>
              </div>
              <span className="text-2xl font-bold text-blue-900">{stats.adolescentesComAlertaSaude}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição por nível de risco */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="text-gray-600" size={24} />
          Distribuição por Nível de Risco (Alojamentos Ocupados)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[0, 1, 2, 3, 4, 5].map((nivel) => {
            const quantidade = stats.distribuicaoRisco[nivel] || 0;
            const cores = {
              0: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-900" },
              1: { bg: "bg-green-100", border: "border-green-400", text: "text-green-900" },
              2: { bg: "bg-lime-100", border: "border-lime-400", text: "text-lime-900" },
              3: { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-900" },
              4: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-900" },
              5: { bg: "bg-red-100", border: "border-red-400", text: "text-red-900" },
            };
            const cor = cores[nivel as keyof typeof cores];

            return (
              <div
                key={nivel}
                className={`p-4 rounded-lg border-2 ${cor.bg} ${cor.border}`}
              >
                <p className="text-sm font-semibold text-gray-600 mb-1">Nível {nivel}</p>
                <p className={`text-3xl font-bold ${cor.text}`}>{quantidade}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribuição por casa */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Home className="text-gray-600" size={24} />
          Distribuição por Casa
        </h3>
        <div className="space-y-3">
          {stats.distribuicaoPorCasa.map((casa) => (
            <div
              key={casa.numero}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900">{casa.nome}</h4>
                  {casa.isolada && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      Isolada
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  Total: {casa.total} alojamentos
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                  <p className="font-semibold text-green-700">{casa.ocupados}</p>
                  <p className="text-xs text-gray-600">Ocupados</p>
                </div>
                <div className="bg-yellow-50 p-2 rounded text-center border border-yellow-200">
                  <p className="font-semibold text-yellow-700">{casa.livres}</p>
                  <p className="text-xs text-gray-600">Livres</p>
                </div>
                <div className="bg-red-50 p-2 rounded text-center border border-red-200">
                  <p className="font-semibold text-red-700">{casa.interditados}</p>
                  <p className="text-xs text-gray-600">Interditados</p>
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(casa.ocupados / casa.total) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-400"
                    style={{ width: `${(casa.livres / casa.total) * 100}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(casa.interditados / casa.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribuição por ala */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="text-gray-600" size={24} />
          Distribuição por Ala
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.distribuicaoPorAla)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([ala, dados]) => (
              <div
                key={ala}
                className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200"
              >
                <h4 className="font-bold text-indigo-900 mb-3">{ala}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">{dados.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ocupados:</span>
                    <span className="font-bold text-green-700">{dados.ocupados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Livres:</span>
                    <span className="font-bold text-yellow-700">{dados.livres}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(dados.ocupados / dados.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Atualizando estatísticas...
        </div>
      )}
    </div>
  );
}
