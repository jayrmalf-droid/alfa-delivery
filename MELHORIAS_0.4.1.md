# Alfa Delivery PRO 0.4.1 — melhorias iniciais

## O que mudou

- Nova tela administrativa **Venda rápida / fiado**, separada dos pedidos do cardápio online.
- Venda rápida com produtos disponíveis do catálogo, quantidades, totais calculados, cliente e observações.
- Cadastro rápido de cliente a partir da venda e seleção de clientes cadastrados.
- Registro de venda à vista, fiado e entrada parcial.
- Livro de contas a receber com saldo, situação, vencimento e lançamento de pagamentos parciais/quitados.
- Limite de fiado por cliente: quando configurado acima de zero, bloqueia a venda que excederia o limite considerando o saldo em aberto já existente.
- Tela Clientes ganhou cadastro manual, telefone, limite de fiado e listagem de cadastros.
- Layout da área de caixa com cards, formulários arredondados, estados financeiros e adaptação para telas menores.
- Dados novos são mantidos em registros separados (`alfa_sales` e `alfa_customer_profiles`); não altera pedidos existentes nem sobrescreve os registros já existentes do banco.
- Registros de venda e perfis de clientes não são incluídos no bootstrap público.

## Dados e migração

O servidor usa a inicialização idempotente dos registros de seed: as duas novas chaves são criadas apenas se ainda não existirem. Nenhum banco de dados real foi aberto ou modificado durante a edição do código nesta entrega. Faça um backup antes de atualizar a instalação local.

## Limitações desta etapa

- Vendas avulsas usam o preço do catálogo no momento da venda e guardam uma cópia do nome/preço dos itens.
- A tela é para operação administrativa; não publica os registros de vendas avulsas no cardápio público.
- O limite de crédito zero significa “sem limite configurado”, não crédito ilimitado recomendado. Defina limites positivos para ativar o bloqueio.
- Ainda não foi implementado estorno/cancelamento de venda avulsa, impressão específica de venda rápida, descontos de caixa ou conciliação automática com fluxo de caixa.

## Validação

- Verificação sintática de `server/index.mjs`: aprovada.
- Validação JSON de `server/seed.json`: aprovada.
- `npm test` não pôde ser concluído neste ambiente porque as dependências não estavam instaladas (`pg` e `typescript` ausentes) e o ambiente usa Node.js 22; este projeto exige Node.js >=24. Execute `npm ci`, `npm run build` e `npm test` em Node.js 24+ antes de substituir a instalação usada no restaurante.
