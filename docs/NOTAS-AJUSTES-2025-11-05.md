# Notas de Ajustes - 05/11/2025

Autor: Codex (assistente)  
Contexto: ajustes em andamento no backend e no frontend para consolidar regras de risco, auditoria e autenticacao.

---

## Resumo rapido
- Frontend (mapa, estrutura e cadastro) passou a consumir diretamente a cor calculada pelo backend e exige operador autenticado antes de enviar acoes.
- Rotas de adolescentes e grupos resgatam o operador via `auth()` e registram logs de auditoria completos.
- Processo de alocacao POST refaz chamada interna para `/api/verificar-alocacao`, valida operador autenticado existente e so registra decisao/log com ID confirmado.
- Processo de desalocacao DELETE valida que o operador autenticado existe e registra sempre o log de auditoria com motivo opcional.
- Criada a rota `/api/eventos-especiais/[id]/verificar-conflitos` com analise de risco consolidada e auditoria.
- Suite de testes automatizados inicial usando Vitest cobrindo alocacao, verificacao de eventos e calculo de risco.
- `/api/auth/login` (PUT) bloqueia criacao de operadores para quem nao for ADMIN e audita tentativas negadas.- Streaming SSE via `/api/mapa/events` dispara atualizacoes automaticas do mapa/estrutura apos alocacoes.
- Painel de analytics ganhou `/api/analytics/ocupacao`, `/api/analytics/alertas` e `/api/analytics/conflitos`, todos com validacoes e testes unitarios.
- Backend de visitantes implementado com CRUD, vinculo/autorizacao de adolescentes e registro de visitas (entrada/saida) auditado.


---

## Backend

### `/api/casas/status/route.ts`
- Consolida rivais ativos em `Set` para evitar duplicidade de conflito.
- Hierarquia de cor/nivel: interditado > risco frontal > zona de risco (janelas) > conflito simples > seguro.
- Mantem alertas especiais como `risco_suicidio`, `perfil_mapeado` e `saude_confidencial`.

### `/api/alocar/route.ts`
- **POST**: reaproveita cookies na verificacao, obriga operador autenticado, valida existencia do operador no banco e so entao grava decisao/log.
- **DELETE**: converte ids vindo de query/body, obriga operador autenticado, valida operador existente, confere `adolescenteId` e `alojamentoAtualId`, registra log de remocao em transacao unica e devolve resposta padronizada.

### `/api/alojamentos/route.ts`
- POST e PATCH exigem sessao autentica via `auth()`, confirmam a existencia do operador no banco e registram auditoria usando o operador real e o IP de origem.

### `/api/conflitos/route.ts`, `/api/conflitos/[id]/mediacoes/route.ts` e `/api/conflitos/[id]/resolver/route.ts`
- Mutacoes exigem `auth()`, validam operador existente no Prisma e registram auditoria usando o ID autenticado; os corpos nao aceitam mais `operadorId`.

### `/api/log-auditoria/route.ts` e `/api/decisoes-operacionais/route.ts`
- Listagem so responde para ADMIN autenticado (valida `auth()` e funcao no banco) antes de aplicar filtros/paginacao.

### `/api/grupos/route.ts`
- POST exige sessao autenticada via `auth()`, valida o operador no Prisma antes de criar o grupo e grava auditoria com IP de origem.

### `/api/grupos/[id]/adicionar-membro/route.ts`
- Passou a obter o operador via `auth()`, recusa requisicoes sem sessao valida, confirma que o operador existe e utiliza esse ID tanto na decisao operacional quanto no log.

### `lib/adolescentes/transformers.ts`
- Novo helper (`INCLUDE_ADOLESCENTE_DEFAULT` + `mapPrismaAdolescente`) padroniza o include no Prisma, normaliza datas (ISO), valida status/ala e estrutura conflitos com adversario completo.

### `/api/adolescentes/route.ts` e `/api/adolescentes/[id]/route.ts`
- GET lista retorna `{ data, meta }` com paginacao e aplica o mapper compartilhado; POST/PUT exigem operador autenticado existente, registram auditoria com IP e rejeitam requisicoes anonimas.

