# Melhorias 0.8.6 — PRÉVIA

Base: 0.8.5. Escopo: apresentação e facilidade de uso de Cupons, Banners e Entrega e taxas.

## Padrão visual

Cabeçalhos seguem a identidade da versão anterior, com título, contexto e ação principal. Filtros ganham uma área consistente e contador de resultados. Indicadores adaptam-se a telas estreitas; os formulários deixam de aplicar caixas e espaçamentos excessivos a pequenos grupos de controles.

## Cupons

Busca com espaço para o ícone, filtros com indicação acessível de seleção e contador dos cupons encontrados. A área de código e cópia pode quebrar linha para acomodar códigos longos. No celular, código e geração automática ficam em linhas separadas no formulário.

Desconto, pedido mínimo, uso único, limite, validade e regras de resgate mantêm as rotinas existentes.

## Banners

Resumo com total, ativos e inativos. Busca sem acentos por título, subtítulo ou título do botão. Filtros Todos, Ativos e Inativos. Quando a busca não encontra resultados, há orientação e ação Limpar filtros; quando a base está vazia, permanece a criação do primeiro banner.

Os filtros atuam apenas na lista administrativa: não alteram a ordem de publicação nem ativam/desativam registros. Cartões mantêm imagem, conteúdo, situação, destino do botão e ações, reorganizados no celular. Editor, imagens, links e botão flutuante preservam suas rotinas anteriores.

## Entrega e taxas

Cabeçalho, indicadores, busca, filtros e ordenação padronizados. No celular, a tabela se apresenta como cartões com bairro, taxa, prazo, situação e ações; os cabeçalhos da tabela continuam no documento para tecnologias assistivas. A edição rápida continua disponível, com espaço para os campos e os botões. Confirmações locais são posicionadas para reduzir sobreposição no celular.

Taxas, cálculo de entrega e ajuste em massa mantêm suas rotinas anteriores.

## Preservação e limites

Servidor, banco, esquema, serviços de persistência e regras de pedidos não são alterados. As rotinas anteriores ao JSX de Cupons e Entrega e taxas são idênticas à 0.8.5. Banners recebe somente estados e derivação de lista para os novos filtros; seus manipuladores de gravação são preservados.

Sem migração, regravação de histórico ou dependências novas. Mantidos uso individual, ausência de operadores/perfis e todas as correções anteriores. Cardápio público mantém a apresentação e as funções existentes; os cadastros de banners, cupons e taxas continuam controlando seus dados como antes.

Conferir no Windows segundo ATUALIZACAO_0.8.6.md. Esta é uma prévia técnica.
