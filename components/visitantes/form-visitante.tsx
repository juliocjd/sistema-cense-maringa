"use client";

import { useState, useEffect } from "react";
import { Save, X, Camera, CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import { CameraCapture } from "@/components/reconhecimento-facial/camera-capture";

type Visitante = {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  dataNascimento: string | null;
  enderecoCompleto: string | null;
  telefones: string[];
  email: string | null;
  fotoUrl: string | null;
  consentimentoBiometria: boolean;
  temFaceCadastrada: boolean;
};

type FormVisitanteProps = {
  visitante?: Visitante | null;
  onSuccess: () => void;
  onCancel: () => void;
};

type Vinculo = {
  adolescenteId: string;
  parentesco: string;
  autorizado: boolean;
};

export function FormVisitante({ visitante, onSuccess, onCancel }: FormVisitanteProps) {
  const [formData, setFormData] = useState({
    nomeCompleto: visitante?.nomeCompleto || "",
    cpf: visitante?.cpf || "",
    dataNascimento: visitante?.dataNascimento?.split("T")[0] || "",
    enderecoCompleto: visitante?.enderecoCompleto || "",
    telefone: visitante?.telefones?.[0] || "",
    email: visitante?.email || "",
  });

  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [adolescentes, setAdolescentes] = useState<any[]>([]);
  const [novoVinculo, setNovoVinculo] = useState({
    adolescenteId: "",
    parentesco: "",
    autorizado: true,
  });

  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(
    visitante?.fotoUrl || null
  );
  const [embeddingsCapturados, setEmbeddingsCapturados] = useState<Float32Array | null>(
    null
  );
  const [consentimentoBiometria, setConsentimentoBiometria] = useState(
    visitante?.consentimentoBiometria || false
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar adolescentes ativos
  useEffect(() => {
    const carregarAdolescentes = async () => {
      try {
        const response = await fetch("/api/adolescentes?statusUnidade=ATIVO,INTERNADO");
        if (response.ok) {
          const result = await response.json();
          console.log("Dados recebidos da API adolescentes:", result);
          // A API retorna { data: [...], meta: {...} }
          setAdolescentes(result.data || result.adolescentes || result);
        } else {
          console.error("Erro ao carregar adolescentes - Status:", response.status);
          const errorData = await response.json().catch(() => ({}));
          console.error("Detalhes do erro:", errorData);
        }
      } catch (error) {
        console.error("Erro ao carregar adolescentes:", error);
      }
    };
    carregarAdolescentes();
  }, []);

  // Carregar vínculos existentes ao editar
  useEffect(() => {
    if (visitante?.id) {
      const carregarVinculos = async () => {
        try {
          const response = await fetch(`/api/visitantes/${visitante.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.vinculos) {
              setVinculos(
                data.vinculos.map((v: any) => ({
                  adolescenteId: v.adolescenteId,
                  parentesco: v.parentesco || "",
                  autorizado: v.autorizado !== false,
                }))
              );
            }
          }
        } catch (error) {
          console.error("Erro ao carregar vínculos:", error);
        }
      };
      carregarVinculos();
    }
  }, [visitante?.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdicionarVinculo = () => {
    if (!novoVinculo.adolescenteId || !novoVinculo.parentesco) {
      alert("Selecione o adolescente e informe o parentesco");
      return;
    }

    if (vinculos.some((v) => v.adolescenteId === novoVinculo.adolescenteId)) {
      alert("Este adolescente já está vinculado");
      return;
    }

    setVinculos([...vinculos, { ...novoVinculo }]);
    setNovoVinculo({ adolescenteId: "", parentesco: "", autorizado: true });
  };

  const handleRemoverVinculo = (adolescenteId: string) => {
    setVinculos(vinculos.filter((v) => v.adolescenteId !== adolescenteId));
  };

  const handleCapturarFace = async (imageDataUrl: string, embeddings: Float32Array) => {
    console.log("🎯 handleCapturarFace chamado");
    console.log("📸 imageDataUrl length:", imageDataUrl?.length);
    console.log("🧠 embeddings recebidos:", embeddings);
    console.log("🧠 embeddings length:", embeddings?.length);
    console.log("🧠 embeddings tipo:", typeof embeddings);
    console.log("🧠 embeddings é Float32Array?", embeddings instanceof Float32Array);

    setFotoCapturada(imageDataUrl);
    setEmbeddingsCapturados(embeddings);
    setMostrarCamera(false);
    setConsentimentoBiometria(true); // Ao capturar, assume consentimento

    console.log("✅ Estado atualizado - embeddingsCapturados definido");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      let fotoUrl = visitante?.fotoUrl?.trim() || null;
      let visitanteId = visitante?.id;

      // 1. Fazer upload da foto se foi capturada nova
      if (fotoCapturada && fotoCapturada !== visitante?.fotoUrl) {
        const blob = await fetch(fotoCapturada).then((r) => r.blob());
        const uploadFormData = new FormData();
        uploadFormData.append("file", blob, "foto-visitante.jpg");
        uploadFormData.append("tipo", "visitante");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Erro ao fazer upload da foto");
        }

        const uploadData = await uploadResponse.json();
        fotoUrl = uploadData.url;
      }

      // 2. Salvar ou atualizar visitante
      const visitanteData = {
        nomeCompleto: formData.nomeCompleto,
        cpf: formData.cpf || null,
        dataNascimento: formData.dataNascimento || null,
        enderecoCompleto: formData.enderecoCompleto || null,
        telefones: formData.telefone ? [formData.telefone] : [],
        email: formData.email?.trim() || null,
        fotoUrl: fotoUrl?.trim() || null,
        vinculos,
      };

      console.log("📤 Enviando visitante...");
      console.log("  - Modo:", visitanteId ? "EDIÇÃO (PUT)" : "CRIAÇÃO (POST)");
      console.log("  - URL:", visitanteId ? `/api/visitantes/${visitanteId}` : "/api/visitantes");
      console.log("  - Dados:", visitanteData);

      const visitanteResponse = await fetch(
        visitanteId ? `/api/visitantes/${visitanteId}` : "/api/visitantes",
        {
          method: visitanteId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(visitanteData),
        }
      );

      console.log("📨 Resposta do servidor:", visitanteResponse.status);

      if (!visitanteResponse.ok) {
        const errorData = await visitanteResponse.json();
        console.error("Erro da API ao salvar visitante:", errorData);
        console.error("Detalhes completos:", JSON.stringify(errorData.detalhes, null, 2));
        console.error("Dados enviados:", visitanteData);
        console.error("fotoUrl específico:", JSON.stringify(visitanteData.fotoUrl));
        console.error("Tipo de fotoUrl:", typeof visitanteData.fotoUrl);
        throw new Error(errorData.erro || errorData.error || "Erro ao salvar visitante");
      }

      const visitanteSalvo = await visitanteResponse.json();
      visitanteId = visitanteSalvo.id;

      // 3. Cadastrar face se foi capturada
      console.log("🔍 Verificando cadastro de face...");
      console.log("🧠 embeddingsCapturados:", embeddingsCapturados);
      console.log("🧠 embeddingsCapturados length:", embeddingsCapturados?.length);
      console.log("✅ consentimentoBiometria:", consentimentoBiometria);
      console.log("📸 fotoUrl:", fotoUrl);

      if (embeddingsCapturados && consentimentoBiometria) {
        console.log("✅ Condições atendidas - cadastrando face...");

        const facePayload = {
          visitanteId,
          faceEmbeddings: Array.from(embeddingsCapturados),
          fotoUrl,
          consentimento: true,
        };

        console.log("📤 Payload para cadastrar-face:", {
          ...facePayload,
          faceEmbeddings: `[Array com ${facePayload.faceEmbeddings.length} elementos]`,
        });

        const faceResponse = await fetch("/api/visitantes/cadastrar-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(facePayload),
        });

        if (!faceResponse.ok) {
          const faceError = await faceResponse.json();
          console.error("❌ Erro ao cadastrar face:", faceError);
          console.error("Status:", faceResponse.status);
        } else {
          const faceResult = await faceResponse.json();
          console.log("✅ Face cadastrada com sucesso:", faceResult);
        }
      } else {
        console.log("⚠️ Condições NÃO atendidas para cadastro de face:");
        if (!embeddingsCapturados) console.log("  - embeddingsCapturados está null/undefined");
        if (!consentimentoBiometria) console.log("  - consentimentoBiometria é false");
      }

      onSuccess();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setErro(err instanceof Error ? err.message : "Erro ao salvar visitante");
    } finally {
      setSalvando(false);
    }
  };

  if (mostrarCamera) {
    return (
      <div className="p-6">
        <CameraCapture
          onCapture={handleCapturarFace}
          onCancel={() => setMostrarCamera(false)}
          title="Captura Facial do Visitante"
          subtitle="Posicione o rosto do visitante no centro da câmera"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {visitante ? "Editar Visitante" : "Novo Visitante"}
        </h1>
        <p className="text-gray-600 mt-2">
          Preencha os dados do visitante e, opcionalmente, cadastre a face para
          reconhecimento automático
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={24} />
            <p>{erro}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Dados Básicos */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Dados Pessoais
              </h2>

              {/* Nome Completo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nomeCompleto"
                  value={formData.nomeCompleto}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nome completo do visitante"
                />
              </div>

              {/* CPF */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              {/* Data de Nascimento */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Telefone */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* E-mail */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="email@exemplo.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usado para envio de orientações e avisos sobre visitas
                </p>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo
                </label>
                <textarea
                  name="enderecoCompleto"
                  value={formData.enderecoCompleto}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Rua, número, bairro, cidade..."
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita - Reconhecimento Facial */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reconhecimento Facial
              </h2>

              {/* Preview da Foto */}
              <div className="mb-4">
                {fotoCapturada ? (
                  <div className="relative">
                    <img
                      src={fotoCapturada}
                      alt="Foto do visitante"
                      className="w-full h-64 object-cover rounded-lg border-2 border-indigo-200"
                    />
                    <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                      <CheckCircle size={16} />
                      Foto Capturada
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Camera className="mx-auto mb-2" size={48} />
                      <p>Nenhuma foto cadastrada</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Capturar */}
              <button
                type="button"
                onClick={() => setMostrarCamera(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md mb-4"
              >
                <Camera size={20} />
                {fotoCapturada ? "Recapturar Face" : "Capturar Face"}
              </button>

              {/* Status Reconhecimento */}
              {embeddingsCapturados && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle size={20} />
                    <p className="font-semibold">Face detectada com sucesso!</p>
                  </div>
                  <p className="text-sm text-green-600">
                    Embeddings faciais (128 dimensões) prontos para cadastro.
                  </p>
                </div>
              )}

              {/* Consentimento LGPD */}
              {embeddingsCapturados && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentimentoBiometria}
                      onChange={(e) => setConsentimentoBiometria(e.target.checked)}
                      className="mt-1"
                    />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">
                        Consentimento para Biometria Facial (LGPD)
                      </p>
                      <p className="text-blue-700">
                        Autorizo o armazenamento e processamento dos meus dados
                        biométricos faciais para fins de identificação e controle de
                        acesso na unidade CENSE Maringá.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Informações */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>💡 Dica:</strong> Para melhor qualidade:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Use boa iluminação frontal</li>
                  <li>Evite sombras no rosto</li>
                  <li>Olhe diretamente para a câmera</li>
                  <li>Remova óculos escuros</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Vínculos com Adolescentes */}
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Vínculos com Adolescentes
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Vincule este visitante aos adolescentes que ele está autorizado a visitar.
              Informe o parentesco específico para cada adolescente.
            </p>

            {/* Lista de Vínculos Atuais */}
            {vinculos.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Vínculos Cadastrados ({vinculos.length})
                </h3>
                <div className="space-y-2">
                  {vinculos.map((vinculo) => {
                    const adolescente = adolescentes.find(
                      (a) => a.id === vinculo.adolescenteId
                    );
                    return (
                      <div
                        key={vinculo.adolescenteId}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {adolescente?.nomeCompleto || adolescente?.nomeSocial || "Adolescente"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Parentesco: <span className="font-medium">{vinculo.parentesco}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {vinculo.autorizado ? "✓ Autorizado" : "✗ Não autorizado"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverVinculo(vinculo.adolescenteId)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Remover vínculo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formulário para Adicionar Vínculo */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Adicionar Novo Vínculo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Select Adolescente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adolescente *
                  </label>
                  <select
                    value={novoVinculo.adolescenteId}
                    onChange={(e) =>
                      setNovoVinculo({ ...novoVinculo, adolescenteId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    {Array.isArray(adolescentes) &&
                      adolescentes
                        .filter(
                          (a) =>
                            !vinculos.some((v) => v.adolescenteId === a.id)
                        )
                        .map((adolescente) => (
                          <option key={adolescente.id} value={adolescente.id}>
                            {adolescente.nomeCompleto || adolescente.nomeSocial}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Input Parentesco */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parentesco *
                  </label>
                  <input
                    type="text"
                    value={novoVinculo.parentesco}
                    onChange={(e) =>
                      setNovoVinculo({ ...novoVinculo, parentesco: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ex: Mãe, Pai, Tia..."
                  />
                </div>

                {/* Checkbox Autorizado */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 h-fit">
                    <input
                      type="checkbox"
                      checked={novoVinculo.autorizado}
                      onChange={(e) =>
                        setNovoVinculo({
                          ...novoVinculo,
                          autorizado: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Autorizado
                    </span>
                  </label>
                </div>
              </div>

              {/* Botão Adicionar */}
              <button
                type="button"
                onClick={handleAdicionarVinculo}
                className="mt-4 flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                <Plus size={20} />
                Adicionar Vínculo
              </button>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={salvando || !formData.nomeCompleto}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
          >
            <Save size={20} />
            {salvando ? "Salvando..." : "Salvar Visitante"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={salvando}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
          >
            <X size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
