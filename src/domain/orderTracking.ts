import type { OrderStatus, DeliveryType } from '../types';

export function orderTracking(status: OrderStatus, deliveryType: DeliveryType) {
  const delivery=deliveryType==='delivery';
  const stages=[
    {key:'pending',title:'Pedido recebido',desc:'Aguardando confirmação do estabelecimento.'},
    {key:'confirmed',title:'Pedido confirmado',desc:'O estabelecimento confirmou seu pedido.'},
    {key:'preparing',title:'Em preparo',desc:'Seu pedido está sendo preparado.'},
    {key:'ready',title:delivery?'Pronto para entrega':'Pronto para retirada',desc:delivery?'Aguardando saída para entrega.':'Seu pedido pode ser retirado no balcão.'},
    ...(delivery?[{key:'delivering',title:'Saiu para entrega',desc:'Seu pedido está a caminho.'}]:[]),
    {key:'delivered',title:delivery?'Pedido entregue':'Retirada concluída',desc:delivery?'Entrega finalizada.':'Pedido finalizado no balcão.'}
  ];
  const key=status==='new'?'pending':!delivery&&status==='delivering'?'ready':status;
  const index=stages.findIndex(stage=>stage.key===key);
  const cancelled=status==='cancelled';
  return {stages,index,cancelled,title:cancelled?'Pedido cancelado':stages[index]?.title||'Status indisponível',description:cancelled?'Entre em contato com o estabelecimento para mais informações.':stages[index]?.desc||'Consulte o estabelecimento.'};
}
