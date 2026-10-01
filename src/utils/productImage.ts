import type { Product } from '../types';
export function fallbackProductImage(product: Product): string {
 const name=product.name.toLowerCase();
 if(name.includes('coxinha'))return '/coxinha.webp';
 if(name.includes('bolinha de queijo'))return '/bolinha-queijo.webp';
 if(name.includes('quibe')||name.includes('kibe'))return '/quibe.webp';
 if(/\d+\s+salgados|cento de salgados/.test(name))return '/hero-salgados.webp';
 return '/product-placeholder.svg';
}

export function productImage(product: Product): string { return product.image_url || fallbackProductImage(product); }
