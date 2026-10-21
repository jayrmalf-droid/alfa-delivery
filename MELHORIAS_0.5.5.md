# AlfaDelivery PRO 0.5.5 — Despesas e caixa

- Novo módulo administrativo **Despesas e caixa**.
- Cadastro de despesas pagas ou pendentes, com categoria, valor, vencimento e forma de pagamento.
- Baixa de pendências com data efetiva de pagamento, cancelamento sem apagar histórico, exportação CSV.
- Auditoria transacional de inclusão, alteração, pagamento e cancelamento de despesas.
- Resumo por período: recebimentos de vendas rápidas e fiado conforme `payments[].created_at`, despesas pagas conforme `paid_date`, saldo parcial e pendências.
- Pedidos com pagamento confirmado são mostrados **separadamente**, pela data de criação, porque o histórico atual não garante data de recebimento. Não são somados ao saldo parcial.
- O saldo parcial **não é lucro** nem fechamento bancário definitivo. Não foram modificadas regras de vendas, fiado ou pedidos.
- Dados em `alfa_expenses`, criado apenas quando ausente; versão anterior permanece utilizável.

## Testes recomendados

`npm ci`, `npm audit`, `npm run build`, `npm start`; cadastrar despesa paga e pendente, baixar uma pendência, cancelar despesa, conferir exportação e registros de auditoria, testar saldo e backup.
