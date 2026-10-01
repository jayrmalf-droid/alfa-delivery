# Alfa Salgados Delivery — versão 0.3

Esta versão evolui o projeto enviado, com visual baseado na proposta da conversa e um servidor de pedidos com banco SQLite. O ZIP original e o site publicado não foram alterados.

## Remodelação visual

- Banner claro com fotografia integrada, degradê, sombras suaves e oferta flutuante com preço real do catálogo. Navegação manual das campanhas.
- Cadastro de produto em quatro etapas, com grupos de sabores e complementos, gravação única e proteção contra conflitos.
- Banner em um painel com texto e fotografia, com navegação manual entre as campanhas ativas do painel.
- Títulos, subtítulos, links, ordem e período dos banners são respeitados. Imagem específica para celular e fallback de foto quando a URL falha.
- Cabeçalho mais leve, categorias em abas, busca integrada e cartões com ações de montar ou adicionar.
- Menu administrativo agrupado em operação, loja e gestão, com identidade visual comum e gaveta em tablets/celulares.
- Destaque de combos usa preço do catálogo e desconsidera itens sem estoque.

## O que está pronto

- Layout claro, cabeçalho branco, marca completa, banner com fotografia, categorias, busca e cards.
- Carrinho, sabores em quantidades configuradas, adicionais, entrega/retirada, agendamento e cupom.
- Pedidos gravados no servidor antes de limpar o carrinho. O administrador e o cliente compartilham o mesmo banco quando acessam a mesma instalação.
- Preços e taxas recalculados no servidor, valores monetários em centavos, estoque reservado de forma transacional e devolvido no cancelamento.
- Login administrativo sem credenciais embutidas; senha com hash scrypt, sessão HttpOnly, limite de tentativas e checagem de origem.
- Numeração central, idempotência no envio, rastreio por token privado e histórico de status.
- Cadastro administrativo preservado, com proteção contra sobrescrita quando outro dispositivo alterou os mesmos dados.
- Cupom com escape de texto/URL validada; 58 e 80 mm preservados. Layout físico depende da impressora e do driver.
- Banco consistente para backup; fotos otimizadas e carregamento separado das telas administrativas.

## Iniciar no seu computador

Requer **Node.js 24 ou superior**. Extraia o ZIP em uma pasta e abra um terminal nessa pasta. Nenhuma IDE é necessária.

```bash
npm ci
npm run setup
npm run build
npm start
```

O comando `setup` pede seu e-mail e uma **nova senha com pelo menos 12 caracteres**, com entrada oculta. Não use as credenciais expostas no projeto antigo. O arquivo `.env` guarda somente o hash da senha. Nunca publique esse arquivo nem o coloque no controle de versões.

Abra a loja em **http://localhost:3001** e a administração em **http://localhost:3001/admin**. Use o e-mail/senha criados no setup. A instalação sem administrador permite visualizar o cardápio, mas não libera o painel. Em produção, as configurações administrativas são obrigatórias.

Para editar com atualização automática, mantenha dois terminais:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

A loja de desenvolvimento fica no endereço exibido pelo Vite. O servidor de dados deve permanecer ativo. O servidor Vite é apenas para desenvolvimento; não o exponha como hospedagem final.

## Iniciar com o assistente

No Windows, depois de instalar Node.js 24 ou superior, abra `INICIAR_WINDOWS.bat` na pasta extraída. Em qualquer sistema, execute `npm run iniciar`.

O assistente instala dependências quando faltam, pede o administrador apenas se ainda não estiver configurado, recompila o projeto e inicia a loja. A primeira instalação precisa de internet. Mantenha a janela aberta enquanto usa o sistema e confira o endereço exibido pelo servidor. Isso executa o sistema no seu computador; não publica um endereço na internet.

As execuções seguintes preservam o catálogo e os pedidos. Se já houver uma configuração de produção, utilize `npm start`.

