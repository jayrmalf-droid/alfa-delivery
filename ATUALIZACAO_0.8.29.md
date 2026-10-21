# Atualização 0.8.29 PRÉVIA

Acabamento Premium Artisan nos detalhes do produto, sacola e checkout: creme, terracota, títulos serifados, campos e escolhas com foco visível. Sem alteração de preços ou esquema do banco.

1. Pare o servidor e faça backup da instalação anterior.
2. Extraia o ZIP em uma pasta nova.
3. Copie da instalação anterior o `.env`, a pasta `data` inteira e `public/uploads` para os mesmos locais da nova instalação. Preserve também qualquer banco `alfa.sqlite` configurado fora de `data`; mantenha o caminho indicado no `.env`. Nunca substitua o banco real por um vazio.
4. Na pasta alfadeliveryPRO execute `npm ci`, `npm test`, `npm run build` e `npm start` (Node.js 24 ou superior).
5. Abra http://localhost:3001 e pressione Ctrl+F5. Confira Cards e Lista, busca, carrinho e checkout antes de usar em produção.

Sem mudança no esquema do banco. A validação no Windows deve ser feita na sua instalação.
