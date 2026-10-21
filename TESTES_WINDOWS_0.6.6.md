# Homologação Windows — AlfaDelivery PRO 0.6.6 PRÉVIA REV4

A 0.6.5 permanece estável. Esta entrega reúne as melhorias de layout e design de todo o painel administrativo.

## Preparação

1. Gere um backup da 0.6.5 e encerre o servidor com Ctrl+C.
2. Preserve a pasta completa da 0.6.5. Extraia a 0.6.6 em uma pasta diferente.
3. Abra AlfaDeliveryPRO_0.6.6/alfadeliveryPRO na pasta extraída.
4. Copie .env, data, backups e as imagens de public/uploads da instalação estável para a cópia da 0.6.6, mantendo os originais na pasta estável. Faça a cópia com o servidor encerrado.
5. Se ALFA_DATABASE ou ALFA_BACKUP_DIR apontar para caminho absoluto, ajuste somente o .env da cópia para usar os dados da cópia. Não aponte a prévia para o banco estável. Se começar sem configuração anterior, execute npm run setup.
6. Use Node.js 24 ou superior. Execute, um comando por vez:

```cmd
npm ci
npm audit
npm test
npm run build
npm start
```

Esperado: 58 testes aprovados, nenhuma vulnerabilidade e compilação sem erros. Acesse http://localhost:3001/admin, ou a PORT configurada. Entre com o acesso administrativo já existente e abra “Visão geral”.

## Testes

| Teste | Procedimento | Esperado |
|---|---|---|
| 1 — Dados preservados | Confira produtos, pedidos, clientes, pontos, vendas, despesas, metas e configurações. | Os mesmos dados da cópia da 0.6.5, sem solicitação de operadores ou perfis. |
| 2 — Navegação | Abra as 13 seções do menu. Recolha e expanda o menu no computador. Role o menu para alcançar as opções inferiores. | Seção ativa destacada, título correto no cabeçalho e todas as opções acessíveis. Clique na lupa ou use Ctrl+K, digite “relatorios” e pressione Enter: deve abrir Relatórios. Teste um termo inexistente, as setas e Escape. O foco deve retornar ao botão de busca. |
| 3 — Visão geral | Confira os quatro indicadores, filtros Hoje/Ontem/7 dias/30 dias/Todos e pedidos recentes. | Cartões legíveis, valores e filtros preservados. Abrir um pedido recente leva ao fluxo de pedidos existente. |
| 4 — Formulários e tabelas | Abra um produto, uma categoria, cliente, cupom, bairro e configurações. Faça uma alteração de teste na cópia e atualize a página. Em Produtos, confira também a pesquisa, o resumo de estoque e as abas do editor. Em Configurações, visite todas as abas. | Campos legíveis, foco visível, tabelas utilizáveis e gravação confirmada. Botões e campos não ficam cortados. No computador, ative a visualização compacta pelo botão ao lado da busca; recarregue e confira que a escolha foi mantida. Desative para voltar ao espaçamento confortável. |
| 5 — Tela menor | No Chrome, pressione F12, ative a barra de dispositivos com Ctrl+Shift+M e teste larguras 390 e 320. Abra e feche o menu; visite Produtos, Venda rápida, Relatórios e Despesas. | Menu sobreposto fecha após escolher a seção; cartões reorganizados; campos acessíveis. Tabelas largas podem ser roladas horizontalmente dentro de sua área. |
| 6 — Teclado | Recarregue o painel e pressione Tab até aparecer “Ir para o conteúdo”; pressione Enter. Use Tab nos filtros da visão geral e abra um pedido recente com Enter. | Foco visível e ações funcionando pelo teclado, sem exigir clique do mouse. Abra as janelas de Produto, Banner, Cupom e Bairro: o Tab deve permanecer na janela, Escape deve fechar quando não estiver gravando e o foco deve retornar ao botão de abertura. |
| 7 — Regressão | Confira cardápio do cliente, pedido personalizado, estoque, pontos, recebimento, relatório, backup e prévia/impressão de cupom. | Funções da 0.6.5 preservadas. O painel mantém as melhorias anteriores; o cardápio do cliente recebe o novo visual da revisão 4; confira também TESTES_CARDAPIO_0.6.6_REV4.md. |
| 8 — Pacote | Execute npm run release e depois npm run verify:release. | AlfaDeliveryPRO_0.6.6_design_cardapio_PREVIA_REV4.zip criado; arquivos e exclusões conferidos; instalação, 58 testes e compilação aprovados após extração. |

## Avaliação visual

Além de aprovar o funcionamento, informe se a aparência está confortável: contraste, tamanho das letras, espaçamento, menu, cartões e facilidade para encontrar os botões. Se algo estiver apertado ou cortado, informe a tela, a resolução/largura e o elemento.

Não é necessário alterar relógio do Windows, regras de pontos ou valores históricos. Use somente registros de teste na cópia. A 0.6.6 só será estável após sua aprovação; para voltar, encerre a prévia e inicie a pasta preservada da 0.6.5.
