# Validação técnica — 0.8.4 PRÉVIA

Data: 16/10/2026. Base: 0.8.3. Ambiente: Linux com Node.js 24.19.0 e Chromium 153 headless. Homologação da 0.8.4 no Windows pendente.

## Verificações

| Item | Resultado |
|---|---|
| Instalação | npm ci concluído |
| Testes | 74 aprovados, nenhuma falha; inclui regressões de segurança, fiado e auditoria da 0.8.3 |
| Compilação | TypeScript e Vite concluídos |
| Lint | Código de saída 0; 120 avisos de manutenção |
| Matriz de navegação | 13 seções em 1440, 768, 390 e 320 px: 52 verificações |
| Relatórios | Abas, setas/Home/End, manutenção de filtros, datas inválidas, busca de seções, meta brasileira e persistência conferidos |
| Metas e Comparações | Abas adicionais conferidas nas quatro larguras |
| Responsividade | Nas 52 verificações, a largura do conteúdo principal não excedeu a área disponível; também conferidos os outros dois painéis de Relatórios |
| Filtros móveis | Seletor de status e contador sem sobreposição em 320 px |
| Agenda com dados | Hoje, Amanhã, semana e mês incluíram/excluíram os pedidos fictícios esperados; cartões sem transbordamento em 320 px |
| CSV | Download do resumo conferido; prefixo de fórmula neutralizado sem remover o caractere original |
| Navegador | Nenhum erro JavaScript de página capturado nos roteiros concluídos |
| Distribuição | Pacote extraído, dependências instaladas, 74 testes e build executados antes da entrega |

A primeira bateria de navegador teve 68 verificações aprovadas. A bateria adicional conferiu quatro filtros da agenda com pedidos reais apenas no banco fictício e uma exportação CSV. As imagens temporárias foram usadas para inspeção de cabeçalho, filtros e abas; não fazem parte da distribuição.

Sete novos testes automatizados cobrem entrada monetária, normalização de busca, CSV e períodos da agenda, incluindo fevereiro bissexto e virada de ano. A verificação de pacote exige os novos módulos e a folha de estilos administrativa.

## Preservação

Os arquivos do servidor permanecem idênticos à 0.8.3. Não houve alteração de esquema ou migração. As consultas da Agenda usam a data da Bahia e o agendamento existente; o preenchimento de metas usa os mesmos endpoints e limites do servidor.

Os testes utilizaram banco e credenciais isolados. As metas e encomendas fictícias não são incluídas no ZIP. Configuração, banco e backups originais não foram usados pelo servidor de teste.

O pacote exclui .env, bancos SQLite e auxiliares, backups, node_modules, dist e ZIPs internos. Os arrays operacionais do seed permanecem vazios; os arquivos src/data obrigatórios estão incluídos.

## Limites

- O usuário aprovou instalação, 67 testes, build e início da 0.8.3 no Windows por log. Isso não é homologação desta nova 0.8.4.
- Conferir os novos fluxos e a impressão física no Windows seguindo ATUALIZACAO_0.8.4.md.
- A emulação de largura não substitui aparelhos físicos nem uma auditoria completa de acessibilidade.
- Integrações externas e banco PostgreSQL não foram conectados nesta etapa.
- Os avisos de manutenção do lint e de tamanho do JavaScript principal do Vite continuam.
- A mudança de formato monetário desta etapa aplica-se ao campo de meta, não a todos os campos do aplicativo.
