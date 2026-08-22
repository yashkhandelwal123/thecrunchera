import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { insertNewsletterSchema, insertContactSchema, checkoutSchema } from "@shared/schema";

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all products
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Get products by category
  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const products = await storage.getProductsByCategory(req.params.category);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Newsletter subscription
  app.post("/api/newsletter", async (req, res) => {
    try {
      const validatedData = insertNewsletterSchema.parse(req.body);
      const newsletter = await storage.createNewsletterSubscription(validatedData);
      res.status(201).json(newsletter);
    } catch (error: any) {
      if (error.message === "Email already subscribed") {
        return res.status(400).json({ error: "This email is already subscribed" });
      }
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // Sign in with Google: verify the ID token the frontend received from
  // Google Identity Services, then create/find the matching user and start
  // a session.
  app.post("/api/auth/google", async (req, res) => {
    try {
      if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
        return res
          .status(500)
          .json({ error: "Google sign-in is not configured on the server" });
      }

      const { credential } = req.body as { credential?: string };
      if (!credential) {
        return res.status(400).json({ error: "Missing credential" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      let user = await storage.getUserByGoogleId(payload.sub);
      if (!user) {
        user = await storage.createUser({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name ?? payload.email,
          avatarUrl: payload.picture ?? null,
        });
      }

      req.session.userId = user.id;
      res.json(user);
    } catch (error) {
      console.error("[auth] Google sign-in failed:", error);
      res.status(401).json({ error: "Google sign-in failed" });
    }
  });

  // Current signed-in user, or null if not signed in
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    const user = await storage.getUserById(req.session.userId);
    res.json(user ?? null);
  });

  // Sign out
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Checkout requires being signed in — an order always belongs to a
  // real user (see the Phase 4 decision: no guest checkout for now).
  function requireAuth(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Sign in required to checkout" });
    }
    next();
  }

  // Creates an order from the cart. The server re-looks-up each product's
  // real price rather than trusting whatever the client sends — this is
  // the authoritative source of truth for what gets charged.
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const checkout = parsed.data;

      const lineItems: {
        productId: string;
        productName: string;
        productImage: string;
        unitPrice: string;
        quantity: number;
      }[] = [];

      let subtotal = 0;

      for (const item of checkout.items) {
        const product = await storage.getProductById(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const unitPrice = parseFloat(product.price);
        subtotal += unitPrice * item.quantity;

        lineItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          unitPrice: product.price,
          quantity: item.quantity,
        });
      }

      if (lineItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Shipping is free for now (matches what the cart page already shows).
      const total = subtotal;

      const order = await storage.createOrder(
        {
          userId: req.session.userId!,
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          shippingName: checkout.shippingName,
          shippingPhone: checkout.shippingPhone,
          shippingAddressLine1: checkout.shippingAddressLine1,
          shippingAddressLine2: checkout.shippingAddressLine2 || null,
          shippingCity: checkout.shippingCity,
          shippingState: checkout.shippingState,
          shippingPincode: checkout.shippingPincode,
        },
        lineItems,
      );

      res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // List the signed-in user's past orders.
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const userOrders = await storage.getOrdersByUserId(req.session.userId!);
      res.json(userOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // A single order's detail, including its line items. Only the order's
  // owner can view it.
  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