## Dados iniciais e preservação

Os dados de catálogo, categorias, bairros, cupons e adicionais vieram do ZIP. Um ambiente novo recebe esses dados uma única vez. Reconstruir o projeto não substitui o banco já existente.

A configuração antiga contava pacotes nos limites dos combos. O script de preparação converte os combos numéricos em grupos explícitos de sabores/unidades. Linhas inativas do catálogo foram preservadas; o cliente usa somente grupos ativos. Os produtos existentes de 30/50/75/80/100/etc. salgados devem ser conferidos pelo administrador antes da publicação, especialmente combos que incluem bebidas ou doces.

Histórico de pedidos/clientes do ZIP original não é importado para esta nova instalação nem incluído nos dados iniciais públicos. O original permanece a fonte de consulta. **Não há migração automática dos localStorage de cada navegador.** Exporte e concilie esses dados em ambiente separado antes de qualquer substituição do sistema em uso.

O arquivo real do banco é `data/alfa.sqlite`. Ele não está incluído no pacote de entrega, assim como sessões, senhas, backups e dependências instaladas. O servidor cria o banco ao iniciar.

## Pagamentos e WhatsApp

Pix usa a chave configurada pela loja e depende de conferência do recebimento. Cartão é **na entrega/retirada**. Escolher pagamento não marca o pedido como pago. Não há gateway financeiro online conectado nesta versão.

Após gravar o pedido, a interface tenta abrir uma conversa com mensagem preenchida. O cliente ainda precisa enviá-la no WhatsApp. Caso o navegador bloqueie a janela, o pedido permanece gravado e pode ser acompanhado; o botão de contato do rastreio permite abrir a conversa novamente. Nenhuma mensagem foi enviada pela análise ou pelos testes desta entrega.

## Agendamento

O servidor usa `America/Bahia`, respeita a agenda semanal, a pausa da loja, a antecedência por produto quando configurada e um mínimo de 30 minutos para agendamento. Horários que atravessam meia-noite são contemplados.

Capacidade por faixa horária, feriados, limites de produção e rotas de entrega ainda precisam de configuração/implementação específica. O sistema não promete capacidade ilimitada como funcionalidade validada.

## Backup

```bash
npm run backup
```

O backup cria uma cópia consistente em `backups/`, mesmo com o servidor ativo. Guarde cópias fora da máquina e proteja-as: contêm dados pessoais e tokens dos pedidos.

Para restaurar: pare o servidor, faça um backup do banco atual, valide a cópia que será restaurada em ambiente separado, substitua `data/alfa.sqlite` e remova apenas os arquivos auxiliares `alfa.sqlite-wal`/`alfa.sqlite-shm` da instalação parada após conferir que não há processo usando o banco. Reinicie e valide pedidos, catálogo e configurações. Nunca restaure diretamente em produção sem essa conferência.

O reset de fábrica da interface foi desativado para evitar perda de dados.

## Publicação

Esta entrega **não substitui automaticamente o domínio atual**. Para publicar, use um ambiente que execute Node.js 24 com disco persistente, mantenha somente uma instância de escrita deste banco SQLite, configure backup e coloque HTTPS/proxy reverso na frente do servidor.

Configure no ambiente:

```dotenv
NODE_ENV=production
PUBLIC_URL=https://seu-dominio
PORT=3001
HOST=127.0.0.1
ALFA_DATABASE=/caminho/persistente/alfa.sqlite
ADMIN_EMAIL=seu-email
ADMIN_PASSWORD_HASH=hash-gerado-pelo-setup
```

Em produção, o cookie da sessão é Secure e o servidor exige domínio HTTPS e administrador configurado. `PUBLIC_URL` deve corresponder à origem utilizada pelos clientes. Para ambiente em contêiner, ajuste o HOST de acordo com o proxy, mantendo o banco em volume persistente. O frontend deve acessar a API pela mesma origem.

