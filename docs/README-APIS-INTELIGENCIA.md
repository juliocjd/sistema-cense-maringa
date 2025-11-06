# APIs de Inteligência Operacional

Este guia descreve as rotas responsáveis pela análise de risco de alocação, grupos e eventos especiais. Todas as chamadas exigem sessão autenticada via NextAuth/`auth()`; o backend ignora qualquer `operadorId` enviado pelo cliente.

---

## Autenticação
- Requer cookie de sessão válido (NextAuth).  
- Rotas retornam `401` se a sessão for inexistente e `403` se o operador não estiver cadastrado/ativo.  
- Toda ação gera registro em `logAuditoria` com IP (`x-forwarded-for`) e operador autenticado.

---

## 1. Verificação de Alocação

`GET /api/verificar-alocacao?adolescenteId=<uuid>&alojamentoId=<uuid>`

### Resposta (200)
```jsonc
{
  "permite_alocacao": true,
  "requer_justificativa": false,
  "nivel_risco": "MEDIO",
  "nivel_numerico": 3,
  "alertas": [
    {
      "tipo": "CONFLITO_MESMA_CASA",
      "nivel": 3,
      "mensagem": "Conflito ativo com João Silva na Casa 02 (ala B).",
      "adolescente_conflitante": {
        "id": "uuid-adversario",
        "nome": "João Silva",
        "alojamento": "Casa 02 - 05B"
      },
      "tipo_conflito": "FACCAO",
      "origem": "CI"
    }
  ],
  "adolescente": {
    "id": "uuid-adolescente",
    "nome": "Pedro Santos",
    "sms": "12345"
  },
  "alojamento": {
    "id": "uuid-alojamento",
    "casa": "Casa 02",
    "numero": "05",
    "ala": "B"
  },
  "estatisticas": {
    "total_conflitos_ativos": 3,
    "conflitos_detectados_nesta_alocacao": 1
  }
}
```

### Regras Principais
- Nível 5: crítico (alojamento frontal com rival).  
- Nível 4: alto (mesma ala).  
- Nível 3: médio-alto (outra ala da mesma casa).  
- Nível 2: médio (zonas de risco cadastradas).  
- Nível 1: baixo (nenhum conflito).  
- Se o alojamento estiver interditado ou ocupado, a API retorna `400` com `permite_alocacao` falso.

---

## 2. Alocação de Adolescente

`POST /api/alocar`

### Request
```jsonc
{
  "adolescenteId": "uuid",
  "alojamentoId": "uuid",
  "justificativa": "Única vaga disponível, vigilância reforçada.",
  "medidas_adicionais": ["Monitoramento 24h"]
}
```

### Comportamento
1. Reexecuta internamente `/api/verificar-alocacao`.  
2. Se `requer_justificativa = true` e nenhuma justificativa for enviada, responde `400`.  
3. Atualiza o `alojamentoAtualId` do adolescente, cria `DecisaoOperacional` (quando necessário) e registra `LogAuditoria`.  
4. Toda operação roda dentro de transação Prisma.

### Resposta (201)
```jsonc
{
  "sucesso": true,
  "mensagem": "Adolescente alocado com sucesso",
  "documentado": true,
  "adolescente": {
    "id": "uuid",
    "nome": "Pedro Santos",
    "alojamento": {
      "casa": "Casa 02",
      "numero": "05",
      "ala": "B"
    }
  },
  "decisao_id": "uuid-decisao",
  "nivel_risco": "MEDIO",
  "alertas_processados": 1
}
```

### Erros Possíveis
- `400`: justificativa ausente, alojamento ocupado, alojamento interditado.  
- `404`: adolescente ou alojamento inexistente.  
- `409`: conflito de ocupação detectado durante a transação.

---

## 3. Desalocação

`DELETE /api/alocar?adolescenteId=<uuid>`  
Corpo opcional (JSON) aceita `justificativa` e `motivo`. O operador é inferido via sessão.

### Resposta (200)
```jsonc
{
  "sucesso": true,
  "mensagem": "Adolescente removido do alojamento",
  "alojamento_liberado": {
    "id": "uuid-aloj",
    "casa": "Casa 02",
    "numero": "05",
    "ala": "B"
  }
}
```

Se o adolescente já estiver sem alojamento, a rota retorna `409` com mensagem explicativa.

---

## 4. Adicionar Membro a Grupo

`POST /api/grupos/{id}/adicionar-membro`

```jsonc
{
  "adolescenteId": "uuid",
  "justificativa": "Mediação concluída",
  "medidas_adicionais": ["Supervisão durante refeições"]
}
```

