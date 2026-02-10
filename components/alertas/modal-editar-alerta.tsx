"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Save, Loader2 } from "lucide-react";
import type { AlertaAtivo } from "@/types";
import { TIPO_CI_OPTIONS, TIPO_CI_MAP } from "@/lib/comunicados/tipos";

type ModalEditarAlertaProps = {
  alerta: AlertaAtivo;
  onClose: () => void;
  onSucesso: () => void;
};

type NivelRisco = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";
const NIVEIS_RISCO: NivelRisco[] = ["CRITICO", "ALTO", "MEDIO", "BAIXO"];

const NIVEL_CLASSES: Record<NivelRisco, string> = {
  CRITICO: "bg-red-100 text-red-800 border-red-300",
  ALTO: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIO: "bg-yellow-100 text-yellow-800 border-yellow-300",
  BAIXO: "bg-blue-100 text-blue-800 border-blue-300",
};

const DESCRICOES_TIPO: Record<string, string> = {
  DISCIPLINAR: "Conduta que exige acompanhamento de comportamento.",
  CONFLITO: "Conflito mapeado envolvendo o adolescente.",
  AUTORIZACAO_ESPECIAL:
    "Permissao controlada de item nao autorizado (ex.: caneta, material de estudo), com justificativa e validade.",
  SAUDE_CONFIDENCIAL:
    "Informacao de saude sensivel que impacta cuidados e seguranca.",
  RISCO_SUICIDIO: "Risco de suicídio identificado.",
  PERFIL_MAPEADO: "Protecao por ato infracional que exige sigilo.",
  FUGA: "Risco ou registro de fuga/plano de fuga/evasao.",
  AGRESSAO: "Registro de agressao ou risco iminente.",
  AMEACA_SERVIDOR: "Ameaca direta contra servidor.",
  OUTROS: "Outros alertas relevantes para a operacao.",
};

