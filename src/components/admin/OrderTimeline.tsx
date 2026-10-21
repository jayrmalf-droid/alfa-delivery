import React from 'react';
import type { Order, OrderStatus } from '../../types';
import { orderTracking } from '../../domain/orderTracking';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  Store,
  PackageCheck,
  AlertCircle,
  XCircle,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';

interface OrderTimelineProps {
  order: Order;
  compact?: boolean;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ order, compact = false }) => {
  const deliveryType = order.delivery_type || 'delivery';
  const { stages, index: currentStageIndex, cancelled } = orderTracking(order.status, deliveryType);
  const isDelivery = deliveryType === 'delivery';

  // Mapeia ícones para cada status
  const getStageIcon = (key: string, isCurrent: boolean, isPassed: boolean) => {
    const size = compact ? 13 : 16;
    switch (key) {
      case 'pending':
        return <ShoppingBag size={size} />;
      case 'confirmed':
        return <CheckCircle2 size={size} />;
      case 'preparing':
        return <ChefHat size={size} />;
      case 'ready':
        return isDelivery ? <PackageCheck size={size} /> : <Store size={size} />;
      case 'delivering':
        return <Bike size={size} />;
      case 'delivered':
        return <CheckCircle2 size={size} />;
      default:
        return <Clock size={size} />;
    }
  };

  // Helper para buscar o timestamp de uma transição específica a partir dos logs de auditoria
  const getStageTimestamp = (stageKey: string): { date: Date | null; user?: string } => {
    if (stageKey === 'pending') {
      const created = new Date(order.created_at);
      return { date: Number.isFinite(created.getTime()) ? created : null, user: 'Cliente' };
    }
    const log = order.audit_logs?.find(l => l.new_status === stageKey);
    if (log) {
      const d = new Date(log.changed_at);
      return { date: Number.isFinite(d.getTime()) ? d : null, user: log.user_responsible };
    }
    return { date: null };
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Modo compacto para usar dentro do Card no Kanban
  if (compact) {
    if (cancelled) {
      return (
        <div className="order-mini-timeline-cancelled" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: 6,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: '0.68rem',
          fontWeight: 700
        }}>
          <XCircle size={11} />
          <span>Cancelado</span>
        </div>
      );
    }

    return (
      <div className="order-mini-stepper" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        width: '100%',
        margin: '2px 0 4px'
      }}>
        {stages.map((stage, idx) => {
          const isPassed = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div
              key={stage.key}
              title={`${stage.title}${isCurrent ? ' (Fase Atual)' : isPassed ? ' (Concluído)' : ''}`}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: isCurrent ? '#0284c7' : isPassed ? '#10b981' : '#e2e8f0',
                boxShadow: isCurrent ? '0 0 6px rgba(2, 132, 199, 0.4)' : 'none',
                transition: 'all 0.3s ease'
              }}
            />
          );
        })}
      </div>
    );
  }

  // Visualização expandida e rica (para o Modal de Detalhes)
  return (
    <div className="order-timeline-expanded" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }}>
      {/* Banner de Cancelamento se aplicável */}
      {cancelled && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#991b1b'
        }}>
          <XCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Pedido Cancelado</div>
            <div style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: 1 }}>
              Atendimento cancelado. O estoque e as pontuações foram estornados automaticamente.
            </div>
          </div>
        </div>
      )}

      {/* Stepper Horizontal Interativo */}
      <div className="timeline-stepper-track" style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          fontSize: '0.74rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#64748b',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Linha do Tempo Operacional</span>
          <span style={{
            color: cancelled ? '#dc2626' : '#0369a1',
            backgroundColor: cancelled ? '#fef2f2' : '#f0f9ff',
            border: `1px solid ${cancelled ? '#fecaca' : '#bae6fd'}`,
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: '0.72rem'
          }}>
            {cancelled ? 'Cancelado' : stages[currentStageIndex]?.title || 'Em andamento'}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {stages.map((stage, idx) => {
            const isPassed = !cancelled && idx < currentStageIndex;
            const isCurrent = !cancelled && idx === currentStageIndex;
            const timeData = getStageTimestamp(stage.key);

            let nodeBg = '#f1f5f9';
            let nodeBorder = '#cbd5e1';
            let nodeColor = '#94a3b8';
            if (isPassed) {
              nodeBg = '#ecfdf5';
              nodeBorder = '#10b981';
              nodeColor = '#059669';
            } else if (isCurrent) {
              nodeBg = '#f0f9ff';
              nodeBorder = '#0284c7';
              nodeColor = '#0284c7';
            }

            return (
              <div
                key={stage.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  flex: 1,
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {/* Linha conectora */}
                {idx > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 15,
                    right: '50%',
                    width: '100%',
                    height: 2,
                    backgroundColor: isPassed || isCurrent ? '#10b981' : '#e2e8f0',
                    zIndex: -1
                  }} />
                )}

                {/* Nó com ícone */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: nodeBg,
                  border: `2px solid ${nodeBorder}`,
                  color: nodeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                  boxShadow: isCurrent ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {getStageIcon(stage.key, isCurrent, isPassed)}
                </div>

                {/* Título do estágio */}
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: isCurrent ? 800 : isPassed ? 700 : 500,
                  color: isCurrent ? '#0f172a' : isPassed ? '#334155' : '#94a3b8',
                  lineHeight: 1.15,
                  maxWidth: 72
                }}>
                  {stage.title}
                </span>

                {/* Horário */}
                {timeData.date && (
                  <span style={{
                    fontSize: '0.62rem',
                    color: isCurrent ? '#0284c7' : '#64748b',
                    fontWeight: 600,
                    marginTop: 2,
                    backgroundColor: isCurrent ? '#e0f2fe' : '#f8fafc',
                    padding: '1px 4px',
                    borderRadius: 3
                  }}>
                    {formatTime(timeData.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico Cronológico Detalhado (Auditoria) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.78rem',
          fontWeight: 800,
          color: '#1e293b',
          marginBottom: 10
        }}>
          <Clock size={15} color="#0f766e" />
          <span>Histórico de Mudanças de Status</span>
        </div>

        {order.audit_logs && order.audit_logs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.audit_logs.map((log, i) => {
              const logDate = new Date(log.changed_at);
              return (
                <div
                  key={log.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.76rem'
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    flexShrink: 0
                  }}>
                    <ArrowRight size={12} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>
                        {log.previous_status?.toUpperCase()} ➔ {log.new_status?.toUpperCase()}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        {formatDate(logDate)} às {formatTime(logDate)}
                      </span>
                    </div>

                    <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 2 }}>
                      Responsável: <strong style={{ color: '#334155' }}>{log.user_responsible || 'Painel Admin'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            fontSize: '0.74rem',
            color: '#64748b'
          }}>
            <ShoppingBag size={18} style={{ margin: '0 auto 4px', color: '#94a3b8' }} />
            <div>Pedido criado no cardápio digital em <strong>{new Date(order.created_at).toLocaleString('pt-BR')}</strong></div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>Aguardando próxima transição operacional.</div>
          </div>
        )}
      </div>
    </div>
  );
};
