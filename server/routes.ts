import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
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

  // Restricts a route to whichever Google account(s) are listed in
  // ADMIN_EMAILS (comma-separated). Anyone else — including other
  // signed-in customers — gets a 403, even though they're authenticated.
  async function requireAdmin(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Sign in required" });
    }
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      return res.status(500).json({ error: "Admin access is not configured on the server." });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user || !adminEmails.includes(user.email.toLowerCase())) {
      return res.status(403).json({ error: "Admin access required" });
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

  // Creates a matching Razorpay order for one of our (already-created,
  // still-pending) orders, and returns what the frontend needs to open
  // Razorpay's Checkout widget. Amount is recalculated from the order
  // stored in our DB — never trust an amount from the client.
  app.post("/api/checkout/create-razorpay-order", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "Missing orderId" });
      }

      const order = await storage.getOrderById(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.status !== "pending") {
        return res
          .status(400)
          .json({ error: `Order is already ${order.status}` });
      }
      if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(500).json({ error: "Payments are not configured on the server." });
      }

      const { razorpay } = await import("./razorpay");
      // Razorpay amounts are in the smallest currency unit (paise for INR).
      const amountInPaise = Math.round(parseFloat(order.total) * 100);

      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.id,
        notes: { orderId: order.id },
      });

      await storage.setOrderRazorpayOrderId(order.id, razorpayOrder.id);

      res.json({
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Create Razorpay order error:", error);
      res.status(500).json({ error: "Failed to start payment" });
    }
  });

  // Called by the frontend right after Razorpay's Checkout widget reports
  // success. We independently verify the signature server-side — this is
  // the step that actually proves the payment is real, not spoofed by
  // someone just calling this endpoint directly with fake IDs.
  app.post("/api/checkout/verify", requireAuth, async (req, res) => {
    try {
      const {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      if (
        !orderId ||
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({ error: "Missing payment verification fields" });
      }

      const order = await storage.getOrderById(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.razorpayOrderId !== razorpay_order_id) {
        return res.status(400).json({ error: "Order/payment mismatch" });
      }
      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: "Payments are not configured on the server." });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed" });
      }

      const wasAlreadyPaid = order.status === "paid";
      const updated = await storage.markOrderPaid(order.id, razorpay_payment_id);

      if (!wasAlreadyPaid && updated) {
        const items = await storage.getOrderItems(order.id);
        const { notifyNewOrder } = await import("./notifications");
        notifyNewOrder(updated, items).catch((err) =>
          console.error("Order notification failed:", err),
        );
      }

      res.json(updated);
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Safety net: Razorpay calls this directly if configured in the
  // dashboard (Settings → Webhooks), independent of whether the browser
  // successfully called /verify (e.g. if the tab was closed mid-payment).
  // Uses the raw request body for signature verification, per Razorpay's
  // requirements — see server/index.ts, which captures req.rawBody.
  app.post("/api/webhooks/razorpay", async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn("RAZORPAY_WEBHOOK_SECRET not set — ignoring webhook.");
        return res.status(200).send("ok");
      }

      const signature = req.headers["x-razorpay-signature"];
      if (typeof signature !== "string" || !req.rawBody) {
        return res.status(400).send("Missing signature or body");
      }

      const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.rawBody as Buffer)
        .digest("hex");

      if (expected !== signature) {
        return res.status(400).send("Invalid signature");
      }

      const event = req.body;
      if (event.event === "payment.captured") {
        const payment = event.payload?.payment?.entity;
        const razorpayOrderId = payment?.order_id;
        const razorpayPaymentId = payment?.id;

        if (razorpayOrderId) {
          const order = await storage.getOrderByRazorpayOrderId(razorpayOrderId);
          if (order && order.status === "pending") {
            const updated = await storage.markOrderPaid(order.id, razorpayPaymentId);
            if (updated) {
              const items = await storage.getOrderItems(order.id);
              const { notifyNewOrder } = await import("./notifications");
              notifyNewOrder(updated, items).catch((err) =>
                console.error("Order notification failed:", err),
              );
            }
          }
        }
      }

      res.status(200).send("ok");
    } catch (error) {
      console.error("Razorpay webhook error:", error);
      res.status(500).send("Webhook processing failed");
    }
  });

  // Admin: list every order across all customers, newest first, with
  // basic customer info attached so you don't have to cross-reference
  // the users table by hand.
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const ordersWithCustomer = await Promise.all(
        allOrders.map(async (order) => {
          const customer = await storage.getUserById(order.userId);
          return {
            ...order,
            customerName: customer?.name ?? "Unknown",
            customerEmail: customer?.email ?? "Unknown",
          };
        }),
      );
      res.json(ordersWithCustomer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Admin: single order detail, including line items — same shape as the
  // customer-facing GET /api/orders/:id, just without the ownership check.
  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const [items, customer] = await Promise.all([
        storage.getOrderItems(order.id),
        storage.getUserById(order.userId),
      ]);
      res.json({
        ...order,
        items,
        customerName: customer?.name ?? "Unknown",
        customerEmail: customer?.email ?? "Unknown",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Admin: update an order's fulfillment status (e.g. mark as shipped).
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
      }
      const updated = await storage.updateOrderStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
