"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  RefreshCw,
} from "lucide-react";

type TemplateEmail = {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export function PainelTemplates() {
  const [templates, setTemplates] = useState<TemplateEmail[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [templateSelecionado, setTemplateSelecionado] =
    useState<TemplateEmail | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    assunto: "",
    corpo: "",
    ativo: true,
  });

  const carregarTemplates = async () => {
    try {
      const response = await fetch("/api/email/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setErro(null);
      } else {
        setErro("Erro ao carregar templates");
      }
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      setErro("Erro ao carregar templates");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTemplates();
  }, []);

  const iniciarNovo = () => {
    setFormData({
      nome: "",
      assunto: "",
      corpo: "",
      ativo: true,
    });
    setTemplateSelecionado(null);
    setModoEdicao(true);
  };

  const iniciarEdicao = (template: TemplateEmail) => {
    setFormData({
      nome: template.nome,
      assunto: template.assunto,
      corpo: template.corpo,
      ativo: template.ativo,
    });
    setTemplateSelecionado(template);
    setModoEdicao(true);
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setTemplateSelecionado(null);
    setFormData({
      nome: "",
      assunto: "",
      corpo: "",
      ativo: true,
    });
  };

  const salvarTemplate = async () => {
    try {
      const url = templateSelecionado
        ? `/api/email/templates/${templateSelecionado.id}`
        : "/api/email/templates";

      const method = templateSelecionado ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await carregarTemplates();
        cancelarEdicao();
      } else {
        const data = await response.json();
        setErro(data.error || "Erro ao salvar template");
      }
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      setErro("Erro ao salvar template");
    }
  };

  const excluirTemplate = async (id: string) => {
    if (!confirm("Deseja realmente excluir este template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/email/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await carregarTemplates();
      } else {
        const data = await response.json();
        setErro(data.error || "Erro ao excluir template");
      }
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      setErro("Erro ao excluir template");
    }
  };

  const toggleAtivo = async (template: TemplateEmail) => {
    try {
      const response = await fetch(`/api/email/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !template.ativo }),
      });

      if (response.ok) {
        await carregarTemplates();
      } else {
        const data = await response.json();
        setErro(data.error || "Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setErro("Erro ao atualizar status");
    }
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={24} />
          <p className="text-gray-600">Carregando templates...</p>
        </div>
      </div>
    );
  }

  if (modoEdicao) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {templateSelecionado ? "Editar Template" : "Novo Template"}
          </h3>
          <button
            onClick={cancelarEdicao}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Template
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ex: ORIENTACOES_VISITA"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use letras maiúsculas e underscores. Ex: VISITANTE_CADASTRADO
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assunto do Email
            </label>
            <input
              type="text"
              value={formData.assunto}
              onChange={(e) =>
                setFormData({ ...formData, assunto: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ex: Bem-vindo ao Sistema - CENSE Maringá"
            />
            <p className="text-xs text-gray-500 mt-1">
              Você pode usar variáveis como {" {{nome}}, {{data}}"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Corpo do Email
            </label>
            <textarea
              value={formData.corpo}
              onChange={(e) =>
                setFormData({ ...formData, corpo: e.target.value })
              }
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              placeholder={`Olá {{nome}},\n\nBem-vindo ao sistema de visitantes do CENSE Maringá.\n\n...`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {"{{variavel}}"} para inserir valores dinâmicos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) =>
                setFormData({ ...formData, ativo: e.target.checked })
              }
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700">
              Template ativo
            </label>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{erro}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={salvarTemplate}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Save size={18} />
              Salvar Template
            </button>
            <button
              onClick={cancelarEdicao}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Templates de Email</h2>
            <p className="text-indigo-100">
              Gerencie os templates de notificações por email
            </p>
          </div>
          <button
            onClick={iniciarNovo}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
          >
            <Plus size={20} />
            Novo Template
          </button>
        </div>
      </div>

      {/* Lista de Templates */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium">{erro}</p>
          <button
            onClick={carregarTemplates}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Mail className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg">
            Nenhum template cadastrado ainda
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Crie seu primeiro template de email
          </p>
          <button
            onClick={iniciarNovo}
            className="mt-6 flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={20} />
            Criar Primeiro Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail
                      className={
                        template.ativo ? "text-indigo-600" : "text-gray-400"
                      }
                      size={24}
                    />
                    <h3 className="text-lg font-bold text-gray-900">
                      {template.nome}
                    </h3>
                    {template.ativo ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        Inativo
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Assunto:</strong> {template.assunto}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Prévia do corpo:
                    </p>
                    <p className="text-sm text-gray-700 font-mono line-clamp-3">
                      {template.corpo}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Atualizado em:{" "}
                    {new Date(template.atualizadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleAtivo(template)}
                    className="p-2 text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                    title={template.ativo ? "Desativar" : "Ativar"}
                  >
                    {template.ativo ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => iniciarEdicao(template)}
                    className="p-2 text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => excluirTemplate(template.id)}
                    className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-100"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
