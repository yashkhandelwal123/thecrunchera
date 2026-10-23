import type { Express, RequestHandler, Request } from "express";
import { randomUUID, createHash } from "crypto";
import { experiment, chooseVariant, learningSummary, type ArmStats } from "../shared/growth";
import { edamameVariants } from "../shared/edamame";

// Only our own new tables are created, explicitly by an authenticated admin.
export const growthMigration = `
CREATE TABLE IF NOT EXISTS growth_experiments (
 id text PRIMARY KEY, running boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS growth_assignments (
 id uuid PRIMARY KEY, visitor_key text NOT NULL UNIQUE, experiment_id text NOT NULL REFERENCES growth_experiments(id),
 variant text NOT NULL CHECK (variant IN ('control','protein')),
 probability double precision NOT NULL CHECK (probability > 0 AND probability <= 1),
 assigned_at timestamptz NOT NULL DEFAULT now(), viewed_at timestamptz
);
CREATE TABLE IF NOT EXISTS growth_order_links (
 order_id varchar PRIMARY KEY REFERENCES orders(id),
 assignment_id uuid NOT NULL REFERENCES growth_assignments(id), verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS growth_assignments_experiment_idx ON growth_assignments(experiment_id);
CREATE TABLE IF NOT EXISTS growth_audit (
 id bigserial PRIMARY KEY, action text NOT NULL, actor_id varchar NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);`;
