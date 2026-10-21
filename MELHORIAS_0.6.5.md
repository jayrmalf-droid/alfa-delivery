# AlfaDelivery PRO 0.6.5 — Datas financeiras no horário da Bahia

Status: PRÉVIA para homologação. Base estável preservada: 0.6.4, com os dez testes funcionais aprovados pelo proprietário e correção do ZIP Windows.

## Alterações

- “Recebido hoje”, fechamento de caixa, painel financeiro, metas, filtros de relatórios e comparações de vendas usam o calendário de America/Bahia.
- Um recebimento às 22h de 31/10 na Bahia, armazenado como 01h UTC de 01/11, pertence ao dia 31/10 e ao mês de outubro nesses indicadores.
- Vencimentos, datas de pagamento de despesas e o dia escolhido para um fechamento são datas de calendário: não são deslocados por conversão de fuso.
- A validação de vencimento da venda a prazo compara com o dia atual da Bahia, permitindo o vencimento no próprio dia após as 21h.
- A comparação com o mês anterior e as sequências mensais usam operações de calendário independentes do fuso configurado no computador.
- Os relatórios exibem o horário da Bahia; o CSV de pedidos e o CSV de fechamentos incluem uma coluna local e mantêm uma coluna com o registro original.
- O gráfico de horário de maior movimento apresenta a hora da Bahia, em vez de interpretar a hora UTC como hora local.
- Valores sem data válida não são classificados como ocorridos hoje. Horários completos sem indicação de fuso são tratados como ambíguos e não entram nos filtros por período. Os registros novos do sistema já usam ISO com UTC.

## Preservação e limites

Os timestamps continuam gravados em UTC. Nenhum registro histórico é regravado e nenhuma estrutura do SQLite foi alterada. Valores financeiros, regras de estoque, fidelidade, pedidos, cadastros e confirmação de gravação são preservados. Nenhum controle de operadores ou perfis foi acrescentado.

Os totais por dia ou mês podem mudar em relação à 0.6.4: registros antes agrupados no dia UTC passam ao dia correto da Bahia. Fechamentos históricos salvos são snapshots e não são recalculados automaticamente; seus valores continuam preservados. Ao atualizar um fechamento por ação do usuário, o novo cálculo usa as datas corrigidas.

Os indicadores de “Recebimentos confirmados” do relatório geral continuam agrupados pela data de criação do pedido. A conciliação em Despesas e caixa usa a data real de confirmação do pagamento. Essa distinção foi mantida e explicitada.

A correção do ZIP Windows da 0.6.4 permanece incluída. O pacote exclui .env, data operacional, backups, node_modules, dist e bancos SQLite. src/data/initialData.ts e src/data/bannerSeeds.ts permanecem incluídos; .env.example é o modelo de configuração.
