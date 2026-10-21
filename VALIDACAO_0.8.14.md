# Validação técnica — 0.8.14 PRÉVIA

- 82 testes automatizados aprovados: 79 anteriores e três novos sobre valores opcionais, conferência negativa e rejeição de formatos/sinais inválidos.
- TypeScript/Vite compilados.
- 21 verificações de navegador aprovadas em banco isolado com registros fictícios.
- Limite inválido não cria cliente; limite de 2.500,50 grava 2500.50.
- Desconto malformado não altera vendas nem cadastros. Venda de R$ 2.000,00 com desconto de R$ 250,50, entrada de R$ 1.000,00 e limite de R$ 2.000,00 registra total de R$ 1.749,50 e saldo de R$ 749,50.
- Recebimento com três casas decimais ou acima do saldo é recusado; R$ 749,50 quita exatamente a venda e registra o recebimento correto.
- Despesa inválida não é gravada; despesa de 1.250,50 grava 1250.50.
- Fechamento de -1.250,50 grava -1250.50.
- CSV de despesas preserva descrição iniciada por =; CSV de fechamento preserva sinal negativo e observação iniciada por =, com proteção de fórmulas.
- Clientes, Venda rápida e Despesas e caixa em 1440, 768, 390 e 320 px, sem transbordamento horizontal da área principal.
- Dois testes visuais adicionais dos indicadores monetários em 320 e 390 px após ajustar os cartões para uma coluna.
- Nenhum erro de JavaScript registrado durante a verificação.
- ZIP final reextraído para verificar instalação, testes e compilação.

Nenhum banco operacional foi iniciado ou alterado. Valores históricos não foram convertidos nem regravados. Homologação Windows do usuário e conferência operacional permanecem pendentes. O aviso de tamanho do bundle permanece não bloqueante.
