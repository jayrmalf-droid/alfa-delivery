# Validação técnica — 0.8.20 PRÉVIA

- 86 testes automatizados existentes, cobrindo leitura monetária, catálogo transacional, preço e reserva concorrente de estoque.
- TypeScript/Vite compilados.
- 12 verificações específicas no navegador: preço inválido sem gravação e com foco no alerta; preço normal/promocional brasileiros persistidos; cadastro em quatro larguras; quantidade/total com estoque; detalhes em quatro larguras; estoque zero.
- Regressão do cardápio com 32 verificações de busca, categorias, carrinho, checkout, envio de entrega/retirada, falhas, acompanhamento e layouts.
- Apenas banco isolado e dados fictícios; nenhum banco operacional alterado.
- ZIP reextraído para instalar dependências, testar e compilar.

Sem migração. Aviso não bloqueante de tamanho do bundle principal permanece. Homologação Windows pelo proprietário pendente.
