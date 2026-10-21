# Correção do empacotamento — 0.6.4 PRÉVIA

Os testes 1 a 9 continuam aprovados. O teste 10 precisa ser repetido.

1. Extraia este ZIP em uma pasta diferente da instalação em uso.
2. Na pasta extraída, entre em AlfaDeliveryPRO_0.6.4/alfadeliveryPRO.
3. Copie apenas scripts/release-utils.mjs e tests/release-and-startup.test.mjs para os mesmos caminhos na pasta 0.6.4 que você já está testando, substituindo esses dois arquivos.
4. Na pasta já configurada, execute npm run release e depois npm run verify:release. O esperado são 49 testes aprovados e a compilação concluída.

Não copie nem substitua .env, data ou backups; a configuração e os dados da instalação em teste permanecem. Esta correção não muda as telas, regras financeiras ou estrutura do SQLite. O arquivo de distribuição completo também está disponível neste ZIP, se precisar de uma instalação nova em pasta separada.
