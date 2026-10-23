import {useEffect,useState} from "react";
import {Link} from "wouter";
import {useAuth} from "@/contexts/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {fetchApi,readApiJson} from "@/lib/apiResponse";
import {experiment,learningSummary,type ArmStats} from "@shared/growth";
interface Dashboard {installed:boolean;running:boolean;rows:ArmStats[];learning:ReturnType<typeof learningSummary>;audit:{action:string;created_at:string}[]}
export default function AdminGrowthPage(){
  const {user,loading}=useAuth();const [data,setData]=useState<Dashboard|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [approved,setApproved]=useState(false);
  async function load(){setBusy(true);setError("");try{setData(await readApiJson(await fetchApi("/api/admin/growth",{credentials:"include"})));}catch(e){setError(e instanceof Error?e.message:"Could not load experiments");}finally{setBusy(false);}}
  useEffect(()=>{if(user)void load();},[user]);
  async function change(running:boolean){setBusy(true);setError("");try{await readApiJson(await fetchApi("/api/admin/growth/state",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({running})}));setApproved(false);await load();}catch(e){setError(e instanceof Error?e.message:"Could not save");setBusy(false);}}
  if(loading)return <main className="shell section">Checking access…</main>;
  if(!user)return <main className="shell section"><h1>Growth lab</h1><p>Sign in with your administrator account.</p><GoogleSignInButton/></main>;
  const format=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
  return <main id="main-content" className="shell section growth-page">
    <Link className="text-link" href="/admin/orders">← Orders</Link>
    <header className="growth-heading"><div><span className="eyebrow">THE CRUNCH ERA · ADMIN</span><h1>Growth lab</h1><p>Test a message. Measure purchases. Learn from evidence.</p></div><button className="btn-outline" disabled={busy} onClick={load}>Refresh data</button></header>
    {error&&<p role="alert" className="growth-alert">{error}</p>}
    {!data&&!error&&<p role="status">Loading experiment data…</p>}
    {data&&<>
      <div className="growth-summary"><article><span>Status</span><strong>{data.running?"Running · 50/50":"Paused"}</strong></article><article><span>Learning mode</span><strong>Observe & recommend</strong></article><article><span>Attribution window</span><strong>7 days</strong></article></div>
      <section className="growth-panel"><span className="eyebrow">EXPERIMENT 01</span><h2>{experiment.name}</h2><p>One message on <Link href="/edamame-beans" className="text-link">the edamame product page</Link>. Participants opt in through the privacy page. Assignment stays fixed for their browser session; returning in another browser may count separately. Signed-in administrators are excluded.</p>
        <div className="growth-variants">{experiment.variants.map(v=><article key={v.id}><h3>{v.label}</h3><p>{v.message}</p><span className="pack-pill">50% of eligible assignments</span></article>)}</div>
        {!data.running&&<label className="growth-approval"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I approve both messages and a fixed 50/50 test for opted-in visitors.</label>}
        <button className="btn-primary" disabled={busy||(!data.running&&!approved)} onClick={()=>change(!data.running)}>{busy?"Saving…":data.running?"Pause experiment":"Approve and start test"}</button>
        <p className="summary-note">{!data.installed?"Starting creates the experiment's own database tables. Existing product and order tables are not changed. ":""}Pausing stops new assignments and restores original copy on the next page load. Existing eligible order attribution continues for its 7-day window. No ad spending or automatic traffic reallocation.</p>
      </section>
      <section className="growth-panel"><h2>Results</h2><p>Learning uses viewed sessions whose full 7-day observation window has elapsed. New sessions remain pending; a purchase must have a recorded payment ID and a paid, shipped or delivered status, and contain edamame.</p>
        <div className="growth-table"><table><thead><tr><th>Message</th><th>Assigned</th><th>Viewed</th><th>Mature viewed sessions</th><th>Converted sessions</th><th>Conversion rate</th><th>Attributed merchandise revenue</th></tr></thead><tbody>{experiment.variants.map(v=>{const r=data.rows.find(r=>r.variant===v.id);return <tr key={v.id}><th>{v.id==="control"?"Control":"Protein"}</th><td>{r?.assigned||0}</td><td>{r?.viewed||0}</td><td>{r?.matured||0}</td><td>{r?.converted||0}</td><td>{r?.matured?`${((r.converted/r.matured)*100).toFixed(1)}%`:"—"}</td><td>{format(r?.revenue||0)}</td></tr>;})}</tbody></table></div>
        <p className="summary-note">Revenue includes all merchandise in qualifying orders after discounts, excluding shipping. It is not profit or incremental revenue. Cancelled orders are excluded; partial refunds, ad costs, product costs and courier costs are not integrated. Do not scale spending from this figure.</p>
      </section>
      <section className="growth-panel"><h2>What the learner says</h2><p>{data.learning.note}</p>{data.learning.candidate&&<p><strong>Candidate for review: {data.learning.candidate}.</strong> Allocation has not changed.</p>}
        <div className="growth-variants">{data.learning.scores.map(s=><article key={s.variant}><h3>{s.variant}</h3><p>{s.n?`${(s.posteriorMean*100).toFixed(2)}% model estimate`:"No evidence yet"}</p><small>Beta(1,1) posterior mean. A model estimate, not a confidence bound or proof of lift.</small></article>)}</div>
        <p>Next: collect enough opted-in visits and verified outcomes, review uncertainty and traffic mix, then consider a bounded adaptive allocation. GA4, Search Console, advertising and profit optimisation are not connected to this dashboard yet.</p>
      </section>
      <section className="growth-panel"><h2>Change history</h2>{data.audit.length?<ul>{data.audit.map((a,i)=><li key={i}>{new Date(a.created_at).toLocaleString("en-IN")} — {a.action}</li>)}</ul>:<p>No experiment has been started. There is no historical or simulated customer data in this report.</p>}</section>
    </>}
  </main>;
}
