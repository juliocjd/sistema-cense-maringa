# 🧪 Roteiro de Testes Manuais - Sistema CENSE Maringá

> **Data de criação**: 2025-11-11
> **Objetivo**: Validar todas as funcionalidades implementadas relacionadas ao sistema de conflitos, motor de risco e Dashboard de Tensão

---

## 📋 Índice

1. [Preparação do Ambiente](#preparação-do-ambiente)
2. [Teste 1: Conflito Interno - Facção](#teste-1-conflito-interno---facção)
3. [Teste 2: Conflito Interno - Bairro](#teste-2-conflito-interno---bairro)
4. [Teste 3: Conflito Externo](#teste-3-conflito-externo)
5. [Teste 4: Motor de Risco](#teste-4-motor-de-risco)
6. [Teste 5: Alojamento Interditado](#teste-5-alojamento-interditado)
7. [Teste 6: Casa 08 - Fase 3](#teste-6-casa-08---fase-3)
8. [Teste 7: Dashboard de Tensão](#teste-7-dashboard-de-tensão)
9. [Checklist de Validação](#checklist-de-validação)

---

## Preparação do Ambiente

### Pré-requisitos
- ✅ Servidor rodando: `npm run dev` (porta 3000)
- ✅ Prisma Studio disponível: `npx prisma studio` (porta 5556)
- ✅ Navegador aberto em: http://localhost:3000
- ✅ Banco de dados populado com dados de teste

### Estrutura do Sistema
- **1 adolescente por alojamento** (capacidade máxima)
- **Alojamentos organizados em Alas** (A e B)
- **Alas agrupadas em Casas** (Casa 01 a Casa 08)
- **Conflito Interno**: Adolescentes rivais na mesma Ala
- **Conflito Externo**: Adolescentes rivais em Alas diferentes da mesma Casa

---

## Teste 1: Conflito Interno - Facção

### 🎯 Objetivo
Validar que o sistema detecta corretamente conflitos de facção entre adolescentes na **mesma ala** e calcula o nível de risco adequado.

### 📦 Setup Necessário
**Dados de teste:**
- 2 adolescentes de facções rivais (ex: "Comando Vermelho" vs "PCC")
- Ambos alocados na **MESMA ALA** (ex: Ala A) da **MESMA CASA**
- Alojamentos diferentes (ex: Alojamento 01-A e Alojamento 02-A)

**Como criar os dados (se necessário):**
1. Abra Prisma Studio: http://localhost:5556
2. Navegue até a tabela `Adolescente`
3. Identifique 2 adolescentes de facções rivais
4. Na tabela `Alojamento`, aloque ambos em alojamentos da mesma ala
5. Salve as alterações

### 🚀 Passos para Executar

1. Acesse http://localhost:3000/estrutura
2. Localize uma casa onde há 2 adolescentes de facções rivais na mesma ala
3. Clique em um dos alojamentos ocupados para abrir o modal de detalhes
4. Observe o card do adolescente ocupante

### ✅ Resultado Esperado

**No Card do Alojamento (Mapa):**
- ✓ Badge de nível de risco deve ser elevado (laranja/vermelho - nível 4 ou 5)
- ✓ Cor de fundo do card reflete o risco (laranja ou vermelho)

**No Modal de Detalhes:**
- ✓ Seção "Ocupantes" mostra o adolescente com badge colorido
- ✓ Na seção **"Conflitos e justificativas do risco"**, deve aparecer um card:
  - **Tipo**: "Conflito interno - facção"
  - **Descrição**: Menciona o rival (nome + facção) e a localização (alojamento + ala)
  - **Nível**: ALTO ou CRÍTICO
  - **Ícone**: Escudo vermelho
  - **Cor de fundo**: Laranja ou vermelho

**Banner de Tensão (se aplicável):**
- ✓ Se houver "Ala em tensão", deve aparecer um banner amarelo no topo explicando o motivo

### 🐛 Problemas Conhecidos
- Nenhum reportado até o momento

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 2: Conflito Interno - Bairro

### 🎯 Objetivo
Validar que o sistema detecta corretamente conflitos de bairro entre adolescentes na **mesma ala**.

### 📦 Setup Necessário
**Dados de teste:**
- 2 adolescentes de bairros rivais (cadastrados na tabela `RegistroConflito` com tipo "BAIRRO")
- Ambos alocados na **MESMA ALA** da **MESMA CASA**
- Alojamentos diferentes

**Estrutura de dados:**
```sql
-- Verificar conflitos de bairro cadastrados
SELECT * FROM RegistroConflito
WHERE conflitoTipo = 'BAIRRO';
```

### 🚀 Passos para Executar

1. Acesse http://localhost:3000/estrutura
2. Localize uma casa com 2 adolescentes de bairros rivais na mesma ala
3. Clique em um dos alojamentos para abrir o modal
4. Observe a seção de conflitos

### ✅ Resultado Esperado

**No Modal de Detalhes:**
- ✓ Card de conflito com tipo: **"Conflito interno - bairro"**
- ✓ Descrição menciona o rival e os bairros envolvidos
- ✓ Nível de risco: MÉDIO ou ALTO (geralmente menor que facção)
- ✓ Ícone: Mapa ou localização
- ✓ Cor de fundo: Amarelo ou laranja

**Cálculo de Risco:**
- ✓ Nível deve ser menor que conflito de facção (tipicamente nível 3-4)

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 3: Conflito Externo

### 🎯 Objetivo
Validar que o sistema detecta e exibe corretamente **conflitos externos** (adolescentes rivais em alas diferentes da mesma casa).

### 📦 Setup Necessário
**Dados de teste:**
- 2 adolescentes rivais (facção ou bairro)
- Alocados em **ALAS DIFERENTES** da **MESMA CASA**
- Ex: Adolescente A no Alojamento 01-A, Adolescente B no Alojamento 01-B

### 🚀 Passos para Executar

1. Acesse http://localhost:3000/estrutura
2. Identifique uma casa com adolescentes rivais em alas diferentes
3. Clique em um alojamento ocupado
4. Observe a seção **"Impacto de conflitos externos"**

### ✅ Resultado Esperado

**Card de Conflito Externo:**
- ✓ Deve aparecer uma seção separada: **"Impacto de conflitos externos"**
- ✓ Card mostrando:
  - **Origem**: Nome do rival + localização (ala diferente)
  - **Tipo**: Facção ou Bairro
  - **Nível**: MÉDIO (geralmente menor que conflito interno)
  - **Descrição**: Explica que o rival está em outra ala da mesma casa
  - **Cor**: Amarelo (menor gravidade que conflito interno)

**Diferença de Conflito Interno vs Externo:**
- ✓ Conflito **interno** (mesma ala) = maior risco = vermelho/laranja
- ✓ Conflito **externo** (ala diferente) = menor risco = amarelo

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 4: Motor de Risco

### 🎯 Objetivo
Validar que o **motor de risco** calcula corretamente o score total e exibe badges coloridos conforme a gravidade.

### 📦 Conceito do Motor de Risco

O motor de risco agrega múltiplos fatores:
- **Conflitos internos** (mesma ala): +5 pontos por conflito de facção, +3 por bairro
- **Conflitos externos** (ala diferente): +2 pontos por conflito
- **Superlotação**: +1 a +3 pontos dependendo do percentual
- **Outros fatores**: Infraestrutura, incidentes, etc.

**Escala de níveis:**
- Nível 1 (Verde): 0-2 pontos - Risco Baixo
- Nível 2 (Azul): 3-5 pontos - Risco Moderado
- Nível 3 (Amarelo): 6-8 pontos - Risco Médio
- Nível 4 (Laranja): 9-12 pontos - Risco Alto
- Nível 5 (Vermelho): 13+ pontos - Risco Crítico

### 🚀 Passos para Executar

1. Acesse http://localhost:3000/estrutura
2. Selecione alojamentos com diferentes cenários:
   - Alojamento vazio (nível 1 - verde)
   - Alojamento com 1 adolescente sem conflitos (nível 1-2)
   - Alojamento com conflito externo (nível 2-3 - amarelo)
   - Alojamento com conflito interno de bairro (nível 3-4 - laranja)
   - Alojamento com conflito interno de facção (nível 4-5 - vermelho)

3. Para cada alojamento, verifique:
   - Cor do badge
   - Número do nível exibido
   - Cards de justificativa na seção de conflitos

### ✅ Resultado Esperado

**Badges Coloridos:**
- ✓ Verde (Nível 1): Sem conflitos ou risco mínimo
- ✓ Azul (Nível 2): Risco moderado
- ✓ Amarelo (Nível 3): Conflito externo ou risco médio
- ✓ Laranja (Nível 4): Conflito interno de bairro ou risco alto
- ✓ Vermelho (Nível 5): Conflito interno de facção ou risco crítico

**Consistência:**
- ✓ A cor do badge no mapa corresponde ao nível mostrado no modal
- ✓ A soma dos fatores de risco corresponde ao nível calculado
- ✓ Todos os cards de justificativa aparecem na seção de conflitos

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 5: Alojamento Interditado

### 🎯 Objetivo
Validar que alojamentos marcados como **INTERDITADO** são **excluídos das sugestões** de realocação segura.

### 📦 Setup Necessário

**Criar um alojamento interditado:**
1. Abra Prisma Studio: http://localhost:5556
2. Navegue até a tabela `Alojamento`
3. Selecione um alojamento vago
4. Altere o campo `status` para **"INTERDITADO"**
5. Salve a alteração

### 🚀 Passos para Executar

1. Acesse http://localhost:3000/estrutura
2. Clique em um alojamento ocupado que tenha conflitos
3. No modal, localize a seção **"Análise de Impacto"**
4. Clique no botão **"Analisar Realocação Segura"**
5. Observe a lista de sugestões de alojamentos seguros

### ✅ Resultado Esperado

**Modal de Análise de Impacto:**
- ✓ Lista de sugestões **NÃO deve incluir** alojamentos com status "INTERDITADO"
- ✓ Somente alojamentos com status "DISPONIVEL" aparecem
- ✓ Mensagem informativa caso não haja sugestões disponíveis

**Comportamento esperado:**
```
Se há 10 alojamentos vagos, sendo 2 INTERDITADOS:
→ Lista de sugestões mostra apenas 8 alojamentos
```

**Validação adicional:**
- ✓ Alojamentos INTERDITADOS aparecem no mapa com indicação visual (ícone de cadeado ou cor cinza)
- ✓ Tooltip ao passar o mouse mostra "Status: Interditado"

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 6: Casa 08 - Fase 3

### 🎯 Objetivo
Validar a regra especial da **Casa 08 (Fase 3)**: aceita apenas adolescentes **sem nenhum conflito** cadastrado.

### 📦 Contexto

A Casa 08 é destinada a adolescentes em **fase final de ressocialização**, portanto é uma área de baixo risco. Apenas adolescentes sem histórico de conflitos podem ser alocados lá.

### 🚀 Passos para Executar

**Cenário A - Tentar alocar adolescente COM conflitos:**
1. Acesse http://localhost:3000/estrutura
2. Localize um adolescente que tem conflitos cadastrados
3. Tente realocá-lo para a Casa 08
4. Observe a mensagem de validação

**Cenário B - Alocar adolescente SEM conflitos:**
1. Identifique um adolescente sem conflitos cadastrados
2. Realize a alocação na Casa 08
3. Verifique se a operação foi bem-sucedida

### ✅ Resultado Esperado

**Cenário A - Com conflitos:**
- ✓ Sistema **bloqueia** a alocação
- ✓ Mensagem de erro clara: "Adolescente não pode ser alocado na Casa 08 (Fase 3) pois possui conflitos cadastrados"
- ✓ Sugestão alternativa é exibida

**Cenário B - Sem conflitos:**
- ✓ Sistema **permite** a alocação
- ✓ Mensagem de sucesso é exibida
- ✓ Alojamento atualizado corretamente no mapa

**Validação adicional:**
- ✓ Casa 08 exibe apenas adolescentes sem conflitos
- ✓ Nível de risco da Casa 08 é sempre BAIXO (verde/azul)

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU
Observações:
_________________________________
_________________________________
```

---

## Teste 7: Dashboard de Tensão

### 🎯 Objetivo
Validar todas as funcionalidades do **Dashboard de Tensão**, incluindo métricas, cards de casas, drill-down e auto-scroll.

### 🚀 Passos para Executar

#### Parte 1: Visualização e Métricas

1. Acesse http://localhost:3000/dashboard-tensao
2. Observe o painel superior com as métricas gerais:
   - Total de casas
   - Casas em alerta
   - Total de adolescentes
   - Conflitos ativos

3. Verifique os cards de cada casa:
   - Nome da casa (ex: "Casa 01")
   - Nível de tensão (badge colorido)
   - Número de alertas
   - Taxa de ocupação
   - Principais alertas listados

#### Parte 2: Drill-down e Auto-scroll

4. Clique no botão **"Ver Detalhes da Casa"** em qualquer card
5. Observe:
   - Navegação para `/estrutura?casa=X`
   - Scroll automático suave até a casa selecionada
   - Highlight visual (borda indigo + pulso) na casa
   - Remoção do highlight após 3 segundos

#### Parte 3: Navegação Reversa

6. Volte para `/dashboard-tensao` usando o navegador
7. Teste drill-down em diferentes casas
8. Verifique que cada casa é corretamente destacada

### ✅ Resultado Esperado

**Métricas Gerais:**
- ✓ **Total de casas**: 8 (ou conforme configuração)
- ✓ **Casas em alerta**: Número correto de casas com nível > 3
- ✓ **Total de adolescentes**: Soma correta de todos os ocupantes
- ✓ **Conflitos ativos**: Soma de todos os conflitos internos + externos

**Cards de Casa:**
- ✓ Badge de tensão com cor correta (verde/azul/amarelo/laranja/vermelho)
- ✓ Lista de alertas mostra no máximo 3 itens principais
- ✓ Taxa de ocupação calculada corretamente: `(ocupados / total) * 100`
- ✓ Ordenação: Casas com maior tensão aparecem primeiro

**Drill-down e Auto-scroll:**
- ✓ Navegação funciona sem erros
- ✓ URL contém parâmetro `?casa=X` correto
- ✓ Scroll suave centraliza a casa na viewport
- ✓ Highlight visual (borda indigo + ring + pulso) aparece
- ✓ Highlight desaparece automaticamente após 3 segundos
- ✓ Funciona para todas as 8 casas

**Performance:**
- ✓ Dashboard carrega em menos de 2 segundos
- ✓ Scroll é suave sem travamentos
- ✓ Transições visuais são fluidas

### 🐛 Problemas Conhecidos
- Nenhum reportado até o momento

### 📝 Notas do Teste
```
Data: ___/___/___
Testador: _________________
Resultado: [ ] PASSOU  [ ] FALHOU

Métricas observadas:
- Total de casas: _____
- Casas em alerta: _____
- Total de adolescentes: _____
- Conflitos ativos: _____

Observações:
_________________________________
_________________________________
```

---

## Checklist de Validação

Use este checklist ao final de todos os testes para garantir que o sistema está completamente funcional.

### ✅ Funcionalidades Core

- [ ] Detecção de conflito interno (facção)
- [ ] Detecção de conflito interno (bairro)
- [ ] Detecção de conflito externo
- [ ] Cálculo correto do motor de risco
- [ ] Badges coloridos exibidos corretamente
- [ ] Exclusão de alojamentos interditados
- [ ] Validação da Casa 08 (Fase 3)

### ✅ Dashboard de Tensão

- [ ] Métricas gerais calculadas corretamente
- [ ] Cards de casas exibidos com informações corretas
- [ ] Drill-down funcional
- [ ] Auto-scroll suave e centralizado
- [ ] Highlight visual aparece e desaparece
- [ ] Navegação entre páginas sem erros

### ✅ UX e Performance

- [ ] Interface responsiva em diferentes resoluções
- [ ] Tempo de carregamento aceitável (< 2s)
- [ ] Transições suaves sem travamentos
- [ ] Tooltips informativos
- [ ] Mensagens de erro claras
- [ ] Cores e ícones consistentes

### ✅ Qualidade do Código

- [ ] Sem console.log em produção
- [ ] Sem erros no console do navegador
- [ ] Sem warnings de TypeScript
- [ ] Código compilado sem erros

---

## 📊 Relatório de Testes

Ao concluir todos os testes, preencha o relatório abaixo:

```
Data dos testes: ___/___/___
Testador: _________________
Versão do sistema: _________________

RESULTADOS:
✅ Testes passados: ___/7
❌ Testes falhos: ___/7

PROBLEMAS ENCONTRADOS:
1. _________________________________
2. _________________________________
3. _________________________________

OBSERVAÇÕES GERAIS:
_________________________________
_________________________________
_________________________________

PRÓXIMOS PASSOS:
_________________________________
_________________________________
_________________________________
```

---

## 📚 Referências

- [PENDENCIAS.md](../../PENDENCIAS.md) - Lista completa de pendências
- [README-CONFLITOS.md](../README-CONFLITOS.md) - Documentação do sistema de conflitos
- [INSTRUCOES-DASHBOARD.md](../INSTRUCOES-DASHBOARD.md) - Instruções do Dashboard de Tensão

---

**Última atualização**: 2025-11-11
