import { useEffect, useRef } from 'react';
// Shared keyboard/focus behavior for all modal flows.
export function useDialog(open: boolean, onClose: () => void) {
 const closeRef=useRef(onClose);
 useEffect(()=>{closeRef.current=onClose;},[onClose]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  let dialog:HTMLElement|null=null;
  const timer=setTimeout(()=>{dialog=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).at(-1)||null;const focusable=dialog?.querySelector<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]');focusable?.focus();},0);
  const handler=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();closeRef.current();}
   if(event.key!=='Tab'||!dialog)return;
   const nodes=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(n=>n.getClientRects().length);
   if(!nodes.length){event.preventDefault();return;}
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',handler);
  return()=>{clearTimeout(timer);document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',handler);previous?.focus();};
 },[open]);
}
