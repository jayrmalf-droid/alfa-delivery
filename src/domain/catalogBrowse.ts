import { productPrice } from './rules';
export type CatalogSort = 'recommended' | 'name' | 'priceAsc' | 'priceDesc';
export function sortCatalog<T extends {name: string; price: number; promo_price?: number | null}>(products: readonly T[], sort: CatalogSort): T[] {
 const copy=[...products];
 if(sort==='recommended') return copy;
 return copy.sort((a,b)=> (sort==='name'?0:sort==='priceAsc'?productPrice(a)-productPrice(b):productPrice(b)-productPrice(a)) || a.name.localeCompare(b.name,'pt-BR'));
}
