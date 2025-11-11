# Changelog da Sessão - Sistema de Análise de Risco e Conflitos

**Data**: 2025-11-11
**Contexto**: Correções e melhorias no sistema de análise de impacto de conflitos e motor de risco

---

## 🔧 Correções de Bugs

### 1. Exibição de Conflitos Externos - Agrupamento de Rivais
**Arquivo**: `components/mapa/modal-alojamento-detalhes.tsx`

**Problema**:
- Ao visualizar conflitos de um adolescente (ex: Marcos Sanches do bairro Requião), apenas UM rival do bairro conflitante (Santa Felicidade) era exibido, mesmo havendo múltiplos rivais (Carlos Andrade e Jean Reis).

**Solução Implementada** (linhas 308-354):
- Adicionado sistema de deduplicação usando `Set<string>` para processar cada `conflitoId` apenas uma vez
- Busca TODOS os adolescentes relacionados ao conflito no mapa `impactosPorConflito`
- Filtra apenas os RIVAIS reais (do bairro/facção oposta), excluindo aliados
- Cria UM ÚNICO card de conflito com TODOS os rivais listados

```typescript
const conflitosProcessados = new Set<string>();
externos.forEach((impacto) => {
  if (conflitosProcessados.has(impacto.conflitoId)) return;
  conflitosProcessados.add(impacto.conflitoId);

  const todosRelacionados = impactosPorConflito
    .get(impacto.conflitoId)
    ?.filter((registro) => registro.adolescente.id !== ocupante.id) ?? [];

  const rivaisReais = todosRelacionados.filter((registro) => {
    if (impacto.conflitoTipo === "BAIRRO") {
      return registro.adolescente.bairro?.id === impacto.conflitoDestino.id;
    }
    // ... lógica para facções
  });
});
```

### 2. Campo Nome Incorreto - bairroOrigem vs bairro
**Arquivo**: `components/mapa/modal-alojamento-detalhes.tsx`

**Problema**:
- Código usava `registro.adolescente.bairroOrigem?.id` mas a API retorna `registro.adolescente.bairro?.id`
- Resultava em nenhum rival sendo exibido após o agrupamento

**Solução** (linha 343):
```typescript
// ANTES (ERRADO):
const match = registro.adolescente.bairroOrigem?.id === impacto.conflitoDestino.id;

// DEPOIS (CORRETO):
const match = registro.adolescente.bairro?.id === impacto.conflitoDestino.id;
```

### 3. Ordem de Exibição de Informações
**Arquivo**: `components/mapa/modal-alojamento-detalhes.tsx`

**Mudança** (linhas 627-664):
- Reorganizada ordem dos dados do adolescente:
  1. Nome completo
  2. SMS
  3. **Bairro/Cidade** (movido para antes do nível de risco)
  4. **Facção** (movido para antes do nível de risco)
  5. Nível de risco atual (com badge colorido)

**Badge de Risco Colorido** (linhas 652-662):
```typescript
<span className={`
  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
  ${avaliacaoRisco.nivel === 5 ? 'bg-red-100 text-red-800 border border-red-300' : ''}
  ${avaliacaoRisco.nivel === 4 ? 'bg-orange-100 text-orange-800 border border-orange-300' : ''}
  ${avaliacaoRisco.nivel === 3 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : ''}
  ${avaliacaoRisco.nivel === 2 ? 'bg-lime-100 text-lime-800 border border-lime-300' : ''}
  ${avaliacaoRisco.nivel === 1 ? 'bg-green-100 text-green-800 border border-green-300' : ''}
  ${avaliacaoRisco.nivel === 0 ? 'bg-gray-100 text-gray-800 border border-gray-300' : ''}
`}>
  {avaliacaoRisco.rotulo}
</span>
```

### 4. Título da Seção de Conflitos
**Arquivo**: `components/mapa/modal-alojamento-detalhes.tsx`

**Mudança** (linha 680):
```typescript
// ANTES:
"Alertas e justificativas do risco"

// DEPOIS:
"Conflitos e justificativas do risco"
```

