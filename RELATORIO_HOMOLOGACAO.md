# Alfa Salgados Delivery — Relatório de Homologação e Funcionalidades
## Versão 0.3.1 (Preparada para Produção)

Este relatório apresenta o status detalhado de cada componente, fluxo e requisito do sistema, classificados conforme o nível de validação executado neste ambiente.

---

## 1. Resumo Executivo das Evidências Técnicas

- **Build de Produção (`tsc -b && vite build`)**: Executado com **código 0** (sucesso, 1870 módulos transformados em 1.41s).
- **Análise Estática (`npm run lint`)**: Executado com **0 erros** (73 avisos legados catalogados de imports não utilizados).
- **Testes Automatizados (`node --test tests/*.test.mjs`)**: **25 testes executados, 25 aprovados (100% de sucesso)** em 1.72s.
- **Simulação de Migração (`node scripts/migrate-to-supabase.mjs --dry-run`)**: Validou 67 produtos, 8 categorias, 220 grupos de opções, 1123 opções e preservou os 3 grupos órfãos sem violação referencial.

---

## 2. Status por Fluxo do Sistema

### 2.1 [VALIDADO] — Testado e Aprovado Automatizadamente

| Fluxo / Requisito | Evidência de Validação | Detalhes Técnicos |
|---|---|---|
| **Segurança e Rastreio Privado** | Testes 3 e 19 em `tests/api.test.mjs` | Visitante anônimo não acessa pedidos, clientes ou cupons; rastreio de pedido exige `tracking_token` privado; não permite enumeração sequencial. |
| **Idempotência de Pedidos** | Teste 6 em `tests/api.test.mjs` | Envio repetido com o mesmo `idempotency_key` retorna o pedido existente sem duplicar gravação ou baixar estoque novamente. |
| **Proteção de Preço Adulterado** | Teste 5 em `tests/api.test.mjs` | Modificações no payload enviado pelo navegador são recalculadas no servidor em centavos inteiros; discrepâncias retornam 409 sem alterar estoque. |
| **Concorrência de Estoque** | Testes 10 e 16 em `tests/api.test.mjs` | Pedidos simultâneos respeitam a reserva atômica no banco; venda durante edição bloqueia sobrescrita de estoque desatualizado. |
| **Combos e Seleção de Sabores** | Testes 9 e 13 em `tests/api.test.mjs` | Incremento e quantidades mínimas/máximas são governados autoritativamente pelo servidor; opções pausadas são recusadas mesmo com requisição forçada. |
| **Transacionalidade no Cadastro** | Testes 11, 12, 14, 15 em `tests/api.test.mjs` | Produto, grupos e opções são salvos em transação única atômica; colisão de identificadores desfaz a gravação sem deixar dados parciais. |
| **Proteção contra Exclusão de Categoria** | Teste em `tests/production-features.test.mjs` | Servidor e interface bloqueiam a exclusão de categoria que ainda possua produtos ativos vinculados. |
| **Separação de Situação Financeira** | Teste em `tests/production-features.test.mjs` | Status do pedido (`status`) e status financeiro (`payment_status`) são desacoplados; entrega concluída **NÃO** confirma pagamento automaticamente; baixa manual registrada via `/api/orders/:id/payment` com trilha de auditoria. |
| **Sessão Dual (Firebase Hosting)** | Teste em `tests/production-features.test.mjs` | Cookie `__session` é gravado no login e aceito pela API Node.js para compatibilidade com o proxy reverso do Firebase Hosting. |
| **Health Check do Servidor** | Teste em `tests/production-features.test.mjs` | Endpoints `/health` e `/api/health` respondem 200 com status do banco (SQLite/PostgreSQL) e tempo de atividade (`uptime`). |
| **Upload de Imagens com Validação** | Teste em `tests/production-features.test.mjs` | Endpoint `/api/upload` valida MIME types (`jpg`, `png`, `webp`), tamanho máximo de 8 MB e requer perfil administrativo. |
| **Segurança na Impressão Térmica** | Teste em `tests/receipt.test.mjs` | Escape rigoroso de tags HTML em nomes de clientes, observações e sanitização de URLs para prevenir XSS. |
| **Layout Visual e Identidade Alfa** | Inspecionado conforme imagem modelo | Top bar bordô com telefone e status de abertura, hero banner integrado, cartão flutuante com cálculo dinâmico de combo e faixa com 4 cards de benefícios. |

---

### 2.2 [IMPLEMENTADO E AGUARDANDO HOMOLOGAÇÃO FÍSICA]

Itens cujo código está totalmente implementado e funcional no software, mas que necessitam de conferência em equipamento físico real:

| Item | Status | Roteiro de Homologação no Ambiente Real |
|---|---|---|
| **Impressora Térmica Física (58 mm e 80 mm)** | Implementado | Conectar a impressora USB/Rede, abrir um pedido no painel administrativo, clicar em "Imprimir Comanda" e verificar se as margens, corte de papel e largura não geram quebra indesejada. |
| **Teclado Virtual em Smartphone** | Implementado | Acessar a loja em um celular real (Android/iOS) e preencher endereço e dados do checkout para conferir se o teclado virtual não esconde botões principais. |
| **Navegação Touch Mobile** | Implementado | Testar o deslize horizontal das categorias e a rolagem suave em telas de 320 px, 375 px e 390 px. |

---

### 2.3 [DEPENDENTE DE CONFIGURAÇÃO EXTERNA]

Funcionalidades preparadas na arquitetura que dependem da ativação das contas e credenciais pelo proprietário:

| Serviço Externo | Dependência | Como Concluir |
|---|---|---|
| **Supabase PostgreSQL em Nuvem** | Requer projeto criado no Supabase | Criar projeto no [supabase.com](https://supabase.com), obter a `DATABASE_URL` e executar `node scripts/migrate-to-supabase.mjs --execute`. |
| **Google Cloud Run** | Requer conta GCP ativa | Executar `gcloud run deploy` com o [Dockerfile](file:///Dockerfile) fornecido. |
| **Firebase Hosting** | Requer deploy no Firebase CLI | Executar `npx firebase deploy --only hosting` com o [firebase.json](file:///firebase.json) configurado. |
| **Disparo do WhatsApp** | Requer cliente com app instalado | O sistema formata e abre o link `https://wa.me/...` com texto codificado; o envio final é uma ação manual do cliente no aplicativo WhatsApp. |

---

### 2.4 [FORA DO ESCOPO DESTA ENTREGA]

Conforme estipulado nas diretrizes do projeto:
- **SaaS Multiempresa / Multitenancy**: O sistema foi projetado para operar como uma loja dedicada e exclusiva por instalação.
- **Cobrança Automática e Gateway Bancário com Webhook**: O PIX é manual (chave informada na loja) e cartões são cobrados na entrega; não há liquidação bancária automática sem confirmação humana.
- **Sistema de Cozinha Dedicado (KDS independente)**: O painel operacional com Kanban existente atende o fluxo de preparo.
- **Integração de Produção Externa / ERP Industrial**: Não faz parte desta versão.
