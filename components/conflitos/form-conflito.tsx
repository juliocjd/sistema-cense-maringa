"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CatalogoBairro, CatalogoFaccao } from "@/types/inteligencia";
import type { CidadeCatalogo } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { ESTADOS_BRASIL } from "@/lib/geo/estados";

type TipoConflito = "BAIRRO" | "FACCAO";

interface FormConflitoProps {
  bairros: CatalogoBairro[];
  faccoes: CatalogoFaccao[];
  compact?: boolean;
}

export default function FormConflito({
  bairros,
  faccoes,
  compact = false,
}: FormConflitoProps) {
  const router = useRouter();
  const { user } = useAuth();
  const podeGerenciar = useMemo(
    () => hasPermission(user?.permissions, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE),
    [user?.permissions]
  );
  const [tipo, setTipo] = useState<TipoConflito>("BAIRRO");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [origemBusca, setOrigemBusca] = useState("");
  const [destinoBusca, setDestinoBusca] = useState("");
  const [mostrarSugestoesOrigem, setMostrarSugestoesOrigem] = useState(false);
  const [mostrarSugestoesDestino, setMostrarSugestoesDestino] = useState(false);
  const [fonteInformacao, setFonteInformacao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bairrosLista, setBairrosLista] = useState(bairros);
  const [cidades, setCidades] = useState<CidadeCatalogo[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [erroCidades, setErroCidades] = useState<string | null>(null);
  const [modalCadastroBairro, setModalCadastroBairro] = useState(false);
  const [modalCadastroFaccao, setModalCadastroFaccao] = useState(false);
  const [cadastroTarget, setCadastroTarget] = useState<"ORIGEM" | "DESTINO" | null>(null);
  const [bairroNovoNome, setBairroNovoNome] = useState("");
  const [cidadeId, setCidadeId] = useState("");
  const [salvandoBairro, setSalvandoBairro] = useState(false);
  const [erroBairro, setErroBairro] = useState<string | null>(null);
  const [faccaoNovaNome, setFaccaoNovaNome] = useState("");
  const [faccaoNovaDescricao, setFaccaoNovaDescricao] = useState("");
  const [salvandoFaccao, setSalvandoFaccao] = useState(false);
  const [erroFaccao, setErroFaccao] = useState<string | null>(null);
  const [novaCidade, setNovaCidade] = useState({
    aberto: false,
    nome: "",
    estado: "PR",
    salvando: false,
    erro: null as string | null,
  });

  useEffect(() => {
    setBairrosLista(bairros);
  }, [bairros]);

  useEffect(() => {
    let ativo = true;
    const carregarCidades = async () => {
      setCarregandoCidades(true);
      try {
        const resposta = await fetch("/api/cidades");
        if (!resposta.ok) {
          throw new Error("Falha ao carregar cidades");
        }
        const payload = await resposta.json().catch(() => null);
        if (!ativo) return;
        const lista = Array.isArray(payload?.cidades) ? payload.cidades : [];
        setCidades(lista);
        setErroCidades(null);
      } catch (error) {
        if (!ativo) return;
        setErroCidades("Nao foi possivel carregar as cidades.");
      } finally {
        if (ativo) {
          setCarregandoCidades(false);
        }
      }
    };

    carregarCidades();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setOrigem("");
    setDestino("");
    setOrigemBusca("");
    setDestinoBusca("");
  }, [tipo]);

  const opcoes = useMemo(() => {
    if (tipo === "BAIRRO") {
      return bairrosLista.map((bairro) => ({
        id: bairro.id,
        label: bairro.nome,
        descricao: `${bairro.cidade}${bairro.estado ? ` - ${bairro.estado}` : ""}`,
      }));
    }
    return faccoes.map((faccao) => ({
      id: faccao.id,
      label: faccao.nome,
      descricao: faccao.descricao ?? "",
    }));
  }, [bairrosLista, faccoes, tipo]);

  const normalizarTexto = (valor: string) =>
    valor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtrarOpcoes = (termo: string, excluirId?: string) => {
    const normalizado = normalizarTexto(termo.trim());
    const filtrados = opcoes.filter((opcao) => {
      if (excluirId && opcao.id === excluirId) return false;
      if (!normalizado) return true;
      const texto = normalizarTexto(
        `${opcao.label} ${opcao.descricao ?? ""}`
      );
      return texto.includes(normalizado);
    });
    return filtrados.slice(0, 6);
  };

  const sugestoesOrigem = useMemo(
    () => filtrarOpcoes(origemBusca, destino),
    [origemBusca, destino, opcoes]
  );
  const sugestoesDestino = useMemo(
    () => filtrarOpcoes(destinoBusca, origem),
    [destinoBusca, origem, opcoes]
  );

  const fonteValida = fonteInformacao.trim().length >= 5;
  const podeSalvar =
    origem.length > 0 &&
    destino.length > 0 &&
    origem !== destino &&
    fonteValida &&
    podeGerenciar;

  const resetar = () => {
    setOrigem("");
    setDestino("");
    setOrigemBusca("");
    setDestinoBusca("");
    setFonteInformacao("");
    setErro(null);
  };

  const abrirCadastroBairro = (target: "ORIGEM" | "DESTINO") => {
    setCadastroTarget(target);
    setModalCadastroBairro(true);
    setErroBairro(null);
    setBairroNovoNome("");
    setCidadeId("");
    setNovaCidade((prev) => ({ ...prev, aberto: false, nome: "", erro: null }));
  };

  const abrirCadastroFaccao = (target: "ORIGEM" | "DESTINO") => {
    setCadastroTarget(target);
    setModalCadastroFaccao(true);
    setErroFaccao(null);
    setFaccaoNovaNome("");
    setFaccaoNovaDescricao("");
  };

  const fecharCadastroBairro = () => {
    setModalCadastroBairro(false);
    setCadastroTarget(null);
    setErroBairro(null);
    setBairroNovoNome("");
    setCidadeId("");
  };

  const fecharCadastroFaccao = () => {
    setModalCadastroFaccao(false);
    setCadastroTarget(null);
    setErroFaccao(null);
    setFaccaoNovaNome("");
    setFaccaoNovaDescricao("");
  };

  const salvarNovaCidade = async () => {
    if (novaCidade.salvando) return;
    const nome = novaCidade.nome.trim();
    const estado = novaCidade.estado.trim().toUpperCase();
    if (nome.length < 2) {
      setNovaCidade((prev) => ({ ...prev, erro: "Informe o nome da cidade." }));
      return;
    }
    setNovaCidade((prev) => ({ ...prev, salvando: true, erro: null }));
    try {
      const resposta = await fetch("/api/cidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, estado }),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar cidade");
      }
      const nova: CidadeCatalogo = {
        id: payload.id,
        nome: payload.nome ?? nome,
        estado: payload.estado ?? estado,
      };
      setCidades((prev) =>
        [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      );
      setCidadeId(nova.id);
      setNovaCidade({
        aberto: false,
        nome: "",
        estado: "PR",
        salvando: false,
        erro: null,
      });
    } catch (error) {
      setNovaCidade((prev) => ({
        ...prev,
        salvando: false,
        erro: error instanceof Error ? error.message : "Erro ao cadastrar cidade",
      }));
    }
  };

  const salvarBairro = async () => {
    if (salvandoBairro) return;
    if (!podeGerenciar) return;
    const nome = bairroNovoNome.trim();
    if (!nome) {
      setErroBairro("Informe o nome do bairro.");
      return;
    }
    if (!cidadeId) {
      setErroBairro("Selecione a cidade.");
      return;
    }

    setSalvandoBairro(true);
    setErroBairro(null);
    try {
      const resposta = await fetch("/api/bairros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeBairro: nome, cidadeId }),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar bairro");
      }

      const cidadeSelecionada = cidades.find((c) => c.id === cidadeId);
      const novoBairro: CatalogoBairro = {
        id: payload.id,
        nome: payload.nomeBairro ?? nome,
        cidade: cidadeSelecionada?.nome ?? "",
        cidadeId,
        estado: cidadeSelecionada?.estado ?? null,
        totalAdolescentes: 0,
      };
      setBairrosLista((prev) =>
        [...prev, novoBairro].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        )
      );

      const sufixoEstado = novoBairro.estado ? ` - ${novoBairro.estado}` : "";
      const textoBusca = `${novoBairro.nome} - ${novoBairro.cidade}${sufixoEstado}`;
      if (cadastroTarget === "ORIGEM") {
        setOrigem(novoBairro.id);
        setOrigemBusca(textoBusca);
      } else if (cadastroTarget === "DESTINO") {
        setDestino(novoBairro.id);
        setDestinoBusca(textoBusca);
      }
      fecharCadastroBairro();
      router.refresh();
    } catch (error) {
      setErroBairro(
        error instanceof Error ? error.message : "Erro ao cadastrar bairro"
      );
    } finally {
      setSalvandoBairro(false);
    }
  };

  const salvarFaccao = async () => {
    if (salvandoFaccao) return;
    if (!podeGerenciar) return;
    const nome = faccaoNovaNome.trim();
    const descricao = faccaoNovaDescricao.trim();
    if (!nome) {
      setErroFaccao("Informe o nome da faccao.");
      return;
    }

    setSalvandoFaccao(true);
    setErroFaccao(null);
    try {
      const resposta = await fetch("/api/faccoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFaccao: nome,
          descricao: descricao.length > 0 ? descricao : null,
        }),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar faccao");
      }

      setFaccaoNovaNome("");
      setFaccaoNovaDescricao("");
      setModalCadastroFaccao(false);

      if (cadastroTarget === "ORIGEM") {
        setOrigem(payload.id);
        setOrigemBusca(nome);
      } else if (cadastroTarget === "DESTINO") {
        setDestino(payload.id);
        setDestinoBusca(nome);
      }

      router.refresh();
    } catch (error) {
      setErroFaccao(
        error instanceof Error ? error.message : "Erro ao cadastrar faccao"
      );
    } finally {
      setSalvandoFaccao(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!podeSalvar || loading) {
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);

    try {
      const endpoint =
        tipo === "BAIRRO"
          ? "/api/bairros/conflitos"
          : "/api/faccoes/conflitos";

      const fonteSanitizada = fonteInformacao.trim();
      const payload =
        tipo === "BAIRRO"
          ? {
              bairroAId: origem,
              bairroBId: destino,
              fonteInformacao: fonteSanitizada,
            }
          : {
              faccaoAId: origem,
              faccaoBId: destino,
              fonteInformacao: fonteSanitizada,
            };

      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Falha ao registrar conflito");
      }

      resetar();
      setMensagem("Conflito registrado com sucesso.");
      router.refresh();
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const containerClass = compact
    ? "space-y-4"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const headerClass = compact ? "mb-3" : "mb-4";
  const titleClass = compact
    ? "text-lg font-semibold text-slate-900"
    : "text-xl font-semibold text-slate-900";

  return (
    <section className={containerClass}>
      <header className={headerClass}>
        <p className="text-xs uppercase tracking-wide text-indigo-500">
          Registrar conflito externo
        </p>
        <h3 className={titleClass}>
          Novo conflito territorial ou faccional
        </h3>
        <p className="text-sm text-slate-500">
          A selecao de bairros usa cidade como contexto; para faccao apenas o
          nome cadastrado e exibido.
        </p>
        {!podeGerenciar && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Acesso somente leitura: criacao de conflitos externos bloqueada.
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          {(["BAIRRO", "FACCAO"] as const).map((opcao) => (
            <label
              key={opcao}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                tipo === opcao
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="tipo-conflito"
                value={opcao}
                checked={tipo === opcao}
                onChange={() => setTipo(opcao)}
                disabled={!podeGerenciar}
                className="sr-only"
              />
              {opcao === "BAIRRO" ? "Territorial" : "Faccao"}
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Origem
            </label>
            <div className="relative">
              <input
                type="text"
                value={origemBusca}
                onFocus={() => setMostrarSugestoesOrigem(true)}
                onChange={(event) => {
                  setOrigemBusca(event.target.value);
                  setOrigem("");
                  setMostrarSugestoesOrigem(true);
                }}
                onBlur={() =>
                  window.setTimeout(() => setMostrarSugestoesOrigem(false), 120)
                }
                disabled={!podeGerenciar}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                placeholder="Digite para buscar"
              />
              {mostrarSugestoesOrigem &&
                origemBusca.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {sugestoesOrigem.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-500">
                        Nenhuma opcao encontrada.
                      </p>
                    )}
                    {sugestoesOrigem.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setOrigem(item.id);
                          setOrigemBusca(
                            item.descricao
                              ? item.label + " - " + item.descricao
                              : item.label
                          );
                          setMostrarSugestoesOrigem(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50"
                      >
                        <span className="font-semibold text-slate-800">
                          {item.label}
                        </span>
                        {item.descricao && (
                          <span className="ml-2 text-xs text-slate-500">
                            {item.descricao}
                          </span>
                        )}
                      </button>
                    ))}
                    {tipo === "BAIRRO" && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                        <button
                          type="button"
                          onMouseDown={() => abrirCadastroBairro("ORIGEM")}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                        >
                          + Cadastrar bairro/cidade
                        </button>
                      </div>
                    )}
                    {tipo === "FACCAO" && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                        <button
                          type="button"
                          onMouseDown={() => abrirCadastroFaccao("ORIGEM")}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                        >
                          + Cadastrar faccao
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Destino
            </label>
            <div className="relative">
              <input
                type="text"
                value={destinoBusca}
                onFocus={() => setMostrarSugestoesDestino(true)}
                onChange={(event) => {
                  setDestinoBusca(event.target.value);
                  setDestino("");
                  setMostrarSugestoesDestino(true);
                }}
                onBlur={() =>
                  window.setTimeout(() => setMostrarSugestoesDestino(false), 120)
                }
                disabled={!podeGerenciar}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                placeholder="Digite para buscar"
              />
              {mostrarSugestoesDestino &&
                destinoBusca.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {sugestoesDestino.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-500">
                        Nenhuma opcao encontrada.
                      </p>
                    )}
                    {sugestoesDestino.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setDestino(item.id);
                          setDestinoBusca(
                            item.descricao
                              ? item.label + " - " + item.descricao
                              : item.label
                          );
                          setMostrarSugestoesDestino(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50"
                      >
                        <span className="font-semibold text-slate-800">
                          {item.label}
                        </span>
                        {item.descricao && (
                          <span className="ml-2 text-xs text-slate-500">
                            {item.descricao}
                          </span>
                        )}
                      </button>
                    ))}
                    {tipo === "BAIRRO" && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                        <button
                          type="button"
                          onMouseDown={() => abrirCadastroBairro("DESTINO")}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                        >
                          + Cadastrar bairro/cidade
                        </button>
                      </div>
                    )}
                    {tipo === "FACCAO" && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                        <button
                          type="button"
                          onMouseDown={() => abrirCadastroFaccao("DESTINO")}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                        >
                          + Cadastrar faccao
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Fonte da informacao
          </label>
          <textarea
            value={fonteInformacao}
            onChange={(event) => setFonteInformacao(event.target.value)}
            rows={3}
            disabled={!podeGerenciar}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            placeholder="Ex: Entrevista com o adolescente Joao (CI 123/2025), materia jornalistica, comunicacao com outra unidade..."
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Descreva como a equipe teve acesso a este conflito (minimo 5 caracteres).
          </p>
        </div>

        {erro && <p className="text-xs text-rose-600">{erro}</p>}
        {mensagem && <p className="text-xs text-emerald-600">{mensagem}</p>}

        <button
          type="submit"
          disabled={!podeSalvar || loading}
          className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
            podeSalvar
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {loading ? "Registrando..." : "Registrar conflito"}
        </button>
      </form>

      {modalCadastroBairro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar bairro/cidade
            </h3>
            <p className="text-sm text-slate-500">
              Registre um novo bairro e vincule a uma cidade.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome do bairro
                </label>
                <input
                  type="text"
                  value={bairroNovoNome}
                  onChange={(event) => setBairroNovoNome(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Zona 7"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Cidade
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={cidadeId}
                    onChange={(event) => setCidadeId(event.target.value)}
                    disabled={carregandoCidades}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">
                      {carregandoCidades ? "Carregando cidades..." : "Selecione"}
                    </option>
                    {cidades.map((cidade) => (
                      <option key={cidade.id} value={cidade.id}>
                        {cidade.nome} - {cidade.estado}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setNovaCidade((prev) => ({ ...prev, aberto: true }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Nova cidade
                  </button>
                </div>
                {erroCidades && (
                  <p className="mt-1 text-xs text-rose-600">{erroCidades}</p>
                )}
              </div>
              {erroBairro && (
                <p className="text-xs text-rose-600">{erroBairro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharCadastroBairro}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={salvandoBairro}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarBairro}
                disabled={salvandoBairro}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {salvandoBairro ? "Salvando..." : "Salvar bairro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {novaCidade.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar nova cidade
            </h3>
            <p className="text-sm text-slate-500">
              Informe o nome da cidade e selecione o estado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da cidade
                </label>
                <input
                  type="text"
                  value={novaCidade.nome}
                  onChange={(event) =>
                    setNovaCidade((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Maringa"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Estado
                </label>
                <select
                  value={novaCidade.estado}
                  onChange={(event) =>
                    setNovaCidade((prev) => ({
                      ...prev,
                      estado: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  {ESTADOS_BRASIL.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
              </div>
              {novaCidade.erro && (
                <p className="text-sm text-rose-600">{novaCidade.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setNovaCidade((prev) => ({
                    ...prev,
                    aberto: false,
                    erro: null,
                  }))
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={novaCidade.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaCidade}
                disabled={novaCidade.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {novaCidade.salvando ? "Salvando..." : "Salvar cidade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCadastroFaccao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar faccao
            </h3>
            <p className="text-sm text-slate-500">
              Informe o nome e, se necessario, uma observacao.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da faccao
                </label>
                <input
                  type="text"
                  value={faccaoNovaNome}
                  onChange={(event) => setFaccaoNovaNome(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: PCC"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Observacao
                </label>
                <textarea
                  value={faccaoNovaDescricao}
                  onChange={(event) => setFaccaoNovaDescricao(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Resumo ou fonte da informacao"
                />
              </div>
              {erroFaccao && (
                <p className="text-xs text-rose-600">{erroFaccao}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharCadastroFaccao}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={salvandoFaccao}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarFaccao}
                disabled={salvandoFaccao}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {salvandoFaccao ? "Salvando..." : "Salvar faccao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
