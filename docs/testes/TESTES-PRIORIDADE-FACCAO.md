# Testes Manuais - Prioridade de Facção sobre Bairro

## Resumo da Funcionalidade

Implementação da hierarquia **Facção > Bairro** para detecção de conflitos externos.

### Regras de Negócio

1. **Mesma Facção → ALIADOS** (ignora conflito de bairro)
2. **Facções Diferentes e Conflitantes → RIVAIS**
3. **Sem Facção + Bairros Conflitantes → RIVAIS**
4. **Hierarquia: Facção > Bairro**

## Arquivos Modificados

- [lib/riscos/calcular.ts](../../lib/riscos/calcular.ts) - Funções auxiliares e lógica principal de risco
- [lib/alocacao/sugestoes.ts](../../lib/alocacao/sugestoes.ts) - Construção de impactos externos
- [app/api/verificar-alocacao/route.ts](../../app/api/verificar-alocacao/route.ts) - API de verificação de alocação
- [app/api/grupos/[id]/adicionar-membro/route.ts](../../app/api/grupos/[id]/adicionar-membro/route.ts) - API de adição de membros a grupos

## Pré-requisitos para Testes

### Dados Necessários no Banco

1. **Bairros** (mínimo 2 com conflito):
   - Bairro A (ex: "Requião")
   - Bairro B (ex: "Santa Felicidade")
   - Criar conflito entre Bairro A ↔ Bairro B

2. **Facções** (mínimo 2 com conflito):
   - Facção PCC
   - Facção CV
   - Criar conflito entre PCC ↔ CV

3. **Adolescentes** (mínimo 6):
   - Adolescente 1: Facção PCC + Bairro A
   - Adolescente 2: Facção PCC + Bairro B (bairro conflitante!)
   - Adolescente 3: Facção CV + Bairro A
   - Adolescente 4: Facção CV + Bairro B
   - Adolescente 5: Sem Facção + Bairro A
   - Adolescente 6: Sem Facção + Bairro B

## Casos de Teste Manual

### 🟢 CASO 1: Mesma Facção, Bairros Conflitantes → ALIADOS

**Objetivo:** Verificar que adolescentes da mesma facção são aliados, mesmo com bairros conflitantes.

**Passos:**
1. Alocar Adolescente 1 (PCC + Bairro A) em Alojamento X
2. Tentar alocar Adolescente 2 (PCC + Bairro B) em Alojamento Y (próximo ao X)

**Resultado Esperado:**
- ✅ NÃO deve exibir alerta de conflito territorial
- ✅ NÃO deve aumentar nível de risco por conflito de bairro
- ✅ Sistema deve considerar que são ALIADOS pela facção

**Onde Testar:**
- `/estrutura` - Mapa de alocação
- `/mapa` - Mapa operacional
- API: `POST /api/verificar-alocacao`

---

### 🔴 CASO 2: Facções Rivais, Mesmo Bairro → RIVAIS

**Objetivo:** Verificar que adolescentes de facções rivais são detectados como rivais, mesmo morando no mesmo bairro.

**Passos:**
1. Alocar Adolescente 1 (PCC + Bairro A) em Alojamento X
2. Tentar alocar Adolescente 3 (CV + Bairro A) em Alojamento Y (próximo ao X)

**Resultado Esperado:**
- ❌ DEVE exibir alerta de conflito entre facções
- ❌ DEVE aumentar nível de risco significativamente
- ❌ Sistema deve detectar como RIVAIS pela facção

**Onde Testar:**
- `/estrutura` - Mapa de alocação
- `/mapa` - Mapa operacional
- API: `POST /api/verificar-alocacao`

---

### 🔴 CASO 3: Sem Facção, Bairros Conflitantes → RIVAIS

**Objetivo:** Verificar que bairros conflitantes são considerados apenas quando NENHUM tem facção.

**Passos:**
1. Alocar Adolescente 5 (Sem Facção + Bairro A) em Alojamento X
2. Tentar alocar Adolescente 6 (Sem Facção + Bairro B) em Alojamento Y (próximo ao X)

**Resultado Esperado:**
- ❌ DEVE exibir alerta de conflito territorial
- ❌ DEVE aumentar nível de risco por bairro
- ❌ Sistema deve detectar como RIVAIS pelo bairro

**Onde Testar:**
- `/estrutura` - Mapa de alocação
- `/mapa` - Mapa operacional
- API: `POST /api/verificar-alocacao`

---

### 🟢 CASO 4: Um com Facção, Outro sem, Bairros Conflitantes → NÃO RIVAIS POR BAIRRO

