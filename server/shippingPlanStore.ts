import { eq } from "drizzle-orm";
import { shippingPlans } from "@shared/schema";
import type { ShippingPlan } from "../shared/shipping";
const memory = new Map<string, ShippingPlan>();
export async function getShippingPlan(orderId: string): Promise<ShippingPlan | undefined> {
  if (!process.env.DATABASE_URL) return memory.get(orderId);
  const { db } = await import("./db");
  return (await db.select().from(shippingPlans).where(eq(shippingPlans.orderId, orderId)))[0]?.plan;
}
export async function saveShippingPlan(plan: ShippingPlan) {
  if (!process.env.DATABASE_URL) { memory.set(plan.orderId, plan); return; }
  const { db } = await import("./db");
  await db.insert(shippingPlans).values({ orderId: plan.orderId, plan }).onConflictDoUpdate({ target: shippingPlans.orderId, set: { plan } });
}
