# AlfaDeliveryPRO 0.8.23 — PRÉVIA de layout

Base: 0.8.22. Esta etapa adiciona ordenação por nome e preço no cardápio, preservando as correções de segurança, fiado, relatórios e agenda anteriores. Homologação da 0.8.23 no Windows pendente.

## Atualizar

Siga [ATUALIZACAO_0.8.23.md](ATUALIZACAO_0.8.23.md). Extraia em outra pasta, preserve a instalação atual e, com o servidor encerrado, copie .env, a pasta data inteira e public/uploads. O guia trata caminhos personalizados e backups.

```cmd
npm ci
npm test
npm run build
npm start
```

Esperado: 92 testes aprovados e compilação concluída. Node.js 24 ou superior. Abra http://localhost:3001/admin, ou a porta do .env, e pressione Ctrl+F5.

O pacote não inclui .env, banco operacional, backups, node_modules ou dist. Inclui os arquivos src/data necessários ao build. Ao atualizar com seu .env, não execute npm run setup: esse comando redefine o acesso administrativo.

## Documentação

- [Melhorias desta versão](MELHORIAS_0.8.23.md)
- [Atualização e testes Windows](ATUALIZACAO_0.8.23.md)
- [Validação técnica](VALIDACAO_0.8.23.md)
- [Backup e restauração](GUIA_BACKUP_RESTAURACAO.md)

Documentos anteriores são histórico. A versão permanece prévia até a conferência pelo proprietário.

## Comandos

| Comando | Finalidade |
|---|---|
| npm ci | Instalar dependências do lockfile |
| npm test | Executar 92 testes |
| npm run build | Validar TypeScript e compilar |
| npm start | Iniciar o servidor |
| npm run backup | Criar backup SQLite consistente |
| npm run release | Gerar ZIP limpo |
| npm run verify:release | Extrair, instalar, testar e compilar o ZIP |

Sem novas dependências, operadores ou perfis de acesso. Login, persistência e funções do cardápio público mantêm o comportamento anterior.
