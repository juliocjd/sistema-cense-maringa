"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Users,
  UserPlus,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Swords,
  Calendar,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    {
      section: "Principal",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Mapa Operacional",
          href: "/mapa",
          icon: Map,
        },
      ],
    },
    {
      section: "Adolescentes",
      items: [
        {
          label: "Lista de Adolescentes",
          href: "/adolescentes",
          icon: Users,
        },
        {
          label: "Novo Cadastro",
          href: "/adolescentes/novo",
          icon: UserPlus,
        },
      ],
    },
    {
      section: "Gestão",
      items: [
        {
          label: "Conflitos",
          href: "/conflitos",
          icon: Swords,
        },
        {
          label: "Grupos",
          href: "/grupos",
          icon: UserCircle,
        },
        {
          label: "Comunicados Internos",
          href: "/comunicados",
          icon: FileText,
        },
        {
          label: "Eventos Especiais",
          href: "/eventos",
          icon: Calendar,
        },
      ],
    },
    {
      section: "Relatórios",
      items: [
        {
          label: "Estatísticas",
          href: "/relatorios",
          icon: BarChart3,
        },
        {
          label: "Alertas Ativos",
          href: "/alertas",
          icon: AlertTriangle,
        },
      ],
    },
    {
      section: "Sistema",
      items: [
        {
          label: "Configurações",
          href: "/configuracoes",
          icon: Settings,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-gradient-to-b from-indigo-900 to-indigo-950 text-white
          transition-all duration-300 z-40 shadow-2xl
          ${isOpen ? "w-64" : "w-0 lg:w-20"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-indigo-800">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">
                CS
              </div>
              {isOpen && (
                <div>
                  <h1 className="font-bold text-lg">CENSE</h1>
                  <p className="text-xs text-indigo-300">Maringá - PR</p>
                </div>
              )}
            </Link>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-6 px-3">
            {menuItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6">
                {isOpen && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    {section.section}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <li key={itemIndex}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                            ${
                              active
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                            }
                            ${!isOpen && "justify-center"}
                          `}
                          title={!isOpen ? item.label : undefined}
                        >
                          <Icon size={20} className="flex-shrink-0" />
                          {isOpen && (
                            <span className="font-medium text-sm">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer - Sair */}
          <div className="p-3 border-t border-indigo-800">
            <button
              onClick={() => {
                if (confirm("Deseja realmente sair?")) {
                  window.location.href = "/login";
                }
              }}
              className={`
                flex items-center gap-3 px-3 py-3 w-full rounded-lg
                text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all
                ${!isOpen && "justify-center"}
              `}
              title={!isOpen ? "Sair" : undefined}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {isOpen && <span className="font-medium text-sm">Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
