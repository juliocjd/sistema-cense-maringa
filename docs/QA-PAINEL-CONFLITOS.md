# QA - painel de tecnicos de referencia e Conflitos

Checklist para validar a nova tela `/conflitos` e o fluxo automático de alocação durante o cadastro:

1. **Cadastro com alocação automática**
   - Acesse `/adolescentes/novo`, preencha os dados pessoais, selecione um alojamento preferencial na etapa “Vinculações” e finalize o cadastro.
   - Confirme que a UI mostra “Adolescente cadastrado com sucesso” e redireciona para `/adolescentes/<id>` real.
   - No DevTools > Network verifique se:
     * `POST /api/adolescentes` retornou 201 e trouxe `adolescente.id`,
     * `POST /api/alocar` foi chamado com `adolescenteId` + `alojamentoId` e devolveu 200 (ou 400 caso exija justificativa, neste caso preencher texto e prosseguir).

2. **Monitoramento de tecnicos**
   - Entre em `/conflitos` e confira se o header mostra o título correto e se o painel de tecnicos de referencia carrega com nome, e-mail e total de adolescentes acompanhados.
   - Altere o filtro entre “Todos”, “Bairros” e “Facções” e certifique-se de que a lista de conflitos muda conforme o tipo, exibindo status ativo e origem ↔ destino.
   - Verifique se há coesão visual com o restante do layout (cards claros, grid responsivo, tipografia alinhada ao padrão).

3. **Sidebar e scroll**
   - No desktop, recolha o sidebar e passe o mouse sobre ele; confirme que ele se expande com os rótulos e mantém a informação visível.
   - Verifique se o scroll do menu lateral usa a classe `sidebar-scrollbar` (barra fina, thumb roxa com borda escura).

5. **Cadastros de tecnicos/conflitos via UI**
   - Navegue até `/tecnicos`, preencha o formulário e confirme que os novos tecnicos aparecem imediatamente na lista (verifique rede para o `POST /api/tecnicos` retornar 201).
   - Em `/conflitos`, use o formulário lateral para registrar um novo conflito entre bairros ou facções; o painel deve mostrar o conflito listado ao lado e a notificação pode ser testada com o botão “Notificar tecnicos”.
   - Confirme que qualquer erro de criação (email duplicado, conflito duplicado) mostra a mensagem vermelha esperada no formulário.

4. **Teste automatizado**
   - Rode `npm run test` antes de cada release para garantir que as suites continuam passando (o warning de 500 em `analytics-alertas` é esperado e já está documentado).

Documente novos bugs ou ajustes detectados e relacione-os às seções do backlog (`docs/BACKLOG-FUNCIONALIDADES.md`). Use esse guia como base sempre que o fluxo de grupos/conflitos sofrer alterações.
6. **Conflitos externos**
   - Abra /inteligencia/conflitos (rotulado como �Conflitos Externos�) e confirme cabe�alho, cart�es de totais e bot�es �Ver impactos�/�Encerrar�.
   - Use o formul�rio �Registrar conflito externo� para criar registros territoriais e faccionais; ap�s o POST eles devem aparecer no painel e alimentar o resumo de impacto.
   - Valide o cat�logo de bairros e fac��es (cadastro/edi��o/remo��o) conferindo as chamadas POST/PUT/DELETE e os contadores de adolescentes vinculados.
   - No card �Relat�rio de impacto� teste filtros (tipo/status), informe um conflitoId espec�fico e gere o CSV garantindo que os adolescentes listados correspondem ao conflito escolhido.


