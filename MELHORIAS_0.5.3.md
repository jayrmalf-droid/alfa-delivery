# AlfaDelivery PRO 0.5.3 — Auditoria administrativa

- Nova seção Configurações > Auditoria, com filtros por data e ação, listagem limitada e CSV.
- Endpoint administrativo protegido; leitura do histórico existente, sem alteração do banco.
- Exportação CSV protegida contra fórmulas em planilhas.
- Limitação atual: o esquema legado não armazena o usuário responsável por cada evento; não há atribuição retroativa.
- Eventos existentes incluem atualizações de pedidos, pagamentos de pedidos, backups e mudanças de configuração. A cobertura de operações financeiras é parcial.
- O arquivo ZIP não contém banco, backups, `.env`, `node_modules` ou `dist`.
