import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // Sauces, Snacks, Pasta, Drinks
  image: text("image").notNull(),
  badge: text("badge"), // "New", "Best Seller", "Organic", null
  featured: integer("featured").default(0), // 1 for featured, 0 for not featured
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
});

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Order status flows: pending -> paid -> shipped -> delivered
// (or -> cancelled / failed at the pending/paid stage)
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, paid, shipped, delivered, cancelled, failed
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingCharge: decimal("shipping_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  promoCode: text("promo_code"),

  // Shipping address, collected at checkout
  shippingName: text("shipping_name").notNull(),
  shippingPhone: text("shipping_phone").notNull(),
  shippingAddressLine1: text("shipping_address_line1").notNull(),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingPincode: text("shipping_pincode").notNull(),

  // Populated once Razorpay integration (Phase 5) is wired in
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),

  // Populated once a shipment is created via Shiprocket (admin "Ship Now")
  shiprocketOrderId: text("shiprocket_order_id"),
  shiprocketShipmentId: text("shiprocket_shipment_id"),
  awbCode: text("awb_code"),
  courierName: text("courier_name"),
  trackingUrl: text("tracking_url"),
  shippingStatus: text("shipping_status"), // raw courier status, e.g. "In Transit"

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  status: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  shiprocketOrderId: true,
  shiprocketShipmentId: true,
  awbCode: true,
  courierName: true,
  trackingUrl: true,
  shippingStatus: true,
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Line items — a snapshot of product name/price at the time of purchase,
// so later price changes never retroactively affect past orders.
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  productImage: text("product_image").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// A cart item as sent from the frontend at checkout time (just id + qty —
// the server looks up the real product to get authoritative price/name).
export const checkoutItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
});

export const quoteSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  promoCode: z.string().trim().max(40).optional(),
});

export const checkoutSchema = quoteSchema.extend({
  expectedTotalPaise: z.number().int().positive(),
  shippingName: z.string().trim().min(2).max(120),
  shippingPhone: z.string().trim().regex(/^(?:\+91[ -]?)?[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number"),
  shippingAddressLine1: z.string().trim().min(5).max(250),
  shippingAddressLine2: z.string().trim().max(250).optional(),
  shippingCity: z.string().trim().min(2).max(100),
  shippingState: z.string().trim().min(2).max(100),
  shippingPincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode"),
});

export type CheckoutRequest = z.infer<typeof checkoutSchema>;

// Frontend-only types for cart (stored in localStorage)
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// Testimonial type (static data in frontend)
export interface Testimonial {
  id: string;
  parentName: string;
  childAge: string;
  rating: number;
  comment: string;
  avatar?: string;
}

