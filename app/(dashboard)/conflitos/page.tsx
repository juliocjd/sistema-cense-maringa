"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ListagemConflitos } from "@/components/conflitos/listagem-conflitos";

type Participante = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string;
  lado?: string | null;
  statusUnidade?: string | null;
};

type ApiConflito = {
  id: string;
  registroGrupoId?: string;
  adolescenteA?: Participante;
  adolescenteB?: Participante;
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  origem: string;
  descricao?: string;
  criadoEm: string;
  resolvidoEm?: string;
  tentativasMediacao: number;
  ultimaMediacao?: string;
  totalOcorrencias?: number;
  ultimaOcorrenciaEm?: string;
  operadorResponsavel?: {
    id: string;
    nomeCompleto: string;
  } | null;
};

type Conflito = Omit<ApiConflito, "adolescenteA" | "adolescenteB"> & {
  registroGrupoId: string;
  participantes: Participante[];
  ativosPorLado: Record<"Lado 1" | "Lado 2", number>;
};

const ordenarConflitos = (lista: Conflito[]) => {
  const pesoStatus = (status: Conflito["status"]) =>
    status === "ATIVO" ? 0 : 1;
  return [...lista].sort((a, b) => {
    const diffStatus = pesoStatus(a.status) - pesoStatus(b.status);
    if (diffStatus !== 0) {
      return diffStatus;
    }
    return (
      new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  });
};

const normalizarConflito = (conflito: ApiConflito): Conflito => {
  const participantes: Participante[] = [];

  if (conflito.adolescenteA) {
    participantes.push({
      ...conflito.adolescenteA,
      statusUnidade: (conflito.adolescenteA as any).statusUnidade ?? conflito.adolescenteA?.statusUnidade ?? null,
      lado: "Lado 1",
    });
  }

  if (conflito.adolescenteB) {
    participantes.push({
      ...conflito.adolescenteB,
      statusUnidade: (conflito.adolescenteB as any).statusUnidade ?? conflito.adolescenteB?.statusUnidade ?? null,
      lado: "Lado 2",
    });
  }

  const statusComParticipantes: "ATIVO" | "RESOLVIDO" =
    conflito.status === "RESOLVIDO" &&
    participantes.some(
      (p) => (p.statusUnidade ?? "").toUpperCase() === "ATIVO"
    )
      ? "ATIVO"
      : conflito.status;

  const ativosPorLado = participantes.reduce(
    (contagem, participante) => {
      const lado = participante.lado === "Lado 2" ? "Lado 2" : "Lado 1";
      const estaAtivo =
        (participante.statusUnidade ?? "").toUpperCase() === "ATIVO";
      if (estaAtivo) {
        contagem[lado] += 1;
      }
      return contagem;
    },
    {
      "Lado 1": 0,
      "Lado 2": 0,
    }
  );

  return {
    id: conflito.id,
    registroGrupoId: conflito.registroGrupoId ?? conflito.id,
    tipoConflito: conflito.tipoConflito,
    status: statusComParticipantes,
    origem: conflito.origem,
    descricao: conflito.descricao,
    criadoEm: conflito.criadoEm,
    resolvidoEm: statusComParticipantes === "ATIVO" ? undefined : conflito.resolvidoEm,
    tentativasMediacao: conflito.tentativasMediacao,
    ultimaMediacao: conflito.ultimaMediacao,
    totalOcorrencias: conflito.totalOcorrencias ?? 0,
    ultimaOcorrenciaEm: conflito.ultimaOcorrenciaEm,
    operadorResponsavel: conflito.operadorResponsavel ?? null,
    participantes,
    ativosPorLado,
  };
};

const agruparConflitosPorGrupo = (lista: Conflito[]): Conflito[] => {
  const grupos = new Map<
    string,
    Conflito & { participantesMap: Map<string, Participante> }
  >();

  lista.forEach((conflito) => {
    const grupoId = conflito.registroGrupoId || conflito.id;
    let grupo = grupos.get(grupoId);
    const jaExistia = Boolean(grupo);

    if (!grupo) {
      const participantesMap = new Map<string, Participante>();
      conflito.participantes.forEach((participante) => {
        participantesMap.set(participante.id, participante);
      });

      grupo = {
        ...conflito,
        registroGrupoId: grupoId,
        resolvidoEm: conflito.status === "ATIVO" ? undefined : conflito.resolvidoEm,
        totalOcorrencias: conflito.totalOcorrencias ?? 0,
        ultimaOcorrenciaEm: conflito.ultimaOcorrenciaEm ?? undefined,
        participantesMap,
      };
      grupos.set(grupoId, grupo);
    } else {
      conflito.participantes.forEach((participante) => {
        const atual = grupo!.participantesMap.get(participante.id);
        if (!atual) {
          grupo!.participantesMap.set(participante.id, participante);
        } else if (!atual.lado && participante.lado) {
          grupo!.participantesMap.set(participante.id, {
            ...atual,
            lado: participante.lado,
          });
        }
      });
    }

    const alvo = grupo!;

    if (alvo.status !== "ATIVO" && conflito.status === "ATIVO") {
      alvo.status = "ATIVO";
      alvo.resolvidoEm = undefined;
    } else if (
      conflito.status === "RESOLVIDO" &&
      alvo.status === "RESOLVIDO" &&
      conflito.resolvidoEm
    ) {
      const atual = alvo.resolvidoEm
        ? new Date(alvo.resolvidoEm).getTime()
        : null;
      const novo = new Date(conflito.resolvidoEm).getTime();
      if (!atual || novo > atual) {
        alvo.resolvidoEm = conflito.resolvidoEm;
      }
    }

    if (new Date(conflito.criadoEm).getTime() < new Date(alvo.criadoEm).getTime()) {
      alvo.criadoEm = conflito.criadoEm;
    }

    if (jaExistia) {
      alvo.tentativasMediacao += conflito.tentativasMediacao ?? 0;
      alvo.totalOcorrencias =
        (alvo.totalOcorrencias ?? 0) + (conflito.totalOcorrencias ?? 0);
    }

    if (conflito.ultimaMediacao) {
      const atual = alvo.ultimaMediacao
        ? new Date(alvo.ultimaMediacao).getTime()
        : null;
      const novo = new Date(conflito.ultimaMediacao).getTime();
      if (!atual || novo > atual) {
        alvo.ultimaMediacao = conflito.ultimaMediacao;
      }
    }

    if (conflito.ultimaOcorrenciaEm) {
      const atual = alvo.ultimaOcorrenciaEm
        ? new Date(alvo.ultimaOcorrenciaEm).getTime()
        : null;
      const novo = new Date(conflito.ultimaOcorrenciaEm).getTime();
      if (!atual || novo > atual) {
        alvo.ultimaOcorrenciaEm = conflito.ultimaOcorrenciaEm;
      }
    }

    if (!alvo.descricao && conflito.descricao) {
      alvo.descricao = conflito.descricao;
    }

    if (
      (!alvo.origem || alvo.origem === "Registro direto") &&
      conflito.origem &&
      conflito.origem !== "Registro direto"
    ) {
      alvo.origem = conflito.origem;
    }
  });

  return Array.from(grupos.values()).map(({ participantesMap, ...resto }) => {
    const participantes = Array.from(participantesMap.values());
    const ativosPorLado = participantes.reduce(
      (contagem, participante) => {
        const lado =
          participante.lado === "Lado 2" ? "Lado 2" : "Lado 1";
        const estaAtivo =
          (participante.statusUnidade ?? "").toUpperCase() === "ATIVO";
        if (estaAtivo) {
          contagem[lado] += 1;
        }
        return contagem;
      },
      {
        "Lado 1": 0,
        "Lado 2": 0,
      }
    );

    return {
      ...resto,
      participantes,
      ativosPorLado,
    };
  });
};

export default function ConflitosPage() {
  const [conflitos, setConflitos] = useState<Conflito[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [incluirInativos, setIncluirInativos] = useState(false);

  const participanteStatusParam = useMemo(() => {
    if (incluirInativos) {
      return "ATIVO,TRANSFERIDO,LIBERADO,EVADIDO";
    }
    return "ATIVO";
  }, [incluirInativos]);

  const carregarConflitos = useCallback(async () => {
    try {
      setErro(null);
      setLoading(true);
      const params = new URLSearchParams({
        participanteStatus: participanteStatusParam,
        status: "TODOS",
      });
      const response = await fetch(`/api/conflitos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar conflitos");
      }

      const data = await response.json();
      const normalizados = data.map(normalizarConflito);
      const agrupados = agruparConflitosPorGrupo(normalizados);
      setConflitos(ordenarConflitos(agrupados));
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Erro ao carregar conflitos";
      setErro(mensagem);
      // Mock de dados para desenvolvimento
      const mockConflitos: ApiConflito[] = [
        {
          id: "conf-001",
          registroGrupoId: "grp-001",
          adolescenteA: {
            id: "adol-001",
            nome: "João da Silva Santos",
            numeroSms: "12345",
            alojamento: "Casa 02 - Aloj 05",
          },
          adolescenteB: {
            id: "adol-002",
            nome: "Pedro Henrique Oliveira",
            numeroSms: "12347",
            alojamento: "Casa 02 - Aloj 06",
          },
          tipoConflito: "FACCAO",
          status: "ATIVO",
          origem: "CI 145/2025",
          descricao:
            "Facções rivais. Adolescentes apresentaram comportamento agressivo durante atividade em grupo.",
          criadoEm: "2025-10-20T10:30:00",
          tentativasMediacao: 0,
        },
        {
          id: "conf-002",
          registroGrupoId: "grp-002",
          adolescenteA: {
            id: "adol-003",
            nome: "Carlos Eduardo Mendes",
            numeroSms: "12349",
            alojamento: "Casa 03 - Aloj 02",
          },
          adolescenteB: {
            id: "adol-004",
            nome: "Rafael dos Santos Lima",
            numeroSms: "12351",
            alojamento: "Casa 07 - Aloj 02",
          },
          tipoConflito: "TERRITORIAL",
          status: "ATIVO",
          origem: "Observação direta",
          descricao:
            "Conflito territorial. Ambos são de bairros rivais (Zona 7 x Jardim Alvorada).",
          criadoEm: "2025-10-18T14:15:00",
          tentativasMediacao: 2,
          ultimaMediacao: "2025-10-25T09:00:00",
        },
        {
          id: "conf-003",
          registroGrupoId: "grp-003",
          adolescenteA: {
            id: "adol-005",
            nome: "Ana Paula Rodrigues",
            numeroSms: "12348",
            alojamento: "Casa 05 - Aloj 03",
          },
          adolescenteB: {
            id: "adol-006",
            nome: "Fernanda Alves Pereira",
            numeroSms: "12352",
            alojamento: "Casa 06 - Aloj 04",
          },
          tipoConflito: "PESSOAL",
          status: "RESOLVIDO",
          origem: "Denúncia",
          descricao:
            "Desentendimento pessoal. Mediação realizada com sucesso pela equipe de psicologia.",
          criadoEm: "2025-09-10T11:20:00",
          resolvidoEm: "2025-10-05T15:30:00",
          tentativasMediacao: 3,
        },
        {
          id: "conf-004",
          registroGrupoId: "grp-004",
          adolescenteA: {
            id: "adol-001",
            nome: "João da Silva Santos",
            numeroSms: "12345",
            alojamento: "Casa 02 - Aloj 05",
          },
          adolescenteB: {
            id: "adol-007",
            nome: "Lucas Ferreira Costa",
            numeroSms: "12353",
            alojamento: "Casa 04 - Aloj 08",
          },
          tipoConflito: "FACCAO",
          status: "ATIVO",
          origem: "CI 152/2025",
          descricao:
            "Facções rivais. Ameaças verbais durante atividade no solário.",
          criadoEm: "2025-10-22T16:45:00",
          tentativasMediacao: 1,
          ultimaMediacao: "2025-10-28T10:00:00",
        },
        {
          id: "conf-005",
          registroGrupoId: "grp-005",
          adolescenteA: {
            id: "adol-008",
            nome: "Matheus Henrique Silva",
            numeroSms: "12354",
            alojamento: "Casa 06 - Aloj 07",
          },
          adolescenteB: {
            id: "adol-009",
            nome: "Gabriel Santos Oliveira",
            numeroSms: "12355",
            alojamento: "Casa 06 - Aloj 09",
          },
          tipoConflito: "OUTROS",
          status: "ATIVO",
          origem: "Observação direta",
          descricao:
            "Discussão durante jogo de futebol. Equipe de segurança interviu.",
          criadoEm: "2025-10-29T14:20:00",
          tentativasMediacao: 0,
        },
      ];
      const normalizadosMock = mockConflitos.map(normalizarConflito);
      const agrupadosMock = agruparConflitosPorGrupo(normalizadosMock);
      setConflitos(ordenarConflitos(agrupadosMock));
    } finally {
      setLoading(false);
    }
  }, [participanteStatusParam]);

  useEffect(() => {
    carregarConflitos();
  }, [carregarConflitos]);

  const handleExcluir = async (conflito: Conflito) => {
    if (
      !confirm(
        "Deseja realmente excluir este conflito? Todos os registros relacionados a este grupo serão removidos."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/conflitos/${conflito.id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const mensagem =
          payload?.erro ??
          "Nao foi possivel excluir o conflito. Tente novamente.";
        throw new Error(mensagem);
      }

      const grupoAlvo = payload?.registroGrupoId ?? conflito.registroGrupoId;
      setConflitos((lista) =>
        lista.filter((item) => item.registroGrupoId !== grupoAlvo)
      );

      alert("Conflito excluido com sucesso.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao excluir conflito."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando conflitos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <ListagemConflitos
        conflitos={conflitos}
        onExcluir={handleExcluir}
        incluirInativos={incluirInativos}
        onToggleInativos={setIncluirInativos}
      />
    </div>
  );
}



