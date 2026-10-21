# AlfaDelivery PRO 0.6.6 — PRÉVIA REV4

Entrega consolidada de layout e design de todo o painel. A versão estável preservada é a 0.6.5. Esta revisão substitui a prévia visual anterior para homologação, sem declarar a 0.6.6 estável.

## Alterações

- Menu lateral, cabeçalho e visão geral com hierarquia visual, indicadores e navegação consistentes.
- Padrão visual compartilhado entre as 13 seções: cartões, campos, tabelas, botões e áreas de ação.
- Pedidos com quadro rolável, cartões mais legíveis e ações reorganizadas para telas menores.
- Produtos com resumo de catálogo e estoque, pesquisa, tabela e editor reorganizados visualmente.
- Financeiro, vendas, relatórios, despesas e configurações seguindo os mesmos padrões de espaçamento e contraste.
- Formulários e janelas com cabeçalhos e ações acessíveis, rolagem interna e adaptação a telas estreitas.
- Janelas de pedidos, clientes, cupons, bairros, banners e sabores com tratamento de foco, retorno ao acionador e Escape, respeitando estados de gravação existentes.
- Campos de pesquisa com espaço para ícones, rótulos para ações por ícone, foco visível e áreas roláveis acessíveis por teclado.
- Ajustes responsivos conferidos em 1440, 768, 390 e 320 pixels, incluindo os editores de produtos, banners, cupons e bairros.

## Preservação

Sem alterações no esquema SQLite, regras de pedidos, pontos ou cálculos financeiros. Sem operadores, usuários individuais ou perfis. O cardápio do cliente recebeu a nova apresentação descrita na revisão 4. Não foram adicionadas dependências ao aplicativo.

O pacote não contém configuração privada, dados operacionais, backups, node_modules ou dist. Inclui os dois arquivos de seeds exigidos. Instale em outra pasta e siga TESTES_WINDOWS_0.6.6.md; a aprovação técnica não substitui a homologação do proprietário.

## Novidades da revisão 3

- Visão geral com cabeçalho em azul profundo, filtros de período contrastados e indicadores com maior destaque.
- Menu com tons graduais, marcador da seção ativa e acabamento consistente com a identidade vinho da loja.
- Tabelas com cabeçalhos padronizados, linhas alternadas e destaque ao passar o ponteiro.
- Busca de seções no cabeçalho: clique na lupa ou pressione Ctrl+K. Filtra sem diferenciar acentos; Enter abre o primeiro resultado; setas percorrem os resultados e Escape fecha. A busca navega entre as 13 seções e não pesquisa dados de clientes ou pedidos.
- Visualização compacta opcional no computador, pelo botão ao lado da busca. Reduz o espaçamento de tabelas e cartões de pedidos. A preferência fica salva apenas no navegador, sem alterar o banco. Telas menores mantêm os tamanhos de toque.
- Cabeçalho adaptado em duas linhas no celular, mantendo as ações acessíveis.

A revisão 2 permanece preservada em arquivo separado. O número do aplicativo continua 0.6.6 PRÉVIA; a revisão identifica apenas este novo pacote para homologação.

## Revisão 4 — cardápio do cliente

- Nova composição visual com tons claros, superfícies quentes, bordas suaves e destaque na cor principal configurada pela loja.
- Cabeçalho, navegação e informações de atendimento mais integrados, com ajustes de contraste e espaços.
- Banners com composição editorial, tipografia maior e fotos existentes preservadas; títulos, links, imagens e ofertas continuam controlados pelos cadastros atuais.
- Categorias em botões arredondados com rolagem horizontal e indicação da seleção.
- Catálogo com resumo da quantidade de opções, pesquisa, estado vazio e alternância entre cards e lista com ícones vetoriais.
- Cards com fotos amplas, descrição, preço, promoção, identificação de combos e ação mais clara.
- Duas colunas em celulares a partir de 360 pixels e uma coluna nas telas mais estreitas. O modo lista mantém composição horizontal.
- Carrinho, personalização e checkout com acabamento visual consistente. A navegação inferior indica a seção ativa também para tecnologias assistivas.
- Link de salto para o cardápio, foco visível e respeito à preferência por movimento reduzido.

Sem imagens novas artificiais, dependências adicionais, mudanças de banco, preços, regras de estoque, fidelidade ou cálculos de pedidos. As alterações administrativas da revisão 3 continuam incluídas. A documentação anterior registra o histórico; a revisão 4 amplia o escopo visual para o cliente.
