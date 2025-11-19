"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Search,
  User,
  ChevronDown,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type ResultadoBusca = {
  adolescentes: Array<{
    id: string;
    nome: string;
    numeroSms?: string | null;
    numeroProcesso?: string | null;
    status?: string | null;
    alojamento?: string | null;
  }>;
  comunicados: Array<{
    id: string;
    numero: number;
    ano: number;
    tipo?: string | null;
    resumo?: string | null;
  }>;
};

const RESULTADOS_INICIAIS: ResultadoBusca = {
  adolescentes: [],
  comunicados: [],
};

type Notificacoes = {
  alertasEspeciais: Array<{
    id: string;
    adolescenteId: string;
    adolescenteNome: string;
    status: string | null;
    tipoAlerta: string | null;
    descricao: string;
    criadoEm: string;
  }>;
  comunicadosCriticos: Array<{
    id: string;
    numero: number;
    ano: number;
    tipo: string | null;
    resumo: string | null;
    dataFato: string;
  }>;
};

const NOTIFICACOES_INICIAIS: Notificacoes = {
  alertasEspeciais: [],
  comunicadosCriticos: [],
};

export function Header() {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [busca, setBusca] = useState("");
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [resultados, setResultados] =
    useState<ResultadoBusca>(RESULTADOS_INICIAIS);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] =
    useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] =
    useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacoes>(
    NOTIFICACOES_INICIAIS
  );
  const router = useRouter();
  const buscaContainerRef = useRef<HTMLDivElement | null>(null);
  const notificacoesRef = useRef<HTMLDivElement | null>(null);
  const { user: authUser, logout } = useAuth();
  const usuarioNome = authUser?.name ?? "Operador";
  const usuarioRole = authUser?.cargo ?? "Perfil";

  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (
        buscaContainerRef.current &&
        !buscaContainerRef.current.contains(event.target as Node)
      ) {
        setMostrarResultados(false);
      }
      if (
        notificacoesRef.current &&
        !notificacoesRef.current.contains(event.target as Node)
      ) {
        setMostrarNotificacoes(false);
      }
    };

    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados(RESULTADOS_INICIAIS);
      setMostrarResultados(false);
      setErroBusca(null);
      return;
    }

    const controller = new AbortController();
    setCarregandoBusca(true);
    setErroBusca(null);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(busca.trim())}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar");
        }
        const payload = await response.json();
        setResultados(payload.resultados ?? RESULTADOS_INICIAIS);
        setMostrarResultados(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Erro na busca rapida:", error);
          setErroBusca("Não foi possível buscar.");
          setResultados(RESULTADOS_INICIAIS);
          setMostrarResultados(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoBusca(false);
        }
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
      setCarregandoBusca(false);
    };
  }, [busca]);

  const limparBusca = () => {
    setBusca("");
    setResultados(RESULTADOS_INICIAIS);
    setMostrarResultados(false);
    setErroBusca(null);
  };

  const handleSelecionar = (url: string) => {
    limparBusca();
    router.push(url);
  };

  const temResultados =
    resultados.adolescentes.length > 0 || resultados.comunicados.length > 0;
  const totalNotificacoes =
    notificacoes.alertasEspeciais.length +
    notificacoes.comunicadosCriticos.length;

  const carregarNotificacoes = async () => {
    try {
      setCarregandoNotificacoes(true);
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Falha ao carregar notificacoes");
      }
      const data = await response.json();
      setNotificacoes({
        alertasEspeciais: data.alertasEspeciais ?? [],
        comunicadosCriticos: data.comunicadosCriticos ?? [],
      });
      setMostrarNotificacoes(true);
    } catch (error) {
      console.error("Erro ao carregar notificacoes:", error);
      setNotificacoes(NOTIFICACOES_INICIAIS);
      setMostrarNotificacoes(true);
    } finally {
      setCarregandoNotificacoes(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Barra de Busca */}
        <div className="flex-1 max-w-xl" ref={buscaContainerRef}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onFocus={() => temResultados && setMostrarResultados(true)}
              placeholder="Buscar adolescente, CI, processo..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
            {mostrarResultados && (
              <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-20">
                {carregandoBusca ? (
                  <div className="p-4 text-sm text-gray-500">
                    Buscando resultados...
                  </div>
                ) : erroBusca ? (
                  <div className="p-4 text-sm text-red-600">{erroBusca}</div>
                ) : !temResultados ? (
                  <div className="p-4 text-sm text-gray-500">
                    Nenhum resultado para &quot;{busca.trim()}&quot;
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Adolescentes
                      </p>
                      {resultados.adolescentes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum adolescente encontrado
                        </p>
                      ) : (
                        resultados.adolescentes.map((ado) => (
                          <button
                            key={ado.id}
                            onClick={() =>
                              handleSelecionar(`/adolescentes/${ado.id}`)
                            }
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-between"
                          >
                            <div className="pr-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {ado.nome}
                              </p>
                              <p className="text-xs text-gray-500">
                                {ado.numeroSms
                                  ? `SMS: ${ado.numeroSms}`
                                  : "SMS não informado"}
                                {ado.numeroProcesso
                                  ? ` • Proc.: ${ado.numeroProcesso}`
                                  : ""}
                              </p>
                              {ado.alojamento && (
                                <p className="text-xs text-gray-400">
                                  {ado.alojamento}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-600">
                              {ado.status ?? ""}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Comunicados Internos
                      </p>
                      {resultados.comunicados.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum comunicado encontrado
                        </p>
                      ) : (
                        resultados.comunicados.map((ci) => (
                          <button
                            key={ci.id}
                            onClick={() =>
                              handleSelecionar(`/comunicados/${ci.id}`)
                            }
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-start gap-3"
                          >
                            <FileText
                              size={18}
                              className="text-indigo-500 mt-0.5"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                CI {ci.numero}/{ci.ano}
                              </p>
                              <p className="text-xs text-gray-500">
                                {ci.tipo ?? "Tipo não informado"}
                              </p>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {ci.resumo ?? "Sem resumo"}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-4 ml-6">
          {/* Notificações */}
          <div className="relative" ref={notificacoesRef}>
            <button
              onClick={() => {
                if (mostrarNotificacoes) {
                  setMostrarNotificacoes(false);
                } else {
                  carregarNotificacoes();
                }
              }}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={22} />
              {totalNotificacoes > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {mostrarNotificacoes && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-2xl z-30">
                {carregandoNotificacoes ? (
                  <div className="p-4 text-sm text-gray-500">
                    Carregando notificações...
                  </div>
                ) : totalNotificacoes === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    Nenhuma notificação recente.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Alertas especiais
                      </p>
                      {notificacoes.alertasEspeciais.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Sem alertas especiais recentes.
                        </p>
                      ) : (
                        notificacoes.alertasEspeciais.map((alerta) => (
                          <button
                            key={alerta.id}
                            onClick={() =>
                              handleSelecionar(`/adolescentes/${alerta.adolescenteId}`)
                            }
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 transition flex gap-3"
                          >
                            <AlertTriangle
                              size={18}
                              className="text-orange-600 mt-0.5"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {alerta.adolescenteNome}
                              </p>
                              <p className="text-xs text-gray-500">
                                {alerta.tipoAlerta}
                              </p>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {alerta.descricao}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Comunicados críticos
                      </p>
                      {notificacoes.comunicadosCriticos.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Sem comunicados recentes.
                        </p>
                      ) : (
                        notificacoes.comunicadosCriticos.map((ci) => (
                          <button
                            key={ci.id}
                            onClick={() =>
                              handleSelecionar(`/comunicados/${ci.id}`)
                            }
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition flex gap-3"
                          >
                            <FileText
                              size={18}
                              className="text-indigo-500 mt-0.5"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                CI {ci.numero}/{ci.ano}
                              </p>
                              <p className="text-xs text-gray-500">
                                {ci.tipo ?? "Sem tipo"}
                              </p>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {ci.resumo ?? "Sem resumo"}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Perfil do Usuário */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenu(!mostrarMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                {usuarioNome.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-800">
                  {usuarioNome}
                </p>
                <p className="text-xs text-gray-600">
                  {usuarioRole}
                </p>
              </div>
              <ChevronDown
                size={16}
                className="text-gray-600 hidden md:block"
              />
            </button>

            {/* Dropdown Menu */}
            {mostrarMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMostrarMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">
                      {usuarioNome}
                    </p>
                    <p className="text-xs text-gray-600">
                      {usuarioRole}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = "/dashboard/perfil";
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <User size={16} />
                    Meu Perfil
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Deseja realmente sair?")) {
                        logout();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
