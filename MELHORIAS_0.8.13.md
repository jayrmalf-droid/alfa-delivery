# AlfaDeliveryPRO 0.8.13 — acompanhamento, navegação e carregamento

Acompanhamento:
- Situação atual destacada com mensagem específica.
- Recebimento, confirmação, preparo, pedido pronto, saída para entrega e conclusão representados separadamente.
- Retirada sem etapa de motoboy. Dados legados de retirada com status delivering apresentados como prontos para retirada.
- Cancelamento sem etapa ativa; data de criação/agendamento com referência à Bahia.
- Janela com identificação acessível, foco contido, fechamento por Escape e controles maiores.

Navegação:
- Mudança de seção do painel retorna ao início do conteúdo e transfere o foco; não interfere em alterações internas da mesma página.

Carregamento:
- Produto, checkout e acompanhamento em módulos sob demanda.
- Checkout permanece montado depois da primeira abertura para preservar o rascunho ao fechar e reabrir na mesma sessão.
- Arquivo JavaScript principal reduzido de aproximadamente 685,41 KB para 625,46 KB (cerca de 9%); gzip de 158,10 KB para 141,64 KB. Valores do build local; não representam medição de velocidade em dispositivos reais.
- O aviso do Vite de arquivo acima de 500 KB ainda permanece.

Regras de status do servidor, pagamentos, estoque e gravação preservadas. Não há migração nem alteração de dados operacionais. O acompanhamento apenas apresenta com maior precisão o status recebido.
