import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
    }

    // Criar as 8 casas
    const casasData = [
      { nome: "Casa 01", numero: 1, isolada: true },
      { nome: "Casa 02", numero: 2, isolada: false },
      { nome: "Casa 03", numero: 3, isolada: false },
      { nome: "Casa 04", numero: 4, isolada: false },
      { nome: "Casa 05", numero: 5, isolada: false },
      { nome: "Casa 06", numero: 6, isolada: false },
      { nome: "Casa 07", numero: 7, isolada: false },
      { nome: "Casa 08", numero: 8, isolada: true },
    ];

    const casas = await Promise.all(
      casasData.map((casa) => prisma.casa.create({ data: casa }))
    );

    // Criar alojamentos para cada casa
    const alojamentosData = [];

    // Casas 01-07: 10 alojamentos cada (6 Ala A + 4 Ala B)
    for (let i = 0; i < 7; i++) {
      const casa = casas[i];

      // Ala A (01-06)
      for (let j = 1; j <= 6; j++) {
        alojamentosData.push({
          casaId: casa.id,
          numeroAlojamento: j.toString().padStart(2, "0"),
          ala: "A",
          localizacaoPreferencial: j === 1 || j === 6,
        });
      }

      // Ala B (07-10)
      for (let j = 7; j <= 10; j++) {
        alojamentosData.push({
          casaId: casa.id,
          numeroAlojamento: j.toString().padStart(2, "0"),
          ala: "B",
          localizacaoPreferencial: j === 7 || j === 10,
        });
      }
    }

    // Casa 08: 8 alojamentos (sem alas)
    for (let j = 1; j <= 8; j++) {
      alojamentosData.push({
        casaId: casas[7].id,
        numeroAlojamento: j.toString().padStart(2, "0"),
        ala: null,
      });
    }

    await prisma.alojamento.createMany({ data: alojamentosData });

    // Buscar alojamentos criados para mapear frontais
    const alojamentos = await prisma.alojamento.findMany();

    // Mapear alojamentos frontais (01↔06, 02↔05, 03↔04, 07↔08, 09↔10)
    const mapeamentoFrontais = [
      ["01", "06"],
      ["02", "05"],
      ["03", "04"],
      ["07", "08"],
      ["09", "10"],
    ];

    for (const casa of casas.slice(0, 7)) {
      for (const [num1, num2] of mapeamentoFrontais) {
        const aloj1 = alojamentos.find(
          (a) => a.casaId === casa.id && a.numeroAlojamento === num1
        );
        const aloj2 = alojamentos.find(
          (a) => a.casaId === casa.id && a.numeroAlojamento === num2
        );

        if (aloj1 && aloj2) {
          await prisma.alojamento.update({
            where: { id: aloj1.id },
            data: { alojamentoFrontalId: aloj2.id },
          });
          await prisma.alojamento.update({
            where: { id: aloj2.id },
            data: { alojamentoFrontalId: aloj1.id },
          });
        }
      }
    }

    // Criar zonas de risco e vincular
    const zonasData = [
      { nomeZona: "Zona C02-AlaB", descricao: "Casa 02, Ala B (Aloj 08, 09)" },
      {
        nomeZona: "Zona C03-AlaA",
        descricao: "Casa 03, Ala A (Aloj 01, 02, 03)",
      },
      { nomeZona: "Zona C04-AlaB", descricao: "Casa 04, Ala B (Aloj 09, 10)" },
      { nomeZona: "Zona C05-AlaA", descricao: "Casa 05, Ala A (Aloj 03, 04)" },
      { nomeZona: "Zona C05-AlaB", descricao: "Casa 05, Ala B (Aloj 09, 10)" },
      { nomeZona: "Zona C06-AlaA", descricao: "Casa 06, Ala A (Aloj 03, 04)" },
      { nomeZona: "Zona C06-AlaB", descricao: "Casa 06, Ala B (Aloj 09, 10)" },
      { nomeZona: "Zona C07-AlaA", descricao: "Casa 07, Ala A (Aloj 03, 04)" },
    ];

    const zonas = await Promise.all(
      zonasData.map((zona) => prisma.zonaRisco.create({ data: zona }))
    );

    // Vincular alojamentos às zonas
    const vinculosZonas = [
      { zona: 0, casa: 1, alojamentos: ["08", "09"] }, // C02 Ala B
      { zona: 1, casa: 2, alojamentos: ["01", "02", "03"] }, // C03 Ala A
      { zona: 2, casa: 3, alojamentos: ["09", "10"] }, // C04 Ala B
      { zona: 3, casa: 4, alojamentos: ["03", "04"] }, // C05 Ala A
      { zona: 4, casa: 4, alojamentos: ["09", "10"] }, // C05 Ala B
      { zona: 5, casa: 5, alojamentos: ["03", "04"] }, // C06 Ala A
      { zona: 6, casa: 5, alojamentos: ["09", "10"] }, // C06 Ala B
      { zona: 7, casa: 6, alojamentos: ["03", "04"] }, // C07 Ala A
    ];

    for (const vinculo of vinculosZonas) {
      const casa = casas[vinculo.casa];
      const zona = zonas[vinculo.zona];

      for (const numAloj of vinculo.alojamentos) {
        const aloj = alojamentos.find(
          (a) => a.casaId === casa.id && a.numeroAlojamento === numAloj
        );

        if (aloj) {
          await prisma.zonaRiscoAlojamento.create({
            data: {
              zonaId: zona.id,
              alojamentoId: aloj.id,
            },
          });
        }
      }
    }

    // Criar vínculos entre zonas (C02↔C03, C04↔C05, C05↔C06, C06↔C07)
    const vinculosEntreZonas = [
      [0, 1], // C02-AlaB ↔ C03-AlaA
      [2, 3], // C04-AlaB ↔ C05-AlaA
      [4, 5], // C05-AlaB ↔ C06-AlaA
      [6, 7], // C06-AlaB ↔ C07-AlaA
    ];

    for (const [z1, z2] of vinculosEntreZonas) {
      await prisma.zonaRiscoVinculo.create({
        data: {
          zonaAId: zonas[z1].id,
          zonaBId: zonas[z2].id,
        },
      });
    }

    return NextResponse.json({ sucesso: true, casas: casas.length });
  } catch (error) {
    console.error("Erro ao inicializar estrutura:", error);
    return NextResponse.json(
      { erro: "Erro ao criar estrutura" },
      { status: 500 }
    );
  }
}
