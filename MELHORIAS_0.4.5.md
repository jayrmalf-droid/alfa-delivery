# Alfa Delivery PRO 0.4.5 — melhorias complementares do caixa

## Implementado nesta versão
- Desconto manual na venda avulsa por valor fixo (R$) ou percentual, limitado ao subtotal para impedir total negativo.
- Registro do subtotal e do desconto no histórico da venda.
- Indicador de valores recebidos no dia com base nos lançamentos de recebimento registrados.
- Cancelamento de venda avulsa sem recebimentos, exigindo motivo e confirmação; o registro permanece no histórico para auditoria.
- Vendas canceladas deixam de compor o saldo a receber e o cálculo de limite de fiado.
- Validação do servidor permite o estado `cancelled` e valida campos opcionais de subtotal/desconto.

## Funcionalidades já existentes mantidas
- Cupons no checkout público.
- Programa de fidelidade e resgate de recompensa.
- Cadastro de clientes e histórico de pedidos online.
- Venda rápida/fiado, cadastro rápido, pagamentos parciais e saldo devedor.
- Layout responsivo da área de caixa.

## Limitação importante
- Por segurança financeira, o cancelamento pela tela não está disponível para vendas que já receberam qualquer valor. Essas vendas precisam de um processo de estorno/ajuste explícito, para não apagar recebimentos reais.
- O indicador “Recebido hoje” reflete as entradas lançadas nas vendas avulsas; não é ainda uma conciliação completa com os pedidos online, extratos bancários ou fechamento de caixa.

## Validação do pacote
- `node --check server/index.mjs`: aprovado.
- Build TypeScript e suíte de testes não puderam ser concluídos neste ambiente porque a instalação de dependências ficou incompleta (`pg`, `typescript` e tipos do Node/Vite ausentes) e o runtime disponível é Node.js 22, enquanto o projeto exige Node.js >=24. Execute `npm ci`, `npm run build` e `npm test` em Node.js 24+ antes de substituir a instalação em uso.
