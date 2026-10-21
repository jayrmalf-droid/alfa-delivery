# Alfa Delivery PRO — 0.8.34 PRÉVIA

## Atualização preservando seus dados

1. Pare o servidor anterior com Ctrl+C e faça uma cópia de segurança da instalação.
2. Extraia este ZIP em uma pasta nova.
3. Copie da instalação anterior o arquivo `.env`, a pasta `data` inteira e a pasta `public/uploads`, mantendo os mesmos caminhos. Se o `.env` aponta para um `alfa.sqlite` em outro local, preserve esse arquivo e o caminho configurado também. Nunca substitua o banco existente por um arquivo vazio.
4. Na pasta `alfadeliveryPRO`, com Node.js 24 ou superior, execute:

```
npm ci
npm test
npm run build
npm start
```

5. Abra http://localhost:3001 e pressione Ctrl+F5. Não mantenha duas versões ocupando a porta 3001.

## Cardápio premium

- Fotos, categorias, variações, adicionais, preços promocionais, busca e ordenação existentes preservados.
- Área de cupons da loja com código, desconto, mínimo e validade.
- Publicação opcional: em **Cupons → Criar/editar**, marque **Divulgar este cupom no cardápio digital** e salve. Cupons anteriores permanecem privados até você marcar essa opção. Cupons pausados, vencidos ou com limite esgotado não aparecem nessa área. Uso por cliente e demais regras continuam validados no checkout.
- Fidelidade em área dedicada, com regras da loja, consulta por WhatsApp, saldo e progresso até a recompensa. O resgate continua no checkout e não acumula com cupom.
- Favoritos salvos somente no navegador usado. Não exigem cadastro e podem ser removidos pelo coração do produto.
- Mais vendidos por unidades em pedidos concluídos; cancelados e pedidos em aberto não entram. A área aparece quando há histórico elegível e produtos disponíveis no catálogo.

## Atualização e administrativo

- Canal de eventos avisa as telas após gravações de catálogo, pedidos e configurações feitas nesta instalação. Os eventos não contêm dados de clientes ou pedidos.
- Se o canal não estiver disponível, há atualização periódica: painel a cada 6 segundos e cardápio a cada 15 segundos, quando a página está visível. Ao retornar à aba, os dados são conferidos novamente. O indicador informa a situação da conexão.
- O detalhe aberto do produto acompanha alterações de preço. Uma opção pausada deixa de compor a seleção e o cliente recebe um aviso para conferir suas escolhas. O servidor mantém a conferência final de valores, estoque e opções.
- Dashboard e Relatórios ganharam **Diagnóstico do período**: vendas concluídas, ticket, recompra, uso de cupons e recompensas, cancelamentos, produto mais vendido e horário de maior movimento. As sugestões são descritivas; não são previsão de demanda. Em Relatórios, respeitam os filtros da aba Resumo. Recebimentos permanecem separados das vendas concluídas.

## Correções e integridade

- Valores de cupom como `1.250,50` preservam os centavos e entradas inválidas são bloqueadas.
- Novas validades de cupom encerram ao final do dia escolhido no horário da Bahia.
- Configurações inválidas de percentual ou limite da fidelidade são recusadas sem gravação parcial.
- Seletores de opções recebem clique no controle nativo, área de toque maior e foco visível.
- Animação de confirmação compatível com a política de segurança e com movimento reduzido.
- Acompanhamento não deve reabrir por uma resposta antiga depois de ser fechado.

## Conferência na sua instalação

Teste primeiro em uma cópia: crie/edite uma categoria, cadastre um produto com opção gratuita e adicional pago, selecione opções e altere a quantidade. Confira subtotal, cupom e total. Confira o pedido no painel, conclua-o e verifique pontos e ranking. Veja as telas no computador e no celular. O pacote não inclui seu banco real nem suas credenciais; a homologação no Windows depende dessa conferência.
