"use client";

import type { ReactNode } from "react";

type StatItem = {
  label: string;
  value: ReactNode;
  accent?: "indigo" | "green" | "purple" | "gray";
};

type GrupoLayoutProps = {
  title: string;
  subtitle: string;
  actionButtons?: ReactNode;
  stats?: StatItem[];
  filters?: ReactNode;
  filtersActive?: boolean;
  onToggleFilters?: () => void;
  children: ReactNode;
};

export function GrupoLayout({
  title,
  subtitle,
  actionButtons,
  stats = [],
  filters,
  filtersActive = false,
  onToggleFilters,
  children,
}: GrupoLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {title}
            </h1>
            <p className="text-gray-600 mt-1">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">{actionButtons}</div>
        </div>

        {filters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onToggleFilters}
                className="flex items-center gap-2 text-gray-700 font-semibold hover:text-indigo-600 transition-colors"
              >
                Filtros
                {filtersActive && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">
                    Ativos
                  </span>
                )}
              </button>
            </div>
            {filters}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <p className="text-sm text-gray-600 font-semibold">{item.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
