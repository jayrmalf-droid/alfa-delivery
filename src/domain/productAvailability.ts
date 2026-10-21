export function productAvailability(product: {available: boolean; has_stock_control?: boolean; stock_quantity: number}): {canOrder: boolean; reason: string} {
 if (!product.available) return {canOrder:false,reason:'Produto pausado'};
 if (product.has_stock_control && product.stock_quantity <= 0) return {canOrder:false,reason:'Sem estoque no momento'};
 return {canOrder:true,reason:'Disponível para pedidos'};
}
