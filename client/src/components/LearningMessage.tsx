import { useEffect, useRef, useState } from "react";
import { edamame } from "@shared/edamame";
function allowed() {
  try { return localStorage.getItem("crunch-growth-consent")==="1" && localStorage.getItem("crunch-analytics-disabled")!=="1" && !(navigator as any).globalPrivacyControl; } catch {return false;}
}
export default function LearningMessage() {
  const [enabled,setEnabled]=useState(allowed);
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
  return <p ref={ref}>{assignment?.message || edamame.description}</p>;
}