### `/api/auth/login/route.ts`
- `PUT` exige header `Authorization: Bearer <token>` valido, verifica role `ADMIN` antes de criar operador e grava tentativa negada.

### `/api/eventos-especiais/route.ts`
- GET lista eventos com filtros por status e carregamento opcional de grupos e participantes.
- POST cria evento, associa grupos/participantes e executa analise preventiva reutilizando `calcularRiscoEvento`, auditando a operacao.

### `/api/eventos-especiais/[id]/verificar-conflitos/route.ts`
- Recebe override opcional de grupos/participantes, valida id do evento e sessao.
- Calcula riscos com base no contexto real (grupos e adolescentes ativos), registra auditoria `EVENTO_VERIFICAR_RISCO` e retorna score consolidado.

### `/api/faccoes/route.ts`
- **GET** permite filtro textual (`busca`) e opcao `incluirTotal` para informar a contagem de adolescentes vinculados.
- **POST** exige operador autenticado, valida unicidade de nome e registra auditoria `FACCAO_CRIAR`.

### `/api/faccoes/[id]/route.ts`
- **GET** retorna resumo e, quando solicitado, lista adolescentes com alojamento atual.
- **PUT** verifica conflito de nome, aplica atualizacoes parciais e registra `FACCAO_ATUALIZAR`.
- **DELETE** bloqueia exclusao quando ha adolescentes vinculados e registra `FACCAO_REMOVER`.

### `/api/bairros/route.ts`
- **GET** aceita filtros `busca`, `cidade` e opcao `incluirTotal` para trazer contagem de adolescentes vinculados.
- **POST** exige operador autenticado, valida combinacao unica (nome + cidade) e registra auditoria `BAIRRO_CRIAR`.

### `/api/bairros/[id]/route.ts`
- **GET** retorna resumo do bairro, total de adolescentes, conflitos cadastrados e pode incluir detalhes de cada adolescente.
- **PUT** valida combinacao unica ao alterar nome/cidade e registra `BAIRRO_ATUALIZAR`.
- **DELETE** impede remocao com adolescentes ou conflitos vinculados e registra `BAIRRO_REMOVER`.

### `/api/tatuagens/route.ts`
- **GET** filtra por `busca`, `nivelRisco` e pode trazer contagem de uso (`incluirTotal`).
- **POST** exige autenticacao, confirma unicidade do simbolo e registra `TATUAGEM_CRIAR`.

### `/api/mapa/events/route.ts`
- Implementado stream SSE para notificar o front sobre alocacoes/desalocacoes em tempo real.
- Mantem conexoes com keep-alive e reconexao simples no client.

### `lib/mapa-event-bus.ts`
- EventEmitter compartilhado para emitir eventos `mapa_update` consumidos pelas rotas SSE e de alocacao.

### `/api/tatuagens/[id]/route.ts`
- **GET** retorna detalhes completos e, quando solicitado, lista adolescentes que possuem a tatuagem com alojamento/local registrados.
- **PUT** valida conflito de nome, permite atualizar significado e nivel de risco, auditando `TATUAGEM_ATUALIZAR`.
- **DELETE** bloqueia remocao com vinculos ativos e registra `TATUAGEM_REMOVER`.

### Auditoria geral
- `POST /api/adolescentes`, `PUT /api/adolescentes/[id]`, `POST /api/grupos` e `DELETE /api/grupos/[id]/membros/[membroId]` ja amarram operador autenticado ao log.

### `/api/analytics/alertas/route.ts`
- Usa o helper `ensureOperador` para validar sessao e operador antes de qualquer consulta.
- Agrupa alertas ativos por nivel (normalizando strings) e por tipo, calcula percentuais relativos e devolve contadores de novos/encerrados em janelas de 7/30 dias.
- Lista os 10 alertas mais recentes com dados do adolescente e do alojamento associado.

