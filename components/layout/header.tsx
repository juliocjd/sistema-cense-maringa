"use client";

import { Bell, Search, User, ChevronDown } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [mostrarMenu, setMostrarMenu] = useState(false);

  // Mock de usuário - substituir por dados reais do contexto/sessão
  const usuario = {
    nome: "José Silva",
    role: "Operador",
    foto: null,
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Barra de Busca */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar adolescente, CI, processo..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-4 ml-6">
          {/* Notificações */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Perfil do Usuário */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenu(!mostrarMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                {usuario.foto ? (
                  <img
                    src={usuario.foto}
                    alt={usuario.nome}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  usuario.nome.charAt(0)
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-800">
                  {usuario.nome}
                </p>
                <p className="text-xs text-gray-600">{usuario.role}</p>
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
                      {usuario.nome}
                    </p>
                    <p className="text-xs text-gray-600">{usuario.role}</p>
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
                        window.location.href = "/login";
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
