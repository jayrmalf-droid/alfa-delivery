# Alfa Salgados Delivery — Guia de Publicação em Produção
## Arquitetura: Firebase Hosting + Cloud Run + Supabase (PostgreSQL, Auth e Storage)

Este guia orienta passo a passo a implantação da aplicação Alfa Salgados Delivery em produção com alta disponibilidade, segurança e escalabilidade.

---

## 1. Visão Geral da Arquitetura

```
[ Usuário / Cliente ]
        │
        ▼ (HTTPS)
[ Firebase Hosting ] ──(Arquivos estáticos / SPA React)──> [ CDN Global ]
        │
        └──(Rewrite /api/** e /health)──> [ Cloud Run (Node.js 24) ]
                                                    │
                      ┌─────────────────────────────┼─────────────────────────────┐
                      ▼                             ▼                             ▼
           [ Supabase PostgreSQL ]          [ Supabase Auth ]            [ Supabase Storage ]
           (Persistência e RLS)             (Tokens de Admin)            (Fotos e Banners)
```

- **Frontend**: Hospedado no **Firebase Hosting** (distribuído via CDN global com cache imutável de assets).
- **Backend / API**: Executando no **Google Cloud Run** via container Docker (Node 24 Alpine, escalonamento automático a partir de zero instâncias).
- **Banco de Dados**: **Supabase PostgreSQL** com conexão criptografada (SSL), pool de conexões gerenciado e políticas de Row Level Security (RLS).
- **Autenticação**: Suporte nativo ao cookie `__session` (único cookie encaminhado pelo Firebase Hosting ao Cloud Run) e tokens do Supabase Auth.
- **Storage**: Fotos de produtos e campanhas armazenadas no bucket Supabase Storage com fallback local.

---

## 2. Passo 1 — Configuração do Supabase (Banco de Dados, Auth e Storage)

### 2.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (ex: `alfa-salgados-prod`).
2. Selecione a região mais próxima dos seus clientes (ex: `sa-east-1` - São Paulo, Brasil).
3. Defina uma senha forte para o banco de dados e guarde-a com segurança.

