# AlfaDeliveryPRO 0.8.14 — valores em reais e exportações

Entradas monetárias padronizadas em despesas, fechamento, limite de fiado do cadastro e da venda, desconto, entrada e recebimento. Aceitam formato brasileiro com milhares e centavos, símbolo R$ e decimal com ponto sem agrupamento. Formatos inválidos e centavos excedentes são recusados na confirmação.

Campos opcionais vazios continuam valendo zero. Fechamento preserva a possibilidade de conferir valor negativo. Demais campos permanecem não negativos; recebimentos continuam limitados ao saldo e vendas a prazo continuam sujeitas ao limite cadastrado.

Mensagens de valor recebido inválido passam a aparecer junto ao formulário da venda. Textos de ajuda e teclado decimal facilitam a entrada no celular; quantidade de produtos permanece inteira.

Exportações de despesas, fechamentos e painel gerencial usam a mesma proteção de CSV dos relatórios. Prefixos como =, + e - deixam de ser descartados: o texto original é preservado com apóstrofo de proteção. Números negativos exportados como texto também preservam seu sinal.

Nenhuma migração ou regravação de dados históricos. APIs, autenticação e banco permanecem os existentes. Confira a nova entrada com dados fictícios antes de usar na operação.
