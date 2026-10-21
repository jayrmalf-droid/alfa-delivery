# Melhorias 0.8.4 — PRÉVIA

Base: 0.8.3. Escopo: organização de relatórios, entrada de metas, busca de páginas, agenda e responsividade administrativa.

## Relatórios mais fáceis de consultar

- Três abas: Resumo do período, Metas mensais e Comparações.
- O resumo mantém seus indicadores, formas de pagamento, ranking, tabela e exportação. Datas e status aplicam-se apenas a essa aba.
- Metas usam seu próprio mês. Comparações mostram seus períodos fixos e deixam explícito que o gráfico por hora considera todo o histórico carregado.
- Trocar de aba preserva os filtros e os estados das seções durante a mesma visita a Relatórios. Não é persistência após sair da página.
- Abas com semântica acessível e navegação por setas, Home e End.
- Datas vazias ou intervalo inválido mostram orientação e bloqueiam a exportação do resumo.
- Exportação do resumo e metas tratam prefixos de fórmula e aspas de forma consistente, preservando os caracteres originais do texto. Nenhum dado gravado é alterado.

## Campo de meta mensal

Aceita 1.000,00, 1000,00, R$ 1.000,00 e entradas numéricas equivalentes. Agrupamentos quebrados e centavos excedentes são rejeitados. Essa mudança abrange o campo de meta, não todos os campos monetários do sistema.

O mês mostra a meta existente como exemplo formatado. Ao mudar de mês, uma entrada ainda não salva é limpa, evitando aplicá-la ao mês errado. Os limites de valor do servidor permanecem.

## Busca de páginas

Busca lateral e Ctrl+K compartilham a normalização sem acentos e os mesmos títulos e grupos de páginas. Exemplos: relatorios, configuracoes e visao geral. Os nomes visíveis continuam identificando as seções existentes.

## Agenda

Antes, Esta Semana e Este Mês não restringiam o período, e Hoje/Amanhã usavam a data UTC. Agora os quatro filtros usam a data da Bahia, com semana de segunda a domingo e mês civil. O intervalo aparece na tela; cartões são ordenados pela data e hora agendadas. Pedidos existentes não são regravados e o tratamento anterior de status é mantido.

## Celular

- Cabeçalho em duas linhas, com menu, seção, busca, pendências e acesso ao cardápio. O botão de som continua acessível no menu lateral.
- Filtros de datas, status e contador de pedidos separados, sem sobreposição.
- Visão geral, Agenda e Cupons sem o transbordamento anteriormente medido em 320 px nos cenários testados.
- Cartões e gráficos das abas de Relatórios adaptados a larguras estreitas. Rolagem horizontal de tabelas permanece dentro da própria tabela.

## Preservação e limites

Sem mudança no servidor de aplicação, esquema SQLite, pedidos, estoque, fidelidade ou regras financeiras da 0.8.3. Alterações de agenda e entrada de meta atuam no fluxo de consulta/preenchimento. Nenhuma migração ou regravação de registros antigos.

Sem novas dependências. Cardápio público mantém sua apresentação e funções. Não inclui operadores ou perfis adicionais. Os demais pontos da revisão ficam para etapas futuras, incluindo unificação de telefones e decisões sobre estoque/personalização na venda rápida.

Esta entrega é uma prévia técnica; conferir no Windows conforme ATUALIZACAO_0.8.4.md.
