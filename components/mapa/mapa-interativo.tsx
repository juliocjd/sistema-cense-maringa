"use client";

import { useState } from "react";
import { AlertTriangle, Lock, Activity } from "lucide-react";
import { ModalAlocacao } from "./modal-alocacao";
import type { Alojamento, Casa, Adolescente } from "@/types";

interface MapaInterativoProps {
  casas: Casa[];
  adolescentes: Adolescente[];
  onAlocar: (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ) => Promise<void>;
}

export function MapaInterativo({
  casas,
  adolescentes,
  onAlocar,
}: MapaInterativoProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [alojamentoSelecionado, setAlojamentoSelecionado] =
    useState<Alojamento | null>(null);

  // ==================== FUNÇÕES DE LÓGICA ====================

  function getCorAlojamento(alojamento: Alojamento) {
    if (alojamento.statusManutencao === "INTERDITADO") {
      return "bg-gray-400 border-gray-600";
    }

    const ocupante = alojamento.adolescentes[0];
    if (!ocupante) {
      return "bg-gray-50 border-gray-300 hover:bg-gray-100";
    }

    const conflitos = [...ocupante.conflitosA, ...ocupante.conflitosB];
    const temConflitoCritico = conflitos.some((c) => {
      const outro =
        c.adolescenteAId === ocupante.id ? c.adolescenteBId : c.adolescenteAId;
      if (alojamento.alojamentoFrontalId) {
        const frontal = casas
          .flatMap((casa) => casa.alojamentos)
          .find((a) => a.id === alojamento.alojamentoFrontalId);
        if (frontal?.adolescentes[0]?.id === outro) return true;
      }
      return casas
        .find((c) => c.id === alojamento.casaId)
        ?.alojamentos.some(
          (a) => a.ala === alojamento.ala && a.adolescentes[0]?.id === outro
        );
    });

    if (temConflitoCritico) {
      return "bg-red-100 border-red-400 shadow-lg shadow-red-200";
    }

    const temConflito = conflitos.length > 0;
    if (temConflito) {
      return "bg-yellow-100 border-yellow-400 shadow-lg shadow-yellow-200";
    }

    return "bg-green-100 border-green-400 shadow-lg shadow-green-200";
  }

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

  // ==================== COMPONENTE DE ALOJAMENTO ====================

  const Alojamento = ({ numero, casa }: { numero: string; casa: Casa }) => {
    const aloj = getAlojamento(casa, numero);
    if (!aloj) return null;

    const ocupante = aloj.adolescentes[0];
    const corClass = getCorAlojamento(aloj);
    const estaLivre = !ocupante && aloj.statusManutencao !== "INTERDITADO";

    const handleClick = () => {
      if (estaLivre) {
        setAlojamentoSelecionado({ ...aloj, casa } as any);
        setModalAberto(true);
      }
    };

    return (
      <button
        onClick={handleClick}
        className={`${corClass} relative rounded-lg border-2 p-3 flex flex-col items-center justify-center hover:scale-105 transition-all group ${
          estaLivre ? "cursor-pointer" : "cursor-default"
        }`}
        title={
          ocupante?.nomeCompleto || "Alojamento Livre - Clique para alocar"
        }
      >
        {getIconesAlerta(aloj)}
        <span className="font-bold text-xl text-gray-800">{numero}</span>
        {ocupante && (
          <span className="text-xs mt-1 text-gray-700 font-medium truncate w-full text-center">
            {ocupante.nomeCompleto.split(" ")[0]}
          </span>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 shadow-xl">
          {ocupante?.nomeCompleto || "Clique para alocar"}
        </div>
      </button>
    );
  };

  // ==================== COMPONENTE CASA PADRÃO ====================

  const CasaPadrao = ({ casa }: { casa: Casa }) => {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-rose-600 hover:shadow-rose-200 transition-shadow">
        {/* Cabeçalho */}
        <div className="flex items-center justify-center mb-4 pb-3 border-b-2 border-rose-200">
          <h3 className="font-bold text-rose-700 text-lg">{casa.nome}</h3>
          {casa.isolada && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
              Isolada
            </span>
          )}
        </div>

        {/* Layout da Casa */}
        <div className="flex gap-3">
          {/* ALA B (Esquerda) */}
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-bold text-orange-600 bg-orange-50 rounded-lg py-1 px-3">
              Ala B
            </div>
            <div className="space-y-2">
              <Alojamento numero="08" casa={casa} />
              <Alojamento numero="07" casa={casa} />
              <div className="h-8 flex items-center justify-center">
                <div className="w-full h-1 bg-orange-300 rounded-full"></div>
              </div>
              <Alojamento numero="09" casa={casa} />
              <Alojamento numero="10" casa={casa} />
            </div>
          </div>

          {/* CORREDOR CENTRAL */}
          <div className="w-3 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 rounded-full"></div>

          {/* ALA A (Direita) */}
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-bold text-blue-600 bg-blue-50 rounded-lg py-1 px-3">
              Ala A
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Alojamento numero="04" casa={casa} />
              <Alojamento numero="03" casa={casa} />
              <Alojamento numero="05" casa={casa} />
              <Alojamento numero="02" casa={casa} />
              <Alojamento numero="06" casa={casa} />
              <Alojamento numero="01" casa={casa} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== COMPONENTE CASA 08 ====================

  const Casa08 = ({ casa }: { casa: Casa }) => {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-rose-600 hover:shadow-emerald-200 transition-shadow">
        {/* Cabeçalho */}
        <div className="flex items-center justify-center mb-4 pb-3 border-b-2 border-rose-200">
          <h3 className="font-bold text-rose-700 text-lg">{casa.nome}</h3>
          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">
            Fase 3
          </span>
        </div>

        {/* Layout da Casa 08 */}
        <div className="flex gap-3 items-center">
          {/* Lado Esquerdo */}
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-bold text-orange-600 bg-orange-50 rounded-lg py-1 px-3">
              Ala B
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Alojamento numero="06" casa={casa} />
              <Alojamento numero="05" casa={casa} />
              <Alojamento numero="08" casa={casa} />
              <Alojamento numero="07" casa={casa} />
            </div>
          </div>

          {/* Área Central */}
          <div className="w-4 h-full bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 rounded-full"></div>

          {/* Lado Direito */}
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-bold text-blue-600 bg-blue-50 rounded-lg py-1 px-3">
              Ala A
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Alojamento numero="04" casa={casa} />
              <Alojamento numero="03" casa={casa} />
              <Alojamento numero="01" casa={casa} />
              <Alojamento numero="02" casa={casa} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== BUSCAR CASAS ====================

  const casa01 = casas.find((c) => c.numero === 1);
  const casa02 = casas.find((c) => c.numero === 2);
  const casa03 = casas.find((c) => c.numero === 3);
  const casa04 = casas.find((c) => c.numero === 4);
  const casa05 = casas.find((c) => c.numero === 5);
  const casa06 = casas.find((c) => c.numero === 6);
  const casa07 = casas.find((c) => c.numero === 7);
  const casa08 = casas.find((c) => c.numero === 8);

  // ==================== RENDER PRINCIPAL ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      {/* Cabeçalho */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center bg-white rounded-2xl shadow-xl p-6 border-b-4 border-rose-600">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Mapa Operacional - CENSE Maringá
          </h1>
          <p className="text-gray-600">
            Monitoramento em tempo real da ocupação e alertas de conflito
          </p>
        </div>
      </div>

      {/* Layout das Casas */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center gap-6">
          {/* Coluna Esquerda */}
          <div className="flex flex-col gap-6">
            {casa01 && <CasaPadrao casa={casa01} />}
            {casa02 && <CasaPadrao casa={casa02} />}
            {casa03 && <CasaPadrao casa={casa03} />}
          </div>

          {/* Coluna Central */}
          <div className="flex flex-col gap-6">
            {casa08 && <Casa08 casa={casa08} />}
            <div className="flex-1"></div>
            {casa04 && <CasaPadrao casa={casa04} />}
          </div>

          {/* Coluna Direita */}
          <div className="flex flex-col gap-6">
            {casa07 && <CasaPadrao casa={casa07} />}
            {casa06 && <CasaPadrao casa={casa06} />}
            {casa05 && <CasaPadrao casa={casa05} />}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="max-w-5xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
          <h4 className="font-bold text-xl mb-4 text-gray-800">Legenda</h4>

          {/* Status */}
          <div className="mb-6">
            <h5 className="font-semibold text-sm mb-3 text-gray-700">
              Status dos Alojamentos:
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-50 border-2 border-gray-300 rounded-lg"></div>
                <span className="text-sm">Livre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 border-2 border-green-400 rounded-lg shadow-lg shadow-green-200"></div>
                <span className="text-sm">Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-lg shadow-yellow-200"></div>
                <span className="text-sm">Atenção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 border-2 border-red-400 rounded-lg shadow-lg shadow-red-200"></div>
                <span className="text-sm">Perigo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-400 border-2 border-gray-600 rounded-lg"></div>
                <span className="text-sm">Interditado</span>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div>
            <h5 className="font-semibold text-sm mb-3 text-gray-700">
              Alertas Especiais:
            </h5>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-orange-500 rounded-full p-1.5">
                  <AlertTriangle size={16} className="text-white" />
                </div>
                <span className="text-sm">Risco de Suicídio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-purple-500 rounded-full p-1.5">
                  <Lock size={16} className="text-white" />
                </div>
                <span className="text-sm">Perfil Mapeado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-500 rounded-full p-1.5">
                  <Activity size={16} className="text-white" />
                </div>
                <span className="text-sm">Alerta de Saúde</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Alocação */}
      <ModalAlocacao
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setAlojamentoSelecionado(null);
        }}
        alojamento={alojamentoSelecionado}
        adolescentes={adolescentes}
        onAlocar={onAlocar}
      />
    </div>
  );
}
