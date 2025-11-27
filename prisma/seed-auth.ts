import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensurePapelPermissao(papelId: string, permissaoId: string) {
  const existente = await prisma.papelPermissao.findFirst({
    where: { papelId, permissaoId },
  });

  if (!existente) {
    await prisma.papelPermissao.create({
      data: { papelId, permissaoId },
    });
  }
}

async function ensureOperadorPapel(operadorId: string, papelId: string) {
  const existente = await prisma.operadorPapel.findFirst({
    where: { operadorId, papelId },
  });

  if (!existente) {
    await prisma.operadorPapel.create({
      data: { operadorId, papelId },
    });
  }
}

async function main() {
  console.log("🔐 Iniciando seed de autenticação...");

  const senhaHash = await bcrypt.hash("admin123", 10);

  const operador = await prisma.operador.upsert({
    where: { email: "admin@cense.pr.gov.br" },
    update: { senhaHash, status: "ATIVO" },
    create: {
      nomeCompleto: "Administrador do Sistema",
      email: "admin@cense.pr.gov.br",
      senhaHash,
      funcaoRole: "ADMIN",
      status: "ATIVO",
    },
  });

  const [papelAdmin, papelOperador, papelConsulta] = await Promise.all([
    prisma.papel.upsert({
      where: { nome: "ADMIN" },
      update: {},
      create: { nome: "ADMIN", descricao: "Acesso total ao sistema" },
    }),
    prisma.papel.upsert({
      where: { nome: "OPERADOR" },
      update: {},
      create: { nome: "OPERADOR", descricao: "Operações de rotina" },
    }),
    prisma.papel.upsert({
      where: { nome: "CONSULTA" },
      update: {},
      create: { nome: "CONSULTA", descricao: "Acesso somente leitura" },
    }),
  ]);

  const [permissaoFull, permissaoConsulta] = await Promise.all([
    prisma.permissao.upsert({
      where: { codigo: "FULL_ACCESS" },
      update: { descricao: "Acesso completo a todos os módulos" },
      create: {
        codigo: "FULL_ACCESS",
        descricao: "Acesso completo a todos os módulos",
      },
    }),
    prisma.permissao.upsert({
      where: { codigo: "READ_ONLY" },
      update: { descricao: "Permissão de leitura" },
      create: {
        codigo: "READ_ONLY",
        descricao: "Permissão de leitura",
      },
    }),
  ]);

  await Promise.all([
    ensurePapelPermissao(papelAdmin.id, permissaoFull.id),
    ensurePapelPermissao(papelOperador.id, permissaoFull.id),
    ensurePapelPermissao(papelConsulta.id, permissaoConsulta.id),
  ]);

  await ensureOperadorPapel(operador.id, papelAdmin.id);

  console.log("✅ Operador e papéis/permissões configurados:");
  console.log({
    id: operador.id,
    nomeCompleto: operador.nomeCompleto,
    email: operador.email,
    funcaoRole: operador.funcaoRole,
    papeisVinculados: ["ADMIN"],
  });

  console.log("\n🔑 Credenciais de acesso:");
  console.log("Email: admin@cense.pr.gov.br");
  console.log("Senha: admin123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("🚨 Erro ao executar seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
