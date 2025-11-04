// prisma/seed-auth.ts
// Script para criar operador de teste com senha hashada

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de autenticação...");

  // Hash da senha "admin123"
  const senhaHash = await bcrypt.hash("admin123", 10);

  // Criar ou atualizar operador admin
  const operador = await prisma.operador.upsert({
    where: {
      email: "admin@cense.pr.gov.br",
    },
    update: {
      senhaHash: senhaHash,
      status: "ATIVO",
    },
    create: {
      nomeCompleto: "Administrador do Sistema",
      email: "admin@cense.pr.gov.br",
      senhaHash: senhaHash,
      funcaoRole: "ADMIN",
      status: "ATIVO",
    },
  });

  console.log("✅ Operador criado/atualizado:");
  console.log({
    id: operador.id,
    nomeCompleto: operador.nomeCompleto,
    email: operador.email,
    funcaoRole: operador.funcaoRole,
    status: operador.status,
  });

  console.log("\n📋 Credenciais de acesso:");
  console.log("Email: admin@cense.pr.gov.br");
  console.log("Senha: admin123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erro ao executar seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
