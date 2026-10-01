# Alfa Salgados — auditoria e melhorias da versão 0.3

Análise realizada em 30/09/2026 sobre o código React/TypeScript, servidor Node/SQLite, catálogo inicial e imagem de referência enviados nesta conversa. As melhorias estão implementadas no pacote 0.3. Não houve acesso ao banco instalado no seu computador nem ao site em produção. A imagem enviada é referência visual, não prova do funcionamento atual.

## Avaliação geral

O projeto já possui uma base operacional útil: loja, carrinho, montagem de combos, entrega/retirada, agendamento, cupons, pedidos, administração e impressão. A versão 0.3 melhora a apresentação e corrige problemas importantes de cadastro e seleção. Pode servir como base para uma instalação comercial dedicada, após homologação no ambiente real. Ainda não equivale a uma plataforma multiempresa com cobrança, gestão de acessos e suporte automatizado.

Build de produção e 20 testes automatizados passaram. A análise estática executou sem erros, mas mantém avisos de código legado, principalmente imports não usados e hooks. A revisão visual interativa não pôde ser concluída neste ambiente: o navegador bloqueou a aplicação local. A prévia `preview/layout.html` foi gerada a partir dos componentes reais, mas é estática e não substitui testes de navegação no computador do usuário.

## O que mudou

| Área | Problema identificado | Entrega nesta versão |
|---|---|---|
| Banner | Composição distante da referência e pouca hierarquia | Fundo claro, foto integrada, degradê, sombras, marca em vermelho, chamadas para ação e cartão flutuante de combo |
| Campanhas | Necessidade de respeitar o cadastro | Ordem, período, destino, imagem para celular e navegação manual preservados; foto de fallback quando a URL falha |
| Oferta principal | Risco de anunciar preço ilustrativo ou item sem estoque | Preço mínimo calculado dos combos disponíveis; oferta não aparece quando não há combinação elegível |
| Destaques | Produtos de categoria oculta ou sem estoque podiam aparecer | Filtro por categoria disponível e estoque; prioridade para destaque cadastrado |
| Fotos | Nome do produto podia sobrepor a foto escolhida | Foto cadastrada tem prioridade; imagem de exemplo só funciona como alternativa |
| Cadastro | Produto e complementos eram escritos separadamente | Gravação autenticada e transacional dos três conjuntos; todos são salvos juntos |
| Edição | Falha de gravação podia fechar o formulário; atualização podia apagar o rascunho | Fecha somente após confirmação do servidor, mantém edição após falha e protege alterações não salvas |
| Concorrência | Edição podia sobrescrever estoque alterado por uma venda | Verifica versões e recusa salvar dados antigos sem sobrescrever a reserva |
| Estrutura de produto | Formulário extenso, com organização pouco clara | Quatro etapas: produto/preço, grupos e opções, foto, disponibilidade/estoque/encomenda |
| Complementos | Opções pausadas e incrementos inconsistentes | Servidor exige opção ativa e disponível; interface usa incremento do grupo |
| Combo | Quantidades deduzidas do nome do produto | Regras cadastradas governam a seleção; configuração explícita é usada no modo legado |
| Grupo opcional | Mínimo podia obrigar o cliente a escolher um grupo opcional | Zero opções permitido; ao escolher, mínimo e máximo passam a valer |
| Duplicação | Copiar estoque podia criar disponibilidade artificial | Cópia com novos identificadores, pausada e com estoque zero; gravação única |
| Clientes | Lista desatualizada e métrica apresentada como faturamento | Leitura atualizada do cache e identificação como valor de pedidos não cancelados |

## Cardápio e organização comercial

O catálogo inicial contém **67 produtos, 8 categorias, 220 grupos e 1.123 opções**. Há 47 produtos no modo normal e 20 combos. São 34 grupos ativos e 186 inativos. Três grupos não têm produto correspondente, sendo dois ativos. Esses dados foram preservados; excluir automaticamente poderia remover histórico ou uma configuração que você deseja recuperar.

| Categoria atual | Produtos | Revisão sugerida |
|---|---:|---|
| Diversos | 10 | Trocar por uma classificação específica quando possível |
| Combos | 8 | Explicar unidades, sabores e se acompanha bebida ou molho |
| Especial | 5 | Explicitar o diferencial no título ou descrição |
| Porção - Salgados | 13 | Padronizar tamanho, quantidade e unidade vendida |
| Churros / Doce | 5 | Separar sabores, recheios e adicionais pagos |
| Adicional / Molho | 8 | Verificar se deve ser item independente, complemento ou ambos |
| MINI | 2 | Esclarecer tamanho e quantidade; evitar ambiguidade com porções |
| Bebidas | 16 | Informar volume, marca e apresentação |

Para uma apresentação vendável, padronize nomes como “Combo com 80 salgados”, “Porção com 20 coxinhas” e “Refrigerante 350 ml”, conferindo os dados reais. Cada descrição deve informar o que acompanha, quantidade, escolhas permitidas e prazo de preparo. Evite categorias genéricas e textos repetidos. Nenhuma quantidade, ingrediente ou preço foi inventado para substituir dados comerciais.

Fotos de produto devem mostrar o item real. Fotos de exemplo desta versão ajudam a avaliar o layout, mas devem ser substituídas antes de anunciar produtos específicos. URLs externas antigas podem falhar; os fallbacks evitam espaços vazios, mas não corrigem a fidelidade da fotografia.

## Cadastro de produto, adicionais e complementos

