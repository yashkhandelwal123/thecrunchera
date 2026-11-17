import { test } from "node:test";
import assert from "node:assert/strict";
import { commercePayload, purchasePayload, markPurchasePending, trackConfirmedPurchase, trackCommerce } from "./analytics";
const lines = [{ productId: "beans-150", productName: "Edamame 150 g", unitPrice: "225.00", quantity: 3 }, { productId: "ragi", productName: "Ragi", unitPrice: "55.00", quantity: 2 }];
const order = { id: "test-transaction", status: "paid", subtotal: "785.00", discountAmount: "78.50", shippingCharge: "70.00", promoCode: "CRUNCH10", items: lines };
test("purchase uses discounted merchandise revenue with separate shipping and exact item totals", () => {
 const p = purchasePayload(order)!;
 assert.equal(p.value, 706.5); assert.equal(p.shipping, 70); assert.equal(p.transaction_id, order.id);
 assert.equal(Math.round(p.items.reduce((n,i) => n + i.price*i.quantity,0)*100),70650);
 assert.equal(p.coupon, "CRUNCH10");
});
test("paise allocation balances awkward quantities", () => {
 const p = commercePayload(lines, 1.01)!;
 assert.equal(Math.round(p.items.reduce((n,i) => n + i.price*i.quantity,0)*100),78399);
});
test("pending, failed, cancelled and inconsistent order data are not purchases", () => {
 for (const status of ["pending","failed","cancelled"]) assert.equal(purchasePayload({...order,status}),null);
 assert.equal(purchasePayload({...order,subtotal:"1"}), null);
 assert.equal(commercePayload(lines,900),null);
 assert.equal(commercePayload([{...lines[0],quantity:NaN}]),null);
});
test("only recent payment attempts count; refreshes do not duplicate; payload excludes customer data", () => {
 const values = new Map<string,string>(); const events: any[]=[];
 Object.assign(globalThis,{ localStorage:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)},window:{gtag:(...args:any[])=>events.push(args)} });
 trackConfirmedPurchase(order); assert.equal(events.length,0);
 markPurchasePending(order.id); trackConfirmedPurchase({...order,status:"pending"}); assert.equal(events.length,0);
 trackConfirmedPurchase({...order, shippingName:"PRIVATE", shippingPhone:"PRIVATE"} as any);
 trackConfirmedPurchase(order); assert.equal(events.length,1);
 assert.equal(events[0][1],"purchase"); assert.ok(!JSON.stringify(events).includes("PRIVATE"));
 values.set("crunch-analytics-disabled","1"); assert.equal(trackCommerce("view_cart", commercePayload(lines)),false);
});
test("analytics failure never escapes into checkout", () => {
 Object.assign(globalThis,{localStorage:{getItem:()=>{throw Error("blocked")}}});
 assert.doesNotThrow(()=>trackConfirmedPurchase(order)); assert.doesNotThrow(()=>markPurchasePending("another"));
 assert.equal(trackCommerce("view_item",commercePayload(lines)),false);
});
