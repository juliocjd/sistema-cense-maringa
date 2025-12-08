"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DetalhesCI } from "@/components/comunicados/detalhes-ci";

type AdolescenteResumo = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string;
  ladoConflito?: "LADO_1" | "LADO_2" | null;
};

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
  adolescentes: AdolescenteResumo[];
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

type ApiCI = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi?: string;
  tipoCI?: string;
  resumoCi: string;
  resumoCI?: string;
  caminhoPdf?: string | null;
  operador?: {
    id: string;
    nome: string;
  } | null;
  criadoEm: string;
  adolescentes?: Array<{
    id: string;
    nome?: string | null;
    nomeCompleto?: string | null;
    nomeSocial?: string | null;
    numeroSms?: string | null;
    alojamento?: string | null;
    ladoConflito?: string | null;
    alojamentoAtual?: {
      numeroAlojamento?: string | number | null;
      ala?: string | null;
      casa?: {
        nome?: string | null;
        numero?: string | number | null;
      } | null;
    } | null;
  }>;
  conflitos?: Array<{
    id: string;
    adolescenteA?: {
      id?: string | null;
      nome?: string | null;
      nomeCompleto?: string | null;
    };
    adolescenteB?: {
      id?: string | null;
      nome?: string | null;
      nomeCompleto?: string | null;
    };
  }>;
  alertas?: Array<{
    id: string;
    tipoAlerta?: string | null;
    tipo?: string | null;
    adolescente?: {
      nome?: string | null;
      nomeCompleto?: string | null;
    };
  }>;
};

const formatarNomeAdolescente = (registro: {
  nome?: string | null;
  nomeCompleto?: string | null;
  nomeSocial?: string | null;
}) =>
  registro.nomeCompleto ||
  registro.nome ||
  registro.nomeSocial ||
  "Nome não informado";

const formatarAlojamento = (dados?: {
  numeroAlojamento?: string | number | null;
  ala?: string | null;
  casa?: {
    nome?: string | null;
    numero?: string | number | null;
  } | null;
} | null) => {
  if (!dados) return undefined;

  const partes: string[] = [];
  if (dados.casa?.numero) {
    partes.push(`Casa ${dados.casa.numero}`);
  } else if (dados.casa?.nome) {
    partes.push(dados.casa.nome);
  }

  if (dados.numeroAlojamento) {
    partes.push(`Aloj. ${dados.numeroAlojamento}`);
  }

  if (dados.ala) {
    partes.push(`Ala ${dados.ala}`);
  }

  return partes.length ? partes.join(" - ") : undefined;
};

const normalizarCI = (payload: ApiCI): ComunicadoInterno => ({
  id: payload.id,
  numero: payload.numero,
  ano: payload.ano,
  dataFato: payload.dataFato,
  tipoCi: payload.tipoCi ?? payload.tipoCI ?? "N/A",
  resumoCi: payload.resumoCi ?? payload.resumoCI ?? "",
  caminhoPdf: payload.caminhoPdf ?? undefined,
  operador: payload.operador ?? null,
  criadoEm: payload.criadoEm,
  adolescentes: (payload.adolescentes ?? []).map((adolescente) => ({
    id: adolescente.id,
    nome: formatarNomeAdolescente(adolescente),
    numeroSms: adolescente.numeroSms ?? "Nao informado",
    alojamento:
      adolescente.alojamento ??
      formatarAlojamento(adolescente.alojamentoAtual ?? null),
    ladoConflito: adolescente.ladoConflito === "LADO_2"
      ? "LADO_2"
      : adolescente.ladoConflito === "LADO_1"
      ? "LADO_1"
      : null,
  })),
  conflitosGerados: (payload.conflitos ?? []).map((conflito) => ({
    id: conflito.id,
    adolescenteA: conflito.adolescenteA
      ? {
          id: conflito.adolescenteA.id ?? `${conflito.id}-A`,
          nome:
            conflito.adolescenteA.nome ??
            conflito.adolescenteA.nomeCompleto ??
            "Participante Lado 1",
        }
      : null,
    adolescenteB: conflito.adolescenteB
      ? {
          id: conflito.adolescenteB.id ?? `${conflito.id}-B`,
          nome:
            conflito.adolescenteB.nome ??
            conflito.adolescenteB.nomeCompleto ??
            "Participante Lado 2",
        }
      : null,
  })),
  alertasGerados: (payload.alertas ?? []).map((alerta) => ({
    id: alerta.id,
    adolescente:
      alerta.adolescente?.nome ??
      alerta.adolescente?.nomeCompleto ??
      "Adolescente",
    tipo: alerta.tipoAlerta ?? alerta.tipo ?? "ALERTA",
  })),
});

