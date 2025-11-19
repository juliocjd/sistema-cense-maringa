"use client";

import { Suspense } from "react";
import { ListagemVisitantes } from "@/components/visitantes/listagem-visitantes";

export default function VisitantesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-gray-500">
          Carregando visitantes...
        </div>
      }
    >
      <ListagemVisitantes />
    </Suspense>
  );
}
