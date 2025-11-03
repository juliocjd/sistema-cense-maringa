import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";
import { InicializarEstruturaButton } from "./inicializar-button";

export default async function EstruturaPage() {
  const casas = await prisma.casa.findMany({
    include: {
      alojamentos: {
        orderBy: { numeroAlojamento: "asc" },
      },
    },
    orderBy: { numero: "asc" },
  });

  const totalCasas = casas.length;
  const totalAlojamentos = casas.reduce(
    (acc, casa) => acc + casa.alojamentos.length,
    0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Estrutura da Unidade
        </h1>
        <p className="text-gray-600">Gerenciar casas e alojamentos</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600">Total de Casas</p>
          <p className="text-3xl font-bold text-gray-900">{totalCasas}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600">Total de Alojamentos</p>
          <p className="text-3xl font-bold text-gray-900">{totalAlojamentos}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4 border-2 border-purple-200">
          <p className="text-sm text-gray-600">Capacidade</p>
          <p className="text-3xl font-bold text-gray-900">78</p>
        </div>
      </div>

      {totalCasas === 0 ? (
        <div className="rounded-lg bg-yellow-50 border-2 border-yellow-200 p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">
            🏗️ Estrutura não inicializada
          </h3>
          <p className="text-yellow-800 mb-4">
            O sistema precisa criar as 8 casas e 78 alojamentos da unidade.
          </p>
          <InicializarEstruturaButton />
        </div>
      ) : (
        <div className="grid gap-4">
          {casas.map((casa) => (
            <div
              key={casa.id}
              className="rounded-lg bg-white border shadow p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">{casa.nome}</h3>
                  <p className="text-sm text-gray-600">
                    {casa.alojamentos.length} alojamentos
                    {casa.isolada && " • Isolada"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-10 gap-2">
                {casa.alojamentos.map((aloj) => (
                  <div
                    key={aloj.id}
                    className={`text-center p-2 rounded text-sm font-medium ${
                      aloj.statusManutencao === "LIVRE"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {aloj.numeroAlojamento}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