export async function recordGrowthPayment(orderId: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    if (!await installed()) return;
    await query(`UPDATE growth_order_links l SET verified_at=coalesce(verified_at,now()) FROM orders o WHERE l.order_id=$1 AND o.id=l.order_id AND o.razorpay_payment_id IS NOT NULL AND o.status IN ('paid','shipped','delivered')`,[orderId]);
  } catch { console.warn("[growth] Verified payment attribution unavailable; payment remains valid."); }
}
async function query(text: string, values: any[] = []) {
  const { pool } = await import("./db");
  return pool.query(text, values);
}
async function installed() {
  if (!process.env.DATABASE_URL) return false;
  const result = await query("SELECT to_regclass('growth_experiments') IS NOT NULL AS ready");
  return result.rows[0].ready as boolean;
}
async function running() {
  if (!await installed()) return false;
  return Boolean((await query("SELECT running FROM growth_experiments WHERE id=$1",[experiment.id])).rows[0]?.running);
}
function sameOrigin(req: Request) {
  const origin = req.get("origin");
  return Boolean(origin && origin === `${req.protocol}://${req.get("host")}`);
}
const safeAdmin: RequestHandler = (req, res, next) => {
  if (req.method !== "GET" && !sameOrigin(req)) return void res.status(403).json({error:"Open the dashboard on this site's own domain to make changes."});
  next();
};
export async function linkGrowthOrder(req: Request, orderId: string) {
  const id = req.session.growthAssignment;
  if (!id) return;
  try {
    await query(`INSERT INTO growth_order_links(order_id,assignment_id)
      SELECT $1,id FROM growth_assignments WHERE id=$2 AND viewed_at IS NOT NULL
      AND viewed_at > now()-interval '7 days' ON CONFLICT DO NOTHING`,[orderId,id]);
  } catch { console.warn("[growth] Order attribution unavailable; order remains valid."); }
}
export function registerGrowthRoutes(app: Express, requireAdmin: RequestHandler) {
  app.get("/api/admin/growth",requireAdmin,async (_req,res) => {
    res.set("Cache-Control","no-store");
    try {
      if (!await installed()) return void res.json({installed:false,running:false,experiment,rows:[],learning:learningSummary([]),audit:[]});
      // Conversion counts use payment IDs and current order state, never client
      // events or manually setting an order to 'paid'. Each session counts once.
      const data = await query(`SELECT a.variant,count(*)::int AS assigned,
        count(*) FILTER (WHERE a.viewed_at IS NOT NULL)::int AS viewed,
        count(*) FILTER (WHERE a.viewed_at <= now()-interval '7 days')::int AS matured,
        count(*) FILTER (WHERE a.viewed_at <= now()-interval '7 days' AND p.converted)::int AS converted,
        coalesce(sum(p.revenue) FILTER (WHERE a.viewed_at <= now()-interval '7 days'),0)::float8 AS revenue
        FROM growth_assignments a LEFT JOIN LATERAL (
          SELECT count(*)>0 AS converted,coalesce(sum(o.subtotal-o.discount_amount),0) AS revenue
          FROM growth_order_links l JOIN orders o ON o.id=l.order_id
          WHERE l.assignment_id=a.id AND o.razorpay_payment_id IS NOT NULL
          AND o.status IN ('paid','shipped','delivered')
          AND l.verified_at >= a.viewed_at AND l.verified_at < a.viewed_at+interval '7 days'
          AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id=o.id AND i.product_id=ANY($2::varchar[]))
        ) p ON true WHERE a.experiment_id=$1 GROUP BY a.variant`,[experiment.id,edamameVariants.map(v=>v.id)]);
      const rows = data.rows as ArmStats[];
      res.json({installed:true,running:await running(),experiment,rows,learning:learningSummary(rows),audit:(await query("SELECT action,created_at FROM growth_audit ORDER BY id DESC LIMIT 10")).rows});
    } catch { res.status(503).json({error:"Experiment data is unavailable. Shopping is unaffected; retry shortly."}); }
  });
  app.post("/api/admin/growth/state",requireAdmin,safeAdmin,async(req,res)=>{
    if (typeof req.body?.running !== "boolean") return void res.status(400).json({error:"Choose start or pause."});
    if (!process.env.DATABASE_URL) return void res.status(503).json({error:"Connect a PostgreSQL database to store experiments. Local previews do not collect data."});
    try {
      const {pool}=await import("./db"); const client=await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(growthMigration);
        await client.query("INSERT INTO growth_experiments(id,running) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET running=$2,updated_at=now()",[experiment.id,req.body.running]);
        await client.query("INSERT INTO growth_audit(action,actor_id) VALUES($1,$2)",[req.body.running?"Approved fixed 50/50 test":"Paused new assignments",req.session.userId]);
        await client.query("COMMIT");
      } catch(e) { await client.query("ROLLBACK");throw e; } finally {client.release();}
      res.json({ok:true});
    } catch {res.status(503).json({error:"Could not change the experiment. Check database availability and table-creation permissions."});}
  });
  app.post("/api/growth/assignment",async(req,res)=>{
    res.set("Cache-Control","no-store");
    if (!sameOrigin(req) || req.body?.consent !== true || req.get("sec-gpc")==="1" || /bot|crawler|spider/i.test(req.get("user-agent")||"")) return void res.json({active:false});
    try {
      if (!await running()) return void res.json({active:false});
      if (req.session.userId) {
        const {storage}=await import("./storage");const user=await storage.getUserById(req.session.userId);
        if (user && (process.env.ADMIN_EMAILS||"").toLowerCase().split(",").map(v=>v.trim()).includes(user.email.toLowerCase())) return void res.json({active:false});
      }
      if (req.session.growthAssignment) {
        const row=(await query("SELECT id,variant FROM growth_assignments WHERE id=$1 AND experiment_id=$2",[req.session.growthAssignment,experiment.id])).rows[0];
        if(row) return void res.json({active:true,...row,message:experiment.variants.find(v=>v.id===row.variant)!.message});
      }
      const visitorKey=createHash("sha256").update(`${experiment.id}:${req.sessionID}`).digest("hex");
      const assigned=await query(`INSERT INTO growth_assignments(id,visitor_key,experiment_id,variant,probability) VALUES($1,$2,$3,$4,0.5)
        ON CONFLICT(visitor_key) DO UPDATE SET visitor_key=excluded.visitor_key RETURNING id,variant`,[randomUUID(),visitorKey,experiment.id,chooseVariant()]);
      const {id,variant}=assigned.rows[0];
      req.session.growthAssignment=id;
      // Save before returning: a failed session write must not show an untrackable variant.
      await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
      res.json({active:true,id,variant,message:experiment.variants.find(v=>v.id===variant)!.message});
    } catch {res.json({active:false});console.warn("[growth] Assignment unavailable; original copy served.");}
  });
  app.post("/api/growth/view",async(req,res)=>{
    if(!sameOrigin(req) || !req.session.growthAssignment) return void res.sendStatus(204);
    try {await query("UPDATE growth_assignments SET viewed_at=coalesce(viewed_at,now()) WHERE id=$1",[req.session.growthAssignment]);}catch{console.warn("[growth] Exposure could not be recorded.");}
    res.sendStatus(204);
  });
  app.post("/api/growth/opt-out",async(req,res)=>{
    if(!sameOrigin(req)) return void res.sendStatus(403);
    // Keep aggregate history, but stop attributing future orders from this session.
    if (!req.session.growthAssignment) return void res.sendStatus(204);
    delete req.session.growthAssignment;
    req.session.save(()=>res.sendStatus(204));
  });
}
