# Alfa Delivery PRO 0.8.35 — Cardápio com melhor aproveitamento de espaço

Abertura mais compacta, largura útil ampliada e alinhada entre cabeçalho, apresentação, benefícios e catálogo. Cupons e fidelidade agora compartilham painéis com o mesmo acabamento e alinhamento; cupons aproveitam a largura disponível. Fotos dos produtos padronizadas em proporção 4:3. Grade com quatro colunas em telas grandes, três no desktop, duas no tablet e uma no celular. Modo Lista preservado.

Cores continuam vinculadas à paleta configurada. Favoritos, atualização automática, adicionais e regras de preços preservados.

## Verificações
- Compilação aprovada.
- 106 testes automatizados aprovados.
- 35 verificações de navegador aprovadas: favoritos, atualização automática, complementos obrigatórios/gratuitos/pagos, total, cupom, pedido, fidelidade e relatório.
- Layout verificado em 1920, 1440, 1024, 768, 390 e 320 pixels, sem rolagem horizontal.
- Pacote extraído e validado pelo verificador de distribuição.

## Instalação preservando os dados
Pare o servidor e faça backup antes da atualização. Na nova pasta, preserve o arquivo .env, toda a pasta data (incluindo alfa.sqlite) e public/uploads da instalação atual. Se ALFA_DATABASE aponta para banco externo, preserve esse arquivo e sua configuração. O pacote não deve substituir seu banco real.

Execute npm ci, npm run build e npm start. Acesse http://localhost:3001 e pressione Ctrl+F5. A conferência visual na instalação Windows permanece necessária.
