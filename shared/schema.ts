import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer } from "drizzle-orm/pg-core";
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
