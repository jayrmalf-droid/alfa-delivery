# Validação técnica — 0.8.15 PRÉVIA

- 82 testes automatizados aprovados; TypeScript/Vite compilados.
- 24 verificações de navegador aprovadas com banco isolado e registros fictícios.
- Mensagens de erro/sucesso conferidas por classificação e papel acessível; foco no aviso de validação.
- Cadastro, venda com desconto/entrada, recebimento parcial/quitação, despesas, fechamento negativo e CSV da 0.8.14 novamente conferidos.
- Falha HTTP 503 simulada ao gravar despesa: nenhum registro gravado e nenhuma mensagem de sucesso; nova tentativa bem-sucedida em seguida.
- Clientes, Venda rápida e Despesas em 1440, 768, 390 e 320 px sem transbordamento da área principal.
- Eventos offline/online simulados no cardápio e no painel: aviso acessível, fechamento, nova exibição e remoção na recuperação. Largura conferida em 320 px.
- Nenhum erro de JavaScript registrado durante a verificação.
- ZIP final reextraído para verificar instalação, testes e compilação.

Nenhum banco operacional foi usado ou alterado. Nenhuma migração de dados. Homologação Windows do usuário e teste de rede física permanecem pendentes. O indicador de conexão usa o estado informado pelo navegador e não substitui o tratamento de falhas do servidor.
