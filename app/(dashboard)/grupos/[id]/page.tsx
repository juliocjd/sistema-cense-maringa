"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Users, UserPlus, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ModalAdicionarMembro } from "@/components/grupos/modal-adicionar-membro";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

type Alojamento = {
  id: string;
  numero: string;
  ala: string | null;
};

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  numeroSms: string | null;
  fotoUrl: string | null;
  statusUnidade: string;
  alojamento: Alojamento | null;
  conflitosAtivos?: number;
};

type Membro = {
  id: string;
  dataEntrada: string;
  dataSaida: string | null;
  ativo: boolean;
  adolescente: Adolescente;
};

type Grupo = {
  id: string;
  nomeGrupo: string;
  ordemAla: string | null;
  status: "ATIVO" | "INATIVO";
  criadoEm: string;
  casa: Casa;
  totalMembros: number;
  membrosAtivos: number;
  membrosInativos: number;
  membros: Membro[];
};

export default function DetalhesGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarGrupo();

    // Abrir modal se veio da listagem com ação
    if (searchParams.get("acao") === "adicionar-membro") {
      setModalAberto(true);
    }
  }, [resolvedParams.id]);

  const carregarGrupo = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/grupos/${resolvedParams.id}?incluir_membros=true`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar grupo");
      }

      const data = await response.json();
      setGrupo(data);
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
      alert("Erro ao carregar grupo");
      router.push("/grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverMembro = async (membroId: string, nomeAdolescente: string) => {
    if (!confirm(`Deseja realmente remover ${nomeAdolescente} do grupo?`)) {
      return;
    }

    try {
      setRemovendo(membroId);
      const response = await fetch(
        `/api/grupos/${resolvedParams.id}/membros/${membroId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.erro || "Erro ao remover membro");
        return;
      }

      alert("Membro removido com sucesso!");
      carregarGrupo();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      alert("Erro ao remover membro");
    } finally {
      setRemovendo(null);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando grupo...</p>
        </div>
      </div>
    );
  }

  if (!grupo) {
    return null;
  }

  const membrosAtivos = grupo.membros.filter((m) => m.ativo);
  const membrosInativos = grupo.membros.filter((m) => !m.ativo);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/grupos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para Grupos
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="text-indigo-600" size={32} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {grupo.nomeGrupo}
                  </h1>
                  {grupo.ordemAla && (
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">
                      Ala {grupo.ordemAla}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${
                      grupo.status === "ATIVO"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {grupo.status}
                  </span>
                </div>
                <p className="text-gray-600 font-semibold">{grupo.casa.nome}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Criado em {formatarData(grupo.criadoEm)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-lg"
            >
              <UserPlus size={20} />
              Adicionar Membro
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Total de Membros</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {grupo.totalMembros}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Membros Ativos</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {grupo.membrosAtivos}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Membros Removidos</p>
          <p className="text-3xl font-bold text-gray-600 mt-2">
            {grupo.membrosInativos}
          </p>
        </div>
      </div>

      {/* Lista de Membros Ativos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Membros Ativos</h2>
          <p className="text-sm text-gray-600 mt-1">
            {membrosAtivos.length} {membrosAtivos.length === 1 ? "membro" : "membros"}
          </p>
        </div>

        {membrosAtivos.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Nenhum membro ativo
            </h3>
            <p className="text-gray-600 mb-6">
              Adicione adolescentes a este grupo para começar.
            </p>
            <button
              onClick={() => setModalAberto(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-bold"
            >
              <UserPlus size={20} />
              Adicionar Primeiro Membro
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Adolescente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    SMS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Alojamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Data Entrada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Conflitos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {membrosAtivos.map((membro) => (
                  <tr key={membro.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                          {membro.adolescente.fotoUrl ? (
                            <img
                              src={membro.adolescente.fotoUrl}
                              alt={membro.adolescente.nomeCompleto}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            membro.adolescente.nomeCompleto.charAt(0)
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/adolescentes/${membro.adolescente.id}`}
                            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                          >
                            {membro.adolescente.nomeCompleto}
                          </Link>
                          {membro.adolescente.nomeSocial && (
                            <p className="text-sm text-gray-500">
                              ({membro.adolescente.nomeSocial})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">
                        {membro.adolescente.numeroSms || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {membro.adolescente.alojamento ? (
                        <span className="text-sm text-gray-900 font-semibold">
                          Aloj {membro.adolescente.alojamento.numero}
                          {membro.adolescente.alojamento.ala && (
                            <span className="text-gray-600">
                              {" "}(Ala {membro.adolescente.alojamento.ala})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Sem alojamento</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatarData(membro.dataEntrada)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {membro.adolescente.conflitosAtivos && membro.adolescente.conflitosAtivos > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                          <AlertTriangle size={14} />
                          {membro.adolescente.conflitosAtivos}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                          <CheckCircle size={14} />
                          Nenhum
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() =>
                          handleRemoverMembro(membro.id, membro.adolescente.nomeCompleto)
                        }
                        disabled={removendo === membro.id}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-sm disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {removendo === membro.id ? "Removendo..." : "Remover"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Membros Inativos (se houver) */}
      {membrosInativos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Membros Removidos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Histórico de membros que foram removidos do grupo
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Adolescente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Data Entrada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Data Saída
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {membrosInativos.map((membro) => (
                  <tr key={membro.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/adolescentes/${membro.adolescente.id}`}
                        className="font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {membro.adolescente.nomeCompleto}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatarData(membro.dataEntrada)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {membro.dataSaida ? formatarData(membro.dataSaida) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adicionar Membro */}
      {modalAberto && (
        <ModalAdicionarMembro
          grupoId={grupo.id}
          nomeGrupo={grupo.nomeGrupo}
          onClose={() => {
            setModalAberto(false);
            router.replace(`/grupos/${grupo.id}`);
          }}
          onSucesso={() => {
            carregarGrupo();
            setModalAberto(false);
            router.replace(`/grupos/${grupo.id}`);
          }}
        />
      )}
    </div>
  );
}
