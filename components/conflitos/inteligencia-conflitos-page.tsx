"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";

import PainelConflitos from "@/components/conflitos/painel-conflitos";
import FormConflito from "@/components/conflitos/form-conflito";
import {
  CatalogoBairro,
  CatalogoFaccao,
  ConflitoExternoResumo,
  ImpactoConflitoPayload,
} from "@/types/inteligencia";

type InteligenciaConflitosPageProps = {
  bairros: CatalogoBairro[];
  faccoes: CatalogoFaccao[];
  conflitos: ConflitoExternoResumo[];
  impactoResumo: ImpactoConflitoPayload;
};

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
};

const Modal = ({
  open,
  title,
  description,
  maxWidth = "max-w-3xl",
  onClose,
  children,
}: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-500">
              {title}
            </p>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function InteligenciaConflitosPage({
  bairros,
  faccoes,
  conflitos,
  impactoResumo,
}: InteligenciaConflitosPageProps) {
  const [modalConflito, setModalConflito] = useState(false);
  const acoesHeader = (
    <>
      <button
        type="button"
        onClick={() => setModalConflito(true)}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold shadow-lg"
      >
        <Plus size={18} />
        Cadastrar novo conflito
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      <PainelConflitos
        conflitos={conflitos}
        impactoResumo={impactoResumo}
        acoesHeader={acoesHeader}
      />

      <Modal
        open={modalConflito}
        title="Novo conflito externo"
        description="Cadastro territorial ou faccional."
        onClose={() => setModalConflito(false)}
        maxWidth="max-w-2xl"
      >
        <FormConflito bairros={bairros} faccoes={faccoes} compact />
      </Modal>

    </div>
  );
}
