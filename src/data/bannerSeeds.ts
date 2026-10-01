import type { Flavor, PromoBanner } from '../types';

export const INITIAL_FLAVORS: Flavor[] = [
  {
    id: 'flv_coxinha',
    name: 'Coxinha de Frango com Catupiry',
    description: 'A clássica e mais pedida: massa macia douradinha com frango desfiado temperado.',
    image_url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 1
  },
  {
    id: 'flv_quibe',
    name: 'Quibe Tradicional com Hortelã',
    description: 'Trigo selecionado, carne moída de primeira e toque especial de folhas frescas de hortelã.',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 2
  },
  {
    id: 'flv_bolinha_queijo',
    name: 'Bolinha de Queijo Crocante',
    description: 'Crocante por fora e com recheio cremoso e generoso de muçarela derretida.',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 3
  },
  {
    id: 'flv_risoles_pq',
    name: 'Risoles de Presunto e Queijo',
    description: 'Massa aveludada, recheio de presunto nobre picadinho e muçarela derretida.',
    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 4
  },
  {
    id: 'flv_risoles_milho',
    name: 'Risoles de Milho Verde com Queijo',
    description: 'Deliciosa combinação de queijo cremoso e milho verde selecionado.',
    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 5
  },
  {
    id: 'flv_pastel_carne',
    name: 'Pastelzinho de Carne Especial',
    description: 'Massa crocante sequinha com carne moída refogada com cebola, azeitona e temperos da casa.',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 6
  },
  {
    id: 'flv_pastel_frango',
    name: 'Pastelzinho de Frango Cremoso',
    description: 'Frango desfiado temperado com requeijão cremoso e massa estaladiça.',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 7
  },
  {
    id: 'flv_enroladinho',
    name: 'Enroladinho de Salsicha',
    description: 'Salsicha selecionada envolvida em massa frita dourada e crocante.',
    image_url: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776391631191.jpg',
    is_active: true,
    sort_order: 8
  },
  {
    id: 'flv_travesseirinho_pizza',
    name: 'Travesseirinho de Pizza',
    description: 'Recheio irresistível de muçarela, presunto, tomate fresco e orégano.',
    image_url: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776392114566.jpg',
    is_active: true,
    sort_order: 9
  },
  {
    id: 'flv_churros',
    name: 'Mini Churros de Doce de Leite',
    description: 'Passado no açúcar com canela e recheio cremoso e farto de doce de leite caseiro.',
    image_url: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=500&auto=format&fit=crop&q=80',
    is_active: true,
    sort_order: 10
  }
];

export const INITIAL_BANNERS: PromoBanner[] = [
  {
    id: 'ban_hero_momento',
    title: 'Seu momento fica muito melhor com Alfa Salgados',
    subtitle: 'Coxinhas douradas, bolinhas de queijo derretidas e quibes crocantes fritos na hora com muito carinho.',
    image_desktop: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776390578448.jpg',
    image_mobile: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776390578448.jpg',
    link_type: 'category',
    link_value: 'combos',
    sort_order: 1,
    is_active: true,
    show_floating_button: true,
    button_title: 'Monte seu cento',
    button_subtitle: 'Escolha seus sabores favoritos',
    button_price_text: 'A partir de R$ 31,90',
    button_icon: 'package',
    button_target_type: 'category',
    button_target_value: 'combos'
  },
  {
    id: 'ban_combo_festa',
    title: 'Combos & Cento de Salgados para Festas',
    subtitle: 'Monte seu cento escolhendo seus sabores favoritos e receba quentinho na sua porta em Vitória da Conquista!',
    image_desktop: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776390589029.jpg',
    image_mobile: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776390589029.jpg',
    link_type: 'category',
    link_value: 'combos',
    sort_order: 2,
    is_active: true,
    show_floating_button: true,
    button_title: 'Combo Festa Especial',
    button_subtitle: 'Cento com sabores variados',
    button_price_text: 'A partir de R$ 37,90',
    button_icon: 'flame',
    button_target_type: 'category',
    button_target_value: 'combos'
  },
  {
    id: 'ban_encomendas',
    title: 'Festas e Eventos? Agende sua Encomenda',
    subtitle: 'Entregamos na hora exata do seu evento com embalagem térmica que mantém a crocância e o sabor.',
    image_desktop: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776391631191.jpg',
    image_mobile: 'https://hqvmyfibxshobdxctksi.supabase.co/storage/v1/object/public/product-images/1776391631191.jpg',
    link_type: 'category',
    link_value: 'encomendas',
    sort_order: 3,
    is_active: true,
    show_floating_button: true,
    button_title: 'Agendar Encomenda',
    button_subtitle: 'Escolha o melhor dia e horário',
    button_price_text: 'Frito na hora',
    button_icon: 'sparkles',
    button_target_type: 'category',
    button_target_value: 'encomendas'
  }
];

