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
  const [activeSpyId, setActiveSpyId] = useState<string | null>(selectedCategoryId);

  // Scrollspy observer for sticky sections
  useEffect(() => {
    if (selectedCategoryId !== null) {
      setActiveSpyId(selectedCategoryId);
      return;
    }

    const available = categories.filter(c => c.is_available);
    if (!available.length) return;

    const elements = available
      .map(c => document.getElementById(`category-${c.id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible sections
        const visible = entries.find(entry => entry.isIntersecting);
        if (visible) {
          const matchId = visible.target.id.replace('category-', '');
          setActiveSpyId(matchId);

          // Auto-scroll the active button into view in the horizontal bar
          const targetBtn = ref.current?.querySelector(`[data-category-id="${matchId}"]`) as HTMLElement | null;
          if (targetBtn && ref.current) {
            ref.current.scrollTo({
              left: targetBtn.offsetLeft - ref.current.clientWidth / 2 + targetBtn.offsetWidth / 2,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
          }
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0.1
      }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [categories, selectedCategoryId]);

  // Keep track of scroll edges for arrows
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
    setActiveSpyId(id);

    // Scroll bar button into center
    const el = ref.current;
    if (el) {
      const b = event.currentTarget;
      el.scrollTo({
        left: b.offsetLeft - el.clientWidth / 2 + b.offsetWidth / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    // Smooth scroll to section in page
    if (id !== null) {
      const targetSec = document.getElementById(`category-${id}`);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    } else {
      const catalogEl = document.getElementById('cardapio-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
  };

  const currentHighlight = selectedCategoryId !== null ? selectedCategoryId : activeSpyId;

  return (
    <nav className="catalog-categories sticky-category-nav" aria-label="Navegação de categorias com rolagem rápida">
      {edges.left && (
        <button
          className="category-arrow previous"
          onClick={() => ref.current?.scrollBy({ left: -240, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
          aria-label="Categorias anteriores"
        >
          <ChevronLeft size={17} />
        </button>
      )}

      <div className="category-list no-scrollbar" ref={ref} aria-label="Filtrar por categoria">
        <button
          data-category-id="all"
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
            const isSelected = currentHighlight === c.id;
            return (
              <button
                key={c.id}
                data-category-id={c.id}
                className={selectedCategoryId === c.id ? 'selected' : isSelected ? 'in-view' : ''}
                aria-pressed={selectedCategoryId === c.id}
                aria-current={selectedCategoryId===null && isSelected ? 'location' : undefined}
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
          onClick={() => ref.current?.scrollBy({ left: 240, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
          aria-label="Mais categorias"
        >
          <ChevronRight size={17} />
        </button>
      )}
    </nav>
  );
};
