import React from 'react';
import { LoyaltyStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
interface Props { loyalty: LoyaltyStatus; currentOrderSubtotal?: number; compact?: boolean; onApplyReward?: () => void; isRewardApplied?: boolean }
export const LoyaltyCard: React.FC<Props> = ({loyalty, currentOrderSubtotal, onApplyReward, isRewardApplied}) => {
 if (!loyalty.enabled) return null;
 const points = loyalty.points ?? loyalty.stamps;
 const goal = loyalty.goal || 100;
 const qualifies = currentOrderSubtotal !== undefined && currentOrderSubtotal >= loyalty.min_order_value;
 return <div style={{padding:18,borderRadius:14,border:'1px solid #fbdcd6',background:'#fff9f5',margin:'12px 0'}}>
   <strong>⭐ {loyalty.program_name || 'Clube de Pontos'}</strong>
   <p style={{margin:'8px 0'}}>Saldo: <strong>{points} pontos</strong> · Resgate: {goal} pontos</p>
   <div style={{height:8,background:'#eee',borderRadius:8,overflow:'hidden'}}><div style={{width:`${Math.max(0,Math.min(100,points/goal*100))}%`,height:'100%',background:'#a91928'}} /></div>
   <p style={{fontSize:13}}>A cada R$ 1 em compras elegíveis, ganhe {loyalty.earn_per_real ?? 1} ponto(s). Pedido mínimo: {formatCurrency(loyalty.min_order_value)}.</p>
   {qualifies && <p style={{fontSize:13,color:'#166534'}}>Este pedido poderá gerar pontos após a confirmação.</p>}
   {loyalty.has_reward ? <><p>Recompensa disponível: {loyalty.discount_percent}% de desconto, até {formatCurrency(loyalty.max_discount_value)}.</p>{onApplyReward && <button type="button" onClick={onApplyReward} style={{padding:'9px 12px',border:0,borderRadius:8,background:'#a91928',color:'white',fontWeight:700}}>{isRewardApplied?'✓ Resgate aplicado':`Resgatar ${goal} pontos`}</button>}</> : <p style={{fontSize:13}}>Faltam {Math.max(0,goal-points)} pontos para a recompensa.</p>}
   {!!loyalty.history?.length && <details><summary style={{cursor:'pointer',fontSize:13}}>Histórico de pontos</summary><div style={{maxHeight:150,overflowY:'auto'}}>{loyalty.history.slice(0,15).map(e=><div key={e.id} style={{fontSize:12,padding:4}}>{new Date(e.created_at).toLocaleDateString('pt-BR')} · Pedido {e.order_number} · {e.type} · {e.points>0?'+':''}{e.points} pontos</div>)}</div></details>}
 </div>;
};