### `/api/analytics/conflitos/route.ts`
- Consolida estatisticas de conflitos (total, ativos, resolvidos, tempo medio em dias) e ordena tipos conforme volume/ativos.
- Gera ranking dos cinco participantes mais recorrentes com ultima ocorrencia conhecida.
- Inclui feed resumido dos cinco conflitos mais recentes com duracao em dias e participantes nomeados.

### `lib/auth/ensure-operador.ts`
- Helper padrao que reaproveita `auth()`, confirma existencia do operador no Prisma e devolve IP (`x-forwarded-for`), retornando JSON padrao para 401/403.
- Evita duplicacao de codigo nas novas rotas de analytics e visitantes.

### `/api/visitantes/route.ts`
- GET exige operador autenticado, aceita filtros (`busca`, `adolescente_id`, `autorizado`) e parametros `detalhes`, `incluir_visitas` e `limite`.
- POST valida com Zod, normaliza CPF/telefones, garante existencia dos adolescentes vinculados e audita com `VISITANTE_CRIAR`.

### `/api/visitantes/[id]/route.ts`
- GET retorna detalhe completo: contadores, vinculos com dados do adolescente e ultimas visitas.
- PUT aceita atualizacoes parciais, sincroniza vinculos (cria/atualiza/remove) dentro de transacao, valida adolescentes informados e grava `VISITANTE_ATUALIZAR`.
- DELETE bloqueia remocao quando ha visitas em aberto, apaga vinculos/visitas anteriores em transacao e audita com `VISITANTE_REMOVER`.

### `/api/visitantes/[id]/visitas/route.ts`
- GET lista visitas por status (todas/abertas/encerradas) com limite configuravel e inclui dados do adolescente.
- POST registra entrada somente quando o vinculo esta autorizado e nao existe visita em aberto, grava operador no registro e audita `VISITA_REGISTRAR_ENTRADA`.

### `/api/visitantes/[id]/visitas/[visitaId]/route.ts`
- PATCH encerra visitas abertas atribuindo `dataHoraSaida` (padrao `now()`), impede encerramento duplicado e registra auditoria `VISITA_REGISTRAR_SAIDA`.

---


### `/api/adolescentes/[id]/route.ts`
- PUT agora detecta mudan�as de status: remove o alojamento ao sair de ATIVO, envia o ato infracional atual para `adolescentes_historico_infracional`, limpa os campos correntes e registra auditoria na mesma transa��o.
- Ao retornar de EVADIDO/TRANSFERIDO para ATIVO (sem novo ato informado), o backend restaura automaticamente o �ltimo ato registrado no hist�rico; retornos a partir de LIBERADO n�o s�o restaurados.
- O payload do adolescente passa a incluir `historicoInfracional`, permitindo que o dossi� apresente cada ato armazenado.

### `/api/justificativas-algema/analise-risco/route.ts`
- Reescrita completa (UTF-8) com helpers para formatar bairros, CIs e participantes, evitando caracteres corrompidos.
- Passou a aceitar `bairroDestinoId` e `destinoDescricao`, consultar conflitos territoriais e expor `contextoMovimentacao` (origem, destino, descri??o e conflito) no payload.
- Fundamenta??o autom?tica agora cita atos infracionais (ano/processo), CIs e alertas ativos, tatuagens catalogadas, v?nculos faccionais e riscos previstos na S?mula Vinculante n? 11.
- A fundamenta??o tamb?m passa a listar, quando a classifica??o alcan?a pelo menos n?vel M?DIO, as pontua??es de fuga/agress?o/autoles?o (escala 0-100) e um resumo dos fatores somados em cada c?lculo.
- PDF ajustado: pontua??o centralizada com explica??o clara da escala, cabe?alho de fatores sem espa?amento entre letras e campos opcionais omitidos quando n?o existem (ex.: Nome Social).
- Nova rota DELETE /api/justificativas-algema/[id] permite ao operador autenticado remover justificativas (com auditoria e IP registrado).
- Pontua??o considera protocolos de suic?dio e conflitos territoriais e adiciona recomenda??es espec?ficas (refor?o de rota, acionamento da intelig?ncia territorial, etc.).
- A fundamenta??o tamb?m passa a listar, quando a classifica??o alcan?a pelo menos n?vel M?DIO, as pontua??es de fuga/agress?o/autoles?o (escala 0-100) e um resumo dos fatores somados em cada c?lculo.
- PDF ajustado: pontua??o centralizada com explica??o clara da escala, cabe?alho de fatores sem espa?amento entre letras e campos opcionais omitidos quando n?o existem (ex.: Nome Social).
- Corrigido `GET /api/justificativas-algema/[id]/pdf` para aguardar `params` (Next.js 16) e validar o ID antes de consultar o Prisma, evitando `id undefined` no PDF.

