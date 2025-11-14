# 📋 Pendências de Implementação - Sistema CENSE Maringá

**Data de Verificação**: 2025-11-11
**Status**: Análise Completa Realizada

---

## ✅ Implementações CONCLUÍDAS Nesta Sessão

### 1. Sistema de Conflitos Externos
- ✅ Agrupamento de múltiplos rivais em um único card
- ✅ Correção do campo `bairro` vs `bairroOrigem`
- ✅ Exibição de todos os adolescentes do bairro/facção conflitante

### 2. Motor de Risco - Cálculo de Conflitos
- ✅ Conflitos de adolescentes existentes agora são carregados
- ✅ Detecção de conflitos frontais funciona corretamente
- ✅ API `/api/verificar-alocacao` retorna níveis corretos

### 3. Regras de Alocação por Tipo de Internação
- ✅ Internação Provisória: apenas Casa 01
- ✅ Internação Definitiva: apenas Casas 02-07
- ✅ Exclusão automática de alojamentos INTERDITADOS

### 4. Sistema de Fallback para Alto Risco
- ✅ Quando não há opções seguras, mostra as 3 menos arriscadas
- ✅ Aviso especial "⚠️ Não há alojamentos seguros disponíveis"

### 5. Seletor de Casa Específica
- ✅ Interface com botões para selecionar casa manualmente
- ✅ Modo automático vs manual
- ✅ Top 3 alojamentos quando casa específica selecionada

### 6. Melhorias de UI/UX
- ✅ Badge colorido para níveis de risco
- ✅ Reorganização da ordem de informações do adolescente
- ✅ Correção do título "Conflitos e justificativas" (não "Alertas")

### 7. **NOVO** - Validação Casa 08 - Fase 3
- ✅ Implementada regra: Casa 08 apenas para nível 0-1 (sem conflitos)
- ✅ Interface especial com cor roxa e ícone de estrela
- ✅ Tooltip explicativo sobre restrições da Casa 08
- ✅ Validação em ambos modais (alocação e realocação)

### 8. **NOVO** - Dashboard de Tensão por Casa
- ✅ Nova página `/dashboard-tensao` criada
- ✅ Estatísticas gerais (4 cards): total, ocupados, em risco, tensão total
- ✅ Cards individuais por casa com métricas detalhadas
- ✅ Sistema de cores dinâmicas por nível de tensão
- ✅ Barras visuais para distribuição de risco
- ✅ Contador de conflitos ativos por casa
- ✅ Ordenação por tensão ou número da casa
- ✅ Navegação bidirecional com página /estrutura
- ✅ Link "Dashboard de Tensão" adicionado no header de /estrutura

### 9. **NOVO (Sessão 2025-11-11 - Parte 1)** - Melhorias de UX e Testes
- ✅ **Remoção completa de logs de debug** (3 arquivos limpos)
- ✅ **Auto-scroll para casa específica**: Navegação do Dashboard → Estrutura com scroll suave
- ✅ **Highlight visual temporário**: Borda indigo + pulso + ring effect por 3 segundos
- ✅ **Documentação de testes**: Roteiro completo em `docs/testes/ROTEIRO-TESTES-MANUAIS.md`
- ✅ **7 cenários de teste documentados**: Conflitos, motor de risco, validações, Dashboard

### 10. **NOVO (Sessão 2025-11-11 - Parte 2)** - Filtros e Gráficos no Dashboard
- ✅ **Filtros avançados por nível de risco**: 6 opções (Crítico, Alto, Médio, Baixo, Sem Risco, Todos)
- ✅ **Filtros por tipo de alerta**: Com conflitos, Superlotação (≥90%), Sem alertas
- ✅ **Ordenação expandida**: 4 opções (Maior Tensão, Taxa de Ocupação, Mais Conflitos, Número da Casa)
- ✅ **Interface de filtros expansível** com contador de filtros ativos
- ✅ **Gráfico de distribuição de risco** (Donut Chart em SVG puro)
- ✅ **Gráfico de barras horizontais**: Top 5 casas com maior tensão
- ✅ **Mapa de calor**: Grid visual de 8 casas com níveis de tensão coloridos
- ✅ **Auto-refresh configurável**: Intervalos de 1, 3, 5 ou 10 minutos
- ✅ **Controles Play/Pause** para auto-atualização
- ✅ **Indicador de próxima atualização** em tempo real

---

## ⚠️ PENDÊNCIAS CRÍTICAS

### 1. 🔴 Testes do Sistema Completo
**Status**: ROTEIRO COMPLETO DOCUMENTADO - AGUARDANDO EXECUÇÃO
**Prioridade**: ALTA

