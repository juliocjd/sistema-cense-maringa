"use client";

import { Suspense } from "react";
import { ListagemAdolescentes } from "@/components/adolescentes/listagem-adolescentes";

export default function AdolescentesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Carregando adolescentes...</div>}>
      <ListagemAdolescentes />
    </Suspense>
  );
}
