// Utilitário completo para paletas estruturadas de cores dinâmicas
// Suporta 4 tokens por paleta: Primária (Ação), Secundária (Destaque/Acento), Fundo Claro e Texto Escuro

export interface StructuredPalette {
  id: string;
  name: string;
  category: string;
  description: string;
  primary: string;       // Primária (Apetite / Ação)
  secondary: string;     // Secundária (Destaque / Acento)
  bgLight: string;       // Fundo Claro (Página e cartões)
  textDark: string;      // Fundo Escuro / Texto Principal
  isSpecialized?: boolean;
}

export interface ColorPalette {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;
  primarySubtle: string;
  primaryBorder: string;
  primaryGlow: string;
  secondary: string;
  secondaryHover: string;
  secondarySubtle: string;
  bgLight: string;
  textDark: string;
  textMuted: string;
  borderSubtle: string;
}

// 1. As 3 Novas Paletas Especializadas para Diferentes Segmentos Gastronômicos
export const SPECIALIZED_PALETTES: StructuredPalette[] = [
  {
    id: 'classica_energetica',
    name: 'Clássica e Energética',
    category: 'Fast-Food & Lanches',
    description: 'Ideal para hamburguerias, pizzarias e apps com apelo popular que buscam estimular o apetite e a rapidez.',
    primary: '#FF4500',   // Laranja avermelhado
    secondary: '#FFD700', // Amarelo ouro
    bgLight: '#FAFAFA',   // Branco suave
    textDark: '#1A1A1A',  // Cinza quase preto
    isSpecialized: true
  },
  {
    id: 'saudavel_sustentavel',
    name: 'Saudável e Sustentável',
    category: 'Saladas, Veganos & Fit',
    description: 'Perfeita para marmitas fitness, comida vegetariana/vegana, sucos e estabelecimentos que vendem a ideia de frescor, saúde e bem-estar.',
    primary: '#2E7D32',   // Verde folha escuro
    secondary: '#81C784', // Verde menta claro
    bgLight: '#F9FBF7',   // Branco com toque esverdeado
    textDark: '#212121',  // Grafite escuro
    isSpecialized: true
  },
  {
    id: 'premium_gourmet',
    name: 'Premium e Gourmet',
    category: 'Cafés, Docerias & Alta Gastronomia',
    description: 'Excelente para docerias refinadas, cafeterias ou restaurantes de alta gastronomia com retirada no balcão, transmitindo sofisticação e conforto.',
    primary: '#4E342E',   // Marrom café escuro
    secondary: '#E0A96D', // Dourado queimado / Caramelo
    bgLight: '#FFFDF9',   // Marfim/Creme
    textDark: '#2A2421',  // Preto café
    isSpecialized: true
  }
];

