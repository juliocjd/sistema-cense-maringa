# Backlog Prioritário de Funcionalidades

Atualizado em **05/11/2025**. As entregas pendentes estão ordenadas por prioridade operacional. Cada item relaciona objetivos e próximos passos para facilitar o kick-off imediato.

| Prioridade | Funcionalidade                      | Objetivo resumido                                                | Próximos passos imediatos |
|-----------:|-------------------------------------|------------------------------------------------------------------|---------------------------|
| **P0**     | Testes automatizados complementares | Cobrir fluxos felizes e cenários críticos nas rotas de alocação, grupos, bairros, facções, tatuagens e eventos. | 1. Expandir suites Vitest existentes.<br>2. Criar fixtures/mocks reutilizáveis.<br>3. `prebuild` já roda `vitest run`; monitorar tempo no CI. |
| **P1**     | Relatórios e analytics              | Disponibilizar métricas operacionais (ocupação, alertas, histórico de conflitos). | 1. Definir KPIs prioritários com stakeholders.<br>2. Projetar endpoints agregadores (`/api/analytics/...`).<br>3. Planejar visualizações ou exportações (CSV/PDF). |
| **P1**     | Regioes/faccoes conflituosas e tecnicos | Mapear territorios criticos e tecnicos de referencia para alertas operacionais. | 1. Consolidar o painel `/inteligencia/conflitos` com formularios completos de bairros/faccoes e relatorio de impacto.<br>2. Ligar os alertas preventivos ao mapa/estrutura e validar SSE apos cada atualizacao.<br>3. Finalizar o ciclo de notificacao (manual no painel interno e relatorios para inteligencia). |
| **P1**     | Sistema de visitantes               | Registrar visitantes autorizados, histórico de entrada/saída e vínculos com adolescentes. | 1. Modelar rotas CRUD (`/api/visitantes`, `/api/visitantes/{id}/visitas`).<br>2. Implementar regras de autorização/auditoria.<br>3. Criar telas de cadastro/listagem. |
- **Novidades 08/11:** o cadastro de conflitos aceita multiplos envolvidos (gerando pares automaticamente) e o detalhe possui o botao "Notificar tecnicos", reutilizando a mesma rota do painel preventivo.
| **P1**     | Fluxo de transferências judiciais   | Controlar solicitações, aprovações e histórico de transferências entre unidades. | 1. Validar estados de fluxo (`AGUARDANDO`, `APROVADA`, `NEGADA`, `TRANSFERIDA`).<br>2. Consolidar endpoints (`POST /api/transferencias`, `PATCH /api/transferencias/{id}`, `GET /api/transferencias`).<br>3. Registrar decisões/anexos em auditoria. |
| **P2**     | SSE do mapa operacional             | Garantir atualização em tempo real sem erros de keep-alive no mapa/estrutura. | 1. Tratar fechamento do controller e limpar timers.<br>2. Cobrir reconexão automática no front.<br>3. Adicionar testes manuais e documentação de fallback. |

---

## Detalhes dos itens

### 1. Testes automatizados complementares (P0)
- **Status atual:** suites iniciais (alocação, eventos, transferências) cobrem apenas parte dos cenários.
- **Cobertura esperada:** alocação (justificativa obrigatória, alojamento interditado), CRUD de grupos/bairros/facções/tatuagens, eventos especiais (criar + verificar conflitos) e analytics.
- **Meta:** execução obrigatória de `npx vitest run` em toda PR crítica e build diário.

### 2. Relatórios e analytics (P1)
- **Status atual:** endpoint de ocupação entregue; alertas e conflitos em andamento.
- **Fontes disponíveis:** `DecisaoOperacional`, `LogAuditoria`, `Alojamento`, `Adolescente`, `SolicitacaoTransferencia`.
- **Entrega mínima:** endpoints consolidados para ocupação, alertas e conflitos + painel com tabela/exportação CSV.

### 2.1 Conflitos internos vs inteligência preventiva (P1)
- **Status atual:** o `/conflitos` agora retorna ao cenário original (registro de incidentes entre adolescentes internados) e inclui formulário para documentar novos casos e monitorar mediações, enquanto `/inteligencia/conflitos` é a vitrine das tensões territoriais/faccionais e da inteligência preventiva.
- **Novidades 08/11:** o cadastro permite selecionar varios envolvidos (gerando um grupo unico) e o detalhe traz o botao manual "Notificar tecnicos" usando a mesma rota da inteligencia preventiva.
- **Atualização 09/11:** o painel `/inteligencia/conflitos` foi renomeado para **Conflitos Externos**, replica o layout da listagem interna, traz formulários completos de bairros/facções (com edição/remoção guiada), botão único para registrar conflitos externos e um relatório exportável (CSV) construído sobre o novo endpoint `GET /api/inteligencia/conflitos/impacto`.
- **Integração:** `lib/conflitos.ts` alimenta o painel preventivo, `lib/notificacoes/tecnico.ts` inclui nível de risco/link e `POST /api/conflitos/[id]/notificar` dispara alertas para os tecnicos correspondentes sempre que um conflito crítico é listado.
- **QA:** siga o checklist em `docs/QA-PAINEL-CONFLITOS.md` para validar ambos os caminhos (cadastro interno e painel de inteligência) e o comportamento do sidebar/scroll.
- **Próximos passos:** manter o foco em usar o painel preventivo para decisões de alocação e continuar enriquecendo as telas com filtros/links para o histórico de conflitos e decisões judiciais.

### 3. Sistema de visitantes (P1)
- **Status atual:** modelos Prisma disponíveis; backend iniciou com rotas básicas, faltam ajustes e cobertura de testes.
- **Escopo:** cadastro de visitantes, autorização por adolescente, registro de visitas e auditoria.
- **Front:** telas de listagem, concessão/revogação e filtros por data/adolescente.

### 4. Fluxo de transferências judiciais (P1)
- **Status atual:** rotas `POST`, `GET`, `PATCH` funcionais com testes; falta UI, anexos e integração com relatórios.
- **Próximos passos técnicos:** expor histórico consolidado, validar anexos, ajustar seed para testes e conectar com painel analítico.
- **Integração:** aproveitar logs e decisões operacionais para manter rastreabilidade.

### 5. SSE do mapa operacional (P2)
- **Status atual:** SSE implementado, mas há exceção “Controller is already closed” durante o keep-alive.
- **Ações sugeridas:** revisar cleanup no endpoint `/api/mapa/events`, adicionar debounce de re-subscribe no front e documentar fallback manual.

---

> **Revisão contínua:** Atualizar este backlog a cada sprint ou release para refletir novos avanços, repriorizações ou descobertas de riscos.







