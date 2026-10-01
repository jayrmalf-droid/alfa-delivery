# Alfa Salgados Delivery — Guia de Execução Local no Windows

Este guia descreve como instalar, configurar e operar a aplicação localmente no ambiente Windows.

---

## 1. Requisitos do Sistema

- **Sistema Operacional**: Windows 10 ou Windows 11 (64-bit).
- **Node.js**: Versão 24.0.0 ou superior (inclui suporte nativo a `node:sqlite` e ESM).
- **Navegador**: Google Chrome, Microsoft Edge ou Firefox atualizados.

Para conferir sua versão do Node.js, abra o PowerShell ou Prompt de Comando e execute:
```cmd
node -v
```
A versão informada deve ser `>= v24.0.0`.

---

## 2. Início Rápido com o Script Automatizado

Na raiz do projeto existe o arquivo [`INICIAR_WINDOWS.bat`](file:///INICIAR_WINDOWS.bat).

1. Dê um duplo clique no arquivo **`INICIAR_WINDOWS.bat`**.
2. O script executa automaticamente:
   - Verificação das dependências.
   - Compilação dos arquivos de produção (`npm run build`).
   - Inicialização do servidor Node.js com SQLite local na porta 3001.
   - Abertura automática do navegador em `http://localhost:3001`.

---

## 3. Configuração Manual do Administrador

Caso seja a primeira instalação ou queira redefinir o acesso ao painel administrativo:

1. Abra o terminal na pasta do projeto.
2. Execute o assistente de credenciais:
   ```cmd
   npm run setup
   ```
3. Informe o e-mail administrativo (ex: `admin@alfasalgados.com.br`) e a senha desejada.
4. O script gerará com segurança o hash criptográfico com salt (`scrypt`) e salvará no arquivo `.env`.

> **Importante**: O arquivo `.env` nunca deve ser compartilhado ou incluído em repositórios públicos.

---

## 4. Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `npm test` | Executa a suíte completa com os 26 testes de aceitação automatizados. |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite com Hot Reload (porta 5173). |
| `npm run server` | Inicia a API Node.js local com reload automático ao alterar arquivos. |
| `npm run build` | Valida tipagem TypeScript e gera o pacote otimizado de produção em `dist/`. |
| `npm run backup` | Gera um snapshot consistente do banco SQLite local na pasta `backups/`. |
| `npm run lint` | Executa análise estática de código com o Oxlint. |
| `npm run preview` | Pré-visualiza localmente os arquivos compilados de `dist/`. |

---

## 5. Acesso pelo Celular ou Outro PC na Mesma Rede (Wi-Fi)

Ao iniciar pelo `INICIAR_WINDOWS.bat`, o servidor escuta em todas as interfaces de rede (`0.0.0.0`) e exibe automaticamente o endereço para acesso no terminal:
- **No próprio computador**: `http://localhost:3001`
- **Pelo celular ou outro PC no mesmo Wi-Fi**: `http://<IP-DO-SEU-PC>:3001` (ex: `http://192.168.1.15:3001`)
- **Painel Administrativo**: `http://<IP-DO-SEU-PC>:3001/admin`

---

## 6. Cuidados e Preservação de Dados

1. **Pasta `data/` na raiz**:
   Contém o arquivo de banco de dados SQLite `alfa.sqlite`. **NUNCA** apague esta pasta ao atualizar o layout ou código, pois ela contém seus produtos cadastrados, pedidos, histórico e configurações.
2. **Pasta `src/data/`**:
   Contém o código e catálogo padrão do aplicativo. Deve ser preservada junto aos demais arquivos de código.
3. **Fotos e Uploads**:
   Fotos enviadas localmente ficam salvas em `public/uploads/` e continuam acessíveis mesmo após reinicializações.
