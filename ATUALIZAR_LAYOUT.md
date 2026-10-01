# Atualizar para o versão 0.3

1. Feche a janela do servidor com Ctrl+C.
2. Faça uma cópia da sua pasta atual inteira antes de atualizar.
3. Extraia o novo ZIP em uma pasta separada.
4. Copie da versão nova para a sua instalação atual: `src`, `public`, `server`, `scripts`, `tests`, `package.json`, `package-lock.json`, `README.md` e `INICIAR_WINDOWS.bat`. Aceite substituir os arquivos nessas pastas.
5. Preserve o arquivo `.env`, a pasta `data` na raiz e seus backups. A pasta `src/data` contém código do catálogo inicial e deve ser copiada normalmente.
6. Execute `INICIAR_WINDOWS.bat`. Ele recompila o visual e inicia o sistema com a configuração existente.
7. Abra a loja e atualize a página com Ctrl+F5. Confira também `/admin`, as campanhas em Banners e um pedido de teste antes de operar.

O build não substitui o banco existente. O novo layout usa as campanhas e os produtos já cadastrados. Caso prefira uma instalação independente, execute o arquivo de iniciar na nova pasta; ela terá outro banco e exigirá configurar o administrador.

O novo cadastro preserva os grupos inativos. Confira os grupos ativos de cada combo antes de aceitar pedidos; dados antigos não são excluídos automaticamente. Consulte `AUDITORIA_V0_3.md` para as melhorias e pendências.