### Validações
- Impede duplicidade de membro ativo.  
- Avalia conflitos com membros do grupo ou da casa do grupo.  
- Retorna `400` quando requer justificativa e não foi enviada.  
- Registra `DecisaoOperacional` e `LogAuditoria` quando necessário.

### Resposta (201)
```jsonc
{
  "sucesso": true,
  "mensagem": "Adolescente adicionado ao grupo",
  "documentado": true,
  "membro": {
    "id": "uuid",
    "adolescente": { "id": "uuid-adol", "nome": "Pedro Santos" },
    "grupo": { "id": "uuid-grupo", "nome": "Grupo Alpha" },
    "data_entrada": "2025-11-05T19:23:18.123Z"
  },
  "decisao_id": "uuid-decisao",
  "nivel_risco": "ALTO",
  "alertas_processados": 2
}
```

---

## 5. Eventos Especiais

### 5.1 Listar / Criar
- `GET /api/eventos-especiais` aceita filtros `status`, `data_inicio`, `data_fim`, `incluirGrupos`, `incluirParticipantes`.  
- `POST /api/eventos-especiais` cria evento, associa grupos/participantes e executa a análise de risco inicial.

### Request (POST)
```jsonc
{
  "titulo": "Campeonato de Futsal",
  "descricao": "Evento interno com supervisão total.",
  "inicioPrevisto": "2025-11-10T14:00:00Z",
  "fimPrevisto": "2025-11-10T18:00:00Z",
  "gruposParticipantes": ["uuid-grupo-1"],
  "adolescentesParticipantes": ["uuid-adolescente-1", "uuid-adolescente-2"]
}
```

### Resposta (201)
```jsonc
{
  "evento": {
    "id": "uuid-evento",
    "titulo": "Campeonato de Futsal",
    "status": "PLANEJADO",
    "inicioPrevisto": "2025-11-10T14:00:00.000Z",
    "fimPrevisto": "2025-11-10T18:00:00.000Z",
    "grupos": [...],
    "participantes": [...]
  },
  "analise": {
    "score_risco_combinado": 4.2,
    "nivel": "ALTO",
    "conflitos_criticos": 1,
    "recomendacoes": ["Separar rivais em horários distintos."]
  }
}
```

### 5.2 Verificar Conflitos de um Evento
`POST /api/eventos-especiais/{id}/verificar-conflitos`

Request opcional permite informar subconjuntos de grupos/participantes:
```jsonc
{
  "gruposParticipantes": ["uuid-grupo-1"],
  "adolescentesParticipantes": ["uuid-adolescente-1"]
}
```
Quando omitido, usa os dados já cadastrados no evento.

### Resposta
```jsonc
{
  "eventoId": "uuid-evento",
  "participantes_avaliados": 12,
  "analise": {
    "score_risco_combinado": 6.1,
    "nivel": "CRITICO",
    "conflitos_criticos": 2,
    "conflitos_detalhados": [
      {
        "adolescenteA": { "id": "...", "nome": "João" },
        "adolescenteB": { "id": "...", "nome": "Enzo" },
        "motivo": "Rivalidade entre facções"
      }
    ],
    "recomendacoes": ["Separar alojamentos", "Reforçar escolta"],
    "participantes_avaliados": 12
  }
}
```

### Erros
- `404` se algum grupo/participante informado não existir.  
- `400` quando o corpo contém tipos inválidos.

---

## Logs e Auditoria
Todas as rotas acima criam entradas em `logAuditoria` com os campos:
- `operadorId`: obtido da sessão.  
- `acao`: string padronizada (ex.: `ALOCACAO_REALIZADA`, `GRUPO_ADICIONAR_MEMBRO`, `EVENTO_VERIFICAR_RISCO`).  
- `tabelaAfetada`: nome lógico (ex.: `adolescentes`, `eventos_especiais`).  
- `registroIdAfetado`: id principal da entidade alterada.  
- `detalhesAlteracao`: objeto JSON com dados contextualizados (nível de risco, justificativa etc.).  
- `ipOrigem`: `x-forwarded-for` ou `unknown`.

---

## Testes Automatizados
- Vitest configurado em `vitest.config.ts`.  
- Suites existentes: `tests/lib/calc-risco-evento.test.ts`, `tests/api/alocar.test.ts`, `tests/api/eventos-especiais-verificar.test.ts`.  
- Pendências: cenários “happy path” para POST/DELETE alocação, testes de grupos e integrações com dados reais de Prisma (work-in-progress).

---

_Documento revisado em 05/11/2025._
