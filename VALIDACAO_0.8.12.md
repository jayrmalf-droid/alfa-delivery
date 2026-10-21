# Validação técnica — 0.8.12 PRÉVIA

- 74 testes automatizados aprovados e compilação TypeScript/Vite concluída.
- 72 verificações de navegador aprovadas em ambiente isolado, sem usar banco operacional.
- Busca sem acentos, limpeza de filtros, categoria selecionada e recuperação de busca sem resultado.
- Produto fictício de R$ 20,00 adicionado à sacola, quantidade alterada para dois, subtotal de R$ 40,00 e retorno ao cardápio preservando itens. Sacola conferida em 1440, 768, 390 e 320 px.
- Checkout com campos identificados, seleção de atendimento/pagamento e três atalhos com foco, nas quatro larguras.
- Falha HTTP 503 simulada na confirmação: erro anunciado com foco e valor preservado; reenvio posterior concluído.
- Retirada de R$ 40,00 e entrega de R$ 20,00 mais taxa do bairro registradas pelo checkout e conferidas no servidor. Todos os registros são fictícios. A abertura externa do WhatsApp foi bloqueada durante o teste.
- Cardápio nos modos Cards e Lista em quatro larguras; tolerância máxima de 1 px na medição horizontal da página.
- 52 verificações visuais de largura do painel: 13 telas em quatro larguras. Isso não representa teste exaustivo de todas as ações de cada tela.
- Nenhum erro de JavaScript registrado nas verificações.
- Lint concluído sem erros; avisos anteriores permanecem.
- ZIP final reextraído para verificar instalação, testes e compilação.

Nenhum banco real foi iniciado, migrado ou alterado. Homologação Windows do usuário, impressão física, pagamento externo e envio real de WhatsApp não foram validados nesta etapa.
