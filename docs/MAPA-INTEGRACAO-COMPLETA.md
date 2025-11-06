# Mapa Operacional – Integração em Tempo Real  
**Data:** 05/11/2025  
**Status:** ✅ Em produção com atualização automática

---

## Panorama
- As páginas `/mapa` e `/estrutura` agora se mantêm sincronizadas com o backend via Server-Sent Events (SSE).  
- Novo endpoint: `GET /api/mapa/events` emite eventos `alocacao`, `desalocacao` e `refresh`.  
- As rotas `/api/alocar` (POST/DELETE) dispararam eventos após cada operação; as UIs consomem o stream e executam `carregarDados()` automaticamente.

---

## Como funciona
1. **Assinatura:**  
   Cada página cliente abre um `EventSource("/api/mapa/events")`.  
   O backend envia `data: {...}\n\n` para cada mudança relevante.

2. **Eventos emitidos:**  
   ```jsonc
   { "tipo": "alocacao", "adolescenteId": "uuid", "alojamentoId": "uuid" }
   { "tipo": "desalocacao", "adolescenteId": "uuid", "alojamentoId": null }
   { "tipo": "refresh" } // reservado para futuras integrações
   ```

3. **Tratamento no front:**  
   - `/mapa`: `useEffect` reconecta automaticamente em caso de erro e chama `carregarDados()` sempre que recebe eventos relevantes.  
   - `/estrutura` (Visão Geral + Mapa Operacional): lógica idêntica, evitando dados obsoletos ao alternar abas ou após ações de outros usuários.

4. **Fallback:**  
   - O stream envia comentários `: keep-alive` a cada 20 s para manter conexões.  
   - Em caso de falha, o cliente tenta reconectar em 5 s.  
   - Usuário continua podendo acionar `Tentar novamente` manualmente se desejar.

---

## Checklist do frontend
- [x] Remover recarregamento manual (`window.location.reload`).  
- [x] Substituir `carregarDados` por `useCallback` e reusar nas reconexões.  
- [x] Lidar com reconexões automáticas.  
- [x] Garantir que `carregarDados` ainda é chamado no `useEffect` inicial para estado fresco.

---

## Próximos ajustes sugeridos
1. Exibir indicador visual quando novas alterações chegarem (ex.: toast discreto ou highlight temporário).  
2. Avaliar compressão/batching caso o volume de eventos aumente (ex.: intervalos com múltiplas alocações).  
3. Documentar o fluxo de SSE no README de integração do mapa e na wiki técnica do time.

---

_Documento revisado em 05/11/2025._ 
