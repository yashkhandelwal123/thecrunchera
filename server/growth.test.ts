import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {once} from "node:events";
import {PGlite} from "@electric-sql/pglite";
import {registerGrowthRoutes,linkGrowthOrder,recordGrowthPayment} from "./growth";
import {chooseVariant,learningSummary,betaInterval,estimateDuration} from "../shared/growth";
import {edamameVariants} from "../shared/edamame";

test("allocation and learning refuse early winner claims",()=>{
  assert.equal(chooseVariant(0),"control");assert.equal(chooseVariant(.5),"protein");
  assert.equal(learningSummary([]).candidate,null);
  const rows=[{variant:"control",assigned:100,viewed:100,matured:100,converted:10,revenue:100},{variant:"protein",assigned:100,viewed:100,matured:100,converted:20,revenue:200}];
  assert.equal(learningSummary(rows).candidate,"protein");
  rows[1].matured=99;assert.equal(learningSummary(rows).candidate,null);
});

test("Postgres experiment lifecycle: access, opt-in, stability, dedupe, paid outcomes and pause",async()=>{
  const saved=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://test:test@localhost/test";
  const database=new PGlite();
  await database.exec(`CREATE TABLE orders(id varchar PRIMARY KEY,subtotal numeric,discount_amount numeric,status text,razorpay_payment_id text,created_at timestamptz DEFAULT now()); CREATE TABLE order_items(order_id varchar,product_id varchar);`);
  const {pool}=await import("./db");const oldQuery=pool.query,oldConnect=pool.connect;
  const query=async(text:any,values:any[]=[])=>String(text).includes("CREATE TABLE") ? (await database.exec(text)).at(-1) : database.query(text,values);
  (pool as any).query=query;(pool as any).connect=async()=>({query,release(){}});
  const sessions:Record<string,any>={};
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{const key=req.get("x-test-session")||"guest";(req as any).sessionID=key;req.session=sessions[key]??=( {save(cb:any){cb();}} as any);next();});
  registerGrowthRoutes(app,(req,res,next)=>{if(req.get("x-test-admin")!=="yes")return void res.sendStatus(403);req.session.userId="test-admin";next();});
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");const base=`http://127.0.0.1:${(server.address() as any).port}`;
  async function request(path:string,body?:unknown,admin=false,session="guest",origin=base){const r=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",origin,"x-test-session":admin?"admin":session,...(admin?{"x-test-admin":"yes"}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return r;}
  try {
    assert.equal((await request("/api/admin/growth")).status,403);
    assert.equal((await (await request("/api/admin/growth",undefined,true)).json()).installed,false);
    assert.equal((await request("/api/admin/growth/state",{running:true},true,"guest","https://evil.invalid")).status,403);
    assert.equal((await request("/api/admin/growth/state",{running:true},true)).status,400);
    assert.equal((await request("/api/admin/growth/state",{running:true,claimVerified:true},true)).status,200);
    assert.equal((await (await request("/api/growth/assignment",{consent:false})).json()).active,false);
    const a=await (await request("/api/growth/assignment",{consent:true})).json();assert.equal(a.active,true);
    assert.equal((await (await request("/api/growth/assignment",{consent:true})).json()).id,a.id);
    await request("/api/growth/view",{});await request("/api/growth/view",{});
    await database.query("INSERT INTO orders VALUES('paid',225,0,'paid','pay_verified',now()),('pending',225,0,'pending',NULL,now()),('cancelled',225,0,'cancelled','pay_cancelled',now())");
    for(const id of ["paid","pending","cancelled"]){await database.query("INSERT INTO order_items VALUES($1,$2)",[id,edamameVariants[0].id]);await linkGrowthOrder({session:sessions.guest} as any,id);await linkGrowthOrder({session:sessions.guest} as any,id);await recordGrowthPayment(id);}
    assert.equal((await database.query("SELECT count(*)::int AS n FROM growth_order_links")).rows[0].n,3);
    let d=await (await request("/api/admin/growth",undefined,true)).json();assert.equal(d.rows[0].viewed,1);assert.equal(d.rows[0].converted,0);
    await database.query("UPDATE growth_assignments SET viewed_at=now()-interval '8 days'");
    await database.query("UPDATE growth_order_links SET verified_at=now()-interval '7 days' WHERE order_id='paid'");
    d=await (await request("/api/admin/growth",undefined,true)).json();assert.equal(d.rows[0].matured,1);assert.equal(d.rows[0].converted,1);assert.equal(d.rows[0].revenue,225);
    await database.query("UPDATE orders SET status='cancelled' WHERE id='paid'");
    d=await (await request("/api/admin/growth",undefined,true)).json();assert.equal(d.rows[0].converted,0);assert.equal(d.rows[0].revenue,0);
    await request("/api/growth/opt-out",{});assert.equal(sessions.guest.growthAssignment,undefined);
    await request("/api/admin/growth/state",{running:false},true);
    assert.equal((await (await request("/api/growth/assignment",{consent:true},false,"new")).json()).active,false);
    (pool as any).query=async()=>{throw new Error("simulated outage");};
    assert.equal((await (await request("/api/growth/assignment",{consent:true})).json()).active,false);
    assert.equal((await request("/api/admin/growth",undefined,true)).status,503);
    await assert.doesNotReject(()=>linkGrowthOrder({session:{growthAssignment:a.id}} as any,"paid"));
  } finally {
    (pool as any).query=oldQuery;(pool as any).connect=oldConnect;
    await new Promise<void>(resolve=>server.close(()=>resolve()));await database.close();
    if(saved===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=saved;
  }
});

test("credible intervals and feasibility estimates expose sparse evidence",()=>{
  const uniform=betaInterval(1,1);assert.ok(Math.abs(uniform[0]-.025)<1e-9);assert.ok(Math.abs(uniform[1]-.975)<1e-9);
  const zero=betaInterval(1,101);assert.ok(Math.abs(zero[1]-(1-Math.pow(.025,1/101)))<1e-9);
  const balanced=betaInterval(51,51);assert.ok(Math.abs(balanced[0]+balanced[1]-1)<1e-9);
  assert.ok(betaInterval(501,501)[1]-betaInterval(501,501)[0]<balanced[1]-balanced[0]);
  assert.equal(estimateDuration(100,10,2)?.days,107);
  assert.equal(estimateDuration(0,10,2),null);assert.equal(estimateDuration(100,101,2),null);assert.equal(estimateDuration(100,10,0),null);
});