**Motivo**: Evitar confusão com o sistema de Alertas (alertaRiscoSuicidio, alertaPerfilMapeado, etc.)

### 5. Erro "casas.forEach is not a function"
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Problema**:
- API `/api/casas/status` retorna `{ casas: Casa[] }` mas código esperava array direto

**Solução** (linhas 143-144, 250-251):
```typescript
// ANTES:
const casas = await casasResponse.json();

// DEPOIS:
const casasData = await casasResponse.json();
const casas = casasData.casas || [];
```

### 6. Alojamentos INTERDITADOS Sendo Sugeridos
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Problema**:
- API retorna `status_manutencao` (snake_case) mas código verificava `statusManutencao` (camelCase)
- Alojamentos interditados eram incluídos nas sugestões

**Solução** (linhas 257-263):
```typescript
// Compatibilidade com ambos os formatos
const statusManutencao = aloj.status_manutencao || aloj.statusManutencao;
if (
  statusManutencao !== "INTERDITADO" &&
  (!aloj.ocupante && !aloj.adolescentes ||
   (Array.isArray(aloj.adolescentes) && aloj.adolescentes.length === 0))
) {
  // Incluir alojamento
}
```

### 7. Encoding UTF-8 - "CRÃTICO" vs "CRITICO"
**Arquivo**: `components/mapa/modal-alocacao.tsx`

**Problema**:
- String "CRÍTICO" estava salva como "CRÃTICO" por erro de encoding
- Switch statement nunca encontrava match, resultando em cor verde para nível crítico

**Solução** (linha 178):
```typescript
case "CRITICO":  // Corrigido de "CRÃTICO"
  return "text-red-600 bg-red-50 border-red-200";
```

### 8. Conflitos de Adolescentes Existentes Não Carregados
**Arquivo**: `app/api/verificar-alocacao/route.ts`

**Problema**:
- API simulava alocação mas adolescentes já no sistema (como João) eram carregados SEM seus conflitos
- Resultado: simulação de Enzo no aloj. 03 retornava nível 1 mesmo com João (rival) no aloj. 04 frontal

**Solução** (linhas 290-337):

**1. Adicionado includes dos conflitos na query Prisma:**
```typescript
adolescentes: {
  where: { statusUnidade: "ATIVO" },
  select: {
    // ... campos existentes
    conflitosA: {
      where: { status: "ATIVO" },
      select: {
        id: true,
        status: true,
        tipoConflito: true,
        adolescenteAId: true,
        adolescenteBId: true,
        adolescenteB: {  // IMPORTANTE: incluir adversário completo
          select: {
            id: true,
            nomeCompleto: true,
            bairroOrigemId: true,
            faccaoGrupoId: true,
            faccao: { select: { id: true, nomeFaccao: true } }
          }
        }
      }
    },
    conflitosB: {
      // Mesma estrutura para conflitosB com adolescenteA
    }
  }
}
```

**2. Mapeamento dos conflitos para AdolescenteRisco** (linhas 363-398):
```typescript
adolescentes: alojamento.adolescentes.map((morador: any): AdolescenteRisco => {
  const conflitosA = mapearConflitosInternos(morador, "B");
  const conflitosB = mapearConflitosInternos(morador, "A");

  // Debug log para verificar
  if (conflitosA.length > 0 || conflitosB.length > 0) {
    console.log(`[DEBUG] Morador ${morador.nomeCompleto} tem conflitos:`, {
      conflitosA: conflitosA.length,
      conflitosB: conflitosB.length,
      adversarios: [...conflitosA, ...conflitosB].map(c => c.adversario?.nomeCompleto)
    });
  }

  return {
    // ... outros campos
    conflitosA,
    conflitosB,
  };
})
```

