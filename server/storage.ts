import {
  type Product,
  type InsertProduct,
  type Newsletter,
  type InsertNewsletter,
  type Contact,
  type InsertContact,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
        image: "/attached_assets/generated_images/mix_veg_chips.webp",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Moong Dal Chips",
        description: "High-protein chips made from moong dal, seasoned with authentic Indian masala. No preservatives, no cholesterol, no palm oil, and gluten-free.",
        price: "70.00",
        category: "Chips",
        image: "/attached_assets/generated_images/moong_dal_chips.webp",
        badge: "New",
        featured: 1,
      },
      {
        name: "Oats Chips",
        description: "Wholesome oats baked into crispy chips with a bold Indian masala flavor. High dietary fiber, no added sugar, and a great everyday snack.",
        price: "70.00",
        category: "Chips",
        image: "/attached_assets/generated_images/oats_chips.webp",
        badge: "Organic",
        featured: 1,
      },
      {
        name: "Ragi Chips",
        description: "Nutrient-rich ragi (finger millet) chips with a spicy Peri Peri twist. High in dietary fiber, no added sugar, and a source of protein.",
        price: "70.00",
        category: "Chips",
        image: "/attached_assets/generated_images/ragi_chips.webp",
        badge: null,
        featured: 1,
      },
    ];

    seedData.forEach((product) => {
      const id = randomUUID();
      this.products.set(id, { ...product, id });
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
    const product: Product = { ...insertProduct, id };
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

export const storage = new MemStorage();