**Objetivo:** Verificar que conflito de bairro é ignorado quando um dos adolescentes tem facção.

**Passos:**
1. Alocar Adolescente 1 (PCC + Bairro A) em Alojamento X
2. Tentar alocar Adolescente 6 (Sem Facção + Bairro B) em Alojamento Y (próximo ao X)

**Resultado Esperado:**
- ✅ NÃO deve exibir alerta de conflito territorial
- ✅ NÃO deve aumentar risco por bairro (um tem facção)
- ⚠️ Pode haver outros riscos, mas NÃO por bairro

**Onde Testar:**
- `/estrutura` - Mapa de alocação
- `/mapa` - Mapa operacional
- API: `POST /api/verificar-alocacao`

---

### 🔴 CASO 5: Grupos - Mesma Facção em Grupos Diferentes

**Objetivo:** Verificar que membros da mesma facção em grupos diferentes são tratados como aliados.

**Passos:**
1. Criar Grupo A e adicionar Adolescente 1 (PCC + Bairro A)
2. Criar Grupo B e adicionar Adolescente 2 (PCC + Bairro B conflitante)

**Resultado Esperado:**
- ✅ NÃO deve bloquear criação de grupos
- ✅ NÃO deve exibir alertas de conflito territorial
- ✅ Sistema reconhece aliança pela facção

**Onde Testar:**
- `/grupos` - Gerenciamento de grupos
- API: `POST /api/grupos/[id]/adicionar-membro`

---

### 🔴 CASO 6: Grupos - Facções Rivais no Mesmo Grupo

**Objetivo:** Verificar que facções rivais são detectadas ao adicionar membros a grupos.

**Passos:**
1. Criar Grupo A e adicionar Adolescente 1 (PCC + Bairro A)
2. Tentar adicionar Adolescente 3 (CV + Bairro A) ao mesmo Grupo A

**Resultado Esperado:**
- ❌ DEVE exibir alerta de conflito entre facções
- ❌ DEVE requerer justificativa
- ❌ Nível de risco deve ser ALTO

**Onde Testar:**
- `/grupos/[id]` - Detalhes do grupo
- API: `POST /api/grupos/[id]/adicionar-membro`

---

## Cenários de Regressão

### Verificar que não quebrou funcionalidades existentes:

1. **Conflitos Internos (CI)**
   - Adolescentes com CI registrada devem continuar sendo detectados como rivais
   - Testar: Alocar dois adolescentes com conflito interno próximos

2. **Alertas e Notificações**
   -    - Sistema deve continuar enviando notificacoes para tecnicos
   - Verificar emails/logs de notificações

3. **Cálculo de Risco Geral**
   - Níveis de risco (1-5) devem continuar sendo calculados corretamente
   - Verificar cores no mapa (verde, amarelo, laranja, vermelho)

4. **Justificativas de Alocação**
   - Alocações de risco ≥3 devem continuar requerendo justificativa
   - Testar criação de justificativa de algema (se aplicável)

## Testes Automatizados

Execute os testes unitários com:

```bash
npm run test -- tests/lib/riscos/conflitos-externos.test.ts
```

**Resultado Esperado:** ✅ 14 testes passando

## Checklist de Validação

- [ ] CASO 1: Mesma facção ignora conflito de bairro
- [ ] CASO 2: Facções rivais detectadas mesmo com mesmo bairro
- [ ] CASO 3: Bairros conflitantes detectados quando nenhum tem facção
- [ ] CASO 4: Um com facção ignora conflito de bairro
- [ ] CASO 5: Grupos - mesma facção permite grupos diferentes
- [ ] CASO 6: Grupos - facções rivais bloqueiam/alertam
- [ ] Regressão: Conflitos internos continuam funcionando
- [ ] Regressão: Notificações continuam sendo enviadas
- [ ] Regressão: Cálculo de risco continua correto
- [ ] Regressão: Justificativas continuam sendo requeridas
- [ ] Testes unitários: 14/14 passando

## Notas Importantes

1. **Cache:** Limpe o cache do navegador entre testes (`Ctrl+Shift+R`)
2. **Dados de Teste:** Use dados isolados para evitar interferência
3. **Logs:** Monitore o console do navegador e logs do servidor
4. **Reversão:** Mantenha backup do banco antes de testes destrutivos

## Contato

Em caso de dúvidas ou bugs encontrados, documente:
- Caso de teste executado
- Resultado obtido vs. esperado
- Screenshots/logs relevantes
- Dados usados (IDs, nomes)




