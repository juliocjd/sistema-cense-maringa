import { describe, it, expect } from "vitest";
import { mapearAlertasEspeciaisDoPayload } from "@/lib/alertas/sincronizar-especiais";

describe("mapearAlertasEspeciaisDoPayload", () => {
  it("mantem o nivel de risco informado no payload", () => {
    const resultado = mapearAlertasEspeciaisDoPayload(
      [
        {
          tipo: "RISCO_SUICIDIO",
          descricao: "observacao manual",
          nivelRisco: "BAIXO",
        },
      ],
      {}
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      tipo: "RISCO_SUICIDIO",
      nivelRisco: "BAIXO",
    });
  });

  it("propaga nivel de risco vindo do fallback", () => {
    const resultado = mapearAlertasEspeciaisDoPayload(undefined, {
      riscoSuicidio: {
        ativo: true,
        descricao: "registro antigo",
        nivelRisco: "MEDIO",
      },
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      tipo: "RISCO_SUICIDIO",
      descricao: "registro antigo",
      nivelRisco: "MEDIO",
    });
  });
});