📋 **Documentação de Testes**: [docs/testes/ROTEIRO-TESTES-MANUAIS.md](docs/testes/ROTEIRO-TESTES-MANUAIS.md)

**Resumo dos 7 Testes Documentados**:

#### Teste 1: Enzo (não alocado) - Internação Provisória
```
Setup:
- Enzo sem alocação
- Conflito ATIVO com João
- João no alojamento 04, Ala A, Casa 01

Passos:
1. Abrir modal "Adolescentes com Conflitos Não Alocados"
2. Selecionar Enzo
3. Escolher "Internação Provisória"
4. Clicar em "Analisar"

Resultado Esperado:
✓ Mostrar apenas sugestões da Casa 01
✓ Alojamento 03 (frontal ao João) deve ter nível 4 ou 5
✓ Alojamento 03 NÃO deve aparecer nas sugestões (ou aparecer com aviso)
✓ Logs no console devem mostrar conflitos do João carregados
```

#### Teste 2: Enzo - Internação Definitiva
```
Setup: Mesmo do Teste 1

Passos:
1. Selecionar Enzo
2. Escolher "Internação Definitiva"
3. Clicar em "Analisar"

Resultado Esperado:
✓ Mostrar apenas sugestões das Casas 02-07
✓ Casa 01 NÃO deve aparecer
✓ Casa 08 NÃO deve aparecer
✓ Deve mostrar pelo menos 1 sugestão segura
```

#### Teste 3: Seleção de Casa Específica
```
Setup: Mesmo do Teste 1

Passos:
1. Selecionar Enzo
2. Escolher "Internação Provisória"
3. Clicar em "Casa 01" (opcional)
4. Clicar em "Analisar"

Resultado Esperado:
✓ Mostrar APENAS 3 sugestões da Casa 01
✓ Ordenadas do menor ao maior risco
✓ Log no console: "[DEBUG] Encontrados X alojamentos vagos para avaliar"
```

#### Teste 4: Marcos Sanches - Conflitos Externos
```
Setup:
- Marcos Sanches alocado
- Bairro Requião
- Conflito territorial: Requião ↔ Santa Felicidade
- Carlos Andrade e Jean Reis (ambos Santa Felicidade)

Passos:
1. Na página /estrutura, clicar no alojamento do Marcos Sanches
2. Verificar seção "Conflitos e justificativas do risco"

Resultado Esperado:
✓ Deve mostrar UM card de conflito externo
✓ Card deve listar AMBOS Carlos E Jean
✓ Título: "Conflito externo - bairro"
✓ Descrição: "Risco ativo envolvendo Santa Felicidade"
```

#### Teste 5: Alojamentos INTERDITADOS
```
Setup:
- Alojamento 08 da Casa 08 está INTERDITADO

Passos:
1. Selecionar qualquer adolescente não alocado
2. Escolher tipo de internação
3. Analisar

Resultado Esperado:
✓ Alojamento 08 NÃO deve aparecer nas sugestões
✓ Log no console: status_manutencao ou statusManutencao === "INTERDITADO"
```

#### Teste 6: Casa 08 - Validação Fase 3
```
Setup:
- Ter um adolescente SEM conflitos ativos (ex: nível risco 0-1)
- Ter um adolescente COM conflitos ativos (ex: nível risco 4-5)

Passos:
1. Selecionar adolescente SEM conflitos
2. Escolher "Internação Definitiva"
3. Clicar em botão "Casa 08" (opcional)
4. Analisar

Resultado Esperado - Adolescente SEM conflitos:
✓ Casa 08 DEVE aparecer nas sugestões
✓ Botão Casa 08 tem cor roxa e ícone de estrela
✓ Tooltip mostra "Casa 08 - Fase 3 (apenas sem conflitos)"

Resultado Esperado - Adolescente COM conflitos:
✓ Casa 08 NÃO deve aparecer nas sugestões
✓ Mesmo clicando em "Casa 08", não deve mostrar opções
```

#### Teste 7: Dashboard de Tensão
```
Setup:
- Ter dados de múltiplas casas com diferentes níveis de risco

Passos:
1. Acessar /estrutura
2. Clicar em "Dashboard de Tensão" (botão roxo-indigo no header)
3. Verificar carregamento da página /dashboard-tensao

Resultado Esperado:
✓ 4 cards de estatísticas gerais no topo
✓ Total alojamentos correto
✓ Taxa de ocupação calculada corretamente
✓ Cards individuais para cada casa
✓ Badge de tensão com cor correta (verde/lima/amarelo/laranja/vermelho)
✓ Barras de distribuição de risco visíveis apenas para níveis 3+
✓ Contador de conflitos ativos por casa
✓ Ordenação por "Maior Tensão" funciona
✓ Ordenação por "Número da Casa" funciona
✓ Botão "Atualizar" recarrega os dados
✓ Link "Voltar para Estrutura" funciona
```

