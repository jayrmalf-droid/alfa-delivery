# Validação técnica — 0.8.18 PRÉVIA

- 85 testes automatizados, incluindo busca de pedido por número com cerquilha, nome, endereço, bairro e telefone.
- TypeScript/Vite compilados.
- 12 verificações novas no navegador: quatro buscas, Hoje no fuso Tóquio com relógio simulado na virada do dia UTC/Bahia, remoção independente, limpeza e etiquetas em 1440, 768, 390 e 320 px.
- 22 verificações de regressão dos modos Operação/Por etapa/Histórico/Tabela, filtros, ordenação, detalhes e exportação CSV.
- Nenhum erro JavaScript nas verificações finais.
- ZIP reextraído para instalação, testes e compilação.
- Apenas banco isolado e pedidos fictícios; nenhum dado operacional ou migração.

Permanece aviso de tamanho do bundle principal, sem bloquear a compilação. Homologação Windows pelo proprietário pendente.
