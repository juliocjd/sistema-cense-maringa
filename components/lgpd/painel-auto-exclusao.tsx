"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Mail,
  Info,
} from "lucide-react";

type FotoParaExclusao = {
  visitanteId: string;
  nome: string;
  cpf: string | null;
  dataUltimaAtualizacao: string;
  diasSemVisita: number;
};

export function PainelAutoExclusao() {
  const [fotos, setFotos] = useState<FotoParaExclusao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [executando, setExecutando] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const carregarFotos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch("/api/lgpd/auto-exclusao");
      if (response.ok) {
        const data = await response.json();
        setFotos(data.fotos || []);
      } else {
        setErro("Erro ao carregar lista de fotos");
      }
    } catch (error) {
      console.error("Erro ao carregar fotos:", error);
      setErro("Erro ao carregar lista de fotos");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFotos();
  }, []);

  const executarExclusao = async () => {
    if (
      !confirm(
        `Deseja realmente excluir ${fotos.length} foto(s)?\n\nEsta ação NÃO pode ser desfeita.`
      )
    ) {
      return;
    }

    if (!confirm("CONFIRMAÇÃO FINAL: As fotos serão permanentemente excluídas!")) {
      return;
    }

    setExecutando(true);
    setErro(null);
    setResultado(null);

    try {
      const response = await fetch("/api/lgpd/auto-exclusao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "executar",
          confirmacao: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResultado(data);
        await carregarFotos(); // Recarregar lista
      } else {
        const data = await response.json();
        setErro(data.error || "Erro ao executar exclusão");
      }
    } catch (error) {
      console.error("Erro ao executar exclusão:", error);
      setErro("Erro ao executar exclusão");
    } finally {
      setExecutando(false);
    }
  };

  const enviarNotificacoes = async () => {
    if (
      !confirm(
        "Deseja enviar notificações por email para os visitantes que terão suas fotos excluídas em breve?"
      )
    ) {
      return;
    }

    setNotificando(true);
    setErro(null);

    try {
      const response = await fetch("/api/lgpd/auto-exclusao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "notificar",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Notificações enviadas para ${data.total} visitantes`);
      } else {
        const data = await response.json();
        setErro(data.error || "Erro ao enviar notificações");
      }
    } catch (error) {
      console.error("Erro ao enviar notificações:", error);
      setErro("Erro ao enviar notificações");
    } finally {
      setNotificando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Shield size={28} />
              Auto-Exclusão de Fotos (LGPD)
            </h2>
            <p className="text-purple-100">
              Gerenciamento automático de retenção de dados biométricos
            </p>
          </div>
          <button
            onClick={carregarFotos}
            disabled={carregando}
            className="p-3 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={carregando ? "animate-spin" : ""} size={24} />
          </button>
        </div>

        <div className="bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Info size={18} />
            Política de Retenção
          </h3>
          <ul className="text-sm space-y-1 text-purple-100">
            <li>• Fotos são retidas por 60 dias após o último cadastro/atualização</li>
            <li>
              • Se não houver visitas nos últimos 60 dias, a foto é automaticamente
              excluída
            </li>
            <li>• Visitantes são notificados 7 dias antes da exclusão</li>
            <li>• Processo em conformidade com LGPD (Lei Geral de Proteção de Dados)</li>
          </ul>
        </div>
      </div>

      {/* Resultado da Execução */}
      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-2">Processo Concluído</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600">Total Processadas</p>
                  <p className="text-2xl font-bold text-gray-900">{resultado.total}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600">Excluídas com Sucesso</p>
                  <p className="text-2xl font-bold text-green-600">{resultado.sucesso}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600">Falhas</p>
                  <p className="text-2xl font-bold text-red-600">{resultado.falhas}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium">{erro}</p>
        </div>
      )}

      {/* Estatísticas */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Fotos Pendentes de Exclusão
          </h3>
          <div className="flex gap-3">
            <button
              onClick={enviarNotificacoes}
              disabled={notificando || fotos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={18} />
              {notificando ? "Enviando..." : "Notificar Visitantes"}
            </button>
            <button
              onClick={executarExclusao}
              disabled={executando || fotos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              {executando ? "Excluindo..." : "Executar Exclusão"}
            </button>
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin text-purple-600 mx-auto mb-3" size={32} />
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : fotos.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <p className="text-gray-600 text-lg font-medium">
              Nenhuma foto pendente de exclusão
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Todas as fotos estão dentro do período de retenção
            </p>
          </div>
        ) : (
          <div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
                <div>
                  <p className="font-bold text-yellow-900">
                    {fotos.length} foto(s) será(ão) excluída(s)
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Estas fotos não tiveram visitas nos últimos 60 dias e estão fora do
                    período de retenção
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Atualização
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dias sem Visita
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fotos.map((foto) => (
                    <tr key={foto.visitanteId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {foto.nome}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {foto.cpf || "Não informado"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(foto.dataUltimaAtualizacao).toLocaleDateString(
                            "pt-BR"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            foto.diasSemVisita >= 90
                              ? "bg-red-100 text-red-800"
                              : foto.diasSemVisita >= 70
                              ? "bg-orange-100 text-orange-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {foto.diasSemVisita} dias
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