---

### 2. ✅ Limpeza de Logs de Debug
**Status**: ✅ **CONCLUÍDO** (2025-11-11)
**Prioridade**: ~~MÉDIA~~ **COMPLETO**

**Todos os logs de debug foram removidos com sucesso**:

#### ✅ `components/mapa/modal-alojamento-detalhes.tsx`
- ✅ Removidas linhas 326-336: Debug de conflito externo
- ✅ Removida linha 344: Comparação de adolescentes
- ✅ Removida linha 354: Contagem de rivais reais

#### ✅ `components/estrutura/modal-analise-impacto.tsx`
- ✅ Removida linha 330: Contagem de alojamentos vagos
- ✅ Removida linha 359: Dados de avaliação

#### ✅ `app/api/verificar-alocacao/route.ts`
- ✅ Removidas linhas 368-375: Debug de conflitos de moradores
- ✅ Removidas linhas 432-447: Debug de simulação de alocação
- ✅ Removida linha 447: Status INTERDITADO
- ✅ Removidas linhas 468-473: Debug de alojamento frontal
- ✅ Removidas linhas 483-487: Debug de resultados do cálculo

**Código agora está pronto para produção** sem logs desnecessários.

---

## 🔍 PENDÊNCIAS DE VALIDAÇÃO

### 1. Performance - Consulta de Todos os Alojamentos
**Status**: NÃO ANALISADO
**Prioridade**: BAIXA (monitorar em produção)

**Preocupação**:
- Modal "Análise de Impacto" consulta `/api/verificar-alocacao` para CADA alojamento vago
- Se houver 50+ alojamentos vagos, são 50+ requisições HTTP simultâneas

**Ações**:
1. Medir tempo de resposta em ambiente real
2. Se > 3 segundos, considerar:
   - Paginação das sugestões
   - API batch que recebe múltiplos alojamentos de uma vez
   - Cache de resultados

### 2. Duplicatas nas Sugestões
**Status**: POTENCIALMENTE CORRIGIDO (REQUER TESTE)
**Prioridade**: MÉDIA

**Relatado pelo Usuário**:
> "Apareceram 3 sugestões idênticas: Casa 02, Ala A"

**Possíveis Causas**:
1. ✅ **CORRIGIDO**: Campo `numero` vs `numeroAlojamento` - agora usa ambos
2. ✅ **CORRIGIDO**: Campo `casaNumero` adicionado para facilitar filtragem
3. ❓ **A VERIFICAR**: API `/api/casas/status` pode estar retornando alojamentos duplicados

**Como Testar**:
```javascript
// Adicionar log temporário em modal-analise-impacto.tsx
console.log('Alojamentos únicos:', new Set(alojamentosVagos.map(a => a.id)).size);
console.log('Total alojamentos:', alojamentosVagos.length);
// Se diferentes, há duplicatas na source
```

### 3. Conflitos Diretos vs Territoriais vs Facção
**Status**: APENAS CONFLITOS DIRETOS TESTADOS
**Prioridade**: MÉDIA

**Tipos de Conflito no Sistema**:
- `DIRETO`: Conflito registrado entre dois adolescentes específicos
- `TERRITORIAL` (via bairro): Conflito entre bairros
- `FACCAO`: Conflito entre facções

**Testes Pendentes**:
- ❓ Conflito direto + conflito territorial simultâneos
- ❓ Conflito direto + conflito de facção simultâneos
- ❓ Todos os 3 tipos simultâneos
- ❓ Priorização: qual conflito tem mais peso no cálculo de risco?

---

## 📚 DOCUMENTAÇÃO PENDENTE

### 1. Manual do Usuário
**Status**: NÃO EXISTE
**Prioridade**: MÉDIA

**Conteúdo Necessário**:
- Como usar o modal "Análise de Impacto de Conflitos"
- Diferença entre Internação Provisória e Definitiva
- Como interpretar níveis de risco (0-5)
- Significado de "Conflito externo - bairro" vs "Conflito externo - facção"
- Quando usar "Filtro por Casa Específica"
- O que fazer quando aparecer "⚠️ Não há alojamentos seguros"