**3. Tratamento de alojamentos INTERDITADOS na simulação** (linhas 442-457):
```typescript
// Para simular alocação, alojamento deve estar disponível
const statusOriginal = alojamentoAlvo.statusManutencao;
if (alojamentoAlvo.statusManutencao === "INTERDITADO") {
  alojamentoAlvo.statusManutencao = "DISPONIVEL";
  console.log(`[DEBUG] Alojamento estava INTERDITADO, mudando para DISPONIVEL para simular`);
}
```

---

## 🚀 Novas Funcionalidades

### 1. Regras de Casa por Tipo de Internação
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Implementação** (linhas 347-365):

#### Internação Provisória
- **Regra**: APENAS Casa 01 é permitida
- **Exceção**: Se não houver opções seguras (nível ≤ 3), mostra as 3 menos arriscadas com aviso
- **Justificativa**: Internação provisória é triagem inicial, deve ficar isolada na Casa 01

```typescript
if (tipoInternacao === "PROVISORIA") {
  sugestoesValidas = sugestoesValidas.filter(
    (a) => a.alojamento.casaNumero === 1
  );
}
```

#### Internação Definitiva
- **Regra**: Apenas Casas 02 a 07 são permitidas
- **Exclusões**:
  - Casa 01 (reservada para provisórios)
  - Casa 08 (Fase 3 - não aceita conflitos ativos ou alertas disciplinares)
- **Justificativa**: Internação definitiva requer separação dos provisórios

```typescript
else if (tipoInternacao === "DEFINITIVA") {
  sugestoesValidas = sugestoesValidas.filter(
    (a) => a.alojamento.casaNumero >= 2 && a.alojamento.casaNumero <= 7
  );
}
```

### 2. Sistema de Fallback para Casos de Alto Risco
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Implementação** (linhas 367-396):

**Lógica**:
1. Separa sugestões em **seguras** (nível 0-3) e **arriscadas** (nível 4-5)
2. Se houver opções seguras: mostra até 10 (ou 3 se casa específica)
3. Se NÃO houver opções seguras:
   - Mostra as 3 opções MENOS ARRISCADAS
   - Adiciona aviso especial no topo dos motivos
   - Lista todos os conflitos/riscos associados

```typescript
const sugestoesSeguras = sugestoesValidas
  .filter((a) => a.nivelRisco <= 3)
  .sort((a, b) => a.nivelRisco - b.nivelRisco);

const sugestoesArriscadas = sugestoesValidas
  .filter((a) => a.nivelRisco >= 4)
  .sort((a, b) => a.nivelRisco - b.nivelRisco);

const sugestoes = sugestoesSeguras.length > 0
  ? sugestoesSeguras.slice(0, limitesugestoes)
  : sugestoesArriscadas.slice(0, 3).map((sug) => ({
      ...sug,
      motivos: [
        "⚠️ AVISO: Não há alojamentos seguros disponíveis. Esta é a opção MENOS ARRISCADA.",
        ...sug.motivos,
      ],
    }));
```

### 3. Seletor de Casa Específica para Operadores
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Estado Adicionado** (linha 82):
```typescript
const [casaEspecifica, setCasaEspecifica] = useState<number | null>(null);
```

**UI Implementada** (linhas 674-730):
- Seção opcional que aparece após selecionar tipo de internação
- Botão "Automático" (padrão): aplica regras por tipo de internação
- Botões de Casa 01 a 07 conforme tipo:
  - **Provisória**: apenas Casa 01
  - **Definitiva**: Casas 02 a 07
- Design com destaque visual (amber) para diferenciar de seleção obrigatória

```typescript
{tipoInternacao && (
  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
    <div className="flex items-start gap-3 mb-3">
      <Home className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
      <div>
        <h3 className="font-semibold text-amber-900 mb-1">
          Filtro por Casa Específica (Opcional)
        </h3>
        <p className="text-sm text-amber-700">
          Selecione uma casa para ver apenas os 3 melhores alojamentos
          disponíveis nessa casa, ordenados por nível de risco:
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 mt-3">
      <button onClick={() => setCasaEspecifica(null)}>Automático</button>
      {tipoInternacao === "PROVISORIA" ? (
        <button onClick={() => setCasaEspecifica(1)}>Casa 01</button>
      ) : (
        {[2, 3, 4, 5, 6, 7].map((casa) => (
          <button key={casa} onClick={() => setCasaEspecifica(casa)}>
            Casa {String(casa).padStart(2, '0')}
          </button>
        ))}
      )}
    </div>
  </div>
)}
```

