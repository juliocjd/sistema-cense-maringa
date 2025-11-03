"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InicializarEstruturaButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function inicializar() {
    setLoading(true);
    try {
      const response = await fetch("/api/estrutura/inicializar", {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Erro ao inicializar estrutura");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={inicializar}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Criando estrutura..." : "🏗️ Inicializar Estrutura"}
    </button>
  );
}
