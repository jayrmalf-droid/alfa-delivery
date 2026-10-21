# Alfa Salgados Delivery — Guia de Backup e Restauração

Este documento define os procedimentos operacionais para criação de cópias de segurança (backups) e restauração completa de dados, tanto para operação local com SQLite quanto para o ambiente de produção com Supabase PostgreSQL.

---

## 1. Backup e Restauração no Ambiente Local (SQLite)

### 1.1 Como Gerar Backup do SQLite
O projeto possui um comando nativo de backup com garantia de consistência transacional via WAL mode:

```cmd
npm run backup
```

- **Destino**: Os arquivos são salvos na pasta `backups/` com timestamp no nome (ex: `backups/alfa-20261014T180000-a1b2c3d4.sqlite`).
- **Segurança**: O comando utiliza a API segura de snapshot do SQLite, impedindo corrupção mesmo que pedidos estejam sendo gravados simultaneamente.

Na 0.6.4, terminal e painel usam a mesma rotina e verificam a integridade antes de disponibilizar o arquivo. Backups antigos gerados pelo comando (por exemplo, `alfa-2026-10-14T18-00-00-000Z.sqlite`) também aparecem na listagem do painel. Nenhum arquivo é apagado automaticamente. `ALFA_BACKUP_DIR`, quando definido, altera o destino padrão.

### 1.2 Como Restaurar um Backup Local
1. Encerre o servidor em execução (pressione `Ctrl + C` no terminal).
2. Vá até a pasta `data/` na raiz do projeto.
3. Preserve uma cópia completa da pasta `data/` antes de substituir qualquer arquivo. Confira a integridade do backup escolhido e teste a restauração em uma pasta separada. O caminho pode ser diferente se ALFA_DATABASE estiver configurado.
4. Copie o arquivo de backup desejado de `backups/alfa-AAAAMMDDTHHMMSS-xxxxxxxx.sqlite` para `data/alfa.sqlite`.
5. Na pasta de restauração, com todas as instâncias encerradas e após preservar a cópia completa, não misture arquivos auxiliares antigos (`alfa.sqlite-wal` e `alfa.sqlite-shm`) com o banco restaurado; mova-os para a cópia de segurança antes de iniciar.
6. Reinicie o servidor normalmente (`INICIAR_WINDOWS.bat` ou `npm start`).
7. Acesse o painel e valide os pedidos e o catálogo restaurados.

---

## 2. Backup e Restauração no Ambiente de Produção (Supabase PostgreSQL)

### 2.1 Backups Automáticos do Supabase
- Projetos no Supabase possuem rotina diária de backup automatizado gerenciado pela infraestrutura.
- No painel do Supabase, acesse **Database** > **Backups** para visualizar o histórico de cópias disponíveis e restaurar com um clique.

### 2.2 Backup Manual via Linha de Comando (pg_dump)
Para gerar uma cópia de segurança sob demanda do banco PostgreSQL:

```bash
pg_dump "postgresql://postgres.[PROJETO]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  --format=custom \
  --file="backup_alfa_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.3 Restauração no PostgreSQL (pg_restore)
Para restaurar um dump em um novo banco ou ambiente de testes:

```bash
pg_restore \
  --dbname="postgresql://postgres.[NOVO_PROJETO]:[SENHA]@.../postgres?sslmode=require" \
  --clean \
  --if-exists \
  --no-owner \
  "backup_alfa_20260930_180000.dump"
```

---

## 3. Backup de Imagens e Arquivos Estáticos

- **Ambiente Local**:
  A pasta `public/uploads/` armazena as fotos enviadas. Faça cópias periódicas dessa pasta junto com o banco de dados.
- **Ambiente de Produção (Supabase Storage)**:
  As imagens ficam armazenadas no bucket `images` do Supabase Storage. É recomendável sincronizar o bucket com um script ou ferramenta de backup S3-compatible periodicamente.

---

## 4. Política de Retenção Recomendada

| Tipo de Backup | Frequência | Retenção | Destino Recomendado |
|---|---|---|---|
| Snapshot Local (SQLite) | Diário antes do expediente | 15 dias | Pasta `backups/` + Pendrive / Nuvem |
| Banco de Produção (Postgres) | Diário automatizado | 30 dias | Supabase Backups |
| Imagens (Uploads) | Semanal | Permanente | Storage externo / Google Drive |
