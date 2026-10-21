# Melhorias 0.8.5 — PRÉVIA

Base: 0.8.4. Escopo desta etapa: layout de Produtos, Clientes e Venda rápida.

## Produtos

Cabeçalho com ações mais fáceis de localizar. Indicadores seguidos pela busca, filtro de categoria, impressão, ordenação e lista de produtos. Ferramentas de estoque, reposição e pausa de opções passam para depois da lista, com acesso direto pelo botão Estoque e opções. O salto posiciona também o foco de teclado. Campos e ações existentes são mantidos.

## Clientes

Cabeçalho identifica a seção e separa a contagem de cadastros manuais da contagem de clientes com pedidos. As bases podem representar a mesma pessoa; as contagens não devem ser somadas.

Novo cadastro manual expande o formulário existente. Fechar e reabrir preserva o preenchimento enquanto a página permanece montada. Sair da seção pode descartar texto não salvo, como antes. A confirmação de gravação permanece visível fora da área recolhível.

No celular, a listagem manual mostra cartões com nome, telefone, limite, saldo devedor, data de cadastro e ação de exclusão, sem exigir rolagem horizontal. Listas grandes mantêm rolagem vertical dentro da região. Histórico de pedidos, fidelidade e relacionamento permanecem disponíveis; a busca dessa área está identificada como busca de clientes com pedidos.

## Venda rápida

Formulário agrupado visualmente em Cliente, Produtos e desconto e Pagamento. Resumo de subtotal, desconto e total com maior destaque. Indicadores compactos no celular, preservando os valores e descrições. Formulário de recebimento e cartões de contas a receber adaptados a telas estreitas.

## Preservação

As rotinas anteriores ao JSX dos três componentes permanecem idênticas à 0.8.4. Servidor, serviços de persistência, cálculo de saldos e regras de negócio não mudam. Sem esquema novo, migração ou regravação de histórico. Segurança e correções anteriores preservadas.

Sem dependências, operadores ou perfis adicionais. O cardápio público mantém sua apresentação e funções. Tabelas largas de produtos e histórico continuam com rolagem na própria região.

A entrega permanece prévia até a conferência no Windows, conforme ATUALIZACAO_0.8.5.md.
