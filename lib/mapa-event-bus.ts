import { EventEmitter } from "events";

export type MapaEventPayload = {
  tipo: "alocacao" | "desalocacao" | "refresh";
  adolescenteId?: string;
  alojamentoId?: string | null;
  timestamp?: string;
};

const mapaEventBus = new EventEmitter();

// Evitar warning de listeners quando muitos clientes estiverem conectados
mapaEventBus.setMaxListeners(100);

export const MAPA_EVENT = "mapa_update";

export function emitMapaEvent(payload: MapaEventPayload) {
  mapaEventBus.emit(MAPA_EVENT, {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  });
}

export default mapaEventBus;