// 2. Paletas Já Existentes no Sistema — Adaptadas ao Mesmo Padrão Estruturado de 4 Cores
export const STANDARD_PALETTES: StructuredPalette[] = [
  {
    id: 'alfa_padrao',
    name: 'Vermelho Alfa (Padrão)',
    category: 'Identidade Alfa Salgados',
    description: 'Identidade original da Alfa Salgados: vermelho apetitoso, acento dourado tostado e creme acolhedor.',
    primary: '#dc2626',
    secondary: '#f59e0b',
    bgLight: '#fefbf6',
    textDark: '#1c1917'
  },
  {
    id: 'laranja_delivery',
    name: 'Laranja Delivery',
    category: 'Lanches Express',
    description: 'Estimulante e dinâmico, excelente para entregas rápidas e promoções diárias.',
    primary: '#ea580c',
    secondary: '#fbbf24',
    bgLight: '#fffdfa',
    textDark: '#1f1a14'
  },
  {
    id: 'ambar_dourado',
    name: 'Âmbar Dourado',
    category: 'Massas & Fornada',
    description: 'Tons quentes que lembram fornada assada no ponto certo, crocância e calor.',
    primary: '#d97706',
    secondary: '#fcd34d',
    bgLight: '#fffdf7',
    textDark: '#291e0a'
  },
  {
    id: 'verde_esmeralda',
    name: 'Verde Esmeralda',
    category: 'Orgânicos & Artesanais',
    description: 'Sensação de equilíbrio e qualidade artesanal para produtos selecionados.',
    primary: '#16a34a',
    secondary: '#4ade80',
    bgLight: '#f0fdf4',
    textDark: '#142918'
  },
  {
    id: 'azul_real',
    name: 'Azul Real',
    category: 'Eventos & Corporativo',
    description: 'Visual corporativo e sóbrio para encomendas de buffet corporativo e recepções.',
    primary: '#2563eb',
    secondary: '#60a5fa',
    bgLight: '#f8faff',
    textDark: '#0f172a'
  },
  {
    id: 'roxo_premium',
    name: 'Roxo Premium',
    category: 'Açaí & Sobremesas',
    description: 'Sofisticação e modernidade para sobremesas autorais, açaí e produtos especiais.',
    primary: '#7c3aed',
    secondary: '#c084fc',
    bgLight: '#faf5ff',
    textDark: '#1e1338'
  },
  {
    id: 'rosa_magenta',
    name: 'Rosa Magenta',
    category: 'Confeitaria & Bolos',
    description: 'Vibrante, afetivo e doce para bolos temáticos, docerias e datas festivas.',
    primary: '#db2777',
    secondary: '#f472b6',
    bgLight: '#fdf2f8',
    textDark: '#241019'
  },
  {
    id: 'vinho_bordo',
    name: 'Vinho Bordô',
    category: 'Tradição & Bistrô',
    description: 'Elegância clássica e tradicional para receitas de família e momentos comemorativos.',
    primary: '#881337',
    secondary: '#fb7185',
    bgLight: '#fff1f2',
    textDark: '#220911'
  },
  {
    id: 'grafite_elegante',
    name: 'Grafite Elegante',
    category: 'Minimalista & Moderno',
    description: 'Foco total nas fotografias dos produtos com contrastes neutros e elegantes.',
    primary: '#334155',
    secondary: '#94a3b8',
    bgLight: '#f8fafc',
    textDark: '#0f172a'
  }
];

export const ALL_THEME_PALETTES: StructuredPalette[] = [
  ...SPECIALIZED_PALETTES,
  ...STANDARD_PALETTES
];

// Presets compatíveis com interfaces legadas
export const THEME_PRESETS = ALL_THEME_PALETTES.map(p => ({
  name: p.name,
  hex: p.primary,
  id: p.id,
  palette: p
}));

// Funções de conversão e cálculo de cor
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) {
    return { r: 220, g: 38, b: 38 }; // fallback #dc2626
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function adjustLightness(r: number, g: number, b: number, factor: number): string {
  if (factor < 0) {
    const multiplier = 1 + factor;
    return rgbToHex(r * multiplier, g * multiplier, b * multiplier);
  } else {
    return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
  }
}

// Localiza paleta correspondente
export function findPaletteById(id?: string): StructuredPalette | undefined {
  if (!id) return undefined;
  return ALL_THEME_PALETTES.find(p => p.id === id);
}

export function findPaletteByPrimary(hex?: string): StructuredPalette | undefined {
  if (!hex) return undefined;
  const clean = hex.trim().toLowerCase();
  return ALL_THEME_PALETTES.find(p => p.primary.toLowerCase() === clean);
}

// Gera paleta calculada completa garantindo contraste e harmonia
export function generatePalette(
  primaryHex: string,
  secondaryHex?: string,
  bgLightHex?: string,
  textDarkHex?: string
): ColorPalette {
  // Se for uma paleta cadastrada, herda os tokens recomendados
  const matched = findPaletteByPrimary(primaryHex);
  const effectiveSecondary = secondaryHex || matched?.secondary || '#f59e0b';
  const effectiveBgLight = bgLightHex || matched?.bgLight || '#fefbf6';
  const effectiveTextDark = textDarkHex || matched?.textDark || '#1c1917';

  const { r, g, b } = hexToRgb(primaryHex);
  const secRgb = hexToRgb(effectiveSecondary);
  const textRgb = hexToRgb(effectiveTextDark);

  const primary = rgbToHex(r, g, b);
  const primaryDark = adjustLightness(r, g, b, -0.18);
  const primaryDarker = adjustLightness(r, g, b, -0.32);
  const primaryLight = adjustLightness(r, g, b, 0.15);
  const primarySubtle = `rgba(${r}, ${g}, ${b}, 0.08)`;
  const primaryBorder = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const primaryGlow = `rgba(${r}, ${g}, ${b}, 0.35)`;

  const secondary = rgbToHex(secRgb.r, secRgb.g, secRgb.b);
  const secondaryHover = adjustLightness(secRgb.r, secRgb.g, secRgb.b, -0.12);
  const secondarySubtle = `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.14)`;

  const textMuted = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.65)`;
  const borderSubtle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.12)`;

  return {
    primary,
    primaryDark,
    primaryDarker,
    primaryLight,
    primarySubtle,
    primaryBorder,
    primaryGlow,
    secondary,
    secondaryHover,
    secondarySubtle,
    bgLight: effectiveBgLight,
    textDark: effectiveTextDark,
    textMuted,
    borderSubtle
  };
}

