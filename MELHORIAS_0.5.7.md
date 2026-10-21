# AlfaDelivery PRO 0.5.7 — Conciliação e fechamento

- Confirmações novas de pagamento de pedidos passam a guardar `payment_confirmed_at`; reabertura ou estorno limpam essa data.
- Pedidos históricos sem timestamp ficam fora da conciliação.
- Fechamentos diários armazenam fotografia do esperado, conferido e diferença em `alfa_cash_closures`, com auditoria.
- Histórico e exportação CSV de fechamentos.
- Não altera vendas, fiado ou despesas.
- O valor esperado não equivale a extrato bancário e não é lucro líquido.
