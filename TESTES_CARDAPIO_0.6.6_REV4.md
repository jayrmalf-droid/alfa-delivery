# Homologação do cardápio — 0.6.6 PRÉVIA REV4

A 0.6.5 permanece estável. Use outra pasta e uma cópia dos dados, conforme a preparação de TESTES_WINDOWS_0.6.6.md. A revisão 4 contém o painel completo da revisão 3. Nenhuma aprovação anterior torna esta revisão estável.

Após npm ci, npm test e npm run build, execute npm start. Abra http://localhost:3001 (ou sua porta configurada), pressione Ctrl+F5 para atualizar os estilos e mantenha o servidor aberto. Faça os testes na cópia.

| Teste | Procedimento e resultado esperado |
|---|---|
| 1 — Apresentação | Confira nome, logo, horários, estado aberto/fechado, informações de entrega, banners e links. Os dados devem corresponder à configuração da loja. Teste as setas dos banners e os botões de produto/categoria/WhatsApp já configurados. |
| 2 — Busca e categorias | Pesquise um produto existente e um termo inexistente. Limpe a busca, selecione categorias e volte a Todos. Resultados e quantidade de opções devem acompanhar o filtro. |
| 3 — Cards e lista | Alterne Cards e Lista. Confira nomes, fotos, descrições, preços, promoções e identificação de combos. Não deve haver alteração de preço ao mudar a visualização. Imagens indisponíveis devem usar a alternativa já existente. |
| 4 — Personalização | Abra produto simples e combo com sabores/opções. Confira regras obrigatórias, limites, quantidade, observação e valor final. Adicione à sacola; a seleção deve permanecer correta. |
| 5 — Sacola | Aumente e diminua quantidades, edite e remova itens. Confira subtotal, observações e opções escolhidas. O botão flutuante deve abrir a sacola sem encobrir a navegação inferior. |
| 6 — Finalização | Avance para o pedido. Confira entrega e retirada, bairro e taxa, agendamento, cupom, pontos e meios de pagamento disponíveis. Faça um pedido de teste apenas na cópia e confirme os valores e o recebimento administrativo. |
| 7 — Celular e teclado | Use F12 e Ctrl+Shift+M no Chrome, larguras 390 e 320. Confira cards/lista, menu, categorias, produto, sacola e checkout. Campos e ações devem permanecer acessíveis, com rolagem dentro das janelas. Use Tab e Escape nas janelas; confira o foco. |
| 8 — Painel e pacote | Confira a busca Ctrl+K e as seções administrativas. Execute npm run release e npm run verify:release. O ZIP REV4 deve ser validado após extração, instalação, 58 testes e compilação. |

Para retornar à versão estável, encerre o servidor da prévia e inicie a pasta preservada da 0.6.5. Informe qualquer corte de texto ou botão com o nome da tela e a largura usada. A homologação no Windows e a aprovação desta revisão ficam a cargo do proprietário.
