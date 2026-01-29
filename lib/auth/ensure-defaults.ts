import { prisma } from "@/lib/prisma";

type PapelInfo = {
  nome: string;
  descricao: string;
};

type PermissaoInfo = {
  codigo: string;
  descricao: string;
};

const PAPEIS_PADRAO: PapelInfo[] = [
  { nome: "ADMIN", descricao: "Acesso total ao sistema" },
  { nome: "OPERADOR", descricao: "Operacoes de rotina" },
  { nome: "CONSULTA", descricao: "Acesso somente leitura" },
  {
    nome: "TECNICO_REFERENCIA",
    descricao: "Tecnico de referencia com acesso operacional limitado",
  },
];

const PERMISSOES_PADRAO: PermissaoInfo[] = [
  { codigo: "FULL_ACCESS", descricao: "Acesso completo a todos os modulos" },
  { codigo: "READ_ONLY", descricao: "Permissao de leitura" },
  { codigo: "ADOLESCENTES_CREATE", descricao: "Cadastrar novos adolescentes" },
  { codigo: "ESTRUTURA_EDIT", descricao: "Editar estrutura e alocacoes" },
  {
    codigo: "ADOLESCENTES_EDIT_ALOJAMENTO",
    descricao: "Alterar alojamento de adolescentes",
  },
  { codigo: "CONFLITOS_EXTERNOS_VIEW", descricao: "Visualizar conflitos externos" },
  {
    codigo: "CONFLITOS_EXTERNOS_MANAGE",
    descricao: "Gerenciar conflitos externos",
  },
  {
    codigo: "JUSTIFICATIVAS_ALGEMA_VIEW",
    descricao: "Visualizar justificativas de algema",
  },
];

const PAPEL_PERMISSOES: Record<string, string[]> = {
  ADMIN: [
    "FULL_ACCESS",
    "ADOLESCENTES_CREATE",
    "ESTRUTURA_EDIT",
    "ADOLESCENTES_EDIT_ALOJAMENTO",
    "CONFLITOS_EXTERNOS_VIEW",
    "CONFLITOS_EXTERNOS_MANAGE",
    "JUSTIFICATIVAS_ALGEMA_VIEW",
  ],
  OPERADOR: [
    "FULL_ACCESS",
    "ADOLESCENTES_CREATE",
    "ESTRUTURA_EDIT",
    "ADOLESCENTES_EDIT_ALOJAMENTO",
    "CONFLITOS_EXTERNOS_VIEW",
    "CONFLITOS_EXTERNOS_MANAGE",
    "JUSTIFICATIVAS_ALGEMA_VIEW",
  ],
  CONSULTA: ["READ_ONLY", "CONFLITOS_EXTERNOS_VIEW"],
  TECNICO_REFERENCIA: [],
};

const ensurePapelPermissao = async (papelId: string, permissaoId: string) => {
  const existente = await prisma.papelPermissao.findFirst({
    where: { papelId, permissaoId },
  });
  if (!existente) {
    await prisma.papelPermissao.create({
      data: { papelId, permissaoId },
    });
  }
};

export const ensureAuthDefaults = async () => {
  const papeis = await Promise.all(
    PAPEIS_PADRAO.map((papel) =>
      prisma.papel.upsert({
        where: { nome: papel.nome },
        update: { descricao: papel.descricao },
        create: {
          nome: papel.nome,
          descricao: papel.descricao,
        },
      })
    )
  );

  const permissoes = await Promise.all(
    PERMISSOES_PADRAO.map((permissao) =>
      prisma.permissao.upsert({
        where: { codigo: permissao.codigo },
        update: { descricao: permissao.descricao },
        create: {
          codigo: permissao.codigo,
          descricao: permissao.descricao,
        },
      })
    )
  );

  const papelMap = new Map(papeis.map((papel) => [papel.nome, papel.id]));
  const permissaoMap = new Map(
    permissoes.map((permissao) => [permissao.codigo, permissao.id])
  );

  for (const [papelNome, permissoesCodigos] of Object.entries(
    PAPEL_PERMISSOES
  )) {
    const papelId = papelMap.get(papelNome);
    if (!papelId) {
      continue;
    }
    for (const codigo of permissoesCodigos) {
      const permissaoId = permissaoMap.get(codigo);
      if (!permissaoId) {
        continue;
      }
      await ensurePapelPermissao(papelId, permissaoId);
    }
  }
};
