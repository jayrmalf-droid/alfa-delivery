import { normalizeAdminSearch as normalize } from '../../domain/adminInput';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Command, Rows3, Search, X } from 'lucide-react';
import { ADMIN_PAGES, ADMIN_PAGE_TERMS } from './adminPages';
import type { AdminTab } from './AdminSidebar';
import { useDialog } from '../../utils/useDialog';


export function AdminWorkspaceTools({ currentTab, onNavigate }: { currentTab: AdminTab; onNavigate: (tab: AdminTab) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentTabs, setRecentTabs] = useState<AdminTab[]>([]);
  useEffect(() => { setRecentTabs(previous => [currentTab, ...previous.filter(tab => tab !== currentTab)].slice(0, 5)); }, [currentTab]);
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem('alfa-admin-density') === 'compact'; } catch { return false; }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  useDialog(open, () => setOpen(false));
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.admin-shell');
    if (shell) shell.dataset.density = compact ? 'compact' : 'comfortable';
    try { localStorage.setItem('alfa-admin-density', compact ? 'compact' : 'comfortable'); } catch { /* Preference is optional. */ }
    return () => { if (shell) delete shell.dataset.density; };
  }, [compact]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      if (document.querySelector('[role="dialog"]') && !open) return;
      event.preventDefault();
      setQuery('');
      setOpen(value => !value);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [open]);
  const matches = useMemo(() => (Object.entries(ADMIN_PAGES) as [AdminTab, { title: string; group: string }][])
    .filter(([tab, page]) => normalize(`${page.title} ${page.group} ${ADMIN_PAGE_TERMS[tab]}`).includes(normalize(query.trim()))), [query]);
  const navigate = (tab: AdminTab) => { setOpen(false); onNavigate(tab); };
  return <div className="admin-workspace-tools">
    <button type="button" className="admin-search-trigger" aria-label="Buscar seção do painel" aria-haspopup="dialog" onClick={() => { setQuery(''); setOpen(true); }}>
      <Search size={17} aria-hidden="true" /><span>Buscar seção…</span><kbd>Ctrl K</kbd>
    </button>
    <button type="button" className="admin-density-toggle" aria-label="Visualização compacta" aria-pressed={compact} title={compact ? 'Usar espaçamento confortável' : 'Usar espaçamento compacto'} onClick={() => setCompact(value => !value)}><Rows3 size={18} aria-hidden="true" /></button>
    {open && <div className="admin-command-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="admin-command" role="dialog" aria-modal="true" aria-labelledby="admin-command-title">
        <header><div><Command size={18} aria-hidden="true" /><h2 id="admin-command-title">Ir para uma seção</h2></div><button type="button" aria-label="Fechar busca de seções" onClick={() => setOpen(false)}><X size={20} /></button></header>
        <div className="admin-command-search"><Search size={20} aria-hidden="true" /><input ref={searchRef} aria-label="Nome da seção" placeholder="Busque também por estoque, fiado ou backup…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && matches.length) { event.preventDefault(); navigate(matches[0][0]); }
          if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector<HTMLButtonElement>('.admin-command-results button')?.focus(); }
        }} /></div>
        {!query.trim() && recentTabs.some(tab=>tab!==currentTab) && <nav className="admin-command-recent" aria-label="Seções recentes"><strong>Acessadas recentemente</strong><div>{recentTabs.filter(tab=>tab!==currentTab).slice(0,4).map(tab=><button type="button" key={tab} onClick={()=>navigate(tab)}>{ADMIN_PAGES[tab].title}<ArrowUpRight size={14} aria-hidden="true"/></button>)}</div></nav>}
        {query && <button type="button" className="admin-command-clear" onClick={()=>{setQuery('');searchRef.current?.focus();}}>Limpar busca</button>}
        <div className="admin-command-results" onKeyDown={event => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          if (!buttons.length) return;
          event.preventDefault();
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if(event.key === 'ArrowUp' && index === 0){ searchRef.current?.focus(); return; }
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next].focus();
        }}>
          <p className="admin-command-count" role="status">{matches.length ? `${matches.length} seções encontradas` : 'Nenhuma seção encontrada. Tente outro nome.'}</p>
          {matches.map(([tab, page]) => <button type="button" key={tab} onClick={() => navigate(tab)} aria-current={tab === currentTab ? 'page' : undefined}>
            <span className="admin-command-mark">{tab === currentTab ? <Check size={17} /> : <ArrowUpRight size={17} />}</span><span><strong>{page.title}</strong><small>{page.group}</small></span>{tab === currentTab && <em>Atual</em>}
          </button>)}
        </div>
        <footer><span><kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></footer>
      </section>
    </div>}
  </div>;
}
