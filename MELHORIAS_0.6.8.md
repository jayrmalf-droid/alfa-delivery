# AlfaDelivery PRO 0.6.8 — Operação Avançada de Pedidos (prévia)

Base: 0.6.7 homologada.

- Indicador de pedidos abertos com mais de 20 e 40 minutos, com relógio atualizado a cada 30 segundos.
- Filtro avançado por prioridade; botão de acesso direto aos pedidos urgentes e opção de retornar a todos.
- Botão Mapa para pedidos de entrega com endereço, no Kanban e na tabela. Abre consulta do endereço no Google Maps em nova aba, sem API e sem geocodificação automática. Verifique o endereço antes de iniciar a rota.
- Nenhuma migração de banco de dados nem alteração das regras de negócio.

## Testes sugeridos

1. npm ci, npm audit, npm run build, npm start.
2. Verificar contagem de atrasados (+20 min) e urgentes (+40 min), ignorando concluídos e cancelados.
3. Filtrar urgentes e limpar o filtro.
4. Verificar atualização da idade do pedido sem recarregar a tela.
5. Abrir Mapa em pedido de entrega com endereço, conferir a pesquisa e confirmar que retiradas não mostram o botão.
6. Testar pesquisa, CSV, impressão, WhatsApp e avanço de situação.
7. Testar em celular e computador.
8. Verificar que pedidos, valores e dados anteriores continuam íntegros.

Esta é uma prévia para testes, não uma versão homologada. A compilação não pôde ser executada no ambiente de preparação porque uma dependência não estava disponível no cache npm.
