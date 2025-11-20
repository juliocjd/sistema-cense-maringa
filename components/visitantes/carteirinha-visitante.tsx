"use client";

import { QrCode, User } from "lucide-react";
import { useMemo } from "react";

export type VisitanteCarteirinhaDados = {
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  fotoUrl?: string | null;
};

type VisitanteCarteirinhaProps = {
  visitante: VisitanteCarteirinhaDados;
  codigoQr: string;
  qrCodeImage: string;
  validade?: string | null;
};

const formatarCpf = (cpf?: string | null) => {
  if (!cpf) return "Nao informado";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9
  )}-${digits.slice(9)}`;
};

const formatarTelefone = (telefone?: string | null) => {
  if (!telefone) return "Nao informado";
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return telefone;
};

export function VisitanteCarteirinha({
  visitante,
  codigoQr,
  qrCodeImage,
  validade,
}: VisitanteCarteirinhaProps) {
  const validadeFormatada = useMemo(() => {
    if (!validade) return "Sem validade definida";
    try {
      return new Date(validade).toLocaleDateString("pt-BR");
    } catch {
      return validade;
    }
  }, [validade]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* coluna esquerda */}
        <div className="flex-1 flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Carteira de Visitante
            </p>
            <p className="text-3xl font-bold text-slate-900">{visitante.nome}</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="h-28 w-28 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
              {visitante.fotoUrl ? (
                <img
                  src={visitante.fotoUrl}
                  alt={visitante.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="text-slate-400" size={40} />
              )}
            </div>
            <div className="flex-1 space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  CPF
                </p>
                <p className="font-semibold">{formatarCpf(visitante.cpf)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  E-mail
                </p>
                <p className="font-semibold break-all">
                  {visitante.email || "Nao informado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Telefone
                </p>
                <p className="font-semibold break-all">
                  {formatarTelefone(visitante.telefone)}
                </p>
              </div>
            </div>
          </div>

          {visitante.endereco && (
            <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 text-sm text-slate-700 shadow-inner">
              <p className="text-xs uppercase text-slate-500 mb-1">Endereço</p>
              <p className="font-medium leading-snug break-words">
                {visitante.endereco}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Validade
              </p>
              <p className="text-xl font-semibold">{validadeFormatada}</p>
            </div>
            <div className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <QrCode size={14} />
              Código ativo
            </div>
          </div>
        </div>

        {/* coluna direita */}
        <div className="flex flex-col items-center rounded-[26px] border border-indigo-100 bg-white p-5 min-w-[260px] shadow-inner relative">
          <div className="absolute inset-4 rounded-[20px] border border-dashed border-indigo-200 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <img
                src={qrCodeImage}
                alt="QR Code do visitante"
                className="h-56 w-56"
              />
            </div>
            <p className="font-mono text-[11px] text-slate-600 break-all text-center">
              {codigoQr}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
