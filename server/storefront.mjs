// Explicit marketing opt-in; never publish the private coupon records.
export function publicOffers(coupons = [], now = Date.now()) {
 return coupons.filter(c=>c.show_in_menu===true&&c.is_active&&(!c.expires_at||(Number.isFinite(Date.parse(c.expires_at))&&Date.parse(c.expires_at)>=now))&&(!c.max_uses||(c.current_uses||0)<c.max_uses)&&(!c.is_single_use||!(c.current_uses>0))).slice(0,12).map(c=>({code:c.code,type:c.free_shipping?'shipping':(c.discount_type||c.type),value:Number(c.discount_value??c.value??0),min_order_value:Number(c.min_order_value||0),expires_at:c.expires_at||null,single_use_per_client:!!c.single_use_per_client}));
}
export function bestsellerIds(orders = []) {
 const quantities=new Map();
 for(const o of orders) if(o.status==='delivered') for(const item of o.items||[]) if(item.product_id&&Number(item.quantity)>0) quantities.set(item.product_id,(quantities.get(item.product_id)||0)+Number(item.quantity));
 return [...quantities].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6).map(([id])=>id);
}
