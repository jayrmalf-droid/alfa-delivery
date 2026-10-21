# Alfa Delivery PRO 0.4.2 — correção de empacotamento

Esta versão corrige um erro no pacote 0.4.1: os arquivos de dados estáticos `src/data/initialData.ts` e `src/data/bannerSeeds.ts` estavam ausentes do ZIP e foram restaurados.

## Importante
- Esta é uma correção do pacote para permitir que o TypeScript encontre os módulos importados.
- A compilação no ambiente Windows do usuário ainda precisa ser executada para confirmar o resultado.
- Os cinco testes de API reportados na versão 0.4.1 continuam pendentes de diagnóstico e não devem ser considerados resolvidos nesta versão.
- Antes de atualizar a instalação real, faça uma cópia de segurança do banco e teste esta versão em uma pasta separada.
- Não execute `npm audit fix` automaticamente antes de avaliar as dependências afetadas.
