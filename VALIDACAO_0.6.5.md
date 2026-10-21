# Verificação técnica — AlfaDelivery PRO 0.6.5 PRÉVIA

Data: 14/10/2026. Base: 0.6.4 com correção do ZIP Windows, homologada pelo proprietário (10 testes funcionais, 49 testes automatizados). Status da 0.6.5: homologação Windows pendente.

## Verificações

- 58 testes automatizados aprovados: os 49 da base e nove testes de datas da Bahia.
- Os novos casos cobrem operações após as 21h, limites exatos de meia-noite, virada de mês/ano, datas de calendário, filtros inválidos, preservação dos valores, meses bissextos, exibição para CSV e computadores em UTC, Bahia e Tóquio.
- Verificação adicional de seis componentes React com relógio fixado em 01h UTC de 01/11/2026: venda rápida, despesas/caixa, painel financeiro, metas, relatório/CSV e gráfico de horários classificam o movimento em outubro, no dia 31 às 22h da Bahia.
- Sete fluxos de confirmação de gravação continuam aprovados em testes de componentes: categorias, configurações, clientes, sabores, despesas, metas e vendas.
- Os testes de componentes usam uma instalação temporária de ferramentas de teste, sem acrescentar dependências ao projeto.
- TypeScript e Vite compilam sem erros. O aviso de arquivo JavaScript principal maior que 500 kB permanece fora deste escopo.
- Lint retorna código 0, com avisos de manutenção já existentes.
- Auditoria de dependências: zero vulnerabilidades reportadas.
- Empacotamento exige os dois arquivos src/data e o novo módulo de datas. ZIP extraído validado com instalação, 58 testes e compilação.

## Preservação

Nenhuma alteração do esquema SQLite, migração de dados, regravação de timestamps ou recálculo de fechamentos históricos. O módulo de datas é usado nos indicadores e na apresentação; as operações continuam gravando os timestamps originais em UTC. Os filtros de caixa e de relatórios continuam com suas funções originais: caixa usa a confirmação de pagamento; relatório geral agrupa pedidos pela criação.

A correção dos separadores do ZIP Windows permanece incluída. O pacote não inclui .env, data operacional, backups, node_modules, dist ou bancos SQLite. Os arquivos src/data/initialData.ts e src/data/bannerSeeds.ts estão presentes.

## Limites

Verificações executadas em Linux com Node.js 24.19.0. Os testes de componentes não substituem a inspeção visual no navegador. A 0.6.5 precisa dos testes de instalação, interface, impressão e empacotamento no Windows do proprietário; a execução Windows comprovada da 0.6.4 não é apresentada como homologação desta nova versão.

Timestamps completos sem indicação de fuso são ambíguos e não são incluídos nos filtros por período. As gravações normais do sistema usam UTC explícito. Datas sem horário, como vencimentos e dias de fechamento, são mantidas como datas de calendário.

Siga TESTES_WINDOWS_0.6.5.md. A versão só será estável após aprovação do proprietário.
