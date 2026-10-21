# Homologação Windows — AlfaDelivery PRO 0.6.4 PRÉVIA

A 0.6.3 continua sendo a versão estável. Execute os testes em uma pasta separada. Não extraia o ZIP sobre a instalação em uso.

## Preparação

1. Na instalação estável, gere um backup pelo painel ou com `npm run backup`.
2. Encerre a instalação estável com Ctrl+C e preserve uma cópia completa da pasta dela, incluindo .env, data, backups e public/uploads. O backup SQLite não contém as fotos enviadas.
3. Extraia o novo ZIP. Abra o terminal dentro de `AlfaDeliveryPRO_0.6.4\alfadeliveryPRO`.
4. Para testar a continuidade da instalação, copie da instalação estável para a nova pasta o .env, data, backups e as imagens de public/uploads. Copie os arquivos do SQLite apenas com o servidor encerrado; preserve também os arquivos auxiliares existentes na cópia de segurança. Não mova ou apague os originais.
5. Se o .env contiver ALFA_DATABASE ou ALFA_BACKUP_DIR com caminhos absolutos, ajuste-os para apontar às CÓPIAS na pasta nova. Se houver DATABASE_URL/PostgreSQL, não use o banco de produção para testes; configure uma cópia separada.
6. Use Node.js 24 ou superior. Para uma instalação nova sem dados anteriores, execute `npm run setup` para configurar o acesso administrativo.

Execute:

```cmd
node -v
npm ci
npm audit
npm test
npm run build
npm start
```

Abra `http://localhost:3001` e `http://localhost:3001/admin`, ou o endereço da PORT configurada. Registre qualquer erro do terminal. O esperado em `npm test` são 49 testes aprovados.

## Testes funcionais

| Teste | Procedimento | Resultado esperado |
|---|---|---|
| 1 — Dados existentes | Abra catálogo, pedidos, clientes, pontos, vendas, despesas e configurações na cópia. | Dados anteriores preservados; nenhuma conta de operador solicitada. |
| 2 — Venda confirmada | Registre uma venda e um recebimento parcial de fiado; atualize a página. | Confirmação após resposta do servidor, uma gravação por envio e valores persistidos. |
| 3 — Falha de venda | Preencha uma venda de teste. No navegador, abra F12 > Network e selecione Offline antes de enviar. | Sem mensagem de sucesso; itens e cliente permanecem preenchidos. Retorne a No throttling/Online. Confira o histórico antes de reenviar. |
| 4 — Cadastros e configurações | Salve categoria, sabor, bairro, cupom, banner, cliente e uma configuração. Repita um envio com Offline. | O formulário fecha ou limpa apenas no sucesso. Na falha, mantém o rascunho e mostra o erro. |
| 5 — Despesas e metas | Cadastre despesa, registre fechamento e salve meta. Teste uma falha com Offline. | Confirmação após salvar; campos mantidos quando o envio falha. |
| 6 — Backups | Com o servidor aberto, execute `npm run backup` em outro terminal. Gere também um backup pelo painel. | Ambos listados no painel; download funciona; integridade aprovada. Arquivos antigos não são apagados. |
| 7 — Fidelidade | Com um telefone de teste e as regras configuradas, acumule pontos, resgate e cancele pedidos de teste. | Ganho, desconto e estornos consistentes; repetir cancelamento não duplica estorno. Não alterar as regras reais apenas para testar. |
| 8 — Loja e pedidos | Faça pedido com personalização, valide preço, estoque, acompanhamento e impressão. | Funcionalidades da 0.6.3 preservadas. |
| 9 — Porta ocupada | Deixe uma instância aberta. Execute `INICIAR_WINDOWS.bat` em outro terminal. | Mensagem de porta ocupada; a instância anterior continua funcionando. |
| 10 — Pacote limpo | Execute `npm run release` e `npm run verify:release`. | ZIP da versão 0.6.4; extração, instalação, testes e compilação aprovados. Os dois arquivos src/data presentes e pastas operacionais ausentes. |

## Encerramento e retorno

Encerre a prévia com Ctrl+C. Para voltar à versão estável, inicie a pasta preservada da 0.6.3. Não copie dados de teste de volta para a instalação estável.

Envie os resultados como “Teste 1 aprovado”, “Teste 2 aprovado” etc. Se houver falha, informe o teste, o comportamento observado e a mensagem exibida. A aprovação final é do proprietário; o resultado automatizado não substitui a homologação.
