"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Download,
  AlertTriangle,
  Swords,
  Plus,
  CheckCircle,
} from "lucide-react";
import { TIPO_CI_OPTIONS } from "@/lib/comunicados/tipos";

type ComunicadoInterno = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi: string;
  resumoCi: string;
  caminhoPdf?: string;
  operador?: {
    id: string;
    nome: string;
  } | null;
  adolescentes: Array<{
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
    ladoConflito?: "LADO_1" | "LADO_2" | null;
  }>;
  criadoEm: string;
  conflitosGerados: Array<{
    id: string;
    adolescenteA: {
      id: string;
      nome: string;
    } | null;
    adolescenteB: {
      id: string;
      nome: string;
    } | null;
  }>;
  alertasGerados: Array<{
    id: string;
    adolescente: string;
    tipo: string;
  }>;
};

type ParticipanteCI = ComunicadoInterno["adolescentes"][number];

interface DetalhesCIProps {
  ci: ComunicadoInterno;
  onCriarConflito: (dados: any) => Promise<void>;
  onCriarAlerta: (dados: any) => Promise<void>;
  onExcluirConflito?: (id: string) => Promise<void>;
  onExcluirAlerta?: (id: string) => Promise<void>;
  onEditar?: () => void;
  onExcluir?: () => void;
  excluindo?: boolean;
}

