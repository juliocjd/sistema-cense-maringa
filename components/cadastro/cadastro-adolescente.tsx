"use client";

import { useEffect, useMemo, useState } from "react";
import {
  User,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  Camera,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type {
  Adolescente,
  FaccaoCatalogo,
  BairroCatalogo,
  TatuagemCatalogo,
  RiscoFuga,
  StatusUnidade,
} from "@/types";
import { SeletorTatuagens } from "@/components/cadastro/seletor-tatuagens";

const STATUS_OPCOES: Array<{ value: StatusUnidade; label: string }> = [
  { value: "ATIVO", label: "Ativo / Internado" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "LIBERADO", label: "Liberado" },
  { value: "EVADIDO", label: "Evadido" },
];

interface CadastroAdolescenteProps {
  onSalvar: (
    adolescente: Partial<Adolescente>,
    alojamentoId?: string
  ) => Promise<void>;
  onCancelar: () => void;
  initialData?: Adolescente | null;
  modo?: "CADASTRO" | "EDICAO";
  permitirAlocacaoAutomatica?: boolean;
}

export function CadastroAdolescente({
  onSalvar,
  onCancelar,
  initialData,
  modo = "CADASTRO",
  permitirAlocacaoAutomatica,
}: CadastroAdolescenteProps) {
  const ehEdicao = modo === "EDICAO";
  const podeSelecionarAlojamento =
    permitirAlocacaoAutomatica ?? !ehEdicao;
  const tituloPagina = ehEdicao
    ? "Editar adolescente"
    : "Cadastro de Adolescente";
  const subtituloPagina = ehEdicao
    ? "Revise e atualize os dados cadastrados antes de salvar."
    : "Preencha todas as informacoes necessarias para o dossie completo.";
  const textoBotaoSalvar = ehEdicao
    ? "Salvar alteracoes"
    : "Salvar cadastro";
  const textoCancelarAcao = ehEdicao
    ? "Cancelar edicao"
    : "Cancelar cadastro";
  const mensagemSucesso = ehEdicao
    ? "Adolescente atualizado com sucesso!"
    : "Adolescente cadastrado com sucesso!";
  const mensagemErro = ehEdicao
    ? "Erro ao atualizar adolescente. Tente novamente."
    : "Erro ao salvar adolescente. Tente novamente.";
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errosFormulario, setErrosFormulario] = useState<string[]>([]);
  const [statusUnidade, setStatusUnidade] =
    useState<StatusUnidade>("ATIVO");
  const [dataStatus, setDataStatus] = useState("");

  // Estados do formulário
  const [dadosPessoais, setDadosPessoais] = useState({
    nomeCompleto: "",
    nomeSocial: "",
    dataNascimento: "",
    numeroSms: "",
    dataEntrada: new Date().toISOString().split("T")[0],
  });

  const [atoInfracional, setAtoInfracional] = useState({
    descricao: "",
    ano: "",
    processo: "",
    gravidade: false,
    gravidadeDescricao: "",
    historico: [] as {
      descricao: string;
      unidade: string;
      ano: string;
      observacoes?: string;
    }[],
  });

  const [vinculacoes, setVinculacoes] = useState({
    faccaoId: "",
    numeroMembro: "",
    bairroId: "",
    riscoFuga: "BAIXO" as RiscoFuga,
  });

  const [tatuagens, setTatuagens] = useState<
    { catalogoId: string; localCorpo: string; observacoes: string }[]
  >([]);

  const [alertas, setAlertas] = useState({
    riscoSuicidio: false,
    perfilMapeado: false,
    saudeConfidencial: false,
    detalheSaude: "",
  });

  const formatarDataInput = (valor?: string | null) => {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    return data.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!initialData) return;

    setDadosPessoais({
      nomeCompleto: initialData.nomeCompleto ?? "",
      nomeSocial: initialData.nomeSocial ?? "",
      dataNascimento: formatarDataInput(initialData.dataNascimento),
      numeroSms: initialData.numeroSms ?? "",
      dataEntrada:
        formatarDataInput(initialData.dataEntrada) ||
        new Date().toISOString().split("T")[0],
    });

    setStatusUnidade(initialData.statusUnidade ?? "ATIVO");
    setDataStatus(
      initialData.statusUnidade && initialData.statusUnidade !== "ATIVO"
        ? formatarDataInput(initialData.dataDesinternacao)
        : ""
    );

    setAtoInfracional({
      descricao: initialData.atoInfracionalAtual ?? "",
      ano: initialData.atoInfracionalAno
        ? String(initialData.atoInfracionalAno)
        : "",
      processo:
        initialData.atoInfracionalProcesso ??
        initialData.numeroProcesso ??
        "",
      gravidade: initialData.atoInfracionalGravidade ?? false,
      gravidadeDescricao: initialData.atoInfracionalGravidadeObs ?? "",
      historico: [],
    });

    setVinculacoes({
      faccaoId: initialData.faccaoGrupoId ?? "",
      numeroMembro:
        initialData.faccaoNumeroMembro ??
        initialData.faccao?.numeroMembro ??
        "",
      bairroId: initialData.bairroOrigemId ?? "",
      riscoFuga: (initialData.riscoFuga as RiscoFuga) ?? "BAIXO",
    });

    setAlertas({
      riscoSuicidio: initialData.alertaRiscoSuicidio ?? false,
      perfilMapeado: initialData.alertaPerfilMapeado ?? false,
      saudeConfidencial: initialData.alertaSaudeConfidencial ?? false,
      detalheSaude: initialData.alertaSaudeDetalhes ?? "",
    });

    setFoto(initialData.fotoUrl ?? null);
    setTatuagens(
      initialData.tatuagens?.map((t) => ({
        catalogoId: t.catalogoId ?? t.id ?? "",
        localCorpo: t.localCorpo ?? "",
        observacoes: t.observacoes ?? "",
      })) ?? []
    );
  }, [initialData]);

  const [alojamentosLivres, setAlojamentosLivres] = useState<
    { id: string; casa: string; numero: string; ala: string | null }[]
  >([]);
  const [alojamentoSelecionado, setAlojamentoSelecionado] = useState<
    string | null
  >(null);
  const [sugestoesAlojamento, setSugestoesAlojamento] = useState<
    Array<{
      alojamentoId: string;
      casaNome: string;
      numero: string;
      ala: string | null;
      nivel: number;
      rotulo: string;
      descricao: string;
      alertas: string[];
      ambientais: string[];
    }>
  >([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState<string | null>(null);

  useEffect(() => {
    const carregarAlojamentosLivres = async () => {
      try {
        const response = await fetch("/api/alojamentos?apenas_livres=true");
        if (!response.ok) {
          throw new Error("Falha ao carregar alojamentos livres");
        }
        const payload = await response.json();
        setAlojamentosLivres(
          payload.alojamentos.map((aloj: any) => ({
            id: aloj.id,
            casa: `${aloj.casa.nome} (${aloj.casa.numero})`,
            numero: aloj.numero_alojamento,
            ala: aloj.ala ?? null,
          }))
        );
      } catch {
        setAlojamentosLivres([]);
      }
    };

    carregarAlojamentosLivres();
  }, []);

  useEffect(() => {
    setSugestoesAlojamento([]);
    setErroSugestoes(null);
  }, [vinculacoes.bairroId, vinculacoes.faccaoId]);

  const buscarSugestoesAlojamento = async () => {
    if (!vinculacoes.bairroId && !vinculacoes.faccaoId) {
      setErroSugestoes(
        "Informe o bairro ou facção antes de solicitar sugestões."
      );
      return;
    }

    setCarregandoSugestoes(true);
    setErroSugestoes(null);
    try {
      const response = await fetch("/api/alocar/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bairroId: vinculacoes.bairroId || null,
          faccaoId: vinculacoes.faccaoId || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao buscar sugestões");
      }

      const payload = await response.json();
      setSugestoesAlojamento(
        Array.isArray(payload?.sugestoes) ? payload.sugestoes : []
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao buscar sugestões de alojamento";
      setErroSugestoes(msg);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  const [foto, setFoto] = useState<string | null>(null);

  const [referencias, setReferencias] = useState<{
    faccoes: FaccaoCatalogo[];
    bairros: BairroCatalogo[];
    tatuagens: TatuagemCatalogo[];
  }>({
    faccoes: [],
    bairros: [],
    tatuagens: [],
  });
  const [modalNovoBairro, setModalNovoBairro] = useState<{
    aberto: boolean;
    nome: string;
    cidade: string;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    cidade: "",
    erro: null,
    salvando: false,
  });
  const [modalNovaFaccao, setModalNovaFaccao] = useState<{
    aberto: boolean;
    nome: string;
    descricao: string;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    descricao: "",
    erro: null,
    salvando: false,
  });
  const [carregandoReferencias, setCarregandoReferencias] = useState(true);
  const [erroReferencias, setErroReferencias] = useState<string | null>(null);

  const carregarReferencias = async () => {
    setCarregandoReferencias(true);
    setErroReferencias(null);

    try {
      const [faccoesRes, bairrosRes, tatuagensRes] = await Promise.all([
        fetch("/api/faccoes"),
        fetch("/api/bairros"),
        fetch("/api/tatuagens"),
      ]);

      if (!faccoesRes.ok || !bairrosRes.ok || !tatuagensRes.ok) {
        throw new Error("Falha ao carregar dados auxiliares");
      }

      const [faccoesPayload, bairrosPayload, tatuagensPayload] =
        await Promise.all([
          faccoesRes.json(),
          bairrosRes.json(),
          tatuagensRes.json(),
        ]);

      setReferencias({
        faccoes: Array.isArray(faccoesPayload?.faccoes)
          ? faccoesPayload.faccoes
          : [],
        bairros: Array.isArray(bairrosPayload?.bairros)
          ? bairrosPayload.bairros
          : [],
        tatuagens: Array.isArray(tatuagensPayload?.tatuagens)
          ? tatuagensPayload.tatuagens
          : [],
      });
    } catch (error) {
      console.error("Erro ao carregar referencias:", error);
      setErroReferencias(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados auxiliares"
      );
    } finally {
      setCarregandoReferencias(false);
    }
  };

  useEffect(() => {
    carregarReferencias();
  }, []);

  const faccoesDisponiveis = useMemo(
    () => [
      {
        id: "",
        nome: "Sem facção / não informado",
        total: undefined,
      },
      ...referencias.faccoes.map((faccao) => ({
        id: faccao.id,
        nome: faccao.nomeFaccao,
        total: faccao.totalAdolescentes ?? undefined,
      })),
    ],
    [referencias.faccoes]
  );

  const bairrosDisponiveis = useMemo(
    () => referencias.bairros,
    [referencias.bairros]
  );

  const abrirModalNovoBairro = () => {
    setModalNovoBairro({
      aberto: true,
      nome: "",
      cidade: "",
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovoBairro = () => {
    setModalNovoBairro({
      aberto: false,
      nome: "",
      cidade: "",
      erro: null,
      salvando: false,
    });
  };

  const salvarNovoBairro = async () => {
    if (modalNovoBairro.salvando) return;

    const nome = modalNovoBairro.nome.trim();
    const cidade = modalNovoBairro.cidade.trim();

    if (nome.length < 2 || cidade.length < 2) {
      setModalNovoBairro((prev) => ({
        ...prev,
        erro: "Informe nome e cidade com ao menos 2 caracteres.",
      }));
      return;
    }

    setModalNovoBairro((prev) => ({ ...prev, salvando: true, erro: null }));

    try {
      const response = await fetch("/api/bairros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeBairro: nome, cidade }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar bairro");
      }

      const novoBairro: BairroCatalogo = {
        id: payload.id,
        nomeBairro: payload.nomeBairro ?? nome,
        cidade: payload.cidade ?? cidade,
      };

      setReferencias((prev) => ({
        ...prev,
        bairros: [...prev.bairros, novoBairro].sort((a, b) =>
          a.nomeBairro.localeCompare(b.nomeBairro, "pt-BR")
        ),
      }));

      setVinculacoes((prev) => ({
        ...prev,
        bairroId: novoBairro.id,
      }));

      fecharModalNovoBairro();
    } catch (error) {
      setModalNovoBairro((prev) => ({
        ...prev,
        erro:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao salvar bairro",
        salvando: false,
      }));
      return;
    }

    setModalNovoBairro({
      aberto: false,
      nome: "",
      cidade: "",
      erro: null,
    salvando: false,
  });
};

  const abrirModalNovaFaccao = () => {
    setModalNovaFaccao({
      aberto: true,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovaFaccao = () => {
    setModalNovaFaccao({
      aberto: false,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const salvarNovaFaccao = async () => {
    if (modalNovaFaccao.salvando) return;

    const nome = modalNovaFaccao.nome.trim();
    const descricao = modalNovaFaccao.descricao.trim();

    if (nome.length < 2) {
      setModalNovaFaccao((prev) => ({
        ...prev,
        erro: "Informe um nome com ao menos 2 caracteres.",
      }));
      return;
    }

    setModalNovaFaccao((prev) => ({ ...prev, salvando: true, erro: null }));

    try {
      const response = await fetch("/api/faccoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeFaccao: nome, descricao }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar faccao");
      }

      const novaFaccao: FaccaoCatalogo = {
        id: payload.id,
        nomeFaccao: payload.nomeFaccao ?? nome,
        descricao: (payload.descricao ?? descricao) || undefined,
        totalAdolescentes: 0,
      };

      setReferencias((prev) => ({
        ...prev,
        faccoes: [...prev.faccoes, novaFaccao].sort((a, b) =>
          a.nomeFaccao.localeCompare(b.nomeFaccao, "pt-BR")
        ),
      }));

      setVinculacoes((prev) => ({
        ...prev,
        faccaoId: novaFaccao.id,
      }));

      fecharModalNovaFaccao();
    } catch (error) {
      setModalNovaFaccao((prev) => ({
        ...prev,
        erro:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao salvar faccao",
        salvando: false,
      }));
      return;
    }

    setModalNovaFaccao({
      aberto: false,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const catalogoTatuagens = useMemo(
    () =>
      referencias.tatuagens.map((item) => ({
        id: item.id,
        nome: item.nomeSimbolo,
        significado: item.significadoAssociado ?? "Significado não informado",
        nivel: item.nivelRisco ?? "DESCONHECIDO",
      })),
    [referencias.tatuagens]
  );

  if (carregandoReferencias) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-600 font-semibold">
            Carregando dados auxiliares...
          </p>
        </div>
      </div>
    );
  }

  if (erroReferencias) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600">
            <AlertTriangle />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Nao foi possivel carregar os dados
            </h2>
            <p className="text-sm text-gray-600">{erroReferencias}</p>
          </div>
          <button
            type="button"
            onClick={carregarReferencias}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Etapas do cadastro
  const etapas = [
    { numero: 1, titulo: "Dados Pessoais", icone: User },
    { numero: 2, titulo: "Ato Infracional", icone: FileText },
    { numero: 3, titulo: "Vinculações", icone: Users },
    { numero: 4, titulo: "Tatuagens", icone: Camera },
    { numero: 5, titulo: "Alertas", icone: AlertTriangle },
  ];

  const proximaEtapa = () => {
    if (etapaAtual < 5) setEtapaAtual(etapaAtual + 1);
  };

  const etapaAnterior = () => {
    if (etapaAtual > 1) setEtapaAtual(etapaAtual - 1);
  };

  const validarFormulario = () => {
    const mensagens: string[] = [];
    let etapaErro = 1;

    const nomeLimpo = dadosPessoais.nomeCompleto.trim();
    if (!nomeLimpo) {
      mensagens.push("Nome completo e obrigatorio.");
    } else if (nomeLimpo.length < 3) {
      mensagens.push("Nome completo deve ter pelo menos 3 caracteres.");
    }

    if (dadosPessoais.dataNascimento) {
      const dataNasc = new Date(dadosPessoais.dataNascimento);
      if (Number.isNaN(dataNasc.getTime())) {
        mensagens.push("Data de nascimento invalida.");
      } else if (dataNasc > new Date()) {
        mensagens.push("Data de nascimento nao pode ser futura.");
      }
    }

    if (dadosPessoais.dataEntrada) {
      const dataEnt = new Date(dadosPessoais.dataEntrada);
      if (Number.isNaN(dataEnt.getTime())) {
        mensagens.push("Data de entrada invalida.");
      }
    }

    if (statusUnidade !== "ATIVO") {
      const dataStatusLimpa = dataStatus.trim();
      if (!dataStatusLimpa) {
        mensagens.push("Informe a data de desinternacao/inatividade.");
        etapaErro = Math.max(etapaErro, 1);
      } else {
        const dataStatusDate = new Date(dataStatusLimpa);
        if (Number.isNaN(dataStatusDate.getTime())) {
          mensagens.push("Data de desinternacao invalida.");
          etapaErro = Math.max(etapaErro, 1);
        } else if (dataStatusDate > new Date()) {
          mensagens.push("Data de desinternacao nao pode ser futura.");
          etapaErro = Math.max(etapaErro, 1);
        }
      }
    }

    const descricaoAto = atoInfracional.descricao.trim();
    if (!descricaoAto) {
      mensagens.push("Descreva o ato infracional atual.");
      etapaErro = Math.max(etapaErro, 2);
    } else if (descricaoAto.length < 5) {
      mensagens.push("Detalhe o ato infracional atual com pelo menos 5 caracteres.");
      etapaErro = Math.max(etapaErro, 2);
    }

    if (atoInfracional.ano.trim()) {
      const anoNumero = Number.parseInt(atoInfracional.ano.trim(), 10);
      if (
        Number.isNaN(anoNumero) ||
        anoNumero < 1900 ||
        anoNumero > new Date().getFullYear()
      ) {
        mensagens.push("Informe um ano valido para o ato infracional.");
        etapaErro = Math.max(etapaErro, 2);
      }
    }

    if (
      atoInfracional.gravidade &&
      !atoInfracional.gravidadeDescricao.trim()
    ) {
      mensagens.push(
        "Detalhe a repercussao ou gravidade quando o indicador estiver marcado."
      );
      etapaErro = Math.max(etapaErro, 2);
    }

    if (alertas.saudeConfidencial && !alertas.detalheSaude.trim()) {
      mensagens.push(
        "Informe os detalhes da condicao de saude confidencial selecionada."
      );
      etapaErro = Math.max(etapaErro, 5);
    }

    if (mensagens.length > 0) {
      setErrosFormulario(mensagens);
      setEtapaAtual(etapaErro);
      return false;
    }

    setErrosFormulario([]);
    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const sanitize = (valor?: string) => {
        if (!valor) return undefined;
        const trimmed = valor.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const sanitizeOrNull = (valor?: string) => {
        const san = sanitize(valor);
        return san ?? null;
      };

      const anoSanitizado = sanitize(atoInfracional.ano);
      const anoNumero =
        anoSanitizado !== undefined
          ? Number.parseInt(anoSanitizado, 10)
          : undefined;
      const anoValido =
        anoNumero !== undefined && !Number.isNaN(anoNumero)
          ? anoNumero
          : undefined;

      const processoSanitizado = sanitize(atoInfracional.processo);
      const gravidadeDescricaoSanitizada = sanitize(
        atoInfracional.gravidadeDescricao
      );

      const adolescente: Partial<Adolescente> = {
        nomeCompleto: dadosPessoais.nomeCompleto.trim(),
        nomeSocial: sanitizeOrNull(dadosPessoais.nomeSocial) ?? undefined,
        dataNascimento: sanitize(dadosPessoais.dataNascimento),
        numeroSms: sanitize(dadosPessoais.numeroSms),
        dataEntrada: sanitize(dadosPessoais.dataEntrada),
        atoInfracionalAtual: sanitize(atoInfracional.descricao),
        atoInfracionalAno: anoValido,
        atoInfracionalProcesso: processoSanitizado,
        atoInfracionalGravidade: atoInfracional.gravidade,
        atoInfracionalGravidadeObs: gravidadeDescricaoSanitizada,
        numeroProcesso: processoSanitizado,
        fotoUrl: foto,
        alertaRiscoSuicidio: alertas.riscoSuicidio,
        alertaPerfilMapeado: alertas.perfilMapeado,
        alertaSaudeConfidencial: alertas.saudeConfidencial,
        alertaSaudeDetalhes: sanitizeOrNull(alertas.detalheSaude) ?? undefined,
        statusUnidade,
        dataDesinternacao:
          statusUnidade === "ATIVO"
            ? undefined
            : sanitize(dataStatus),
        conflitosA: [],
        conflitosB: [],
        grupos: [],
        tatuagens: tatuagens
          .filter((t) => t.catalogoId && t.localCorpo)
          .map((t) => ({
            catalogoId: t.catalogoId,
            localCorpo: t.localCorpo,
            observacoes: t.observacoes || "",
            significadoPessoal: t.significadoPessoal || "",
          })),
        faccaoGrupoId: sanitize(vinculacoes.faccaoId),
        faccaoNumeroMembro: sanitize(vinculacoes.numeroMembro),
        bairroOrigemId: sanitize(vinculacoes.bairroId),
        riscoFuga: vinculacoes.riscoFuga,
      };

      const destinoAlojamento = podeSelecionarAlojamento
        ? alojamentoSelecionado ?? undefined
        : undefined;

      await onSalvar(adolescente, destinoAlojamento);
      alert(mensagemSucesso);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const adicionarHistoricoInfracional = () => {
    setAtoInfracional({
      ...atoInfracional,
      historico: [
        ...atoInfracional.historico,
        { descricao: "", unidade: "", ano: "", observacoes: "" },
      ],
    });
  };

  const removerHistoricoInfracional = (index: number) => {
    setAtoInfracional({
      ...atoInfracional,
      historico: atoInfracional.historico.filter((_, i) => i !== index),
    });
  };

  const adicionarTatuagem = () => {
    setTatuagens([
      ...tatuagens,
      { catalogoId: "", localCorpo: "", observacoes: "" },
    ]);
  };

  const removerTatuagem = (index: number) => {
    setTatuagens(tatuagens.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-b-4 border-indigo-600">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {tituloPagina}
          </h1>
          <p className="text-gray-600">{subtituloPagina}</p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {etapas.map((etapa, index) => (
              <div key={etapa.numero} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      etapa.numero === etapaAtual
                        ? "bg-indigo-600 text-white scale-110"
                        : etapa.numero < etapaAtual
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {etapa.numero < etapaAtual ? (
                      <CheckCircle size={24} />
                    ) : (
                      <etapa.icone size={24} />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-semibold text-center ${
                      etapa.numero === etapaAtual
                        ? "text-indigo-600"
                        : etapa.numero < etapaAtual
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    {etapa.titulo}
                  </span>
                </div>
                {index < etapas.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all ${
                      etapa.numero < etapaAtual ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {errosFormulario.length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-5 space-y-2">
            <p className="font-semibold">
              Ajuste os itens abaixo antes de salvar:
            </p>
            <ul className="list-disc list-inside text-sm">
              {errosFormulario.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ETAPA 1: Dados Pessoais */}
          {etapaAtual === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User className="text-indigo-600" />
                Dados Pessoais
              </h2>

              {/* Upload de Foto */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-indigo-200">
                    {foto ? (
                      <img
                        src={foto}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={48} className="text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeCompleto}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeCompleto: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: João da Silva Santos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Social
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeSocial}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeSocial: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: João"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={dadosPessoais.dataNascimento}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        dataNascimento: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número SMS
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.numeroSms}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        numeroSms: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={dadosPessoais.dataEntrada}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        dataEntrada: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Situacao na Unidade
                  </label>
                  <select
                    value={statusUnidade}
                    onChange={(e) =>
                      setStatusUnidade(e.target.value as StatusUnidade)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                  >
                    {STATUS_OPCOES.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                </div>

                {statusUnidade !== "ATIVO" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Data da mudanca de status
                    </label>
                    <input
                      type="date"
                      value={dataStatus}
                      onChange={(e) => setDataStatus(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Utilize esta data para registrar liberacao, transferencia ou evasao.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 2: Ato Infracional */}
          {etapaAtual === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Ato Infracional
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ato Infracional Atual
                </label>
                <textarea
                  value={atoInfracional.descricao}
                  onChange={(e) =>
                    setAtoInfracional({
                      ...atoInfracional,
                      descricao: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                  placeholder="Ex: Analogos a roubo qualificado (art. 157, paragrafo 2, CP)"
                />
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Numero do Processo
                    </label>
                    <input
                      type="text"
                      value={atoInfracional.processo}
                      onChange={(e) =>
                        setAtoInfracional({
                          ...atoInfracional,
                          processo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      placeholder="Ex: 0001234-56.2024.8.16.0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ano do Fato
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={atoInfracional.ano}
                      onChange={(e) =>
                        setAtoInfracional({
                          ...atoInfracional,
                          ano: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      placeholder="Ex: 2024"
                    />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border-2 transition-all ${
                    atoInfracional.gravidade
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="gravidadeAto"
                      checked={atoInfracional.gravidade}
                      onChange={(e) =>
                        setAtoInfracional({
                          ...atoInfracional,
                          gravidade: e.target.checked,
                        })
                      }
                      className="mt-1 h-5 w-5 text-orange-500 rounded focus:ring-orange-500 border-gray-300"
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="gravidadeAto"
                        className="font-semibold text-gray-800 cursor-pointer flex items-center gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Ato com repercussao publica ou gravidade elevada
                      </label>
                      <p className="text-sm text-gray-600">
                        Use esta opcao quando o fato tenha grande repercussao ou represente risco
                        excepcional. Caso o indicador esteja marcado a descricao detalhada sera destacada
                        em relatorios operacionais (ex.: justificativa de algema).
                      </p>
                      <p className="text-xs text-gray-500">
                        Dica: revise tambem a etapa de alertas para garantir coerencia com esta marcacao.
                      </p>
                    </div>
                  </div>

                  {atoInfracional.gravidade && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Descricao complementar da gravidade ou repercussao
                      </label>
                      <textarea
                        value={atoInfracional.gravidadeDescricao}
                        onChange={(e) =>
                          setAtoInfracional({
                            ...atoInfracional,
                            gravidadeDescricao: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none bg-white"
                        placeholder="Detalhe fatos relevantes, vitimas envolvidas, repercussao midiaticas ou decisoes judiciais correlatas."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Histórico Infracional
                  </h3>
                  <button
                    type="button"
                    onClick={adicionarHistoricoInfracional}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                  >
                    + Adicionar
                  </button>
                </div>

                {atoInfracional.historico.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText
                      size={48}
                      className="mx-auto mb-2 text-gray-400"
                    />
                    <p>Nenhum histórico registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atoInfracional.historico.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].descricao = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Descrição do ato"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.unidade}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].unidade = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Unidade"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.ano}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].ano = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              placeholder="Ano"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <textarea
                              value={item.observacoes ?? ""}
                              onChange={(e) => {
                                const novo = [...atoInfracional.historico];
                                novo[index].observacoes = e.target.value;
                                setAtoInfracional({
                                  ...atoInfracional,
                                  historico: novo,
                                });
                              }}
                              rows={2}
                              placeholder="Observacoes complementares (opcional)"
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none resize-none text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={() => removerHistoricoInfracional(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-semibold"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 3: Vinculações */}
          {etapaAtual === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-indigo-600" />
                Vinculações
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">
                      Faccao / Grupo
                    </label>
                    <button
                      type="button"
                      onClick={abrirModalNovaFaccao}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      + Nova faccao
                    </button>
                  </div>
                  <select
                    value={vinculacoes.faccaoId}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        faccaoId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    {faccoesDisponiveis.map((faccao) => (
                      <option
                        key={faccao.id || "sem-faccao"}
                        value={faccao.id}
                      >
                        {faccao.nome}
                        {typeof faccao.total === "number"
                          ? ` - ${faccao.total} adolescentes`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Membro
                  </label>
                  <input
                    type="text"
                    value={vinculacoes.numeroMembro}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        numeroMembro: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: 123"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">
                      Bairro de Origem
                    </label>
                    <button
                      type="button"
                      onClick={abrirModalNovoBairro}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      + Novo bairro
                    </button>
                  </div>
                  <select
                    value={vinculacoes.bairroId}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        bairroId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {bairrosDisponiveis.map((bairro) => (
                      <option key={bairro.id} value={bairro.id}>
                        {bairro.nomeBairro} - {bairro.cidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Risco de Fuga
                  </label>
                  <select
                    value={vinculacoes.riscoFuga}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        riscoFuga: e.target.value as RiscoFuga,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                  </select>
                </div>

                {podeSelecionarAlojamento && (
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Alojamento preferencial
                    </label>
                    <button
                      type="button"
                      onClick={buscarSugestoesAlojamento}
                      className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                      disabled={
                        carregandoSugestoes ||
                        (!vinculacoes.bairroId && !vinculacoes.faccaoId)
                      }
                    >
                      {carregandoSugestoes
                        ? "Sugerindo..."
                        : "Sugerir com base no risco"}
                    </button>
                    {!vinculacoes.bairroId && !vinculacoes.faccaoId && (
                      <span className="text-[11px] text-slate-500">
                        Selecione o bairro ou a facção para liberar a sugestão.
                      </span>
                    )}
                  </div>
                  <select
                    value={alojamentoSelecionado ?? ""}
                    onChange={(e) => {
                      setAlojamentoSelecionado(
                        e.target.value ? e.target.value : null
                      );
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="">Nenhum (sem alocação automática)</option>
                    {alojamentosLivres.map((aloj) => (
                      <option key={aloj.id} value={aloj.id}>
                        {aloj.casa} – Alo {aloj.numero}
                        {aloj.ala ? ` (Ala ${aloj.ala})` : ""}
                      </option>
                    ))}
                  </select>
                  {erroSugestoes && (
                    <p className="mt-1 text-xs text-rose-600">{erroSugestoes}</p>
                  )}
                  {sugestoesAlojamento.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {sugestoesAlojamento.map((sugestao) => (
                        <div
                          key={sugestao.alojamentoId}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {sugestao.casaNome} - Aloj. {sugestao.numero}
                                {sugestao.ala ? ` (Ala ${sugestao.ala})` : ""}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {sugestao.rotulo}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setAlojamentoSelecionado(sugestao.alojamentoId)
                              }
                              className="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Usar
                            </button>
                          </div>
                          <p className="mt-1">{sugestao.descricao}</p>
                          {sugestao.alertas.length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-rose-600 space-y-0.5">
                              {sugestao.alertas.map((alerta, index) => (
                                <li
                                  key={`alerta-${sugestao.alojamentoId}-${index}`}
                                >
                                  {alerta}
                                </li>
                              ))}
                            </ul>
                          )}
                          {sugestao.ambientais.length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-amber-600 space-y-0.5">
                              {sugestao.ambientais.map((motivo, index) => (
                                <li
                                  key={`ambiental-${sugestao.alojamentoId}-${index}`}
                                >
                                  {motivo}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    A seleção será usada para acionar `/api/alocar`
                    automaticamente após salvar.
                  </p>
                </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 4: Tatuagens */}
          {etapaAtual === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Camera className="text-indigo-600" />
                Tatuagens
              </h2>

              <SeletorTatuagens
                tatuagens={tatuagens}
                onChange={setTatuagens}
              />
            </div>
          )}

          {/* ETAPA 5: Alertas */}
          {etapaAtual === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-indigo-600" />
                Alertas Especiais
              </h2>

              {atoInfracional.gravidade && (
                <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500 mt-1" />
                    <div className="space-y-1">
                      <p className="font-semibold text-orange-900">
                        Ato atual marcado como grave ou com repercussao
                      </p>
                      {(atoInfracional.processo || atoInfracional.ano) && (
                        <p className="text-sm text-orange-800">
                          {atoInfracional.processo && (
                            <span>
                              Processo: {atoInfracional.processo}
                              {atoInfracional.ano ? " • " : ""}
                            </span>
                          )}
                          {atoInfracional.ano && (
                            <span>Ano: {atoInfracional.ano}</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-orange-800">
                        {atoInfracional.gravidadeDescricao.trim() ||
                          "Detalhe a gravidade na etapa anterior para registrar no dossie e nos relatorios operacionais."}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-700">
                    Considere ativar alertas de perfil protegido ou emitir comunicados internos quando necessario.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <input
                    type="checkbox"
                    id="riscoSuicidio"
                    checked={alertas.riscoSuicidio}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        riscoSuicidio: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="riscoSuicidio"
                      className="font-semibold text-orange-900 cursor-pointer"
                    >
                      Risco de Suicidio
                    </label>
                    <p className="text-sm text-orange-700 mt-1">
                      Adolescente apresenta historico ou comportamento de risco para autolesao
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <input
                    type="checkbox"
                    id="perfilMapeado"
                    checked={alertas.perfilMapeado}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        perfilMapeado: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="perfilMapeado"
                      className="font-semibold text-purple-900 cursor-pointer"
                    >
                      Perfil Mapeado (Protecao)
                    </label>
                    <p className="text-sm text-purple-700 mt-1">
                      Ato infracional que necessita sigilo e protecao especial
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <input
                    type="checkbox"
                    id="saudeConfidencial"
                    checked={alertas.saudeConfidencial}
                    onChange={(e) =>
                      setAlertas({
                        ...alertas,
                        saudeConfidencial: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="saudeConfidencial"
                      className="font-semibold text-blue-900 cursor-pointer"
                    >
                      Alerta de Saude Confidencial
                    </label>
                    <p className="text-sm text-blue-700 mt-1">
                      Condicao de saude que requer atencao especial
                    </p>
                  </div>
                </div>

                {alertas.saudeConfidencial && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Detalhes da condicao de saude (confidencial)
                    </label>
                    <textarea
                      value={alertas.detalheSaude}
                      onChange={(e) =>
                        setAlertas({
                          ...alertas,
                          detalheSaude: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                      placeholder="Descreva a condicao de saude que requer atencao especial..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}          {/* Botões de Navegação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="text-sm text-gray-600 font-semibold">
              Etapa {etapaAtual} de {etapas.length}
            </div>

            {etapaAtual < 5 ? (
              <button
                type="button"
                onClick={proximaEtapa}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Próxima
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSalvar}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {textoBotaoSalvar}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Botão Cancelar */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancelar}
              className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
            >
              {textoCancelarAcao}
            </button>
          </div>
        </div>
      </div>
      {modalNovoBairro.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar novo bairro
            </h3>
            <p className="text-sm text-slate-500">
              Preencha os dados abaixo para inserir um novo bairro no catálogo.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome do bairro
                </label>
                <input
                  type="text"
                  value={modalNovoBairro.nome}
                  onChange={(event) =>
                    setModalNovoBairro((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Zona 7"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Cidade
                </label>
                <input
                  type="text"
                  value={modalNovoBairro.cidade}
                  onChange={(event) =>
                    setModalNovoBairro((prev) => ({
                      ...prev,
                      cidade: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Maringa"
                />
              </div>
              {modalNovoBairro.erro && (
                <p className="text-sm text-rose-600">{modalNovoBairro.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovoBairro}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovoBairro.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovoBairro}
                disabled={modalNovoBairro.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovoBairro.salvando ? "Salvando..." : "Salvar bairro"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalNovaFaccao.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar nova faccao
            </h3>
            <p className="text-sm text-slate-500">
              Registre a faccao/grupo para manter o catalogo atualizado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da faccao
                </label>
                <input
                  type="text"
                  value={modalNovaFaccao.nome}
                  onChange={(event) =>
                    setModalNovaFaccao((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: PCC"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Observacao
                </label>
                <textarea
                  value={modalNovaFaccao.descricao}
                  onChange={(event) =>
                    setModalNovaFaccao((prev) => ({
                      ...prev,
                      descricao: event.target.value,
                      erro: null,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Contexto ou observacoes adicionais"
                />
              </div>
              {modalNovaFaccao.erro && (
                <p className="text-sm text-rose-600">{modalNovaFaccao.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovaFaccao}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovaFaccao.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaFaccao}
                disabled={modalNovaFaccao.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovaFaccao.salvando ? "Salvando..." : "Salvar faccao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

