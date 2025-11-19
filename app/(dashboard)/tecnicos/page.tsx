"use client";

import { Suspense } from "react";
import { ListagemTecnicos } from "@/components/tecnicos/listagem-tecnicos";

export default function TecnicosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Carregando técnicos...</div>}>
      <ListagemTecnicos />
    </Suspense>
  );
}
