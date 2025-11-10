# QA - Mapa Operacional

Checklist rapido para validar as entregas mais recentes do painel `/estrutura`.

## 1. Cores e alertas
- Abra `/estrutura?tab=mapa-operacional` e confirme que os alojamentos ocupados exibem badges extras quando ha conflitos externos (vermelho para risco critico, amarelo ou laranja para riscos elevados).
- Passe o mouse nos cards e confira o tooltip com a justificativa resumida do risco.
- Compare a cor/descricao exibidas no card com o retorno de `/api/casas/status` (campo `nivel_risco` + `alertas`) para garantir que o motor unico (`lib/riscos/calcular.ts`) esta em sincronia; nao deve haver divergencia entre API e UI.
- Confirme no DevTools (aba Network) que `/api/inteligencia/conflitos/impacto?status=ATIVO` responde 200 ao abrir a tela; se a requisicao falhar, os riscos externos e badges translúcidos nao serao exibidos.
- Repita a validacao na aba “Visao Geral” (ela reutiliza o mesmo `MapaInterativo`), garantindo que legendas, cores e o modal avancado estejam identicos aos da aba “Mapa Operacional”.
- Para alojamentos ocupados, verifique se a cor calculada (vermelho, laranja, amarelo, verde-lima ou verde) prevalece sobre `corRisco` manual.
- Confira a legenda "Escala de risco (niveis 0 a 5)" e valide se os textos 0, 1, 2, 3, 4, 5 e "Interditado" batem com as cores exibidas.
- Force cenarios: rival direto em frente (nivel 5), rival apenas na mesma ala (nivel 4), rival na mesma casa (nivel 3) e aliado do rival na casa (nivel 2). Nenhum alerta deve permanecer verde puro quando houver risco real.
- O badge "Aliados do rival na casa" so deve aparecer quando ha aliados (mesmo bairro/faccao) posicionados na mesma ala/casa; confirme se o modal lista os nomes e alojamentos desses aliados.
- Observe se a Casa 8 exibe o selo "Fase 3" e oito alojamentos (4 por lado) respeitando o layout novo.

## 2. Modal "Detalhes do alojamento"
- Clique em qualquer alojamento (ocupado ou livre) e confirme as tres abas: **Ocupacao atual**, **Transferir/realocar** e **Interdicao**.
- Na aba Ocupacao atual:
  - Confira dados do adolescente (SMS, bairro, faccao, alertas de saude/perfil).
  - O nome exibido no card e no modal deve mostrar nome e sobrenome (primeira + ultima palavra), facilitando a identificacao rapida.
  - Cada alerta deve aparecer como um card: riscos pessoais, conflitos internos e externos com os demais envolvidos listados por nome + alojamento/casa.
  - O texto "Nivel de risco atual" precisa refletir o valor calculado (1 ate 5) e combinar com a cor/alertas.
  - Quando houver tensao ambiental, o bloco amarelo deve listar todos os motivos detectados.
  - Teste os botoes "Remover do alojamento" e "Desinternar" com registros de prova.
- Quando o alojamento estiver livre, use o botao "Alocar adolescente" para abrir o modal de alocacao classico.

## 3. Transferencias e verificacao de riscos
- Na aba Transferir/realocar escolha uma casa e alojamento livres, depois clique em "Verificar riscos" (`/api/verificar-alocacao` precisa responder 200).
- O campo Justificativa so aparece depois da escolha do destino **e** quando `requer_justificativa=true`. Valide esse gatilho.
- Use "Sugerir destino" para buscar `/api/alocar/sugestoes`, selecione uma das opcoes e confirme se casa/alojamento sao preenchidos automaticamente.
- Ao comparar as sugestoes retornadas com o modal principal, verifique se `nivel`/`rotulo` e alertas sao identicos aos exibidos apos simular a transferencia (ambos usam `lib/riscos/calcular.ts`).
- Finalize uma transferencia e confirme se o mapa atualiza o card e o modal fecha.

## 4. Interdicao
- Na aba Interdicao, interdite um alojamento vazio preenchendo justificativa e numero de CI; ao concluir o card deve ficar cinza.
- Tente interditar um alojamento ocupado: espere o aviso "Remova ou transfira o adolescente antes de interditar" e o botao desabilitado.
- Libere um alojamento interditado preenchendo justificativa + CI novamente e confira se retorna ao modo livre.

## 5. Relatorio e filtros
- Em `/inteligencia/conflitos` clique em "Relatorio de impacto", gere o CSV no modal e valide filtros (tipo/status) antes de exportar.

> Se notar divergencia entre a cor do mapa e os alertas listados, abra a aba de rede e confirme se `/api/inteligencia/conflitos/impacto` respondeu 200; falhas nessa rota impedem o destaque dos riscos externos.
