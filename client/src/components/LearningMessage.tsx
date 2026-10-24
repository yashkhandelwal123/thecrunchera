import { useEffect, useRef, useState } from "react";
import { edamame } from "@shared/edamame";
function allowed() {
  try { return localStorage.getItem("crunch-growth-consent")==="1" && localStorage.getItem("crunch-analytics-disabled")!=="1" && !(navigator as any).globalPrivacyControl; } catch {return false;}
}
export default function LearningMessage() {
  const [enabled,setEnabled]=useState(allowed);
  const [showChoice,setShowChoice]=useState(()=>{try{return localStorage.getItem("crunch-growth-consent")===null && localStorage.getItem("crunch-analytics-disabled")!=="1" && !(navigator as any).globalPrivacyControl;}catch{return false;}});
  function chooseConsent(value:boolean){try{localStorage.setItem("crunch-growth-consent",value?"1":"0");setEnabled(value&&allowed());setShowChoice(false);}catch{setShowChoice(false);}}
  const [assignment,setAssignment]=useState<{id:string;message:string}|null>(null);
  const ref=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{
    let cancelled=false;
    if(!enabled) {setAssignment(null);fetch("/api/growth/opt-out",{method:"POST",credentials:"include"}).catch(()=>{});return;}
    fetch("/api/growth/assignment",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({consent:true})})
      .then(r=>r.ok?r.json():null).then(data=>{if(!cancelled&&data?.active)setAssignment(data);}).catch(()=>{});
    return ()=>{cancelled=true;};
  },[enabled]);
  useEffect(()=>{
    if(!assignment||!ref.current)return;
    let sent=false;
    const observer=new IntersectionObserver(entries=>{
      if(!sent && entries.some(e=>e.isIntersecting) && document.visibilityState==="visible") {
        sent=true;fetch("/api/growth/view",{method:"POST",credentials:"include"}).catch(()=>{});observer.disconnect();
      }
    },{threshold:0.5});
    observer.observe(ref.current);return ()=>observer.disconnect();
  },[assignment]);
  return <><p ref={ref}>{assignment?.message || edamame.description}</p>{showChoice&&<aside className="growth-consent" aria-label="Optional message testing"><p>Help us improve product information? With permission, we can test descriptions and link your message view to a paid order within 7 days. Participation is optional. <a href="/privacy-policy">Details and withdrawal</a>.</p><div><button type="button" className="btn-outline" onClick={()=>chooseConsent(true)}>Allow message testing</button><button type="button" className="btn-outline" onClick={()=>chooseConsent(false)}>No thanks</button></div></aside>}</>;
}
