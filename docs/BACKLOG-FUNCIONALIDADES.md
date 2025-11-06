# Backlog Prioritário de Funcionalidades

Atualizado em **05/11/2025**. As entregas pendentes estão ordenadas por prioridade operacional. Cada item traz objetivos e próximos passos recomendados para dar start imediato.

| Prioridade | Funcionalidade                      | Objetivo resumido                                                | Próximos passos imediatos |
|-----------:|-------------------------------------|------------------------------------------------------------------|---------------------------|
| **P0**     | Testes automatizados complementares | Cobrir fluxos felizes e cenários críticos nas rotas de alocação, grupos, bairros, facções, tatuagens e eventos. | 1. Expandir suites Vitest existentes.<br>2. Criar fixtures/mocks reutilizáveis.<br>3. Integrar `npx vitest run` à pipeline. |
| **P1**     | Relatórios e analytics              | Disponibilizar métricas operacionais (ocupação, alertas, histórico de conflitos). | 1. Definir KPIs prioritários com stakeholders.<br>2. Projetar endpoints agregadores (`/api/analytics/...`).<br>3. Planejar visualizações ou exportações (CSV/PDF). |
| **P1**     | Sistema de visitantes               | Registrar visitantes autorizados, histórico de entrada/saída e vínculos com adolescentes. | 1. Modelar rotas CRUD (`/api/visitantes`, `/api/visitantes/{id}/visitas`).<br>2. Implementar regras de autorização/auditoria.<br>3. Criar telas de cadastro/listagem. |
| **P1**     | Fluxo de transferências judiciais   | Controlar solicitações, aprovações e histórico de transferências entre unidades. | 1. Validar estados de fluxo (`AGUARDANDO`, `APROVADA`, `NEGADA` etc.).<br>2. Implementar rotas (`POST /api/transferencias`, `PATCH /api/transferencias/{id}`).<br>3. Registrar decisões/anexos em auditoria. |

---

## Detalhes dos itens

### 1. Testes automatizados complementares (P0)
- **Status atual:** suites iniciais (alocação, eventos) cobrem apenas parte dos cenários.
- **Cobertura esperada:** alocação (justificativa obrigatória, alojamento interditado), CRUD de grupos/bairros/facções/tatuagens e eventos especiais (criar + verificar com dados reais).
- **Meta:** execução obrigatória de `npx vitest run` em toda PR crítica.

### 2. Relatórios e analytics (P1)
- **Status atual:** nenhum endpoint ou UI para métricas.
- **Fontes disponíveis:** `DecisaoOperacional`, `LogAuditoria`, `Alojamento`, `Adolescente`.
- **Entrega mínima:** endpoint de ocupação por casa e painel com tabela/CSV.

### 3. Sistema de visitantes (P1)
- **Status atual:** apenas modelos Prisma (`Visitante`, `AdolescenteVisitanteLink`, `VisitaRegistro`).
- **Escopo:** cadastro de visitantes, autorização por adolescente, registro de visitas e auditoria.
- **Front:** telas de listagem, concessão/revogação e histórico com filtros por data/adolescente.

### 4. Fluxo de transferências judiciais (P1)
- **Status atual:** modelos `SolicitacaoTransferencia` e `HistoricoTransferencia` sem API/UI.
- **Processo esperado:** criação da solicitação, anexos, análise, decisão e registro histórico.
- **Integração:** aproveitar logs e decisões operacionais para manter rastreabilidade.

---

_Revisar este backlog a cada sprint ou release para refletir avanços e reavaliar prioridades._
