# AlfaDelivery PRO 0.6.4 — PRÉVIA para homologação

Base: versão 0.6.3 aprovada pelo proprietário. A 0.6.4 só será considerada estável após aprovação dos testes no Windows.

## Alterações

- Gravações administrativas retornam uma confirmação aguardável. Falhas são propagadas ao formulário; a fila permanece utilizável e não reaplica gravações que dependem de uma alteração rejeitada.
- Sem conexão até para recarregar o servidor, o cache volta ao último valor confirmado, sem tratar o rascunho como dado persistido.
- Vendas, recebimentos, cancelamentos, configurações, clientes, categorias, sabores, banners, cupons, bairros, despesas, fechamentos e metas aguardam a confirmação antes de fechar formulários, limpar campos ou informar sucesso. Os controles do formulário ficam bloqueados durante a gravação.
- O cadastro rápido do cliente de uma venda é confirmado antes da venda. São duas gravações: se a venda falhar depois do cadastro, o cliente pode já estar salvo; o formulário da venda permanece preenchido. Não há reenvio automático de vendas ou pagamentos.
- Compilação e empacotamento geram os dados iniciais somente a partir dos arquivos-fonte; nunca incorporam o banco local. Registros operacionais do seed são vazios. O banco existente não é alterado pela compilação.
- Backups do terminal e do painel compartilham nomenclatura e verificação de integridade. O arquivo só aparece na listagem depois de validado. Backups com a nomenclatura antiga do comando continuam disponíveis para listagem e download.
- O iniciador verifica a porta configurada e orienta o usuário se ela estiver ocupada. Não encerra processos.
- Uma falha ao consultar endereços de rede não encerra o servidor; o endereço localhost continua sendo anunciado.
- Distribuição usa a versão do package.json, inclui a documentação e valida o ZIP novamente após extraí-lo. Windows utiliza PowerShell/.NET; Linux utiliza zip/unzip.
- Testes de fidelidade passaram a verificar a API de pontos, incluindo ganho, resgate e estorno por cancelamento. As regras atuais de pontos foram preservadas.

## Preservação

Nenhuma alteração de estrutura do SQLite, migração destrutiva ou recálculo de histórico. Nenhum controle de operadores, contas individuais ou perfis de acesso foi acrescentado. O login administrativo já existente foi mantido.

O pacote exclui .env, bancos SQLite, pastas operacionais data e backups, node_modules e dist. A pasta de fontes src/data é preservada, com initialData.ts e bannerSeeds.ts. .env.example é apenas o modelo de configuração e está incluído.

## Comandos adicionais

- `npm run release`: gera o ZIP PRÉVIA limpo e verifica seu conteúdo após extração.
- `npm run verify:release`: instala, testa e compila uma extração temporária do ZIP gerado.
- Para um caminho específico: `npm run verify:release -- "C:\caminho\arquivo.zip"`.

Nenhum desses comandos promove automaticamente a versão a estável.

## Correção do teste 10 — Windows

A verificação do ZIP aceita separadores de diretório usados pelo PowerShell/.NET, preservando a rejeição de caminhos inválidos e de dados operacionais. Teste automatizado adicional: 49 testes ao todo. Os testes funcionais 1 a 9 foram aprovados pelo proprietário; o teste 10 permanece pendente.
