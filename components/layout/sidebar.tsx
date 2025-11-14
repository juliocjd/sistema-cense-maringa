"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Settings,
  Shield,
  Swords,
  User,
  UserCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

type MenuEntry = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type MenuSection = {
  section: string;
  items: MenuEntry[];
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(true);
  const [forceOpen, setForceOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const expanded = isOpen || (isDesktop && forceOpen);

  const menuItems: MenuSection[] = useMemo(
    () => [
      {
        section: "Principal",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Estrutura & Mapa", href: "/estrutura", icon: Building2 },
        ],
      },
      {
        section: "Adolescentes",
        items: [
          { label: "Lista de Adolescentes", href: "/adolescentes", icon: Users },
          { label: "Novo Cadastro", href: "/adolescentes/novo", icon: UserPlus },
        ],
      },
      {
        section: "Gestao",
        items: [
          { label: "Conflitos", href: "/conflitos", icon: Swords },
          {
            label: "Conflitos Externos",
            href: "/inteligencia/conflitos",
            icon: BarChart3,
          },
          { label: "Grupos", href: "/grupos", icon: UserCircle },
          { label: "Tatuagens", href: "/tatuagens", icon: Shield },
          { label: "Comunicados Internos", href: "/comunicados", icon: FileText },
          { label: "Eventos Especiais", href: "/eventos", icon: Calendar },
        ],
      },
      {
        section: "Relatorios",
        items: [
          { label: "Analytics", href: "/analytics", icon: PieChart },
          { label: "Estatisticas", href: "/relatorios", icon: BarChart3 },
          { label: "Alertas Ativos", href: "/alertas", icon: AlertTriangle },
          { label: "Justificativas de Algema", href: "/justificativas-algema", icon: Shield },
        ],
      },
      {
        section: "Sistema",
        items: [
          { label: "Configuracoes", href: "/configuracoes", icon: Settings },
        ],
      },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-indigo-600 p-2 text-white shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {expanded && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-gradient-to-b from-indigo-900 to-indigo-950 text-white shadow-2xl transition-all duration-300 ${
          expanded ? "w-64" : "w-0 lg:w-20 lg:hover:w-64"
        } ${expanded ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        onMouseEnter={() => {
          if (isDesktop) setForceOpen(true);
        }}
        onMouseLeave={() => {
          if (isDesktop) setForceOpen(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-indigo-800 p-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-xl font-bold">
                CS
              </div>
              {expanded && (
                <div>
                  <h1 className="text-lg font-bold">CENSE</h1>
                  <p className="text-xs text-indigo-300">Maringa - PR</p>
                </div>
              )}
            </Link>
          </div>

          <nav className="sidebar-scrollbar flex-1 overflow-y-auto px-3 py-6">
            {menuItems.map((section) => (
              <div key={section.section} className="mb-6">
                {expanded && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    {section.section}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                            active
                              ? "bg-indigo-600 text-white shadow-lg"
                              : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                          } ${!expanded ? "justify-center" : ""}`}
                          title={!expanded ? item.label : undefined}
                        >
                          <Icon size={20} className="flex-shrink-0" />
                          {expanded && <span>{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-indigo-800 p-3">
            {user && expanded && (
              <div className="rounded-lg bg-indigo-800/50 px-3 py-2 text-xs text-indigo-300">
                <div className="mb-1 flex items-center gap-2 text-white">
                  <User size={16} />
                  <span className="font-semibold truncate">{user.name}</span>
                </div>
                <p className="truncate">{user.email}</p>
                <p className="mt-1 text-indigo-400">
                  {user.cargo} - {user.setor}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                if (confirm("Deseja realmente sair?")) {
                  logout();
                }
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-900/30 hover:text-red-100 ${
                !expanded ? "justify-center" : ""
              }`}
              title={!expanded ? "Sair" : undefined}
            >
              <LogOut size={20} />
              {expanded && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