// Aplica paleta no documento DOM com todas as variáveis CSS correspondentes
export function applyTheme(input: string | {
  primary?: string;
  secondary?: string;
  bgLight?: string;
  textDark?: string;
  primary_color?: string;
  secondary_color?: string;
  bg_color?: string;
  text_color?: string;
  palette_id?: string;
}): void {
  if (typeof document === 'undefined') return;

  let primary: string = '#dc2626';
  let secondary: string | undefined;
  let bgLight: string | undefined;
  let textDark: string | undefined;

  if (typeof input === 'string') {
    primary = input;
    const match = findPaletteByPrimary(input) || findPaletteById(input);
    if (match) {
      primary = match.primary;
      secondary = match.secondary;
      bgLight = match.bgLight;
      textDark = match.textDark;
    }
  } else if (input && typeof input === 'object') {
    if (input.palette_id) {
      const match = findPaletteById(input.palette_id);
      if (match) {
        primary = match.primary;
        secondary = match.secondary;
        bgLight = match.bgLight;
        textDark = match.textDark;
      }
    }
    primary = input.primary || input.primary_color || primary;
    secondary = input.secondary || input.secondary_color || secondary;
    bgLight = input.bgLight || input.bg_color || bgLight;
    textDark = input.textDark || input.text_color || textDark;
  }

  const palette = generatePalette(primary, secondary, bgLight, textDark);
  const root = document.documentElement;

  // 1. Variáveis primárias
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-dark', palette.primaryDark);
  root.style.setProperty('--color-primary-darker', palette.primaryDarker);
  root.style.setProperty('--color-primary-light', palette.primaryLight);
  root.style.setProperty('--color-primary-subtle', palette.primarySubtle);
  root.style.setProperty('--color-primary-border', palette.primaryBorder);
  root.style.setProperty('--color-primary-glow', palette.primaryGlow);

  // 2. Variáveis secundárias / acento
  root.style.setProperty('--color-secondary', palette.secondary);
  root.style.setProperty('--color-accent', palette.secondary);
  root.style.setProperty('--color-accent-hover', palette.secondaryHover);
  root.style.setProperty('--color-accent-subtle', palette.secondarySubtle);

  // 3. Fundo e superfícies
  root.style.setProperty('--bg-page', palette.bgLight);
  root.style.setProperty('--bg-card', '#ffffff');
  root.style.setProperty('--border-subtle', palette.borderSubtle);

  // 4. Tipografia e contrastes
  root.style.setProperty('--text-main', palette.textDark);
  root.style.setProperty('--text-muted', palette.textMuted);
}

// Manter compatibilidade com código existente
export function applyThemeColor(hexOrSettings: string | any): void {
  applyTheme(hexOrSettings);
}
