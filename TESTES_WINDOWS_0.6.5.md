# Testes Windows — AlfaDelivery PRO 0.6.5 PRÉVIA

A 0.6.4 continua estável. Não extraia a prévia sobre ela.

## Preparação

1. Gere um backup da 0.6.4 e encerre o servidor com Ctrl+C.
2. Preserve a pasta completa da 0.6.4, com .env, data, backups e public/uploads.
3. Extraia o ZIP da 0.6.5 em outra pasta. O projeto está em AlfaDeliveryPRO_0.6.5/alfadeliveryPRO.
4. Copie .env, data, backups e as imagens de public/uploads da instalação estável para a pasta nova, com o servidor encerrado. Mantenha os originais na pasta estável.
5. Se ALFA_DATABASE ou ALFA_BACKUP_DIR usar caminho absoluto, ajuste o .env da cópia para apontar aos dados da cópia. Não aponte a prévia para o banco de produção. Sem configuração anterior, execute npm run setup.
6. Use Node.js 24 ou superior. Execute na pasta alfadeliveryPRO:

```cmd
npm ci
npm audit
npm test
npm run build
npm start
```

Esperado: 58 testes aprovados, zero vulnerabilidades e compilação sem erros. Abra http://localhost:3001/admin, ou a PORT configurada.

## Homologação

| Teste | Procedimento | Esperado |
|---|---|---|
| 1 — Preservação | Confira catálogo, pedidos, vendas, fiados, pontos, despesas, configurações e fechamentos anteriores. | Registros preservados; snapshots de fechamentos históricos não alterados. |
| 2 — Recebido hoje | Registre venda de teste, faça recebimento parcial e atualize a página. | Recebimento aparece uma vez no dia da Bahia; valor pago e saldo corretos. |
| 3 — Despesas e caixa | Selecione o dia atual nos dois filtros. Confira a entrada do teste 2, registre despesa de teste e um fechamento na cópia. | Recebimentos no dia correto e saldo consistente com entradas menos despesas. |
| 4 — Relatório e CSV | Filtre o dia atual em Relatórios e metas e exporte CSV de pedidos. Exporte também os fechamentos. | Datas exibidas na Bahia; coluna local e coluna original no CSV; filtros e tabela consistentes. |
| 5 — Metas e painel financeiro | Confira o mês atual, o mês anterior e o resultado financeiro mensal. | Mês correto da Bahia e comparação mensal consistente. Metas continuam editáveis e persistentes. |
| 6 — Viradas de data | Execute npm test e confira os testes de 21h, meia-noite, mês, ano e fuso do computador. | Todos aprovados. Não é necessário alterar o relógio do Windows ou os timestamps do banco. Se operar depois das 21h, confira também uma venda real de teste no dia atual. |
| 7 — Regressão | Faça pedido de teste, personalize, confira estoque, pontos, pagamento e impressão. Gere backup pelo terminal e pelo painel. | Funcionalidades homologadas na 0.6.4 preservadas. |
| 8 — Distribuição | Execute npm run release e npm run verify:release. | ZIP 0.6.5 criado no Windows; arquivos e exclusões verificados; instalação, 58 testes e compilação aprovados após extração. |

## Interpretação dos resultados

Recebimentos próximos da meia-noite UTC podem mudar de dia/mês em comparação com a 0.6.4, pois agora usam o horário da Bahia. O valor total dos registros não muda. Fechamentos históricos permanecem como foram registrados; não os atualize apenas para testar. Use datas e registros de teste na cópia.

Os filtros escolhidos por você permanecem na data selecionada. Quando iniciar uma tela, os valores padrão usam o dia/mês atual da Bahia.

Envie “Teste 1 aprovado”, “Teste 2 aprovado” etc. Depois dos oito testes, a aprovação de estabilidade é sua. Para voltar à 0.6.4, encerre a prévia e inicie a pasta estável preservada, sem copiar dados de teste de volta.