## Frontend
- Páginas de mapa e estrutura assinam `/api/mapa/events` e recarregam dados automaticamente após alocações/desalocações.
- `app/(dashboard)/mapa`, `app/(dashboard)/estrutura/visao-geral-tab`, `app/(dashboard)/estrutura/mapa-operacional-tab` e `components/mapa/mapa-interativo` exibem cor e nivel de risco fornecidos pelo backend.
- `components/conflitos/detalhes-conflito.tsx` tolera `mediacoes = null` e evita `TypeError`.
- `components/cadastro/cadastro-adolescente.tsx` carrega faccoes, bairros e tatuagens diretamente das APIs e desabilita interacoes quando ha erro ou carregamento.
- `app/(dashboard)/adolescentes` consulta `/api/adolescentes`, remove mocks e apresenta estados de erro/carregamento com opcao de recarregar.
- `components/adolescentes/listagem-adolescentes.tsx` usa o novo payload `{ data, meta }`, exibe alojamento real (nome, numero, ala) e adiciona filtros/paginacao alinhados ao backend.
- `components/adolescentes/dossie-adolescente.tsx` consome integralmente as informacoes do backend (alojamento, faccao, bairro, tatuagens, conflitos) e abandona dados ficticios.
- `app/(dashboard)/justificativas-algema/nova/page.tsx` consome a nova an?lise (bairro monitorado + bot?o "Atualizar an?lise") e exibe o painel territorial retornado pelo backend, mantendo a UI existente.

---

## Testes automatizados
- Adicionado `vitest` como runner padrao (`npm run test`).
- Suite `tests/lib/calc-risco-evento.test.ts` cobre pesos e recomendacoes do helper `calcularRiscoEvento`.
- Suite `tests/api/alocar.test.ts` garante respostas HTTP corretas para cenarios de autenticacao e valida operador inexistente.
- Suite `tests/api/eventos-especiais-verificar.test.ts` valida fluxos de erro/sucesso da rota de verificacao.
- Suite `tests/api/faccoes.test.ts` cobre cenarios principais de CRUD (listar, criar, atualizar e excluir) com auditoria mockada.
- Suite `tests/api/bairros.test.ts` valida os fluxos de CRUD de bairros incluindo bloqueios por vinculos e auditoria.
- Suite `tests/api/tatuagens.test.ts` garante comportamentos de CRUD, conflitos de nome e bloqueios por vinculos.
- Suite `tests/api/analytics-alertas.test.ts` cobre agregacoes, percentuais e cenarios de erro da rota de alertas.
- Suite `tests/api/analytics-conflitos.test.ts` valida consolidados, rankings e erros da rota de conflitos.
- Suites `tests/api/visitantes.test.ts` e `tests/api/visitantes-visitas.test.ts` garantem CRUD de visitantes, sincronizacao de vinculos e fluxo de visitas (entrada/saida) com auditoria.
- Todos os testes executados com sucesso via `npx vitest run`.

---

## Observacoes
- Expandir cobertura de testes para cenarios felizes de alocacao/desalocacao e validacoes de justificativa.
- Validar `npm run build` apos concluir demais pendencias do backend.
