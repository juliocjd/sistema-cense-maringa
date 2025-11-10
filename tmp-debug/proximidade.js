"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classificarProximidade = void 0;
const JANELAS_CONFIG = [
    {
        casaA: 2,
        alaA: "B",
        alojamentosA: ["08", "09"],
        casaB: 3,
        alaB: "A",
        alojamentosB: ["01", "02", "03"],
    },
    {
        casaA: 4,
        alaA: "B",
        alojamentosA: ["09", "10"],
        casaB: 5,
        alaB: "A",
        alojamentosB: ["03", "04"],
    },
    {
        casaA: 5,
        alaA: "B",
        alojamentosA: ["09", "10"],
        casaB: 6,
        alaB: "A",
        alojamentosB: ["03", "04"],
    },
    {
        casaA: 6,
        alaA: "B",
        alojamentosA: ["09", "10"],
        casaB: 7,
        alaB: "A",
        alojamentosB: ["03", "04"],
    },
];
const normalizarNumeroCasa = (valor) => {
    if (typeof valor === "number" && !Number.isNaN(valor)) {
        return valor;
    }
    if (typeof valor === "string") {
        const parsed = Number(valor);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return null;
};
const normalizarNumeroAlojamento = (valor) => {
    if (!valor)
        return "";
    const trimmed = valor.trim();
    if (!trimmed)
        return "";
    return trimmed.padStart(2, "0");
};
const normalizarAla = (valor) => {
    if (!valor)
        return "";
    const trimmed = valor.trim().toUpperCase();
    if (!trimmed)
        return "";
    const onlyLetters = trimmed.replace(/[^A-Z]/g, "");
    if (!onlyLetters)
        return "";
    const ultima = onlyLetters.slice(-1);
    if (ultima === "A" || ultima === "B") {
        return ultima;
    }
    return trimmed;
};
const estaEmZonaDeJanela = (origem, destino) => {
    const casaOrigemNumero = normalizarNumeroCasa(origem.casa?.numero);
    const casaDestinoNumero = normalizarNumeroCasa(destino.casa?.numero);
    if (casaOrigemNumero === null || casaDestinoNumero === null) {
        return false;
    }
    const alaOrigem = normalizarAla(origem.alojamento.ala);
    const alaDestino = normalizarAla(destino.alojamento.ala);
    const numeroOrigem = normalizarNumeroAlojamento(origem.alojamento.numeroAlojamento);
    const numeroDestino = normalizarNumeroAlojamento(destino.alojamento.numeroAlojamento);
    return JANELAS_CONFIG.some((config) => {
        const matchDireto = casaOrigemNumero === config.casaA &&
            alaOrigem === config.alaA &&
            config.alojamentosA.includes(numeroOrigem) &&
            casaDestinoNumero === config.casaB &&
            alaDestino === config.alaB &&
            config.alojamentosB.includes(numeroDestino);
        const matchInverso = casaOrigemNumero === config.casaB &&
            alaOrigem === config.alaB &&
            config.alojamentosB.includes(numeroOrigem) &&
            casaDestinoNumero === config.casaA &&
            alaDestino === config.alaA &&
            config.alojamentosA.includes(numeroDestino);
        return matchDireto || matchInverso;
    });
};
const classificarProximidade = (origem, destino) => {
    if (!destino?.alojamento)
        return "FORA";
    const origemFrontal = origem.alojamento.alojamentoFrontalId;
    const destinoFrontal = destino.alojamento.alojamentoFrontalId;
    if ((origemFrontal && destino.alojamento.id === origemFrontal) ||
        (destinoFrontal && origem.alojamento.id === destinoFrontal)) {
        return "FRONTAL";
    }
    const alaOrigem = normalizarAla(origem.alojamento.ala);
    const alaDestino = normalizarAla(destino.alojamento.ala);
    if (origem.alojamento.casaId && destino.alojamento.casaId) {
        if (origem.alojamento.casaId === destino.alojamento.casaId) {
            if (alaOrigem && alaDestino && alaOrigem === alaDestino) {
                return "MESMA_ALA";
            }
            return "MESMA_CASA";
        }
    }
    if (estaEmZonaDeJanela(origem, destino)) {
        return "ZONA_JANELA";
    }
    return "FORA";
};
exports.classificarProximidade = classificarProximidade;
