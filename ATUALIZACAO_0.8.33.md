# Atualização 0.8.33 PRÉVIA

Painel com base visual premium: menu, cabeçalho, indicadores, campos e superfícies em tons neutros e terracota. Rodapé do cardápio harmonizado. Cores semânticas de erros e status preservadas. Sem alteração de preços ou esquema do banco.

1. Pare o servidor e faça backup da instalação anterior.
2. Extraia o ZIP em uma pasta nova.
3. Copie da instalação anterior o `.env`, a pasta `data` inteira e `public/uploads` para os mesmos locais da nova instalação. Preserve também qualquer banco `alfa.sqlite` configurado fora de `data`; mantenha o caminho indicado no `.env`. Nunca substitua o banco real por um vazio.
4. Na pasta alfadeliveryPRO execute `npm ci`, `npm test`, `npm run build` e `npm start` (Node.js 24 ou superior).
5. Abra http://localhost:3001 e pressione Ctrl+F5. Confira Cards e Lista, busca, carrinho e checkout antes de usar em produção.

Sem mudança no esquema do banco. A validação no Windows deve ser feita na sua instalação.

## Visual e cores
Selecione uma paleta para pré-visualizar e clique em Salvar configurações para persistir. As cores do painel e do cardápio acompanham a paleta, mantendo o layout premium. Cores de alertas e status permanecem semânticas.

## Correção de contraste
Filtros de período com superfície sólida, texto legível e seleção destacada. Botões, categorias, preços e controles usam cores de texto derivadas por contraste da paleta. Bordas interativas e foco visível. Preservados status e alertas semânticos.

## Novidades
Prévia visual de identidade, indicação de cores ainda não salvas e restauração exclusiva das cores. Ao sair de Configurações, cores não salvas deixam de afetar a interface. Contraste dos botões do cardápio também ajustado no hover.
