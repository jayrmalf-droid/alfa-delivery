import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
export type FeedbackMessage={text:string;kind:'error'|'success'};
export function useFeedback(){
 const [message,update]=useState<FeedbackMessage|null>(null);
 const setMessage=(text:string,kind:FeedbackMessage['kind']='error')=>update(text?{text,kind}:null);
 return {message,setMessage};
}
export function Feedback({message}:{message:FeedbackMessage|null}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message?.kind==='error'){ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest',behavior:'auto'});}},[message]);
 if(!message)return null;
 const error=message.kind==='error';
 const Icon=error?AlertCircle:CheckCircle;
 return <div ref={ref} className={`app-feedback ${message.kind}`} role={error?'alert':'status'} tabIndex={-1} aria-atomic="true"><Icon size={20} aria-hidden="true"/><div><strong>{error?'Confira os dados':'Concluído'}</strong><span>{message.text}</span></div></div>;
}
