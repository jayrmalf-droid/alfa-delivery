# AlfaDeliveryPRO 0.8.15 — mensagens e conexão

Clientes, Venda rápida e Despesas e caixa usam um componente compartilhado de mensagens, com classificação explícita: validação/erro em vermelho e confirmação em verde. Ícones, títulos e anúncio acessível complementam a cor. Um erro de validação recebe foco e rolagem até a mensagem; sucesso não altera o foco.

Mensagens de recebimento continuam junto à venda correspondente e separadas dos avisos do formulário de nova venda. Falhas de persistência mantêm o tratamento existente, sem mostrar confirmação de sucesso.

Cardápio e painel mostram aviso quando o navegador sinaliza perda de conexão. O aviso permite fechamento, reaparece em nova perda e sai quando a rede retorna. Não é um teste de saúde do servidor e não adiciona funcionamento offline.

Nenhuma alteração nos cálculos, validações monetárias, APIs, autenticação, banco ou histórico.