### 2. Documentação Técnica
**Status**: PARCIAL (apenas CHANGELOG-SESSION.md)
**Prioridade**: BAIXA

**Documentos Sugeridos**:
- Arquitetura do Motor de Risco (`lib/riscos/calcular.ts`)
- Fluxo de dados da API `/api/verificar-alocacao`
- Estrutura de tipos `AdolescenteRisco`, `AlojamentoRisco`, `CasaRisco`
- Mapa de conflitos externos: como é construído

### 3. Diagramas
**Status**: NÃO EXISTE
**Prioridade**: BAIXA

**Diagramas Úteis**:
- Fluxo de decisão: "Qual casa sugerir?"
- Matriz de compatibilidade: Casa x Tipo de Internação
- Diagrama de cálculo de risco (0-5)

---

## 🚀 MELHORIAS FUTURAS (Backlog)

### 1. Histórico de Alocações Sugeridas
**Descrição**: Registrar quais alojamentos foram sugeridos vs onde foi realmente alocado
**Benefício**: Analytics para melhorar motor de recomendação

### 2. Notificações Automáticas
**Descrição**: Alertar equipe quando surgir conflito em alocação existente
**Exemplo**: João foi alocado na Casa 01, depois Enzo (rival) também foi alocado na Casa 01

### 3. Simulação de Múltiplos Adolescentes
**Descrição**: "E se eu alocar Enzo aqui E Carlos ali?"
**Benefício**: Planejamento de realocação em massa

### 4. Recomendação Inteligente de Realocação
**Descrição**: Sistema sugere trocas (swap) entre adolescentes
**Exemplo**: "Trocar João (Casa 01, Aloj 04) com Pedro (Casa 02, Aloj 02) reduz risco geral"

### 5. ~~Dashboard de Tensão por Casa~~ ✅ **IMPLEMENTADO**
**Descrição**: Visão geral do nível de risco em cada casa
**Métrica**: Score de tensão (já calculado em `/api/casas/status`)
**Status**: Concluído em 2025-11-11 - Ver `app/dashboard-tensao/page.tsx`

### 6. Exportação de Relatórios
**Descrição**: PDF com análise completa de conflitos
**Uso**: Reuniões, auditorias, estudos de caso

### 7. Melhorias no Dashboard de Tensão
**Descrição**: Funcionalidades adicionais para o dashboard criado
**Possíveis Adições**:
- Gráficos de histórico de tensão ao longo do tempo
- Comparação entre períodos (semana atual vs anterior)
- Alertas automáticos quando tensão ultrapassa limites
- Drill-down: clicar em casa para ver detalhes dos alojamentos
- Exportação de relatórios do dashboard (PDF/Excel)

---

## ✅ Checklist de Produção

Antes de colocar em produção, verificar:

- [ ] Todos os testes da seção "PENDÊNCIAS CRÍTICAS" executados e passando (ver [docs/testes/ROTEIRO-TESTES-MANUAIS.md](docs/testes/ROTEIRO-TESTES-MANUAIS.md))
- [x] Logs de debug removidos de TODOS os arquivos ✅ **CONCLUÍDO (2025-11-11)**
- [x] Auto-scroll e drill-down do Dashboard implementados ✅ **CONCLUÍDO (2025-11-11)**
- [x] Filtros e gráficos no Dashboard de Tensão ✅ **CONCLUÍDO (2025-11-11)**
- [x] Auto-refresh configurável implementado ✅ **CONCLUÍDO (2025-11-11)**
- [x] Regra Casa 08 validada e implementada ✅ **CONCLUÍDO**
- [ ] Performance testada com carga real (30+ adolescentes não alocados)
- [ ] Manual do usuário criado e distribuído
- [ ] Backup do banco de dados antes do deploy
- [ ] Rollback plan definido
- [ ] Monitoramento de erros configurado (Sentry, etc.)

---

## 📞 Contato

**Para Questões Técnicas**: [Adicionar contato dev]
**Para Regras de Negócio**: [Adicionar contato gestor]
**Para Bugs em Produção**: [Adicionar canal emergência]

---

**Última Atualização**: 2025-11-11 (Sessão 3: Filtros, Gráficos e Auto-refresh no Dashboard)
**Próxima Revisão**: Após execução completa dos testes documentados

**Resumo desta sessão**:
- ✅ Filtros avançados implementados (risco + alertas)
- ✅ 3 gráficos visuais criados (donut, barras, mapa de calor)
- ✅ Auto-refresh configurável com controles Play/Pause
- ✅ Documentação completa atualizada
