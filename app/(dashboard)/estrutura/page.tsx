import { prisma } from "@/lib/prisma";
import { EstruturaTabsComponent } from "./estrutura-tabs";

export default async function EstruturaPage() {
  const casas = await prisma.casa.findMany({
    include: {
      alojamentos: {
        orderBy: { numeroAlojamento: "asc" },
      },
    },
    orderBy: { numero: "asc" },
  });

  const totalAlojamentos = casas.reduce(
    (acc, casa) => acc + casa.alojamentos.length,
    0
  );

  return (
    <EstruturaTabsComponent
      casas={casas}
      totalAlojamentos={totalAlojamentos}
    />
  );
}
