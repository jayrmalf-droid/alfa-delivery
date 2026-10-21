# Melhorias — 0.8.20 PRÉVIA

## Administrativo

- Cadastro de produtos usa o mesmo leitor monetário de vendas/despesas: aceita 1.250,50, R$ 1.250,50 e 1250.50 no preço normal, promocional e nos adicionais. Campos inválidos continuam bloqueando o cadastro completo.
- Avisos de validação recebem foco, papel de alerta e identificação visual padronizada. O formulário permanece aberto em caso de erro.
- A prévia do cartão interpreta os valores com a mesma regra do salvamento.

## Cardápio

- Produtos com controle de estoque informam as unidades disponíveis na janela de detalhes.
- O botão de aumentar quantidade para no estoque informado; diminuir libera o aumento novamente.
- Estoque zero bloqueia inclusão; uma quantidade de edição acima do estoque pede redução.
- A quantidade possui anúncio acessível e os botões desabilitados têm indicação visual.

O estoque exibido é o recebido pelo navegador; a reserva e a conferência final continuam no servidor ao enviar o pedido. Outras unidades no carrinho ou compras concorrentes podem reduzir a disponibilidade. Sem migração de banco ou mudança na reserva do servidor.
