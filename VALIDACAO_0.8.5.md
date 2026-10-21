# Validação técnica — 0.8.5 PRÉVIA

Data: 16/10/2026. Base: 0.8.4. Ambiente: Linux, Node.js 24.19.0 e Chromium 153 headless. Homologação da 0.8.5 no Windows pendente.

## Resultados

| Verificação | Resultado |
|---|---|
| Instalação | npm ci concluído |
| Suíte automatizada | 74 testes aprovados, nenhuma falha |
| Compilação | TypeScript e Vite concluídos |
| Lint | Código de saída 0; 120 avisos de manutenção |
| Navegador | 17 verificações aprovadas; nenhum erro JavaScript de página capturado |
| Responsividade | Produtos, Clientes e Venda rápida conferidos em 1440, 768, 390 e 320 px, sem transbordamento da área principal nos cenários exercitados |
| Cadastro manual | Expandir/recolher preservou o preenchimento; cliente fictício cadastrado pela interface |
| Venda e fiado | Venda fictícia de R$ 40,00 com entrada de R$ 10,00 resultou em saldo de R$ 30,00 |
| Recebimento | Novo pagamento de R$ 5,00 pela interface resultou em saldo de R$ 25,00, também conferido em Clientes |
| Produtos | Busca, abertura/fechamento do editor e acesso com foco às ferramentas de estoque conferidos |
| Telas estreitas | Cadastro expandido e recebimento conferidos em 320 px; inspeção visual de cartões, campos e ações |
| Distribuição | ZIP extraído, dependências instaladas, 74 testes e build executados antes da entrega |

Não foram criados testes unitários que apenas espelham esta alteração visual. A suíte existente verifica regras de negócio e as regressões anteriores. O teste de integridade do pacote passou a exigir a nova folha de estilos.

## Preservação

A comparação com a 0.8.4 confirmou que os arquivos do servidor, serviços de persistência e módulos de cálculo/regras permanecem idênticos. Nos três componentes alterados, o código anterior ao JSX também permanece idêntico; as alterações concentram-se na composição visual e nos nomes acessíveis de alguns campos.

Não há mudança de esquema SQLite, migração, regravação de histórico, dependências novas, operadores ou perfis adicionais. O cardápio público mantém sua apresentação e funções.

Testes de gravação foram executados exclusivamente em banco isolado com credenciais e dados fictícios. Nenhum cadastro, venda ou recebimento de teste entra no pacote. O .env e o banco operacional enviados anteriormente não foram carregados pelo servidor de teste.

O pacote é limpo: sem .env, bancos e auxiliares SQLite, backups, node_modules, dist ou outros ZIPs. Arrays operacionais do seed vazios. Os dois arquivos src/data obrigatórios e a nova folha admin-workspaces.css são verificados no empacotamento.

## Limites

- A instalação, os testes e o início da 0.8.4 no Windows foram confirmados pelo log do proprietário. Isso não substitui a conferência desta nova 0.8.5.
- Conferir a apresentação, impressão física e os fluxos com a cópia dos dados no Windows, conforme ATUALIZACAO_0.8.5.md.
- Emulação de largura não substitui aparelhos físicos nem avaliação completa por leitor de tela.
- PostgreSQL, integrações externas e ambientes publicados não foram conectados nesta etapa.
- Permanecem os avisos de manutenção do lint e de tamanho do arquivo JavaScript principal no build.
