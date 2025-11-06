import { describe, it, expect } from "vitest";
import {
  calcularRiscoEvento,
  ParticipanteEvento,
} from "@/lib/eventos/calc-risco-evento";

const buildMap = (participantes: ParticipanteEvento[]) =>
  new Map(participantes.map((participante) => [participante.id, participante]));

const participanteBase = (
  overrides: Partial<ParticipanteEvento>
): ParticipanteEvento => ({
  id: "default",
  nome: "Participante Default",
  grupoId: "grupo-1",
  grupoNome: "Grupo 1",
  casaId: "casa-1",
  casaNome: "Casa 1",
  alertaPerfilMapeado: false,
  alertaRiscoSuicidio: false,
  alertaSaudeConfidencial: false,
  conflitos: [],
  ...overrides,
});

describe("calcularRiscoEvento", () => {
  it("retorna nivel baixo quando nao ha conflitos", () => {
    const participantes = buildMap([
      participanteBase({ id: "a", nome: "Adolescente A" }),
      participanteBase({ id: "b", nome: "Adolescente B" }),
    ]);

    const resultado = calcularRiscoEvento(participantes);

    expect(resultado.score_risco_combinado).toBe(0);
    expect(resultado.nivel).toBe("BAIXO");
    expect(resultado.participantes_avaliados).toBe(2);
    expect(resultado.conflitos_detalhados).toHaveLength(0);
    expect(resultado.recomendacoes).toContain(
      "Manter vigilancia padrao com equipe completa e monitoramento constante."
    );
  });

  it("considera conflitos criticos na mesma ala ou grupo", () => {
    const participantes = buildMap([
      participanteBase({
        id: "a",
        nome: "Adolescente A",
        conflitos: [
          {
            id: "conf-1",
            tipo: "Conflito interno",
            outroId: "b",
            outroNome: "Adolescente B",
          },
        ],
      }),
      participanteBase({
        id: "b",
        nome: "Adolescente B",
      }),
    ]);

    const resultado = calcularRiscoEvento(participantes);

    expect(resultado.score_risco_combinado).toBeGreaterThan(0);
    expect(resultado.conflitos_detalhados).toHaveLength(1);
    expect(resultado.conflitos_detalhados[0].nivel).toBe("CRITICO");
    expect(resultado.nivel).toBe("ALTO");
  });

  it("inclui recomendacoes adicionais para alertas de risco", () => {
    const participantes = buildMap([
      participanteBase({
        id: "a",
        nome: "Adolescente A",
        alertaRiscoSuicidio: true,
        conflitos: [
          {
            id: "conf-1",
            tipo: "Faccoes rivais",
            outroId: "b",
            outroNome: "Adolescente B",
          },
        ],
      }),
      participanteBase({
        id: "b",
        nome: "Adolescente B",
        alertaPerfilMapeado: true,
        alertaSaudeConfidencial: true,
      }),
    ]);

    const resultado = calcularRiscoEvento(participantes);

    expect(resultado.recomendacoes).toContain(
      "Garantir acompanhamento especializado para participantes com alerta de risco de suicidio."
    );
    expect(resultado.recomendacoes).toContain(
      "Designar monitoramento dedicado para participantes com alerta de perfil mapeado."
    );
    expect(resultado.recomendacoes).toContain(
      "Notificar equipe de saude para acompanhar participantes com alerta confidencial."
    );
  });
});

