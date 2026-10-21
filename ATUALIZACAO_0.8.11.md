# Atualizar para 0.8.11 preservando os dados

Esta é uma prévia de correções. Preserve a pasta completa da instalação atual. Não extraia o ZIP por cima dela.

## 1. Preparar a cópia

1. Na instalação atual, crie um backup pelo painel ou com npm run backup. Aguarde a confirmação.
2. Encerre o servidor com Ctrl+C e feche outros processos do AlfaDeliveryPRO que usem o mesmo banco.
3. Guarde uma cópia completa da pasta atual em outro local.
4. Extraia o ZIP da 0.8.11 em uma pasta nova. Entre em alfadeliveryPRO, onde está o package.json.
5. Copie da instalação atual para a nova:
   - **.env** — configuração, na mesma pasta do package.json. Não confundir com .env.example.
   - **data** — pasta inteira com alfa.sqlite e, se existirem, alfa.sqlite-wal e alfa.sqlite-shm. Copie após encerrar o servidor e mantenha esses arquivos juntos.
   - **public/uploads** — copie suas imagens para public/uploads na nova pasta, preservando suas versões mais recentes.
   - **backups** — pode copiar a pasta para manter os backups acessíveis na nova instalação.
6. Se ALFA_DATABASE ou ALFA_BACKUP_DIR no .env apontarem para caminho absoluto ou fora da pasta padrão, ajuste a cópia de teste para usar os arquivos copiados. Não aponte a prévia para o banco original.

Não copie node_modules ou dist. Não substitua data por uma pasta vazia. Não copie .env.example por cima do seu .env. Para PostgreSQL, a cópia SQLite não se aplica: teste com banco separado e backup próprio, sem conectar a prévia à produção.

## 2. Instalar e iniciar

No terminal da nova pasta alfadeliveryPRO:

```cmd
npm ci
npm test
npm run build
npm start
```

Esperado: 74 testes aprovados e compilação concluída. Abra http://localhost:3001/admin (ou a porta do .env), pressione Ctrl+F5 e entre com seu e-mail e senha atuais.

Não execute npm run setup ao atualizar com seu .env existente: esse comando redefine as credenciais.

## 3. Conferir somente na cópia

Além de conferir os dados, valide as novidades:

- **Pedidos:** confira os quatro modos: Operação, Por etapa, Histórico e Tabela. O modo selecionado fica destacado e tem uma descrição.
- **Histórico:** mantém pedidos entregues e cancelados. O nome anterior Concluídos foi substituído para representar o conteúdo existente.
- **Contagens:** a linha de resultados informa quantos pedidos estão na visualização e quantos correspondem aos filtros; os indicadores superiores continuam gerais.
- **Filtros:** busca, Entrega/Retirada, prioridades, filtros avançados, ordenação e Limpar filtros mantidos.
- **Tabela no celular:** cartões com os nove campos: pedido, data/hora, cliente, atendimento, itens, total, pagamento, status e ações. Status apresentados em português.
- **Detalhes e ações:** confira detalhes, fechamento por Escape e exportação. As ações de status, impressão e pagamento mantêm seu comportamento anterior.
- **Quadro:** permanece com rolagem horizontal dentro da região de etapas; a página deve caber em 320/390 px.
- **Recursos anteriores:** todas as melhorias até 0.8.10 permanecem incluídas.


| Teste | Resultado esperado |
|---|---|
| Login e saída | Credenciais atuais funcionam; Sair do painel encerra a sessão |
| Dados anteriores | Produtos, imagens, pedidos, clientes, fiado e configurações permanecem |
| Fiado parcial | Venda fictícia de R$ 40,00 com R$ 10,00 recebidos deixa R$ 30,00 |
| Cancelamento | Outra venda fictícia de R$ 40,00, sem recebimento e depois cancelada, não aumenta o saldo |
| Consistência | Clientes, Venda rápida e resumos desconsideram vendas canceladas |
| Auditoria | Novas ações aparecem uma vez por tipo de evento; duplicações antigas permanecem |
| Pedidos e impressão | Pedido de teste chega ao painel, total/status corretos; confira impressão física |
| Backup e reinício | Backup é criado e os registros permanecem após reiniciar |

Faça lançamentos fictícios somente na cópia. Evite registrar vendas reais em duas pastas durante a homologação.

Se uma conferência falhar, encerre a prévia e inicie a pasta anterior preservada. Não substitua o banco original pelo banco de teste.

Após homologar, mantenha dados fictícios separados dos operacionais. Se ocorreram lançamentos reais na instalação anterior, faça a troca com uma cópia atualizada dos dados e o servidor encerrado.
