"use client";

import { useState, useEffect } from "react";
import { ListagemConflitos } from "@/components/conflitos/listagem-conflitos";

type Participante = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string;
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
};

type Conflito = Omit<ApiConflito, "adolescenteA" | "adolescenteB"> & {
  registroGrupoId: string;
  participantes: Participante[];
};

const normalizarConflito = (conflito: ApiConflito): Conflito => {
  const participantes: Participante[] = [];

  if (conflito.adolescenteA) {
    participantes.push({ ...conflito.adolescenteA });
  }

  if (conflito.adolescenteB) {
    participantes.push({ ...conflito.adolescenteB });
  }

  return {
    id: conflito.id,
    registroGrupoId: conflito.registroGrupoId ?? conflito.id,
    tipoConflito: conflito.tipoConflito,
    status: conflito.status,
    origem: conflito.origem,
    descricao: conflito.descricao,
    criadoEm: conflito.criadoEm,
    resolvidoEm: conflito.resolvidoEm,
    tentativasMediacao: conflito.tentativasMediacao,
    ultimaMediacao: conflito.ultimaMediacao,
    participantes,
  };
};

export default function ConflitosPage() {
  const [conflitos, setConflitos] = useState<Conflito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarConflitos();
  }, []);

  const carregarConflitos = async () => {
    try {
      const response = await fetch("/api/conflitos");

      if (!response.ok) {
        throw new Error("Erro ao carregar conflitos");
      }

      const data = await response.json();
      setConflitos(data.map(normalizarConflito));
    } catch (error) {
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
      setConflitos(mockConflitos.map(normalizarConflito));
    } finally {
      setLoading(false);
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

  return <ListagemConflitos conflitos={conflitos} />;
}
