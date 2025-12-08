"use client";

import {
  AlertTriangle,
  MapPin,
  Calendar,
  FileText,
  MoreVertical,
  XCircle,
  CheckCircle,
  Trash2,
  Clock,
  User,
  Lock,
  Activity,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { AlertaAtivo } from "@/types";
import {
  ALERTAS_ESPECIAIS,
  mapearTipoEspecialPorCodigo,
  type AlertaEspecialTipo,
} from "@/lib/alertas/especiais";

const ICONES_ALERTA_ESPECIAL: Record<
  AlertaEspecialTipo,
  { Icone: typeof AlertTriangle; classe: string }
> = {
  RISCO_SUICIDIO: { Icone: AlertTriangle, classe: "text-orange-600" },
  PERFIL_MAPEADO: { Icone: Lock, classe: "text-purple-600" },
  SAUDE_CONFIDENCIAL: { Icone: Activity, classe: "text-blue-600" },
};

type CardAlertaProps = {
  alerta: AlertaAtivo;
  onDesativar: (alertaId: string) => void;
  onReativar: (alertaId: string) => void;
  onAtualizar: () => void;
  onEditar: (alerta: AlertaAtivo) => void;
};

export function CardAlerta({
  alerta,
  onDesativar,
  onReativar,
  onAtualizar,
  onEditar,
}: CardAlertaProps) {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [processando, setProcessando] = useState(false);
  const tipoEspecial = mapearTipoEspecialPorCodigo(alerta.tipoAlerta);
  const especialConfig = tipoEspecial
    ? ICONES_ALERTA_ESPECIAL[tipoEspecial]
    : null;
  const especialLabel = tipoEspecial
    ? ALERTAS_ESPECIAIS[tipoEspecial].label
    : null;

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const corNivel: Record<string, string> = {
    CRITICO: "bg-red-100 border-red-300 text-red-800",
    ALTO: "bg-orange-100 border-orange-300 text-orange-800",
    MEDIO: "bg-yellow-100 border-yellow-300 text-yellow-800",
    BAIXO: "bg-blue-100 border-blue-300 text-blue-800",
  };

  const iconeNivel: Record<string, React.ReactNode> = {
    CRITICO: <AlertTriangle size={16} className="text-red-600" />,
    ALTO: <AlertTriangle size={16} className="text-orange-600" />,
    MEDIO: <Clock size={16} className="text-yellow-600" />,
    BAIXO: <CheckCircle size={16} className="text-blue-600" />,
  };

  const nivelRisco = alerta.nivelRisco || "BAIXO";
  const isAtivo = !alerta.desativadoEm;

  const handleDeletar = async () => {
    if (!confirm(`Deseja realmente excluir este alerta permanentemente?`)) {
      return;
    }

    try {
      setProcessando(true);
      const response = await fetch(`/api/alertas/${alerta.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.erro || "Erro ao excluir alerta");
        return;
      }

      alert("Alerta excluído com sucesso!");
      onAtualizar();
    } catch (error) {
      console.error("Erro ao excluir alerta:", error);
      alert("Erro ao excluir alerta");
    } finally {
      setProcessando(false);
      setMostrarMenu(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
        isAtivo ? "border-gray-200 hover:shadow-md" : "border-gray-300 opacity-60"
      }`}
    >
      {/* Header do Card */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold border-2 flex items-center gap-1 ${
                corNivel[nivelRisco]
              }`}
            >
              {iconeNivel[nivelRisco]}
              {nivelRisco}
            </span>

            {alerta.tipoAlerta && (
              <span
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                  tipoEspecial
                    ? "bg-white/80 border border-gray-200 text-gray-900"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {tipoEspecial && especialConfig ? (
                  <>
                    <especialConfig.Icone
                      size={14}
                      className={especialConfig.classe}
                    />
                    {especialLabel}
                  </>
                ) : (
                  alerta.tipoAlerta
                )}
              </span>
            )}
          </div>

          {/* Menu de Ações */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenu(!mostrarMenu)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={18} className="text-gray-600" />
            </button>

            {mostrarMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMostrarMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  <Link
                    href={`/adolescentes/${alerta.adolescenteId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User size={16} />
                    Ver Adolescente
                  </Link>

                  {alerta.ciOrigemId && (
                    <Link
                      href={`/comunicados-internos/${alerta.ciOrigemId}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FileText size={16} />
                      Ver CI Origem
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setMostrarMenu(false);
                      onEditar(alerta);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={16} />
                    Editar alerta
                  </button>

                  {isAtivo ? (
                    <button
                      onClick={() => {
                        setMostrarMenu(false);
                        onDesativar(alerta.id);
                      }}
                      disabled={processando}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Desativar Alerta
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setMostrarMenu(false);
                        onReativar(alerta.id);
                      }}
                      disabled={processando}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      Reativar Alerta
                    </button>
                  )}

                  <button
                    onClick={handleDeletar}
                    disabled={processando}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {processando ? "Excluindo..." : "Excluir Permanente"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              isAtivo
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {isAtivo ? "ATIVO" : "DESATIVADO"}
          </span>
        </div>
      </div>

      {/* Informações do Adolescente */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold flex-shrink-0">
            {alerta.adolescente?.fotoUrl ? (
              <img
                src={alerta.adolescente.fotoUrl}
                alt={alerta.adolescente.nomeCompleto}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              alerta.adolescente?.nomeCompleto?.charAt(0) || "?"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/adolescentes/${alerta.adolescenteId}`}
              className="font-bold text-gray-900 hover:text-red-600 transition-colors block truncate"
            >
              {alerta.adolescente?.nomeCompleto || "Adolescente desconhecido"}
            </Link>
            {alerta.adolescente?.nomeSocial && (
              <p className="text-sm text-gray-600 truncate">
                ({alerta.adolescente.nomeSocial})
              </p>
            )}
            {alerta.adolescente?.numeroSms && (
              <p className="text-xs text-gray-500 font-mono">
                SMS: {alerta.adolescente.numeroSms}
              </p>
            )}
          </div>
        </div>

        {/* Localização */}
        {alerta.adolescente?.alojamentoAtual && (
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
            <MapPin size={14} className="text-gray-500 flex-shrink-0" />
            <span className="font-semibold truncate">
              {alerta.adolescente.alojamentoAtual.casa.nome} -{" "}
              Aloj {alerta.adolescente.alojamentoAtual.numeroAlojamento}
              {alerta.adolescente.alojamentoAtual.ala && (
                <span> (Ala {alerta.adolescente.alojamentoAtual.ala})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Descrição do Alerta */}
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
          {alerta.descricaoAlerta}
        </p>

        {/* CI Origem */}
        {alerta.ciOrigem && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2 bg-blue-50 p-2 rounded">
            <FileText size={12} className="text-blue-600 flex-shrink-0" />
            <span className="truncate">
              <strong>CI {alerta.ciOrigem.numero}:</strong>{" "}
              {alerta.ciOrigem.resumoCI}
            </span>
          </div>
        )}

        {/* Data de Criação */}
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar size={12} />
            Criado em {formatarData(alerta.criadoEm)}
          </div>
          <div className="flex items-center gap-2">
            <User size={12} />
            <span>
              Operador:{" "}
              <span className="font-semibold text-gray-700">
                {alerta.operadorResponsavel?.nomeCompleto ?? "Não informado"}
              </span>
            </span>
          </div>
        </div>

        {/* Data de Desativação */}
        {alerta.desativadoEm && (
          <div className="flex items-center gap-2 text-xs text-orange-600 mt-1">
            <XCircle size={12} />
            Desativado em {formatarData(alerta.desativadoEm)}
          </div>
        )}
      </div>
    </div>
  );
}