O backend Node/SQLite desta entrega não funciona sozinho em hospedagem apenas estática, como um upload isolado de `dist` no Firebase Hosting. É necessário hospedar o servidor ou adaptar a API para o provedor escolhido. Para múltiplas instâncias e maior volume, planeje outro banco e coordenação de filas.

## Validação executada

- Compilação TypeScript/Vite concluída.
- Lint: sem erros; permanecem avisos herdados e recomendações de refatoração.
- 14 testes automatizados aprovados: autenticação/autorização, integridade, repetição de envio, concorrência de estoque, combos, fuso/horário, impressão segura, fila de gravação administrativa e rastreio com armazenamento bloqueado.
- Navegador: seleção de 30 sabores, carrinho, confirmação de pedido com resposta 201 e login sem erros do React.
- Loja verificada em 320, 390, 768 e 1440 px sem rolagem horizontal da página.
- Assistente de execução local testado no ambiente Linux com Node.js 24: compilação, loja, login e catálogo. O arquivo `.bat` deverá ser conferido no computador Windows do usuário.
- Backup testado em banco temporário: verificação de integridade SQLite e conferência do catálogo.

A prévia estática dos componentes fica em `preview/layout.html` no pacote. Ela mostra a composição com o catálogo inicial e não executa pedidos ou ações do painel. Nesta revisão o navegador remoto bloqueou acesso ao servidor local e a arquivos locais; a conferência visual interativa deve ser feita na instalação do usuário. As verificações anteriores de navegador referem-se à versão 0.1. Os testes de interface foram feitos com banco e credenciais temporários, sem operar o domínio real.

```bash
npm test
npm run lint
npm run build
```

## Próximas etapas

- Escolher hospedagem e colocar a instalação de homologação online.
- Revisar preços, cupons, fotos e disponibilidade com o catálogo real atual.
- Fazer migração conciliada e teste de restauração antes de substituir a operação existente.
- Conectar pagamento online se desejado, com webhook verificado, confirmação e reconciliação.
- Implementar usuários/perfis adicionais e políticas de retenção de dados.
- Validar impressora física e criar relatório A4 próprio se necessário.

## Organização

- `src/components/client`: loja, carrinho, checkout e rastreio.
- `src/components/admin`: telas administrativas existentes.
- `src/services/api.ts`: comunicação, sessão, cache e gravações.
- `src/services/storageService.ts`: interface de compatibilidade para os componentes antigos.
- `src/domain/rules.ts`: regras compartilhadas de moeda, telefone e horários.
- `server/index.mjs`: API, autenticação, transações e arquivos da loja.
- `server/seed.json`: catálogo inicial gerado a partir do fonte.
- `scripts/prepare-server.mjs`: preparação de regras/dados no build.
- `scripts/start-local.mjs` e `INICIAR_WINDOWS.bat`: assistente de execução local sem IDE.
- `scripts/setup-admin.mjs`: criação segura do administrador local.
- `scripts/backup.mjs`: backup consistente do banco.
- `tests/`: testes com dados fictícios e banco temporário.

## Orientação para futuras alterações

Preserve esta arquitetura e o lockfile. Não reintroduza credenciais no frontend, dados oficiais no localStorage, seeds durante leitura ou total calculado pelo cliente como autoridade. Faça alterações numa branch/cópia, execute os testes e valide todos os fluxos alterados. Não publique nem migre dados reais sem backup e conferência. A imagem de referência orienta o layout; preços e conteúdo comercial vêm dos dados reais.

## Editar o banner

No painel, abra **Banners**. Prefira fotografias limpas, sem texto embutido, pois título, descrição e ações são apresentados pelo sistema. Sugestão: 1600 × 1200 px para computador e 1000 × 700 px para celular, com o produto principal no centro. Use uma campanha ativa e o período desejado. Os controles manuais do banner permitem navegar sem troca automática de conteúdo.
