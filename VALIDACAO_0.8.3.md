# Validação técnica — 0.8.3 PRÉVIA

Data: 16/10/2026. Base: 0.8.2 enviada pelo proprietário. Ambiente: Linux, Node.js 24.19.0; navegador Chromium 153 headless. Homologação Windows pendente.

## Escopo

Correção da autenticação insegura por Bearer, saldo devedor que incluía cancelamentos em Clientes e eventos financeiros duplicados. Sem mudança de esquema, migração ou exclusão de dados históricos. Sem dependências novas no aplicativo.

## Resultados

| Verificação | Resultado |
|---|---|
| Dependências | Instalação com npm ci concluída |
| Suíte automatizada | 67 testes aprovados, nenhuma falha |
| Build | TypeScript e Vite concluídos |
| Lint | Código de saída 0; 120 avisos de manutenção preexistentes |
| Navegador | Login e logout; saldo R$ 30,00 em Clientes, Venda rápida, Visão geral e Painel financeiro; Clientes também em 390 px |
| Erros JavaScript de página | Nenhum capturado no roteiro corrigido |
| Pacote extraído | npm ci, 67 testes e compilação executados antes da disponibilização |

Nove testes novos cobrem tokens fabricados, cookies inválidos, logout, unicidade dos eventos financeiros e saldo devedor sem cancelados. Os dois cookies administrativos existentes continuam cobertos. O validador de distribuição exige o novo módulo de saldo, além dos dois arquivos de seeds.

## Proteção dos dados

Testes e navegador usaram banco isolado com dados fictícios. A reprodução reaproveitou vendas fictícias criadas na auditoria da 0.8.2, comprovando o cálculo correto na leitura de registros existentes. Não foi carregado o .env operacional enviado.

A pasta de desenvolvimento desta correção foi obtida do pacote limpo validado. Não contém configuração privada, banco operacional ou backups. O ZIP de entrega exclui esses itens, node_modules, dist e outros ZIPs; os registros operacionais do seed estão vazios.

O banco, WAL/SHM, configuração e backup do ZIP original não são modificados. Os eventos de auditoria duplicados antigos permanecem preservados; apenas novos eventos deixam de duplicar.

## Limites e pendências

- Conferir login, dados copiados, recebimentos, cancelamento, backup e impressão física no Windows, conforme ATUALIZACAO_0.8.3.md.
- Tokens Bearer não são aceitos para entrar no painel; o login próprio com e-mail/senha é o método suportado nesta entrega.
- PostgreSQL, Supabase Storage e sistemas publicados não foram conectados durante a validação.
- Mantidos os avisos de manutenção do lint e de tamanho do JavaScript principal no Vite.
- Outros achados de layout e usabilidade da revisão da 0.8.2 ficam para etapas posteriores, conforme CORRECOES_0.8.3.md.
