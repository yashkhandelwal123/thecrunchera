import {
  type Product,
  type InsertProduct,
  type Newsletter,
  type InsertNewsletter,
  type Contact,
  type InsertContact,
  products,
  newsletters,
  contacts,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Products
  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Newsletter
  createNewsletterSubscription(newsletter: InsertNewsletter): Promise<Newsletter>;
  getNewsletterByEmail(email: string): Promise<Newsletter | undefined>;

  // Contacts
  createContact(contact: InsertContact): Promise<Contact>;
  getAllContacts(): Promise<Contact[]>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private newsletters: Map<string, Newsletter>;
  private contacts: Map<string, Contact>;

  constructor() {
    this.products = new Map();
    this.newsletters = new Map();
    this.contacts = new Map();
    this.seedProducts();
  }

  private seedProducts() {
    const seedData: InsertProduct[] = [
      {
        name: "Mix Veg Chips",
        description: "Crunchy baked chips made from real carrots, beetroot, and spinach, finished with a classic Indian masala. High in dietary fiber, no added sugar, and a good source of protein.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/mix_veg_chips.webp",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Moong Dal Chips",
        description: "High-protein chips made from moong dal, seasoned with authentic Indian masala. No preservatives, no cholesterol, no palm oil, and gluten-free.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/moong_dal_chips.webp",
        badge: "New",
        featured: 1,
      },
      {
        name: "Oats Chips",
        description: "Wholesome oats baked into crispy chips with a bold Indian masala flavor. High dietary fiber, no added sugar, and a great everyday snack.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/oats_chips.webp",
        badge: "Organic",
        featured: 1,
      },
      {
        name: "Ragi Chips",
        description: "Nutrient-rich ragi (finger millet) chips with a spicy Peri Peri twist. High in dietary fiber, no added sugar, and a source of protein.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/ragi_chips.webp",
        badge: null,
        featured: 1,
      },
    ];

    seedData.forEach((product) => {
      const id = randomUUID();
      this.products.set(id, {
        ...product,
        id,
        badge: product.badge ?? null,
        featured: product.featured ?? 0,
      });
    });
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      badge: insertProduct.badge ?? null,
      featured: insertProduct.featured ?? 0,
    };
    this.products.set(id, product);
    return product;
  }

  async createNewsletterSubscription(
    insertNewsletter: InsertNewsletter
  ): Promise<Newsletter> {
    const existing = await this.getNewsletterByEmail(insertNewsletter.email);
    if (existing) {
      throw new Error("Email already subscribed");
    }

    const id = randomUUID();
    const newsletter: Newsletter = { ...insertNewsletter, id };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }

  async getNewsletterByEmail(email: string): Promise<Newsletter | undefined> {
    return Array.from(this.newsletters.values()).find(
      (newsletter) => newsletter.email === email
    );
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }
}

/**
 * Real, persistent storage backed by Postgres (Neon) via Drizzle ORM.
 * Used whenever DATABASE_URL is set. Products still get seeded once, the
 * first time the table is empty, so a fresh database starts populated.
 */
export class DbStorage implements IStorage {
  private seeded = false;

  private async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;

    const { db } = await import("./db");
    const existing = await db.select().from(products).limit(1);
    if (existing.length > 0) return;

    const seedData: InsertProduct[] = [
      {
        name: "Mix Veg Chips",
        description: "Crunchy baked chips made from real carrots, beetroot, and spinach, finished with a classic Indian masala. High in dietary fiber, no added sugar, and a good source of protein.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/mix_veg_chips.webp",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Moong Dal Chips",
        description: "High-protein chips made from moong dal, seasoned with authentic Indian masala. No preservatives, no cholesterol, no palm oil, and gluten-free.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/moong_dal_chips.webp",
        badge: "New",
        featured: 1,
      },
      {
        name: "Oats Chips",
        description: "Wholesome oats baked into crispy chips with a bold Indian masala flavor. High dietary fiber, no added sugar, and a great everyday snack.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/oats_chips.webp",
        badge: "Organic",
        featured: 1,
      },
      {
        name: "Ragi Chips",
        description: "Nutrient-rich ragi (finger millet) chips with a spicy Peri Peri twist. High in dietary fiber, no added sugar, and a source of protein.",
        price: "70.00",
        category: "Chips",
        image: "/product-images/ragi_chips.webp",
        badge: null,
        featured: 1,
      },
    ];

    await db.insert(products).values(seedData);
  }

  async getAllProducts(): Promise<Product[]> {
    await this.ensureSeeded();
    const { db } = await import("./db");
    return db.select().from(products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    await this.ensureSeeded();
    const { db } = await import("./db");
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    await this.ensureSeeded();
    const { db } = await import("./db");
    return db
      .select()
      .from(products)
      .where(eq(products.category, category));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const { db } = await import("./db");
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async createNewsletterSubscription(
    insertNewsletter: InsertNewsletter,
  ): Promise<Newsletter> {
    const existing = await this.getNewsletterByEmail(insertNewsletter.email);
    if (existing) {
      throw new Error("Email already subscribed");
    }

    const { db } = await import("./db");
    const [newsletter] = await db
      .insert(newsletters)
      .values(insertNewsletter)
      .returning();
    return newsletter;
  }

  async getNewsletterByEmail(email: string): Promise<Newsletter | undefined> {
    const { db } = await import("./db");
    const [newsletter] = await db
      .select()
      .from(newsletters)
      .where(eq(newsletters.email, email));
    return newsletter;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const { db } = await import("./db");
    const [contact] = await db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getAllContacts(): Promise<Contact[]> {
    const { db } = await import("./db");
    return db.select().from(contacts);
  }
}

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    console.log("[storage] Using DbStorage (Postgres via Neon) — data will persist.");
    return new DbStorage();
  }
  console.warn(
    "[storage] DATABASE_URL not set — using in-memory storage. " +
      "Data will reset on every restart. Set DATABASE_URL to use a real database.",
  );
  return new MemStorage();
}

export const storage = createStorage();
