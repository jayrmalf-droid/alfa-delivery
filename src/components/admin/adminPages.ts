import type { AdminTab } from './AdminSidebar';

export const ADMIN_PAGES: Record<AdminTab, { title: string; group: string }> = {
  dashboard: { title: 'Visão geral', group: 'Operação' },
  orders: { title: 'Pedidos', group: 'Operação' },
  schedule: { title: 'Agenda e horários', group: 'Operação' },
  products: { title: 'Produtos', group: 'Loja e cardápio' },
  categories: { title: 'Categorias', group: 'Loja e cardápio' },
  banners: { title: 'Banners promocionais', group: 'Loja e cardápio' },
  neighborhoods: { title: 'Entrega e taxas', group: 'Loja e cardápio' },
  coupons: { title: 'Cupons e descontos', group: 'Loja e cardápio' },
  customers: { title: 'Clientes e fidelidade', group: 'Clientes e vendas' },
  sales: { title: 'Venda rápida e fiado', group: 'Clientes e vendas' },
  reports: { title: 'Relatórios e metas', group: 'Financeiro' },
  expenses: { title: 'Despesas e caixa', group: 'Financeiro' },
  settings: { title: 'Configurações da loja', group: 'Sistema' }
};

// Alternate terms people use in daily operation; navigation never changes records.
export const ADMIN_PAGE_TERMS: Record<AdminTab, string> = {
 dashboard: 'inicio resumo faturamento indicadores', orders: 'comandas entregas retirada historico',
 schedule: 'agendamento funcionamento expediente', products: 'cardapio estoque itens adicionais complementos',
 categories: 'grupos secoes', banners: 'propaganda imagens promocao', neighborhoods: 'bairros frete regioes delivery',
 coupons: 'cupom promocao desconto', customers: 'cadastro telefone whatsapp recompra pontos',
 sales: 'vendas avulsas fiado receber devedor pagamento recebimento', reports: 'relatorio metas resultados financeiro',
 expenses: 'despesa caixa gastos contas pagar fechamento', settings: 'configuracao loja backup seguranca impressora'
};