export function DetalhesCI({
  ci,
  onCriarConflito,
  onCriarAlerta,
  onExcluirConflito,
  onExcluirAlerta,
  onEditar,
  onExcluir,
  excluindo = false,
}: DetalhesCIProps) {
  const [mostrarModalConflito, setMostrarModalConflito] = useState(false);
  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excluindoConflitoId, setExcluindoConflitoId] = useState<string | null>(null);
  const [excluindoAlertaId, setExcluindoAlertaId] = useState<string | null>(null);

  // Form de conflito
  const [lado1Selecionados, setLado1Selecionados] = useState<string[]>([]);
  const [lado2Selecionados, setLado2Selecionados] = useState<string[]>([]);
  const [novoParticipanteLado1, setNovoParticipanteLado1] = useState("");
  const [novoParticipanteLado2, setNovoParticipanteLado2] = useState("");
  const [tipoConflito, setTipoConflito] = useState("");
  const [descricaoConflito, setDescricaoConflito] = useState("");

  // Form de alerta
  const [alertaAdolescente, setAlertaAdolescente] = useState("");
  const [tipoAlerta, setTipoAlerta] = useState("");
  const [descricaoAlerta, setDescricaoAlerta] = useState("");

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { cor: string; texto: string }> = {
      DISCIPLINAR: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Disciplinar",
      },
      CONFLITO: {
        cor: "bg-orange-100 text-orange-800 border-orange-300",
        texto: "Conflito",
      },
      AUTORIZACAO_ESPECIAL: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Autorizacao item excepcional",
      },
      SAUDE_CONFIDENCIAL: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Saude confidencial",
      },
      FUGA: {
        cor: "bg-orange-100 text-orange-800 border-orange-300",
        texto: "Fuga",
      },
      AGRESSAO: {
        cor: "bg-rose-100 text-rose-800 border-rose-300",
        texto: "Agressao",
      },
      AMEACA_SERVIDOR: {
        cor: "bg-amber-100 text-amber-800 border-amber-300",
        texto: "Ameaca a servidor",
      },
      RISCO_SUICIDIO: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Risco de suicidio",
      },
      PERFIL_MAPEADO: {
        cor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        texto: "Perfil mapeado",
      },
      OUTROS: {
        cor: "bg-gray-100 text-gray-800 border-gray-300",
        texto: "Outros",
      },
    };
    return badges[tipo] || badges.OUTROS;
  };

  const mapaAdolescentes = useMemo(
    () =>
      new Map(
        ci.adolescentes.map((participante) => [participante.id, participante])
      ),
    [ci.adolescentes]
  );

  const ladosRegistrados = useMemo(() => {
    if (ci.tipoCi !== "CONFLITO") {

      return null;

    }



    const lado1 = ci.adolescentes.filter(

      (participante) => participante.ladoConflito === "LADO_1"

    );

    const lado2 = ci.adolescentes.filter(

      (participante) => participante.ladoConflito === "LADO_2"

    );



    if (lado1.length === 0 && lado2.length === 0) {

      return null;

    }



    return { lado1, lado2 };

  }, [ci.adolescentes, ci.tipoCi]);

  const participantesDisponiveis = useMemo(
    () =>
      ci.adolescentes.filter(
        (participante) =>
          !lado1Selecionados.includes(participante.id) &&
          !lado2Selecionados.includes(participante.id)
      ),
    [ci.adolescentes, lado1Selecionados, lado2Selecionados]
  );

  const participantesLado1Selecionados = useMemo(
    () =>
      lado1Selecionados
        .map((id) => mapaAdolescentes.get(id))
        .filter((item): item is ParticipanteCI => Boolean(item)),
    [lado1Selecionados, mapaAdolescentes]
  );

  const participantesLado2Selecionados = useMemo(
    () =>
      lado2Selecionados
        .map((id) => mapaAdolescentes.get(id))
        .filter((item): item is ParticipanteCI => Boolean(item)),
    [lado2Selecionados, mapaAdolescentes]
  );

  const ladosDerivadosDosConflitos = useMemo(() => {
    if (ci.tipoCi !== "CONFLITO" || (ci.conflitosGerados?.length ?? 0) === 0) {

      return null;

    }

    const lado1 = new Map<string, (typeof ci.adolescentes)[number]>();

    const lado2 = new Map<string, (typeof ci.adolescentes)[number]>();



    const resolverParticipante = (

      participante:

        | {

            id: string;

            nome: string;

          }

        | null,

      fallbackId: string

    ) => {

      if (!participante) return null;

      const existente = mapaAdolescentes.get(participante.id);

      if (existente) return existente;

      return {

        id: participante.id ?? fallbackId,

        nome: participante.nome,

        numeroSms: "N?o informado",

      };

    };



    ci.conflitosGerados.forEach((conflito, index) => {

      const participanteA = resolverParticipante(

        conflito.adolescenteA,

        `${conflito.id}-A-${index}`

      );

      const participanteB = resolverParticipante(

        conflito.adolescenteB,

        `${conflito.id}-B-${index}`

      );

      if (participanteA) {

        lado1.set(participanteA.id, participanteA);

      }

      if (participanteB) {

        lado2.set(participanteB.id, participanteB);

      }

    });



    if (lado1.size === 0 && lado2.size === 0) {

      return null;

    }



    return {

      lado1: Array.from(lado1.values()),

      lado2: Array.from(lado2.values()),

    };

  }, [ci, mapaAdolescentes]);



  const ladosConflito = useMemo(() => {

    if (ladosRegistrados) {

      return ladosRegistrados;

    }

    return ladosDerivadosDosConflitos;

  }, [ladosRegistrados, ladosDerivadosDosConflitos]);

  const exibirLadosConflito =
    ci.tipoCi === "CONFLITO" &&
    ladosConflito &&
    (ladosConflito.lado1.length > 0 || ladosConflito.lado2.length > 0);

  const handleCriarConflito = async () => {
    if (lado1Selecionados.length === 0 || lado2Selecionados.length === 0) {
      alert("Selecione ao menos um adolescente em cada lado.");
      return;
    }

    if (!tipoConflito) {
      alert("Selecione o tipo de conflito.");
      return;
    }

    const partes = [
      {
        nome: "Lado 1",
        participantes: lado1Selecionados.map((id) => ({ adolescenteId: id })),
      },
      {
        nome: "Lado 2",
        participantes: lado2Selecionados.map((id) => ({ adolescenteId: id })),
      },
    ];

    setLoading(true);
    try {
      await onCriarConflito({
        tipoConflito,
        origem: `CI ${ci.numero}/${ci.ano}`,
        ciOrigemId: ci.id,
        descricao: descricaoConflito || undefined,
        partes,
      });

      alert("Conflitos criados com sucesso.");
      fecharModalConflito();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao criar conflito."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAlerta = async () => {
    if (!alertaAdolescente || !tipoAlerta) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);
    try {
      await onCriarAlerta({
        adolescenteId: alertaAdolescente,
        tipoAlerta,
        descricaoAlerta,
        ciOrigemId: ci.id,
      });

      alert("Alerta criado com sucesso.");
      setMostrarModalAlerta(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar alerta.");
    } finally {
      setLoading(false);
    }
  };

  const badge = getTipoBadge(ci.tipoCi);

  const handleExcluirConflitoGerado = async (id: string) => {
    if (!onExcluirConflito) return;
    const confirmado = window.confirm(
      "Confirma a excluso deste conflito vinculado ao CI?"
    );
    if (!confirmado) return;
    setExcluindoConflitoId(id);
    try {
      await onExcluirConflito(id);
      alert("Conflito removido com sucesso.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao remover conflito. Tente novamente."
      );
    } finally {
      setExcluindoConflitoId(null);
    }
  };

  const handleExcluirAlertaGerado = async (id: string) => {
    if (!onExcluirAlerta) return;
    const confirmado = window.confirm(
      "Confirma a excluso deste alerta gerado pelo CI?"
    );
    if (!confirmado) return;
    setExcluindoAlertaId(id);
    try {
      await onExcluirAlerta(id);
      alert("Alerta removido com sucesso.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao remover alerta. Tente novamente."
      );
    } finally {
      setExcluindoAlertaId(null);
    }
  };

  const resetarFormConflito = (valores?: { lado1?: string[]; lado2?: string[] }) => {
    setLado1Selecionados(valores?.lado1 ?? []);
    setLado2Selecionados(valores?.lado2 ?? []);
    setNovoParticipanteLado1("");
    setNovoParticipanteLado2("");
    setTipoConflito("");
    setDescricaoConflito("");
  };

  const adicionarAoLado = (
    lado: "LADO_1" | "LADO_2",
    participanteId: string
  ) => {
    if (!participanteId) return;
    if (lado === "LADO_1") {
      setLado2Selecionados((prev) =>
        prev.filter((item) => item !== participanteId)
      );
      setLado1Selecionados((prev) =>
        prev.includes(participanteId) ? prev : [...prev, participanteId]
      );
      setNovoParticipanteLado1("");
    } else {
      setLado1Selecionados((prev) =>
        prev.filter((item) => item !== participanteId)
      );
      setLado2Selecionados((prev) =>
        prev.includes(participanteId) ? prev : [...prev, participanteId]
      );
      setNovoParticipanteLado2("");
    }
  };

  const removerDoLado = (lado: "LADO_1" | "LADO_2", participanteId: string) => {
    if (lado === "LADO_1") {
      setLado1Selecionados((prev) =>
        prev.filter((item) => item !== participanteId)
      );
    } else {
      setLado2Selecionados((prev) =>
        prev.filter((item) => item !== participanteId)
      );
    }
  };

  const abrirModalConflito = () => {
    if (ladosConflito) {
      const lado1Padrao = ladosConflito.lado1.map((participante) => participante.id);
      const lado2Padrao = ladosConflito.lado2.map((participante) => participante.id);
      if (lado1Padrao.length > 0 || lado2Padrao.length > 0) {
        resetarFormConflito({ lado1: lado1Padrao, lado2: lado2Padrao });
      } else {
        resetarFormConflito();
      }
    } else {
      resetarFormConflito();
    }
    setMostrarModalConflito(true);
  };

  const fecharModalConflito = () => {
    resetarFormConflito();
    setMostrarModalConflito(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-blue-600">
        <Link
          href="/comunicados"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              CI {ci.numero}/{ci.ano}
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold border ${badge.cor}`}
              >
                {badge.texto}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ci.caminhoPdf && (
              <a
                href={ci.caminhoPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
              >
                <Download size={18} />
                Baixar PDF
              </a>
            )}
            {onEditar && (
              <button
                onClick={onEditar}
                className="px-5 py-2 border-2 border-blue-100 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                type="button"
              >
                Editar
              </button>
            )}
            {onExcluir && (
              <button
                onClick={onExcluir}
                disabled={excluindo}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                type="button"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Informaes Principais */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Informaes do CI
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Nmero</p>
            <p className="text-2xl font-bold text-gray-800">
              {ci.numero}/{ci.ano}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <Calendar size={14} />
              Data do Fato
            </p>
            <p className="font-bold text-gray-800">
              {new Date(ci.dataFato).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <User size={14} />
              Operador Responsvel
            </p>
            <p className="font-bold text-gray-800">
              {ci.operador?.nome ?? "Operador no identificado"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Resumo:</p>
          <p className="text-gray-800 leading-relaxed">{ci.resumoCi}</p>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <span className="font-semibold">Registrado em:</span>{" "}
            {new Date(ci.criadoEm).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Adolescentes Envolvidos */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Adolescentes Envolvidos ({ci.adolescentes.length})
        </h2>

        {exibirLadosConflito && ladosConflito ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[{ titulo: "Lado 1", lista: ladosConflito.lado1 },
              { titulo: "Lado 2", lista: ladosConflito.lado2 }].map(
              ({ titulo, lista }) => (
                <div
                  key={titulo}
                  className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-base font-semibold text-gray-800">
                      {titulo}
                    </p>
                    <span className="text-xs font-semibold text-gray-600">
                      {lista.length} participante(s)
                    </span>
                  </div>
                  {lista.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhum adolescente neste lado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lista.map((participante) => (
                        <Link
                          key={participante.id}
                          href={`/adolescentes/${participante.id}`}
                          className="block rounded-lg border border-indigo-100 bg-white px-3 py-2 hover:bg-indigo-100"
                        >
                          <p className="font-semibold text-gray-800">
                            {participante.nome}
                          </p>
                          <p className="text-xs text-gray-500">
                            SMS: {participante.numeroSms ?? "No informado"}
                            {participante.alojamento ? (
                              <span className="ml-1">
                                | {participante.alojamento}
                              </span>
                            ) : null}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ci.adolescentes.map((adolescente) => (
              <Link
                key={adolescente.id}
                href={`/adolescentes/${adolescente.id}`}
                className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors"
              >
                <p className="font-bold text-gray-800 mb-1">
                  {adolescente.nome}
                </p>
                <p className="text-sm text-gray-600">
                  SMS: {adolescente.numeroSms || "Nao informado"}
                  {adolescente.alojamento && (
                    <span className="ml-1">| {adolescente.alojamento}</span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Gatilhos Automticos */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Gatilhos Automticos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Criar Conflito */}
          <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Swords size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Criar Conflito</h3>
                <p className="text-sm text-gray-600">
                  Registrar conflito baseado neste CI
                </p>
              </div>
            </div>

            {(ci.conflitosGerados?.length ?? 0) > 0 && (
              <div className="mb-3 p-3 bg-white rounded border border-orange-300">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Conflitos gerados ({ci.conflitosGerados?.length ?? 0}):
                </p>
                {ci.conflitosGerados?.map((conflito) => (
                  <div
                    key={conflito.id}
                    className="flex items-center justify-between gap-3 text-sm text-gray-600"
                  >
                    <span>
                      - {conflito.adolescenteA?.nome ?? "Lado 1"} {" "}
                      {conflito.adolescenteB?.nome ?? "Lado 2"}
                    </span>
                    {onExcluirConflito && conflito.id && (
                      <button
                        type="button"
                        onClick={() => handleExcluirConflitoGerado(conflito.id)}
                        disabled={excluindoConflitoId === conflito.id}
                        className="text-red-600 text-xs font-semibold hover:underline disabled:text-gray-400"
                      >
                        {excluindoConflitoId === conflito.id
                          ? "Excluindo..."
                          : "Excluir"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={abrirModalConflito}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo Conflito
            </button>
          </div>

          {/* Criar Alerta */}
          <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Criar Alerta</h3>
                <p className="text-sm text-gray-600">
                  Ativar alerta para adolescente
                </p>
              </div>
            </div>

            {(ci.alertasGerados?.length ?? 0) > 0 && (
              <div className="mb-3 p-3 bg-white rounded border border-purple-300">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Alertas gerados ({ci.alertasGerados?.length ?? 0}):
                </p>
                {ci.alertasGerados?.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between gap-3 text-sm text-gray-600"
                  >
                    <span>
                      - {alerta.adolescente} - {alerta.tipo}
                    </span>
                    {onExcluirAlerta && alerta.id && (
                      <button
                        type="button"
                        onClick={() => handleExcluirAlertaGerado(alerta.id)}
                        disabled={excluindoAlertaId === alerta.id}
                        className="text-red-600 text-xs font-semibold hover:underline disabled:text-gray-400"
                      >
                        {excluindoAlertaId === alerta.id
                          ? "Excluindo..."
                          : "Excluir"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setMostrarModalAlerta(true)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo Alerta
            </button>
          </div>
        </div>
      </div>

      {/* Visualizao do PDF */}
      {ci.caminhoPdf && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Documento PDF
          </h2>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <iframe
              src={ci.caminhoPdf}
              className="w-full h-[600px]"
              title="PDF do CI"
            />
          </div>
        </div>
      )}

      {/* Modal de Criar Conflito */}
      {mostrarModalConflito && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={fecharModalConflito}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Criar Conflito a partir do CI {ci.numero}/{ci.ano}
              </h3>

              <div className="space-y-6">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-orange-900">
                  <p className="font-semibold">Separe os adolescentes por lado</p>
                  <p className="mt-1">
                    Cada adolescente so pode aparecer em um lado do conflito. Use os
                    campos abaixo para distribuir todos os envolvidos antes de confirmar
                    o registro.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    {
                      lado: "LADO_1" as const,
                      titulo: "Lado 1",
                      selecionados: participantesLado1Selecionados,
                      contador: lado1Selecionados.length,
                      novo: novoParticipanteLado1,
                      setNovo: setNovoParticipanteLado1,
                    },
                    {
                      lado: "LADO_2" as const,
                      titulo: "Lado 2",
                      selecionados: participantesLado2Selecionados,
                      contador: lado2Selecionados.length,
                      novo: novoParticipanteLado2,
                      setNovo: setNovoParticipanteLado2,
                    },
                  ].map(({ lado, titulo, selecionados, contador, novo, setNovo }) => (
                    <div
                      key={lado}
                      className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-gray-800">
                            {titulo}
                          </p>
                          <p className="text-xs text-gray-500">
                            Integrantes do {titulo.toLowerCase()} nao geram alertas entre si.
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gray-600">
                          {contador} selecionado(s)
                        </span>
                      </div>

                      <div className="mt-4">
                        <label className="text-xs font-semibold text-gray-600">
                          Adicionar participante
                        </label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <select
                            value={novo}
                            onChange={(e) => setNovo(e.target.value)}
                            disabled={participantesDisponiveis.length === 0}
                            className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-100"
                          >
                            <option value="">Selecione...</option>
                            {participantesDisponiveis.map((participante) => (
                              <option key={`${lado}-${participante.id}`} value={participante.id}>
                                {participante.nome} (SMS: {participante.numeroSms})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => adicionarAoLado(lado, novo)}
                            disabled={!novo}
                            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                            Adicionar
                          </button>
                        </div>
                        {participantesDisponiveis.length === 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Todos os adolescentes deste CI ja foram distribuidos.
                          </p>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {selecionados.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Nenhum adolescente neste lado.
                          </p>
                        ) : (
                          selecionados.map((participante) => (
                            <div
                              key={participante.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-orange-100 bg-white/80 px-3 py-2"
                            >
                              <div>
                                <Link
                                  href={`/adolescentes/${participante.id}`}
                                  className="font-semibold text-gray-800 hover:text-orange-700"
                                >
                                  {participante.nome}
                                </Link>
                                <p className="text-xs text-gray-500">
                                  SMS: {participante.numeroSms ?? "Nao informado"}
                                  {participante.alojamento ? (
                                    <span className="ml-1">| {participante.alojamento}</span>
                                  ) : null}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removerDoLado(lado, participante.id)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Tipo de Conflito *
                    </label>
                    <select
                      value={tipoConflito}
                      onChange={(e) => setTipoConflito(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="FACCAO">Faccoes rivais</option>
                      <option value="TERRITORIAL">Territorial</option>
                      <option value="PESSOAL">Pessoal</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Descricao
                    </label>
                    <textarea
                      value={descricaoConflito}
                      onChange={(e) => setDescricaoConflito(e.target.value)}
                      rows={3}
                      placeholder="Detalhes adicionais..."
                      className="w-full resize-none rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={fecharModalConflito}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarConflito}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
                >
                  {loading ? "Criando..." : "Criar Conflito"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Criar Alerta */}
      {mostrarModalAlerta && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMostrarModalAlerta(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Criar Alerta a partir do CI {ci.numero}/{ci.ano}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adolescente *
                  </label>
                  <select
                    value={alertaAdolescente}
                    onChange={(e) => setAlertaAdolescente(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {ci.adolescentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} (SMS: {a.numeroSms})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tipo de Alerta *
                  </label>
                  <select
                    value={tipoAlerta}
                    onChange={(e) => setTipoAlerta(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {TIPO_CI_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descrio *
                  </label>
                  <textarea
                    value={descricaoAlerta}
                    onChange={(e) => setDescricaoAlerta(e.target.value)}
                    rows={3}
                    placeholder="Descreva o alerta..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMostrarModalAlerta(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarAlerta}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? "Criando..." : "Criar Alerta"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


