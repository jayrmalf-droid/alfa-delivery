# AlfaDelivery PRO 0.4.7 — Painel de fiado e recebíveis

## Novidades
- O Dashboard Geral passa a exibir o total a receber de vendas avulsas/fiado.
- Exibe a quantidade de vendas em aberto e o número de clientes com saldo devedor.
- Destaca valores vencidos com base na data de vencimento registrada na venda.
- Lista até cinco vendas vencidas mais antigas, com nome, vencimento e saldo pendente.
- Os valores são derivados do livro de vendas e recebimentos; vendas canceladas são excluídas e pagamentos parciais reduzem o saldo em aberto.

## Como validar
1. Abra o Dashboard Geral no painel administrativo.
2. Registre uma venda fiado com vencimento anterior à data atual e confirme que ela aparece em “Fiado vencido”.
3. Registre um recebimento parcial e confira se o saldo exibido diminui.
4. Quite a venda e confirme que ela deixa de contar como saldo a receber.
5. Cancele uma venda sem recebimentos e confirme que ela não entra nos totais.

## Atualização segura
Faça backup do `.env` e de `data/alfa.sqlite`. Instale em uma pasta nova e copie os arquivos de configuração/dados da instalação anterior sem substituir os arquivos de código. Esta versão deve ser homologada no ambiente do usuário antes de substituir a versão estável.

## Validação técnica
O pacote contém a alteração do Dashboard e os arquivos de aplicação da versão 0.4.6 como base. A compilação TypeScript não foi concluída neste ambiente por indisponibilidade das dependências completas; por isso, execute `npm ci`, `npm run build` e os testes locais antes de colocar em produção.