const formatarDataCurta = (valor?: string | null) => {
  if (!valor) return "Nao informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export function ModalEditarAlerta({
  alerta,
  onClose,
  onSucesso,
}: ModalEditarAlertaProps) {
  const normalizarNivel = (valor?: string | null): NivelRisco => {
    if (valor && NIVEIS_RISCO.includes(valor as NivelRisco)) {
      return valor as NivelRisco;
    }
    return "MEDIO";
  };
  const sugerirNivelPorTipo = (valor: string): NivelRisco => {
    if (valor === "RISCO_SUICIDIO") return "ALTO";
    if (
      valor === "FUGA" ||
      valor === "SAUDE_CONFIDENCIAL" ||
      valor === "AGRESSAO" ||
      valor === "AMEACA_SERVIDOR"
    ) {
      return "ALTO";
    }
    return "MEDIO";
  };

  const [tipoSelecionado, setTipoSelecionado] = useState<string>(
    alerta.tipoAlerta ?? "",
  );
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>(
    normalizarNivel(alerta.nivelRisco) ||
      sugerirNivelPorTipo(alerta.tipoAlerta ?? "MEDIO"),
  );
  const [descricao, setDescricao] = useState(alerta.descricaoAlerta ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [registrarAltaMedica, setRegistrarAltaMedica] = useState(false);
  const [descricaoAltaMedica, setDescricaoAltaMedica] = useState("");
  const [nivelAnteriorAlta, setNivelAnteriorAlta] = useState<NivelRisco | null>(
    null,
  );
  const [protocoloInfo, setProtocoloInfo] = useState<
    AlertaAtivo["protocoloRiscoSuicidio"] | null
  >(alerta.protocoloRiscoSuicidio ?? null);
  const [carregandoProtocolo, setCarregandoProtocolo] = useState(false);

  const tipoSelecionadoOpcao = tipoSelecionado
    ? TIPO_CI_OPTIONS.find((option) => option.value === tipoSelecionado)
    : null;
  const tipoAlertaEmUso =
    tipoSelecionadoOpcao?.label ||
    TIPO_CI_MAP.get(tipoSelecionado) ||
    tipoSelecionado;
  const tipoSelecionadoNivel = tipoSelecionado
    ? sugerirNivelPorTipo(tipoSelecionado)
    : null;

  useEffect(() => {
    if (alerta.tipoAlerta !== "RISCO_SUICIDIO") {
      setProtocoloInfo(null);
      return;
    }
    let ativo = true;
    const carregarProtocolo = async () => {
      setCarregandoProtocolo(true);
      try {
        const response = await fetch(`/api/alertas/${alerta.id}`);
        if (!response.ok) {
          return;
        }
        const detalhes = (await response.json()) as AlertaAtivo;
        if (!ativo) return;
        setProtocoloInfo(detalhes.protocoloRiscoSuicidio ?? null);
      } catch (error) {
        console.error("Erro ao carregar historico do protocolo:", error);
      } finally {
        if (ativo) {
          setCarregandoProtocolo(false);
        }
      }
    };
    carregarProtocolo();
    return () => {
      ativo = false;
    };
  }, [alerta.id, alerta.tipoAlerta]);

  const validar = () => {
    const novosErros: Record<string, string> = {};
    if (!descricao.trim()) {
      novosErros.descricao = "Descricao obrigatoria";
    } else if (descricao.trim().length < 10) {
      novosErros.descricao = "Utilize ao menos 10 caracteres";
    }
    if (!tipoSelecionado) {
      novosErros.tipo = "Selecione o tipo do alerta";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSalvar = async () => {
    if (!validar()) {
      return;
    }
    try {
      setSalvando(true);
      const payload: Record<string, unknown> = {
        tipoAlerta: tipoSelecionado,
        descricaoAlerta: descricao.trim(),
        nivelRisco,
      };
      if (registrarAltaMedica) {
        payload.altaMedica = true;
        if (descricaoAltaMedica.trim().length > 0) {
          payload.altaMedicaDescricao = descricaoAltaMedica.trim();
        }
      }
      const response = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-full sm:max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
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
          <section className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Tipo de alerta *
            </label>
            <select
              value={tipoSelecionado}
              onChange={(event) => {
                const valor = event.target.value;
                setTipoSelecionado(valor);
                setNivelRisco(sugerirNivelPorTipo(valor));
                setErros((prev) => ({ ...prev, tipo: "" }));
              }}
              className="w-full rounded-lg border-2 px-3 py-2 text-sm focus:outline-none border-slate-300 focus:border-red-500"
            >
              <option value="">Selecione o tipo...</option>
              {TIPO_CI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {tipoAlertaEmUso && (
              <p className="text-xs text-slate-600 flex items-center gap-2">
                Tipo selecionado: {tipoAlertaEmUso}
                {tipoSelecionadoNivel && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${NIVEL_CLASSES[tipoSelecionadoNivel]}`}
                  >
                    Nivel sugerido: {tipoSelecionadoNivel}
                  </span>
                )}
              </p>
            )}
            {tipoSelecionado && DESCRICOES_TIPO[tipoSelecionado] && (
              <p className="text-[11px] text-slate-500">
                {DESCRICOES_TIPO[tipoSelecionado]}
              </p>
            )}
            {erros.tipo && (
              <p className="text-xs font-semibold text-rose-600">
                {erros.tipo}
              </p>
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
                  onClick={() => !registrarAltaMedica && setNivelRisco(nivel)}
                  disabled={registrarAltaMedica}
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
            {registrarAltaMedica && (
              <p className="text-[11px] text-rose-600 mt-1">
                Alta médica registrada força o nível para BAIXO.
              </p>
            )}
          </section>

          {tipoSelecionado === "RISCO_SUICIDIO" && (
            <section className="space-y-3 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Alta médica do protocolo
                  </p>
                  <p className="text-xs text-slate-500">
                    Use quando houver laudo médico permitindo downgrade do
                    protocolo.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <input
                    type="checkbox"
                    checked={registrarAltaMedica}
                    onChange={(event) => {
                      const marcado = event.target.checked;
                      setRegistrarAltaMedica(marcado);
                      if (marcado) {
                        setNivelAnteriorAlta(nivelRisco);
                        setNivelRisco("BAIXO");
                      } else if (nivelAnteriorAlta) {
                        setNivelRisco(nivelAnteriorAlta);
                        setNivelAnteriorAlta(null);
                      }
                    }}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  Registrar alta
                </label>
              </div>
              {registrarAltaMedica && (
                <div className="space-y-2">
                  <textarea
                    value={descricaoAltaMedica}
                    onChange={(event) =>
                      setDescricaoAltaMedica(event.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg border-2 border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Observações da alta médica (opcional)"
                  />
                  <p className="text-[11px] text-slate-500">
                    A alta será registrada em auditoria e exibida nos
                    relatórios.
                  </p>
                </div>
              )}
              <div className="space-y-2 text-[11px]">
                {carregandoProtocolo && (
                  <p className="text-slate-400">
                    Carregando histórico do protocolo...
                  </p>
                )}
                {protocoloInfo?.ultimaEntrada && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-900">
                    <p className="font-semibold text-blue-800">
                      Protocolo ativado em{" "}
                      {formatarDataCurta(protocoloInfo.ultimaEntrada.data)}
                    </p>
                    {protocoloInfo.ultimaEntrada.descricao && (
                      <p className="text-blue-700">
                        {protocoloInfo.ultimaEntrada.descricao}
                      </p>
                    )}
                  </div>
                )}
                {protocoloInfo?.ultimaAlta && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                    <p className="font-semibold text-emerald-800">
                      Última alta médica em{" "}
                      {formatarDataCurta(protocoloInfo.ultimaAlta.data)}
                    </p>
                    {protocoloInfo.ultimaAlta.descricao && (
                      <p className="text-emerald-700">
                        {protocoloInfo.ultimaAlta.descricao}
                      </p>
                    )}
                  </div>
                )}
                {!carregandoProtocolo &&
                  !protocoloInfo?.ultimaEntrada &&
                  !protocoloInfo?.ultimaAlta && (
                    <p className="text-slate-500">
                      Nenhuma alta médica registrada para este protocolo até o
                      momento.
                    </p>
                  )}
              </div>
            </section>
          )}

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

          <section
            className={`rounded-xl border-2 ${NIVEL_CLASSES[nivelRisco]} p-4`}
          >
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
                {registrarAltaMedica && (
                  <p className="text-xs text-blue-900">
                    Alta médica será registrada e o nível reduzirá para BAIXO.
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
