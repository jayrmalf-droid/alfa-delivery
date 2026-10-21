import React, { useEffect, useState } from 'react';
import { refresh } from '../services/api';
export function LiveSync({admin}:{admin:boolean}) {
 const [state,setState]=useState<'connecting'|'live'|'polling'|'offline'>('connecting');
 const [updated,setUpdated]=useState<Date|null>(null);
 useEffect(()=>{
  let active=true,running=false,queued=false,live=false;let timer:ReturnType<typeof setTimeout>|undefined;
  const sync=async()=>{if(running){queued=true;return;}running=true;try{await refresh();if(active){setUpdated(new Date());setState(navigator.onLine?(live?'live':'polling'):'offline');}}catch{if(active)setState(navigator.onLine?'polling':'offline');}finally{running=false;if(queued&&active){queued=false;void sync();}}};
  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden)void sync();},180);};
  const source=typeof EventSource!=='undefined'?new EventSource('/api/events'):null;
  if(source){source.onopen=()=>{live=true;if(active)setState('live');};source.addEventListener('update',schedule);source.onerror=()=>{live=false;if(active)setState(navigator.onLine?'polling':'offline');};}else setState('polling');
  const resume=()=>{if(!document.hidden)schedule();};const offline=()=>setState('offline');
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);window.addEventListener('offline',offline);
  const polling=setInterval(()=>{if(!document.hidden)void sync();},admin?6000:15000);
  return()=>{active=false;source?.close();clearInterval(polling);if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);window.removeEventListener('offline',offline);};
 },[admin]);
 return <div className={`live-sync ${admin?'live-sync-admin':''}`} role="status"><span aria-hidden="true"/>{state==='live'?'Atualização em tempo real':state==='offline'?'Sem conexão — dados podem estar desatualizados':state==='polling'?'Atualização periódica ativa':'Conectando atualizações…'}{updated&&<small>Conferido às {updated.toLocaleTimeString('pt-BR',{timeZone:'America/Bahia'})}</small>}</div>;
}