**Lógica de Filtro** (linhas 348-365):
```typescript
if (casaEspecifica !== null) {
  // Modo manual: filtrar apenas pela casa selecionada
  sugestoesValidas = sugestoesValidas.filter(
    (a) => a.alojamento.casaNumero === casaEspecifica
  );
} else {
  // Modo automático: aplicar regras por tipo de internação
  if (tipoInternacao === "PROVISORIA") {
    sugestoesValidas = sugestoesValidas.filter(
      (a) => a.alojamento.casaNumero === 1
    );
  } else if (tipoInternacao === "DEFINITIVA") {
    sugestoesValidas = sugestoesValidas.filter(
      (a) => a.alojamento.casaNumero >= 2 && a.alojamento.casaNumero <= 7
    );
  }
}
```

**Limite de Resultados** (linhas 384, 236):
```typescript
// Quando casa específica selecionada: mostrar TOP 3
// Quando automático: mostrar até 10
const limitesugestoes = casaEspecifica !== null ? 3 : 10;
```

### 4. Melhorias na Estrutura de Dados
**Arquivo**: `components/estrutura/modal-analise-impacto.tsx`

**Campo casaNumero Adicionado** (linhas 291-303):
```typescript
const avaliacao = {
  alojamento: {
    id: aloj.id,
    numero: aloj.numero || aloj.numeroAlojamento,  // Compatibilidade
    ala: aloj.ala,
    casa: aloj.casa.nome || `Casa ${String(aloj.casa.numero).padStart(2, '0')}`,
    casaNumero: aloj.casa.numero,  // NOVO: facilita filtragem
  },
  nivelRisco: resultado.nivel_numerico ?? 3,
  categoria: resultado.nivel_risco ?? "DESCONHECIDO",
  motivos: resultado.motivos ?? [],
  permiteAlocacao: resultado.permite_alocacao ?? false,
};
```

---

## 🔍 Debug e Logs Adicionados

### Logs Temporários para Diagnóstico
**Arquivos com Debug Logs**:

1. **modal-alojamento-detalhes.tsx** (linhas 326-336, 344, 354):
   - Log de conflitos externos encontrados
   - Log de comparação de bairros/facções
   - Log de rivais reais identificados

2. **modal-analise-impacto.tsx** (linha 276, 305):
   - Log de quantidade de alojamentos vagos
   - Log de cada avaliação de alojamento

3. **app/api/verificar-alocacao/route.ts** (linhas 322-327, 368-376, 383-391, 401-405, 428-432):
   - Log de moradores com conflitos carregados
   - Log de adolescente sendo simulado
   - Log de status do alojamento antes da simulação
   - Log de alojamento frontal detectado
   - Log de resultado final do cálculo

**⚠️ IMPORTANTE**: Estes logs devem ser removidos antes de produção.

---

## 📋 Regras de Negócio Implementadas

### Matriz de Alocação por Tipo de Internação

| Tipo de Internação | Casas Permitidas | Casas Excluídas | Motivo da Exclusão |
|-------------------|------------------|-----------------|-------------------|
| **Provisória** | Casa 01 | Casas 02-08 | Triagem inicial, isolamento |
| **Definitiva** | Casas 02-07 | Casa 01, Casa 08 | Casa 01 é provisória; Casa 08 é Fase 3 |

### Níveis de Risco e Ações

| Nível | Categoria | Cor | Ação do Sistema |
|-------|-----------|-----|-----------------|
| 0 | LIVRE | Cinza | Sugerir normalmente |
| 1 | SEGURO | Verde | Sugerir normalmente |
| 2 | MONITORAR | Lima | Sugerir normalmente |
| 3 | ATENÇÃO | Amarelo | Sugerir com ressalvas |
| 4 | ELEVADO | Laranja | Não sugerir (exceto se não houver opções) |
| 5 | CRÍTICO | Vermelho | Não sugerir (exceto se não houver opções) |

