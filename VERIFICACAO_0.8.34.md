# Conferência da prévia 0.8.34

Verificação em ambiente isolado, com produtos, cupons, telefones e pedidos fictícios. Homologação na instalação Windows do restaurante ainda necessária.

## Resultado

- 106 testes automatizados aprovados.
- 35 verificações dos novos fluxos no navegador.
- 57 verificações de navegação e layout das 13 telas do administrativo e rodapé do cardápio.
- 4 verificações de atualização periódica e recuperação de conexão.

## Fluxos conferidos

| Área | Conferência |
| --- | --- |
| Produtos | Cadastro atômico, edição, preço, opções e preservação de metadados |
| Categorias | Cadastro, edição e impedimento de exclusão quando em uso |
| Adicionais | Gratuito, pago, obrigatório, opcional, incrementos, pausa e seleção pelo cliente |
| Totais | Quantidade e adicional multiplicados corretamente; cotação conferida no servidor |
| Cupons | Publicação opcional, ocultação dos privados, pausa, expiração, limite, desconto no checkout e valores brasileiros |
| Fidelidade | Ganho ao concluir, resgate, cancelamento, ausência de duplicidade, configurações inválidas recusadas e consulta atualizada |
| Destaques | Favoritos locais persistentes e mais vendidos por unidades concluídas |
| Atualização | Evento sem conteúdo privado; produto e cupom atualizados sem recarga; conferência periódica e reconexão |
| Analytics | Diagnóstico usa o período selecionado; concluídos, cancelamentos, recompra, cupons, recompensa e horário local separados |
| Layout | Larguras de 320, 390, 768 e 1440 px |

## Exemplo financeiro validado no navegador

Duas unidades de R$ 20,00 com adicional de R$ 2,50 por unidade: R$ 45,00. Cupom de 10%: R$ 40,50. Pedido registrado com complemento e totais preservados. Após conclusão, 45 pontos na configuração de teste e entrada no ranking de concluídos.

Favoritos pertencem ao navegador. Mais vendidos usa o histórico de pedidos concluídos. Os diagnósticos são descritivos e não estimam lucro ou demanda futura. O painel separa valor vendido de recebimento confirmado.
