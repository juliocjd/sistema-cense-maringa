"use client";

import { useMemo, useState } from "react";
import { X, AlertTriangle, Save, Loader2 } from "lucide-react";
import type { AlertaAtivo } from "@/types";
import {
  ALERTAS_ESPECIAIS,
  ALERTA_ESPECIAL_TIPOS,
  mapearTipoEspecialPorCodigo,
  type AlertaEspecialTipo,
} from "@/lib/alertas/especiais";

type ModalEditarAlertaProps = {
  alerta: AlertaAtivo;
  onClose: () => void;
  onSucesso: () => void;
};

const NIVEIS_RISCO = ["CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
type NivelRisco = (typeof NIVEIS_RISCO)[number];

const NIVEL_CLASSES: Record<NivelRisco, string> = {
  CRITICO: "bg-red-100 text-red-800 border-red-300",
  ALTO: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIO: "bg-yellow-100 text-yellow-800 border-yellow-300",
  BAIXO: "bg-blue-100 text-blue-800 border-blue-300",
};

export function ModalEditarAlerta({
  alerta,
  onClose,
  onSucesso,
}: ModalEditarAlertaProps) {
  const tipoEspecialInicial = mapearTipoEspecialPorCodigo(alerta.tipoAlerta);
  const [tipoEspecialSelecionado, setTipoEspecialSelecionado] =
    useState<AlertaEspecialTipo | null>(tipoEspecialInicial);
  const [tipoPersonalizado, setTipoPersonalizado] = useState(
    tipoEspecialInicial ? "" : alerta.tipoAlerta ?? ""
  );
  const normalizarNivel = (valor?: string | null): NivelRisco => {
    if (valor && NIVEIS_RISCO.includes(valor as NivelRisco)) {
      return valor as NivelRisco;
    }
    return "MEDIO";
  };
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>(
    normalizarNivel(alerta.nivelRisco)
  );
  const [descricao, setDescricao] = useState(alerta.descricaoAlerta ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const tipoEspecialMeta = useMemo(
    () => (tipoEspecialSelecionado ? ALERTAS_ESPECIAIS[tipoEspecialSelecionado] : null),
    [tipoEspecialSelecionado]
  );

  const tipoAlertaEmUso = tipoEspecialMeta
    ? tipoEspecialMeta.label
    : tipoPersonalizado;

  const tipoParaEnvio = tipoEspecialMeta
    ? tipoEspecialMeta.tipoAlerta
    : tipoPersonalizado.trim() || null;

  const validar = () => {
    const novosErros: Record<string, string> = {};
    if (!descricao.trim()) {
      novosErros.descricao = "Descricao obrigatoria";
    } else if (descricao.trim().length < 10) {
      novosErros.descricao = "Utilize ao menos 10 caracteres";
    }
    if (!tipoParaEnvio) {
      novosErros.tipo = "Informe um tipo ou selecione um alerta especial";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleToggleEspecial = (tipo: AlertaEspecialTipo) => {
    setTipoEspecialSelecionado((atual) => {
      if (atual === tipo) {
        return null;
      }
      const meta = ALERTAS_ESPECIAIS[tipo];
      setNivelRisco(normalizarNivel(meta.nivelPadrao));
      return tipo;
    });
    setTipoPersonalizado("");
    setErros((prev) => ({ ...prev, tipo: "" }));
  };

  const handleSalvar = async () => {
    if (!validar()) {
      return;
    }
    try {
      setSalvando(true);
      const response = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoAlerta: tipoParaEnvio,
          descricaoAlerta: descricao.trim(),
          nivelRisco,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.erro || "Erro ao atualizar alerta");
        return;
      }

      alert("Alerta atualizado com sucesso!");
      onSucesso();
    } catch (error) {
      console.error("Erro ao atualizar alerta:", error);
      alert("Erro ao atualizar alerta");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Editar alerta</h2>
            <p className="text-sm text-slate-600">
              {alerta.adolescente?.nomeCompleto ?? "Adolescente sem nome"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Alertas especiais
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {ALERTA_ESPECIAL_TIPOS.map((tipo) => {
                const meta = ALERTAS_ESPECIAIS[tipo];
                const ativo = tipoEspecialSelecionado === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleToggleEspecial(tipo)}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      ativo
                        ? "border-red-500 bg-red-50 shadow-sm"
                        : "border-slate-200 hover:border-red-200"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {meta.descricaoPadrao}
                    </p>
                    <span className="mt-2 inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Nivel sugerido: {meta.nivelPadrao ?? "MEDIO"}
                    </span>
                    {ativo && (
                      <span className="mt-2 block text-[10px] font-bold text-red-600">
                        Selecionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Tipo personalizado
            </label>
            <input
              type="text"
              value={tipoAlertaEmUso}
              onChange={(event) => {
                setTipoEspecialSelecionado(null);
                setTipoPersonalizado(event.target.value);
                setErros((prev) => ({ ...prev, tipo: "" }));
              }}
              placeholder="Ex.: Risco de fuga, Conduta agressiva..."
              disabled={Boolean(tipoEspecialMeta)}
              className={`w-full rounded-lg border-2 px-3 py-2 text-sm focus:outline-none ${
                tipoEspecialMeta
                  ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                  : "border-slate-300 focus:border-red-500"
              }`}
            />
            {!tipoEspecialMeta && (
              <p className="text-[11px] text-slate-500">
                Campo opcional para cenarios que nao sejam alertas especiais
              </p>
            )}
            {erros.tipo && (
              <p className="text-xs font-semibold text-rose-600">{erros.tipo}</p>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Nivel de risco
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NIVEIS_RISCO.map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => setNivelRisco(nivel)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                    nivelRisco === nivel
                      ? `${NIVEL_CLASSES[nivel]} border-current`
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Descricao detalhada
            </label>
            <textarea
              value={descricao}
              onChange={(event) => {
                setDescricao(event.target.value);
                setErros((prev) => ({ ...prev, descricao: "" }));
              }}
              rows={5}
              className={`w-full rounded-xl border-2 px-3 py-2 text-sm focus:outline-none resize-none ${
                erros.descricao
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-300 focus:border-red-500"
              }`}
              placeholder="Descreva o motivo, data e orientacoes do alerta..."
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Minimo de 10 caracteres</span>
              <span>{descricao.length}/800</span>
            </div>
            {erros.descricao && (
              <p className="text-xs font-semibold text-rose-600">
                {erros.descricao}
              </p>
            )}
          </section>

          <section className={`rounded-xl border-2 ${NIVEL_CLASSES[nivelRisco]} p-4`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 flex-shrink-0" size={24} />
              <div className="space-y-1 text-sm">
                <p className="font-bold text-base">
                  Preview do alerta - {nivelRisco}
                </p>
                <p>
                  <strong>Adolescente:</strong>{" "}
                  {alerta.adolescente?.nomeCompleto ?? "N/I"}
                </p>
                {tipoAlertaEmUso && (
                  <p>
                    <strong>Tipo:</strong> {tipoAlertaEmUso}
                  </p>
                )}
                <p>{descricao || "Descreva o alerta acima"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {salvando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar alteracoes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