### Filtros de Sugestão

**Modo Automático**:
- Exclui alojamentos INTERDITADOS
- Exclui alojamentos já ocupados
- Aplica regras de casa por tipo de internação
- Prioriza níveis 0-3
- Mostra até 10 sugestões

**Modo Casa Específica**:
- Exclui alojamentos INTERDITADOS
- Exclui alojamentos já ocupados
- Filtra APENAS pela casa selecionada
- Prioriza níveis 0-3
- Mostra TOP 3 sugestões

---

## 🧪 Testes Realizados

### Cenário 1: Enzo (não alocado) com conflito com João
**Setup**:
- Enzo: não alocado, tem conflito ATIVO com João
- João: alocado no alojamento 04, Ala A, Casa 01

**Teste 1**: Sugestão automática para Enzo (Provisória)
- ✅ Sistema exclui alojamento 08 (INTERDITADO)
- ✅ Sistema filtra apenas Casa 01
- ❌ **BUG IDENTIFICADO**: Alojamento 03 (frontal ao João) retornava nível 1
- ✅ **CORRIGIDO**: Conflitos de João agora são carregados, detecta conflito frontal

**Teste 2**: Seleção de casa específica
- ✅ Filtro por casa funciona corretamente
- ✅ Mostra apenas top 3 da casa selecionada
- ✅ Ordena por nível de risco crescente

### Cenário 2: Marcos Sanches (Requião) vs Santa Felicidade
**Setup**:
- Marcos Sanches: bairro Requião
- Conflito territorial: Requião ↔ Santa Felicidade
- Carlos Andrade e Jean Reis: ambos de Santa Felicidade, ambos na mesma ala

**Teste**: Visualizar conflitos de Marcos
- ❌ **BUG ORIGINAL**: Mostrava apenas Carlos OU Jean
- ✅ **CORRIGIDO**: Mostra AMBOS Carlos E Jean em um único card de conflito

---

## 🔄 Migrações de Dados

Nenhuma migração de banco de dados foi necessária nesta sessão.

---

## ⚠️ Itens Pendentes

1. **Remover logs de debug** dos seguintes arquivos:
   - `modal-alojamento-detalhes.tsx` (linhas 326-336, 344, 354)
   - `modal-analise-impacto.tsx` (linhas 276, 305)
   - `app/api/verificar-alocacao/route.ts` (múltiplas linhas)

2. **Validar Casa 08 - Fase 3**:
   - Confirmar regra de negócio: Casa 08 não aceita conflitos ativos
   - Implementar filtro adicional se necessário

3. **Testes de Integração**:
   - Testar todos os tipos de conflito (BAIRRO, FACCAO, DIRETO)
   - Testar com múltiplos adolescentes em conflito
   - Testar realocação com casa específica

4. **Otimização de Performance**:
   - Avaliar impacto de consultar TODOS os alojamentos vagos
   - Considerar paginação se necessário

5. **Documentação de Usuário**:
   - Criar guia de uso do seletor de casa específica
   - Documentar significado de cada nível de risco
   - Explicar avisos de "opção menos arriscada"

---

## 📚 Arquivos Modificados

1. `components/mapa/modal-alojamento-detalhes.tsx`
2. `components/estrutura/modal-analise-impacto.tsx`
3. `components/mapa/modal-alocacao.tsx`
4. `app/api/verificar-alocacao/route.ts`

**Total de Linhas Modificadas**: ~400 linhas

---

## 🎯 Próximos Passos Sugeridos

1. **Code Review**: Revisar implementações com equipe
2. **Testes de Aceitação**: Validar com usuários finais
3. **Limpeza**: Remover todos os logs de debug
4. **Documentação**: Atualizar manual do usuário
5. **Performance**: Monitorar tempos de resposta em produção
