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

---

## ⚠️ PENDÊNCIAS CRÍTICAS

### 1. 🔴 Testes do Sistema Completo
**Status**: NÃO TESTADO
**Prioridade**: ALTA

**O que testar**:

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

---

### 2. 🟡 Validação da Regra Casa 08 - Fase 3
**Status**: REGRA DE NEGÓCIO NÃO CONFIRMADA
**Prioridade**: MÉDIA

**Questões a Esclarecer**:
- Casa 08 é exclusivamente para Fase 3?
- Casa 08 aceita adolescentes com conflitos ATIVOS?
- Casa 08 aceita adolescentes com alertas disciplinares?

**Implementação Necessária** (se confirmado):
```typescript
// Em modal-analise-impacto.tsx
if (tipoInternacao === "DEFINITIVA") {
  sugestoesValidas = sugestoesValidas.filter((a) => {
    // Excluir Casa 01 (provisórios) e Casa 08 (Fase 3)
    if (a.alojamento.casaNumero >= 2 && a.alojamento.casaNumero <= 7) {
      return true;
    }

    // Casa 08 só se for Fase 3 e SEM conflitos ativos
    if (a.alojamento.casaNumero === 8) {
      // TODO: verificar se adolescente tem conflitos ativos
      // TODO: verificar se adolescente tem alertas disciplinares
      // return !temConflitosAtivos && !temAlertasDisciplinares;
    }

    return false;
  });
}
```

**Arquivo**: `components/estrutura/modal-analise-impacto.tsx` (linha ~360)

---

### 3. 🟢 Limpeza de Logs de Debug
**Status**: LOGS TEMPORÁRIOS ATIVOS
**Prioridade**: MÉDIA (antes de produção)

**Arquivos com Logs para Remover**:

#### `components/mapa/modal-alojamento-detalhes.tsx`
```typescript
// REMOVER linhas 326-336:
if (todosRelacionados.length > 0) {
  console.log('=== DEBUG Conflito Externo ===');
  console.log('Ocupante:', ocupante.nomeCompleto);
  console.log('Conflito:', impacto.conflitoDestino.nome);
  console.log('Tipo:', impacto.conflitoTipo);
  console.log('Total relacionados:', todosRelacionados.length);
  todosRelacionados.forEach(r => {
    console.log('  - ', r.adolescente.nome, 'Bairro:', r.adolescente.bairro?.nome, 'ID:', r.adolescente.bairro?.id);
  });
  console.log('Destino ID:', impacto.conflitoDestino.id);
}

// REMOVER linha 344:
console.log('    Comparando:', registro.adolescente.nome, match ? '✓ MATCH' : '✗ NO MATCH');

// REMOVER linha 354:
console.log('Rivais reais encontrados:', rivaisReais.length);
```

#### `components/estrutura/modal-analise-impacto.tsx`
```typescript
// REMOVER linha 276:
console.log(`[DEBUG] Encontrados ${alojamentosVagos.length} alojamentos vagos para avaliar`);

// REMOVER linha 305:
console.log(`[DEBUG] Avaliação:`, avaliacao.alojamento);
```

#### `app/api/verificar-alocacao/route.ts`
```typescript
// REMOVER linhas 322-327:
if (conflitosA.length > 0 || conflitosB.length > 0) {
  console.log(`[DEBUG] Morador ${morador.nomeCompleto} tem conflitos:`, {
    conflitosA: conflitosA.length,
    conflitosB: conflitosB.length,
    adversarios: [...conflitosA, ...conflitosB].map(c => c.adversario?.nomeCompleto),
  });
}

// REMOVER linhas 368-376:
console.log(`[DEBUG] Simulando alocacao de ${adolescenteSimulado.nomeCompleto}:`, {
  id: adolescenteSimulado.id,
  conflitosA: adolescenteSimulado.conflitosA?.length ?? 0,
  conflitosB: adolescenteSimulado.conflitosB?.length ?? 0,
  adversarios: [...],
});

// REMOVER linhas 378-383:
console.log(`[DEBUG] Status do alojamento ANTES da simulacao:`, {
  alojamentoId: alojamentoAlvo.id,
  numero: alojamentoAlvo.numeroAlojamento,
  statusManutencao: alojamentoAlvo.statusManutencao,
  ocupantesAtuais: alojamentoAlvo.adolescentes.length,
});

// REMOVER linha 392:
console.log(`[DEBUG] Alojamento estava INTERDITADO, mudando para DISPONIVEL para simular`);

// REMOVER linhas 410-417:
if (alojamentoAlvo.alojamentoFrontalId) {
  const frontal = casaAlvo.alojamentos.find(a => a.id === alojamentoAlvo.alojamentoFrontalId);
  console.log(`[DEBUG] Alojamento ${alojamentoAlvo.numeroAlojamento} tem frontal:`, {
    frontalId: alojamentoAlvo.alojamentoFrontalId,
    frontalNumero: frontal?.numeroAlojamento,
    ocupantes: frontal?.adolescentes.map(a => a.nomeCompleto),
  });
}

// REMOVER linhas 428-432:
console.log(`[DEBUG] Resultado do calculo:`, {
  nivel: resultado.nivel,
  categoria: resultado.categoria,
  motivos: resultado.motivos,
});
```

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

### 5. Dashboard de Tensão por Casa
**Descrição**: Visão geral do nível de risco em cada casa
**Métrica**: Score de tensão (já calculado em `/api/casas/status`)

### 6. Exportação de Relatórios
**Descrição**: PDF com análise completa de conflitos
**Uso**: Reuniões, auditorias, estudos de caso

---

## ✅ Checklist de Produção

Antes de colocar em produção, verificar:

- [ ] Todos os testes da seção "PENDÊNCIAS CRÍTICAS" executados e passando
- [ ] Logs de debug removidos de TODOS os arquivos
- [ ] Regra Casa 08 validada e implementada (se necessário)
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

**Última Atualização**: 2025-11-11
**Próxima Revisão**: Após testes completos
