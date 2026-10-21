import { useEffect, useState } from 'react';
export function ConnectionNotice() {
 const [offline,setOffline]=useState(()=>typeof navigator!=='undefined'&&!navigator.onLine);
 useEffect(()=>{const lost=()=>setOffline(true),restored=()=>setOffline(false);window.addEventListener('offline',lost);window.addEventListener('online',restored);return()=>{window.removeEventListener('offline',lost);window.removeEventListener('online',restored);};},[]);
 const [notice,setNotice]=useState<{status:string;message?:string}|null>(null);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const onSave=(event:Event)=>{clearTimeout(timer);const detail=(event as CustomEvent).detail;setNotice(detail);if(detail.status==='saved')timer=setTimeout(()=>setNotice(null),2500);};
  window.addEventListener('alfa-save',onSave);return()=>{clearTimeout(timer);window.removeEventListener('alfa-save',onSave);};
 },[]);
 return <>{offline&&<div className="network-notice" role="alert"><button type="button" aria-label="Fechar aviso de conexão" onClick={()=>setOffline(false)}>×</button><strong>Dispositivo sem conexão</strong><span>Verifique sua internet antes de confirmar pedidos ou salvar alterações.</span></div>}{notice&&<div className={`save-notice ${notice.status}`} role={notice.status==='error'?'alert':'status'}>{notice.status==='saving'?'Salvando alterações…':notice.status==='saved'?'Alterações salvas.':notice.message}<button type="button" aria-label="Fechar aviso" onClick={()=>setNotice(null)}>×</button></div>}</>;
}
