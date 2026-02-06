import type {
  AdolescenteRisco,
  ConflitosExternosMapa,
} from "@/lib/riscos/calcular";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import type {
  BairroConflitoInfo,
  FaccaoConflitoInfo,
} from "@/lib/conflitos";
import { extrairNivelRiscoSuicidio } from "@/lib/alertas/especiais";

type PrismaAdolescente = any;

const adversarioAtivo = (
  conflito: any,
  adversarioCampo: "A" | "B"
): boolean => {
  const adversario =
    adversarioCampo === "B"
      ? conflito.adolescenteB
      : conflito.adolescenteA;
  return adversario?.statusUnidade === "ATIVO";
};

export const mapearConflitosInternos = (
  adolescente: PrismaAdolescente,
  adversarioCampo: "A" | "B"
) => {
  const lista =
    adversarioCampo === "B"
      ? adolescente.conflitosA ?? []
      : adolescente.conflitosB ?? [];

  return lista
    .filter((conflito: any) => adversarioAtivo(conflito, adversarioCampo))
    .map((conflito: any) => {
      const adversario =
        adversarioCampo === "B"
          ? conflito.adolescenteB
          : conflito.adolescenteA;

      return {
        id: conflito.id,
        status: conflito.status,
        tipoConflito: conflito.tipoConflito,
        criadoEm: conflito.criadoEm ?? null,
        adolescenteAId: conflito.adolescenteAId,
        adolescenteBId: conflito.adolescenteBId,
        adversario: adversario
          ? {
              id: adversario.id,
              nomeCompleto: adversario.nomeCompleto,
              bairroOrigemId: adversario.bairroOrigemId,
              faccaoGrupoId: adversario.faccaoGrupoId,
              faccao: adversario.faccao
                ? {
                    id: adversario.faccao.id,
                    nome:
                      adversario.faccao.nomeFaccao ??
                      adversario.faccao.nome ??
                      undefined,
                  }
                : null,
            }
          : null,
      };
    });
};

export const mapearAdolescenteParaRisco = (
  adolescente: PrismaAdolescente
): AdolescenteRisco => ({
  id: adolescente.id,
  nomeCompleto: adolescente.nomeCompleto,
  bairroOrigemId: adolescente.bairroOrigemId,
  faccaoGrupoId: adolescente.faccaoGrupoId,
  alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
  alertaRiscoSuicidioNivel:
    adolescente.alertaRiscoSuicidioNivel ??
    extrairNivelRiscoSuicidio(
      (adolescente as any).alertasAtivos ?? adolescente.alertasEspeciais
    ),
  alertaPerfilMapeado: adolescente.alertaPerfilMapeado,
  alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial,
  alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes,
  alertasAtivos: (adolescente.alertasAtivos ?? []).map((a: any) => ({
    id: a.id,
    tipoAlerta: a.tipoAlerta,
    nivelRisco: a.nivelRisco,
    criadoEm: a.criadoEm ?? null,
  })),
  atoInfracionalVinculos:
    (adolescente.atoInfracionalVinculos ?? [])
      .map((item: any) => {
        const vinculo = item?.vinculo ?? item;
        const id = vinculo?.id ?? item?.vinculoId ?? item?.id;
        if (!id) return null;
        return {
          id,
          descricao: vinculo?.descricao ?? null,
        };
      })
      .filter(Boolean) ?? [],
  faccao: adolescente.faccao
    ? {
        id: adolescente.faccao.id,
        nome:
          adolescente.faccao.nomeFaccao ??
          adolescente.faccao.nome ??
          undefined,
      }
    : null,
  conflitosA: mapearConflitosInternos(adolescente, "B"),
  conflitosB: mapearConflitosInternos(adolescente, "A"),
});

export const formatarImpactosExternos = (
  adolescente: PrismaAdolescente,
  bairros: Map<string, BairroConflitoInfo>,
  faccoes: Map<string, FaccaoConflitoInfo>
): ConflitosExternosMapa => {
  const impactos: ImpactoConflitoExterno[] = [];

  const temFaccao = !!(adolescente.faccaoGrupoId || adolescente.faccao?.id);

  if (!temFaccao) {
    bairros.forEach((info) => {
      impactos.push({
        conflitoId: info.id,
        conflitoTipo: "BAIRRO",
        statusConflito: info.status,
        risco: "MEDIO",
        conflitoOrigem: {
          id: info.origem.id,
          nome: info.origem.nome,
        },
        conflitoDestino: {
          id: info.destino.id,
          nome: info.destino.nome,
        },
        adolescente: {
          id: adolescente.id,
          nome: adolescente.nomeCompleto,
          status: adolescente.statusUnidade,
          numeroSms: adolescente.numeroSms,
          bairro: adolescente.bairroOrigem
            ? {
                id: adolescente.bairroOrigem.id,
                nome:
                  adolescente.bairroOrigem.nomeBairro ??
                  adolescente.bairroOrigem.nome,
                cidade: adolescente.bairroOrigem.cidade ?? "Desconhecida",
              }
            : null,
          faccao: null,
          alojamento: null,
        },
      });
    });
  }

  faccoes.forEach((info) => {
    impactos.push({
      conflitoId: info.id,
      conflitoTipo: "FACCAO",
      statusConflito: info.status,
      risco: "ALTO",
      conflitoOrigem: {
        id: info.origem.id,
        nome: info.origem.nome,
      },
      conflitoDestino: {
        id: info.destino.id,
        nome: info.destino.nome,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        status: adolescente.statusUnidade,
        numeroSms: adolescente.numeroSms,
        bairro: null,
        faccao: adolescente.faccao
          ? {
              id: adolescente.faccao.id,
              nome:
                adolescente.faccao.nomeFaccao ??
                adolescente.faccao.nome ??
                undefined,
            }
          : null,
        alojamento: null,
      },
    });
  });

  if (impactos.length === 0) {
    return {};
  }

  return { [adolescente.id]: impactos };
};
