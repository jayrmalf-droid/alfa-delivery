# Correções 0.8.3 — PRÉVIA

Base: 0.8.2 enviada pelo proprietário. Escopo: três correções prioritárias da revisão de 16/10/2026.

## Acesso administrativo

Removido o caminho que aceitava tokens Bearer apenas decodificando seu conteúdo, sem verificar assinatura. O painel utiliza sessões emitidas pelo próprio servidor e persistidas no banco, por cookies alfa_session e __session. O login com e-mail e senha continua disponível.

Não foi adicionada autenticação externa Supabase. Armazenamento de imagens e conexão PostgreSQL não são alterados por esta correção.

## Saldo devedor

Clientes exclui vendas canceladas. Clientes, Venda rápida, Visão geral e Painel financeiro compartilham a regra de cálculo nos seus respectivos conjuntos de registros.

Exemplo: venda de R$ 40,00 com R$ 10,00 recebidos, mais outra venda cancelada de R$ 40,00, resulta em R$ 30,00 de saldo, em vez de R$ 70,00 em Clientes.

Sem migração, exclusão ou regravação de vendas e pagamentos. Telefones com e sem código do país ficam para etapa posterior.

## Auditoria financeira

Removido o bloco duplicado de eventos em alfa_sales. Cada novo evento é registrado uma vez, na mesma transação da venda. Uma alteração pode gerar eventos diferentes, por exemplo mudança de situação e de valor recebido.

As duplicações históricas permanecem; nenhum evento antigo é apagado ou recalculado.

## Testes e pacote

Nove novos testes cobrem tokens fabricados, cookies inválidos, logout, auditoria, cancelamento e saldo. Total: 67 testes.

Documentação e nome de distribuição atualizados. ZIP limpo: sem .env, bancos, backups, dependências instaladas ou dist. Seeds obrigatórios e recursos existentes preservados.

## Próximas etapas

Continuam pendentes os demais achados da revisão: entrada monetária brasileira, busca sem acentos, escopo dos filtros, transbordamento em 320 px, sobreposição de filtros e refinamento de layout. Venda rápida mantém seu comportamento atual sobre estoque e personalização de combos.

A 0.8.3 é uma prévia técnica até a conferência no Windows pelo proprietário.