export default function CIPorIdPage() {
  const params = useParams();
  const router = useRouter();
  const ciId = params.id as string;

  const [ci, setCI] = useState<ComunicadoInterno | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarCI();
  }, [ciId]);

  const carregarCI = async () => {
    try {
      const response = await fetch(`/api/comunicados/${ciId}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar CI");
      }

      const data: ApiCI = await response.json();
      setCI(normalizarCI(data));
    } catch (error) {
      console.error("Erro:", error);
      setErro(true);

      // Mock de dados para desenvolvimento
      const mockCI: ComunicadoInterno = {
        id: ciId,
        numero: 145,
        ano: 2025,
        dataFato: "2025-10-20",
        tipoCi: "CONFLITO",
        resumoCi:
          "Conflito entre adolescentes durante atividade no solário. Facções rivais envolvidas. Necessária intervenção da equipe de segurança.",
        caminhoPdf: "/pdfs/ci-145-2025.pdf",
        operador: {
          id: "op-001",
          nome: "José Silva",
        },
        adolescentes: [
          {
            id: "adol-001",
            nome: "João da Silva Santos",
            numeroSms: "12345",
            alojamento: "Casa 02 - Aloj 05",
          },
          {
            id: "adol-003",
            nome: "Pedro Henrique Oliveira",
            numeroSms: "12347",
            alojamento: "Casa 02 - Aloj 06",
          },
        ],
        criadoEm: "2025-10-20T14:30:00",
        conflitosGerados: [
          {
            id: "conf-001",
            adolescenteA: {
              id: "adol-001",
              nome: "João da Silva Santos",
            },
            adolescenteB: {
              id: "adol-003",
              nome: "Pedro Henrique Oliveira",
            },
          },
        ],
        alertasGerados: [],
      };

      setCI(mockCI);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarConflito = async (dados: any) => {
    try {
      const response = await fetch("/api/conflitos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar conflito");
      }

      // Recarregar CI para mostrar novo conflito
      await carregarCI();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  };

  const handleCriarAlerta = async (dados: any) => {
    try {
      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar alerta");
      }

      // Recarregar CI para mostrar novo alerta
      await carregarCI();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando CI...</p>
        </div>
      </div>
    );
  }

  if (erro && !ci) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            CI não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O CI com ID {ciId} não foi encontrado no sistema.
          </p>
          <button
            onClick={() => router.push("/comunicados")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  if (!ci) {
    return null;
  }

  const handleEditar = () => {
    router.push(`/comunicados/${ciId}/editar`);
  };

  const handleExcluirConflitoGerado = async (conflitoId: string) => {
    const response = await fetch(`/api/conflitos/${conflitoId}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.erro ?? "Erro ao remover conflito.");
    }
    await carregarCI();
  };

  const handleExcluirAlertaGerado = async (alertaId: string) => {
    const response = await fetch(`/api/alertas/${alertaId}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.erro ?? "Erro ao remover alerta.");
    }
    await carregarCI();
  };

  const handleExcluir = async () => {
    if (!ci) return;
    const confirmado = window.confirm(
      `Confirma a exclusão do CI ${ci.numero}/${ci.ano}? Esta ação não poderá ser desfeita.`
    );
    if (!confirmado) return;

    const possuiConflitos =
      (ci.conflitosGerados?.length ?? 0) > 0;
    const possuiAlertas =
      (ci.alertasGerados?.length ?? 0) > 0;

    const removerConflitos = possuiConflitos
      ? window.confirm(
          "Deseja excluir também os conflitos vinculados a este CI?"
        )
      : false;
    const removerAlertas = possuiAlertas
      ? window.confirm(
          "Deseja excluir também os alertas vinculados a este CI?"
        )
      : false;

    setExcluindo(true);
    try {
      const response = await fetch(`/api/comunicados/${ciId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          removerConflitos,
          removerAlertas,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao excluir comunicado.");
      }

      alert(payload?.mensagem ?? "Comunicado excluído com sucesso.");
      router.push("/comunicados");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Falha ao excluir comunicado."
      );
      setExcluindo(false);
    }
  };

  return (
    <DetalhesCI
      ci={ci}
      onCriarConflito={handleCriarConflito}
      onCriarAlerta={handleCriarAlerta}
      onExcluirConflito={handleExcluirConflitoGerado}
      onExcluirAlerta={handleExcluirAlertaGerado}
      onEditar={handleEditar}
      onExcluir={handleExcluir}
      excluindo={excluindo}
    />
  );
}
