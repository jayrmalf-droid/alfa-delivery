import { useEffect, useState } from 'react';
export function ConnectionNotice() {
 const [notice,setNotice]=useState<{status:string;message?:string}|null>(null);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const onSave=(event:Event)=>{clearTimeout(timer);const detail=(event as CustomEvent).detail;setNotice(detail);if(detail.status==='saved')timer=setTimeout(()=>setNotice(null),2500);};
  window.addEventListener('alfa-save',onSave);return()=>{clearTimeout(timer);window.removeEventListener('alfa-save',onSave);};
 },[]);
 if(!notice)return null;
 return <div className={`save-notice ${notice.status}`} role={notice.status==='error'?'alert':'status'}>{notice.status==='saving'?'Salvando alterações…':notice.status==='saved'?'Alterações salvas.':notice.message}<button aria-label="Fechar aviso" onClick={()=>setNotice(null)}>×</button></div>;
}