### 2.2 Aplicar o Esquema e Políticas RLS
1. No painel do Supabase, acesse **SQL Editor**.
2. Abra e execute o arquivo [`server/migrations/001_initial_schema.sql`](file:///server/migrations/001_initial_schema.sql).
3. Esse script cria as tabelas com integridade referencial, índices de busca e ativa as políticas de segurança (RLS):
   - Tabelas públicas (`alfa_categories`, `alfa_products`, `alfa_option_groups`, `alfa_product_options`, `alfa_banners`, `alfa_neighborhoods`) só expõem itens disponíveis para leitura.
   - Tabelas restritas (`orders`, `audit`, `sessions`, `records`) são blindadas contra leitura anônima direta.

### 2.3 Obter a String de Conexão (DATABASE_URL)
1. No painel do Supabase, vá em **Project Settings** > **Database**.
2. Em **Connection string**, selecione o modo **Transaction** ou **Session** (porta `5432` ou `6543`).
3. O formato será:
   ```
   postgresql://postgres.[PROJETO]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

### 2.4 Configurar o Bucket de Imagens no Supabase Storage
1. No menu lateral, acesse **Storage** > **New bucket**.
2. Nomeie o bucket como `images` e marque **Public bucket**.
3. Em **Policies**, permita upload para usuários autenticados ou service role.

---

## 3. Passo 2 — Migração de Dados do SQLite para o Supabase

Antes de ativar o tráfego de produção, execute a migração com conciliação auditada:

1. **Simulação (Dry-Run)**:
   ```bash
   node scripts/migrate-to-supabase.mjs --dry-run
   ```
   Verifique o relatório de contagens:
   - Produtos e categorias
   - Grupos de opções (ativos e inativos)
   - Banners e bairros
   - Integridade de relacionamentos (órfãos preservados)

2. **Execução Real**:
   Defina a variável `DATABASE_URL` no seu `.env` e execute:
   ```bash
   node scripts/migrate-to-supabase.mjs --execute
   ```
   O script aplicará a migração em transação atômica (`BEGIN`/`COMMIT`), com rollback automático em caso de qualquer inconsistência.

---

## 4. Passo 3 — Implantação da API no Google Cloud Run

### 4.1 Pré-requisitos
- Ter o Google Cloud SDK (`gcloud`) instalado e autenticado.
- Projeto criado no Google Cloud Console com as APIs Cloud Run e Artifact Registry ativadas.

### 4.2 Build e Deploy do Container
Execute na raiz do projeto:

```bash
# Definir ID do projeto
gcloud config set project SEU_PROJECT_ID_GCP

# Compilar e implantar no Cloud Run (região southamerica-east1 / São Paulo)
gcloud run deploy alfa-delivery-api \
  --source . \
  --region southamerica-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,DATABASE_TYPE=postgres \
  --set-env-vars DATABASE_URL="postgresql://postgres.[PROJETO]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" \
  --set-env-vars ADMIN_EMAIL="admin@alfasalgados.com.br" \
  --set-env-vars ADMIN_PASSWORD_HASH="SEU_SALT:SEU_HASH_GERADO_NO_SETUP" \
  --set-env-vars PUBLIC_URL="https://delivery.alfasalgados.com.br"
```

> **Dica de Segurança**: Para dados sensíveis em produção, use o **Secret Manager** do GCP (`--set-secrets DATABASE_URL=alfa-db-url:latest`).

### 4.3 Testar Health Check da API no Cloud Run
```bash
curl https://alfa-delivery-api-xxxx-rj.a.run.app/health
# Resposta esperada: {"status":"ok","database":"postgres","uptime":...,"timestamp":...}
```

---

## 5. Passo 4 — Implantação do Frontend no Firebase Hosting

### 5.1 Conectar o Firebase ao Projeto GCP
Se o projeto Firebase for o mesmo do GCP, o Firebase Hosting conecta diretamente ao Cloud Run.

No arquivo [`firebase.json`](file:///firebase.json), confirme que a rota aponta para o serviço do Cloud Run:
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "alfa-delivery-api",
          "region": "southamerica-east1"
        }
      },
      {
        "source": "/health",
        "run": {
          "serviceId": "alfa-delivery-api",
          "region": "southamerica-east1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 5.2 Compilar e Publicar
```bash
# 1. Compilar os arquivos estáticos de produção
npm run build

# 2. Publicar no Firebase Hosting
npx firebase-tools deploy --only hosting
```

---

## 6. Particularidades Críticas de Produção

### 6.1 Encaminhamento de Cookies pelo Firebase Hosting
- O Google Front End (GFE) do Firebase Hosting **remove todos os cookies de requisições enviadas ao Cloud Run, exceto o cookie nomeado `__session`**.
- O backend da Alfa Salgados já está preparado: ao realizar login, ele define simultaneamente `alfa_session` e `__session`, e valida ambos os cookies para autorização.
- Mantenha sempre `__session` ativo para conexões através do Firebase Hosting.

### 6.2 Domínio Próprio e Certificado SSL
1. No console do Firebase Hosting, vá em **Custom Domains** > **Add Custom Domain**.
2. Digite seu domínio (ex: `delivery.alfasalgados.com.br`).
3. Adicione os registros DNS (tipo A / TXT) informados no seu provedor de domínio (ex: Registro.br, Cloudflare, GoDaddy).
4. O Google provisiona automaticamente o certificado SSL/TLS gratuito Let's Encrypt / Google Trust Services em até 24 horas.

---

## 7. Procedimento de Atualização e Rollback

### Atualização Contínua
1. Modifique e teste localmente: `npm test && npm run build`.
2. Para alterações na API: reimplemente o container no Cloud Run (`gcloud run deploy ...`).
3. Para alterações visuais: `npm run build && npx firebase deploy --only hosting`.

### Rollback Imediato
- **Frontend**: No console do Firebase Hosting, selecione a versão anterior no histórico de releases e clique em **Rollback**.
- **Backend API**: No console do Cloud Run, selecione a revisão anterior e clique em **Manage Traffic** (100% para a revisão anterior).
- **Banco de Dados**: Se a migração não tiver sido concluída ou falhar, a transação realiza rollback automático. O banco SQLite local permanece intacto e funcional para contingência imediata.
