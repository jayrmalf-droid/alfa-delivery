import React, { useRef, useState, useEffect } from 'react';
import type { Category } from '../../types';
import { ChevronLeft, ChevronRight, LayoutGrid, Package, Utensils, CupSoda, CirclePlus, Candy } from 'lucide-react';

interface Props {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

const iconFor = (name: string) =>
  /combo|cento/i.test(name)
    ? Package
    : /molho|adicional/i.test(name)
    ? CirclePlus
    : /bebida|refrigerante|suco/i.test(name)
    ? CupSoda
    : /doce|churros/i.test(name)
    ? Candy
    : Utensils;

export const CategoryBar: React.FC<Props> = ({
  categories,
  selectedCategoryId,
  onSelectCategory
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      });
    update();
    el.addEventListener('scroll', update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [categories.length]);

  const choose = (id: string | null, event: React.MouseEvent<HTMLButtonElement>) => {
    onSelectCategory(id);
    const el = ref.current;
    if (el) {
      const b = event.currentTarget;
      el.scrollTo({
        left: b.offsetLeft - el.clientWidth / 2 + b.offsetWidth / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    }
  };

  return (
    <div className="catalog-categories">
      {edges.left && (
        <button
          className="category-arrow previous"
          onClick={() => ref.current?.scrollBy({ left: -240, behavior: 'smooth' })}
          aria-label="Categorias anteriores"
        >
          <ChevronLeft size={17} />
        </button>
      )}

      <div className="category-list no-scrollbar" ref={ref} aria-label="Filtrar por categoria">
        <button
          className={selectedCategoryId === null ? 'selected' : ''}
          aria-pressed={selectedCategoryId === null}
          onClick={e => choose(null, e)}
        >
          <LayoutGrid size={15} />
          Todos
        </button>

        {categories
          .filter(c => c.is_available)
          .map(c => {
            const Icon = iconFor(c.name);
            return (
              <button
                key={c.id}
                className={selectedCategoryId === c.id ? 'selected' : ''}
                aria-pressed={selectedCategoryId === c.id}
                onClick={e => choose(c.id, e)}
              >
                <Icon size={15} />
                {c.name}
              </button>
            );
          })}
      </div>

      {edges.right && (
        <button
          className="category-arrow next"
          onClick={() => ref.current?.scrollBy({ left: 240, behavior: 'smooth' })}
          aria-label="Mais categorias"
        >
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
};
