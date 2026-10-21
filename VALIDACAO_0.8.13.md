# Validação técnica — 0.8.13 PRÉVIA

- 79 testes automatizados aprovados: 74 anteriores e cinco novos testes de acompanhamento, cobrindo oito status, entrega/retirada, cancelamento, confirmação, dados legados e separação entre pronto e em rota.
- TypeScript/Vite compilados.
- 84 verificações de navegador aprovadas em ambiente isolado, sem banco operacional.
- Janelas de produto, checkout e acompanhamento ausentes das requisições de scripts iniciais, antes da primeira abertura.
- Rascunho do checkout preservado ao fechar/reabrir; pedidos fictícios de entrega e retirada gravados e totais conferidos; falha HTTP 503 e reenvio preservados.
- Acompanhamento com respostas de status simuladas sobre o pedido fictício: pronto para entrega, em rota, pronto para retirada, retirada concluída e cancelamento. API e regras do servidor não foram modificadas.
- Acompanhamento em 1440, 768, 390 e 320 px; foco contido e fechamento por Escape.
- 13 telas do painel em quatro larguras, com foco no conteúdo após mudar de seção e sem transbordamento da área principal.
- Revisão final específica da jornada pública após o ajuste de contraste e remoção da mensagem duplicada de cancelamento.
- Nenhum erro de JavaScript registrado.
- JavaScript principal: aproximadamente 625,46 KB, contra 685,41 KB na 0.8.12. Arquivos sob demanda continuam sendo baixados quando necessários; a economia não corresponde a uma medição de tempo em aparelhos reais.
- ZIP final reextraído para conferir instalação, testes e compilação.

Homologação Windows do usuário, impressão física, pagamentos externos e envio real de WhatsApp pendentes. A abertura do WhatsApp foi bloqueada nos testes. O aviso de bundle acima de 500 KB permanece.
