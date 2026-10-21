# AlfaDelivery PRO 0.5.4 — Auditoria financeira

- Novos eventos na auditoria administrativa: `sale_created`, `sale_cancelled`, `sale_payment_status_changed`, `sale_payment_amount_changed`, `sale_amount_adjusted`, `sale_removed`, `order_cancelled`.
- Eventos de alteração de status e pagamento de pedidos incluem transição anterior → nova.
- Eventos financeiros são inseridos na mesma transação da atualização de vendas; sem alterar os cálculos financeiros.
- Operador individual não é inferido: o mecanismo atual de sessão só verifica acesso administrativo.
- A auditoria é prospectiva; eventos anteriores à atualização não são recriados.
- A exportação CSV existente contempla os novos tipos de evento.

**Atenção:** o endpoint legado de atualização de vendas transmite a lista completa; operações de alteração de valores ou remoção são registradas como eventos, mas a versão não impõe autorização individual por operador.