O modelo é **produto → grupos de escolha → opções**. O produto define preço base, categoria, foto, disponibilidade e estoque. Cada grupo define obrigatoriedade, mínimo, máximo e incremento. Cada opção tem disponibilidade e valor por unidade selecionada, somado ao preço base. A quantidade comprada multiplica o valor da configuração completa.

Exemplos de configuração, para conferir antes de cadastrar:

| Situação | Obrigatório | Mínimo / máximo | Incremento | Preço das opções |
|---|---|---|---|---|
| Caixa com 80 salgados, sabores em blocos de 10 | Sim | 80 / 80 | 10 | Zero, quando incluídos no preço da caixa |
| Molhos extras | Não | 0 / 6 | 1 | Valor de cada unidade de molho |
| Escolha de uma bebida incluída | Sim | 1 / 1 | 1 | Zero ou diferença de preço informada |
| Opcional com pelo menos duas unidades quando escolhido | Não | 2 / 6 | 1 | Valor unitário de cada opção |

Mínimo e máximo devem ser compatíveis com o incremento. Um grupo ativo precisa ter uma opção disponível. Promoção deve ser positiva e menor que o preço base. Estoque e antecedência usam números inteiros. O estoque se refere à unidade vendida: uma caixa com 80 salgados consome uma caixa, não 80 unidades de estoque.

O editor permite criar modelos, inserir opções por lista, duplicar grupos, pausar opções e ver a prévia do produto. Grupos inativos ficam recolhidos e podem ser exibidos. Campos existentes não editados são preservados. Grupos removidos explicitamente são excluídos quando o cadastro completo é salvo.

## Painel e operação

**Pedidos:** preços, frete, cupom e estoque são conferidos no servidor; envio tem idempotência e rastreio privado. Os testes cobrem concorrência, cancelamento e devolução de estoque. Faça uma simulação completa de entrega e retirada antes de operar.

**Financeiro:** pedido entregue não prova recebimento. PIX continua manual, e cartão é uma opção de pagamento na entrega; não há confirmação automática por adquirente ou gateway. A tela de clientes agora evita chamar todo pedido de faturamento. A próxima etapa deve separar vendas concluídas, pagamentos confirmados, cancelamentos e caixa recebido, com uma ação auditável de baixa de pagamento.

**Horários e encomendas:** o servidor usa regras de funcionamento, pausa, antecedência e horário de Bahia. Agendamento não é controle de capacidade de produção. Para uma operação maior, prever limite por faixa horária, datas bloqueadas e calendário de feriados configurável.

**Clientes:** a agregação é por pedidos e telefone. O rótulo anterior de conformidade foi removido porque uma tela de cadastro, por si só, não comprova conformidade. Definir política de retenção, controle de acesso e processo de atendimento de solicitações requer trabalho específico.

**Impressão:** há layouts para 58 e 80 mm e escape de conteúdo. Impressora, margens, corte e driver precisam ser testados fisicamente. Não foi validada impressão automática neste ambiente.

**Backup:** há comando para backup consistente do SQLite. Ainda é necessário exercitar restauração em uma instalação separada e definir frequência, retenção e destino. Importação/exportação de catálogo não deve ser confundida com backup completo de pedidos e configurações.

## Pendências por prioridade

| Prioridade | Ação | Critério de conclusão |
|---|---|---|
| Antes de operar | Revisar os grupos ativos de todos os combos, grupos órfãos e categorias genéricas | Todo produto pode ser montado sem regra contraditória; cadastro comercial aprovado |
| Antes de operar | Testar loja e painel em desktop e celular reais | Login, produto, complementos, carrinho, checkout e rastreio funcionam sem cortes ou bloqueios |
| Antes de operar | Exercitar atualização e restauração de backup | Pedidos, administrador e catálogo preservados, com retorno à versão anterior possível |
| Antes de vender hospedado | Configurar domínio, HTTPS, disco persistente e monitoramento | Instalação mantém dados após reinício e recebe alerta de indisponibilidade |
| Alta | Bloquear exclusão de categoria ainda usada por produtos | Não há produtos órfãos após alteração administrativa; atualmente é preciso mover os produtos primeiro |
| Alta | Separar situação financeira de status de entrega | Relatórios distinguem pedido de pagamento recebido |
| Alta para equipes | Administradores individuais, perfis e recuperação de acesso | Operações atribuídas a usuários e acesso limitado por função |
| Média | Consolidar caminhos antigos de gravação genérica do catálogo | Rotinas futuras usam a mesma validação do cadastro completo |
| Média | Reduzir avisos de hooks e imports no código legado | Análise estática sem os avisos conhecidos |
| Conforme o modelo de venda | Multiempresa, licenciamento, cobrança e gestão de instalações | Isolamento de dados e administração comercial implementados e testados |

## Testes e limites

Os 20 testes passam e incluem autorização, origem, preço adulterado, persistência/idempotência, privacidade de rastreio, estoque concorrente, loja pausada, forma de pagamento desativada, combos, gravações em sequência e escape na impressão. Os novos testes verificam cadastro completo, preservação de metadados, opção pausada, grupo opcional, regras inválidas, colisão de identificadores e venda durante edição.

O pacote contém código, servidor preparado, catálogo inicial, fotos de exemplo, prévia e instruções. Não inclui senha, `.env`, banco de execução ou dependências instaladas. A pasta `src/data` está incluída; a pasta `data` na raiz pertence à instalação e deve ser preservada.

Para atualizar, siga `ATUALIZAR_LAYOUT.md`. Para instalar, execute `INICIAR_WINDOWS.bat` com Node 24 ou superior. A senha do administrador é a definida no setup; para uma instalação existente, preserve `.env`. Não é necessário usar Antigravity.
