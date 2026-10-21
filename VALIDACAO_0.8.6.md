# Validação técnica — 0.8.6 PRÉVIA

Data: 16/10/2026. Base: 0.8.5. Ambiente: Linux, Node.js 24.19.0 e Chromium 153 headless. Homologação da 0.8.6 no Windows pendente.

## Resultados

| Verificação | Resultado |
|---|---|
| Instalação | npm ci concluído |
| Suíte automatizada | 74 testes aprovados, nenhuma falha |
| Compilação | TypeScript e Vite concluídos |
| Lint | Código de saída 0; 120 avisos de manutenção |
| Navegador | 30 verificações aprovadas; nenhum erro JavaScript de página capturado |
| Responsividade | Cupons, Banners e bairros em 1440, 768, 390 e 320 px; sem transbordamento da área principal nos cenários exercitados |
| Editores | Os três formulários conferidos nas quatro larguras: limites da janela, rolagem interna horizontal, foco após Tab e fechamento com Escape |
| Cupom | Cadastro pela interface; 10% em R$ 40,00 produziu total R$ 36,00 na cotação |
| Banners | Cadastro com imagem local existente; busca sem acentos, situação ativo/inativo, reativação e limpeza de filtros conferidos |
| Bairro | Cadastro pela interface com taxa R$ 5,50; cotação de entrega resultou em R$ 45,50 para produtos de R$ 40,00 |
| Edição rápida | Taxa atualizada para R$ 6,50 pela interface em 320 px, com persistência conferida no servidor |
| Distribuição | ZIP extraído, dependências instaladas, 74 testes e build executados antes da entrega |

As 30 verificações incluem cinco fluxos funcionais, doze acessos às páginas, doze conferências de formulários e uma edição rápida de taxa. Foram usadas imagens temporárias para inspecionar cabeçalhos, filtros, cartões e formulário de cupom; elas não fazem parte do pacote.

Não foram criados testes unitários que apenas repetem a nova estrutura visual. A suíte existente continua cobrindo regras e regressões; o teste de integridade do pacote passou a exigir admin-campaigns.css.

## Preservação

Comparação com a 0.8.5: arquivos do servidor idênticos. As rotinas anteriores ao JSX de Cupons e Entrega e taxas também permanecem idênticas. Banners ganhou estado e derivação de lista para filtros; os manipuladores de criação, edição, imagens e gravação permanecem idênticos.

Sem mudança de esquema, migração ou regravação de histórico. Sem dependências novas. Login, sessões, saldos, estoque e pedidos mantêm os mecanismos existentes.

Gravações ocorreram apenas em banco e credenciais isolados. Nenhum cupom, banner, bairro ou outro dado fictício entra na distribuição. O servidor de teste não carregou o .env operacional.

O ZIP exclui .env, bancos SQLite e auxiliares, backups, node_modules, dist e outros ZIPs. Arrays operacionais do seed vazios, arquivos src/data obrigatórios e novas folhas de estilo conferidos.

## Limites

- O log do proprietário confirmou instalação, 74 testes, compilação e início da 0.8.5 no Windows. Isso não substitui a conferência desta nova prévia.
- Validar apresentação e fluxos no Windows seguindo ATUALIZACAO_0.8.6.md.
- Emulação de largura não substitui aparelhos físicos nem uma avaliação completa por leitor de tela.
- Não foram acessados PostgreSQL, ambientes publicados ou integrações externas. O teste de banner usou endereço de imagem já existente, sem upload externo.
- Ajuste em massa e todas as combinações de cupons não foram novamente exercitados manualmente; suas rotinas anteriores não foram alteradas.
- Permanecem avisos de manutenção do lint e de tamanho do arquivo JavaScript principal no Vite.
