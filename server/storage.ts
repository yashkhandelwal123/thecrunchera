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
        name: "Organic Tomato Basil Sauce",
        description: "Made with sun-ripened organic tomatoes and fresh basil. Perfect for pasta night!",
        price: "8.99",
        category: "Sauces",
        image: "/attached_assets/generated_images/Organic_pasta_sauce_product_794bc74f.png",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Creamy Alfredo Sauce",
        description: "Rich and creamy sauce made with real cheese and organic cream. Crunch-Approved!",
        price: "9.99",
        category: "Sauces",
        image: "/attached_assets/generated_images/Organic_pasta_sauce_product_794bc74f.png",
        badge: "New",
        featured: 1,
      },
      {
        name: "Fruit & Veggie Pouches - Mixed Berry",
        description: "Organic fruit and veggie blend in a convenient pouch. Perfect for on-the-go snacking!",
        price: "12.99",
        category: "Snacks",
        image: "/attached_assets/generated_images/Healthy_kids_snack_pouches_4f171a1d.png",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Fruit & Veggie Pouches - Tropical Mix",
        description: "Delicious tropical fruit blend with hidden veggies. No added sugar!",
        price: "12.99",
        category: "Snacks",
        image: "/attached_assets/generated_images/Healthy_kids_snack_pouches_4f171a1d.png",
        badge: "Organic",
        featured: 1,
      },
      {
        name: "Crunchy Veggie Chips",
        description: "Baked vegetable chips made from real carrots, beets, and sweet potatoes.",
        price: "5.99",
        category: "Snacks",
        image: "/attached_assets/generated_images/Healthy_kids_snack_pouches_4f171a1d.png",
        badge: null,
        featured: 1,
      },
      {
        name: "Organic Whole Wheat Pasta Shapes",
        description: "Fun-shaped whole wheat pasta that kids love. Made with organic grains.",
        price: "6.99",
        category: "Pasta",
        image: "/attached_assets/generated_images/Organic_whole_wheat_pasta_4b554d72.png",
        badge: "Best Seller",
        featured: 1,
      },
      {
        name: "Veggie-Infused Rainbow Pasta",
        description: "Colorful pasta naturally colored with spinach, beets, and carrots.",
        price: "7.99",
        category: "Pasta",
        image: "/attached_assets/generated_images/Organic_whole_wheat_pasta_4b554d72.png",
        badge: "New",
        featured: 1,
      },
      {
        name: "Organic Apple Juice",
        description: "100% organic apple juice with no added sugar. Just pure, delicious fruit!",
        price: "4.99",
        category: "Drinks",
        image: "/attached_assets/generated_images/Organic_fruit_juice_bottle_66e968ae.png",
        badge: "Organic",
        featured: 1,
      },
      {
        name: "Mixed Berry Smoothie",
        description: "Nutrient-packed berry smoothie made with real fruit and yogurt.",
        price: "5.99",
        category: "Drinks",
        image: "/attached_assets/generated_images/Organic_fruit_juice_bottle_66e968ae.png",
        badge: null,
        featured: 0,
      },
      {
        name: "Marinara Sauce with Hidden Veggies",
        description: "Classic marinara with pureed vegetables. Kids can't even tell!",
        price: "8.99",
        category: "Sauces",
        image: "/attached_assets/generated_images/Organic_pasta_sauce_product_794bc74f.png",
        badge: null,
        featured: 0,
      },
      {
        name: "Cheese Sauce",
        description: "Creamy cheese sauce made with real cheddar. Perfect for mac and cheese!",
        price: "7.99",
        category: "Sauces",
        image: "/attached_assets/generated_images/Organic_pasta_sauce_product_794bc74f.png",
        badge: null,
        featured: 0,
      },
      {
        name: "Fruit & Nut Trail Mix",
        description: "A perfect blend of dried fruits, nuts, and seeds. Great for lunchboxes!",
        price: "8.99",
        category: "Snacks",
        image: "/attached_assets/generated_images/Healthy_kids_snack_pouches_4f171a1d.png",
        badge: null,
        featured: 0,
      },
      {
        name: "Organic Granola Bars",
        description: "Chewy granola bars made with oats, honey, and real fruit.",
        price: "9.99",
        category: "Snacks",
        image: "/attached_assets/generated_images/Healthy_kids_snack_pouches_4f171a1d.png",
        badge: "New",
        featured: 0,
      },
      {
        name: "Brown Rice Pasta",
        description: "Gluten-free pasta made from organic brown rice. Tastes just like regular pasta!",
        price: "7.99",
        category: "Pasta",
        image: "/attached_assets/generated_images/Organic_whole_wheat_pasta_4b554d72.png",
        badge: null,
        featured: 0,
      },
      {
        name: "Lentil Pasta Spirals",
        description: "High-protein pasta made from red lentils. Fun spiral shape!",
        price: "8.99",
        category: "Pasta",
        image: "/attached_assets/generated_images/Organic_whole_wheat_pasta_4b554d72.png",
        badge: "Organic",
        featured: 0,
      },
      {
        name: "Tropical Fruit Juice",
        description: "A blend of mango, pineapple, and passion fruit. No added sugar!",
        price: "5.99",
        category: "Drinks",
        image: "/attached_assets/generated_images/Organic_fruit_juice_bottle_66e968ae.png",
        badge: null,
        featured: 0,
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
