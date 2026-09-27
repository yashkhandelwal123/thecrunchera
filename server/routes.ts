import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { verifyIdToken } from "./auth";
import * as Razorpay from "razorpay";
import { createHmac } from "crypto";

export function registerRoutes(app: Express, storage: IStorage) {
  // === Session & Auth ===

  app.get("/api/session", (req: Request, res: Response) => {
    if (req.session.userId) {
      res.json({ userId: req.session.userId, email: req.session.email });
    } else {
      res.json(null);
    }
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "idToken required" });
      }

      const claims = await verifyIdToken(idToken);
      let user = await storage.getUserByGoogleId(claims.sub);

      if (!user) {
        user = await storage.createUser({
          googleId: claims.sub,
          email: claims.email,
          name: claims.name,
        });
      }

      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // === Products ===

  app.get("/api/products", async (req: Request, res: Response) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  // === Newsletter ===

  app.post("/api/newsletter/subscribe", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const result = await storage.subscribeNewsletter(email);
      if (result.success) {
        res.json({ message: "Subscribed" });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Newsletter subscribe error:", error);
      res.status(500).json({ error: "Subscription failed" });
    }
  });

  // === Contact Form ===

  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res
          .status(400)
          .json({ error: "Name, email, and message required" });
      }

      await storage.createContact({ name, email, message });
      res.json({ message: "Message received" });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  // === Checkout: Shipping Rate Check ===

  app.post("/api/checkout/shipping-rate", async (req: Request, res: Response) => {
    try {
      const { pincode, items } = req.body;
      if (!pincode || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "pincode and items are required" });
      }

      let totalQuantity = 0;
      for (const item of items) {
        totalQuantity += item.quantity || 0;
      }
      const weightKg = Math.max(0.08 * totalQuantity, 0.08);

      const { checkShippingRate } = await import("./shiprocket");
      const result = await checkShippingRate({
        deliveryPincode: pincode,
        weightKg,
      });

      res.json(result);
    } catch (error) {
      console.error("Shipping rate check error:", error);
      res.status(500).json({ error: "Failed to check shipping rate" });
    }
  });

  // === Orders ===

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const checkout = req.body;

      if (
        !checkout.items ||
        !checkout.shippingAddress ||
        !checkout.shippingPincode ||
        !checkout.shippingPhone
      ) {
        return res.status(400).json({ error: "Missing checkout data" });
      }

      let subtotal = 0;
      for (const item of checkout.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        subtotal += parseFloat(product.price) * item.quantity;
      }

      // Get real shipping cost from Shiprocket
      const { checkShippingRate } = await import("./shiprocket");
      const totalQuantity = checkout.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
      const weightKg = Math.max(0.08 * totalQuantity, 0.08);
      const shippingResult = await checkShippingRate({
        deliveryPincode: checkout.shippingPincode,
        weightKg,
      });

      if (!shippingResult.serviceable) {
        return res.status(400).json({
          error: "Sorry, we don't currently ship to this pincode.",
        });
      }

      const shippingCost = shippingResult.rate;
      const total = subtotal + shippingCost;

      const order = await storage.createOrder(
        {
          userId: req.session.userId!,
          subtotal: subtotal.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          total: total.toFixed(2),
          shippingAddress: checkout.shippingAddress,
          shippingPincode: checkout.shippingPincode,
          shippingPhone: checkout.shippingPhone,
        },
        checkout.items,
      );

      // Create Razorpay order
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || "placeholder",
        key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder",
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: `order_${order.id}`,
      });

      const updatedOrder = await storage.updateOrderRazorpayId(
        order.id,
        razorpayOrder.id,
      );

      res.json({
        orderId: updatedOrder.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const orders = await storage.getOrdersByUserId(req.session.userId);
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:orderId", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const order = await storage.getOrder(parseInt(req.params.orderId));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const orderItems = await storage.getOrderItems(order.id);

      res.json({ ...order, items: orderItems });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders/:orderId/payment-verify", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return res.status(400).json({ error: "Missing payment details" });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      const hmac = createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (hmac !== razorpaySignature) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const order = await storage.getOrder(parseInt(req.params.orderId));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedOrder = await storage.updateOrderPaymentVerified(
        order.id,
        razorpayPaymentId,
      );

      // Send notifications
      try {
        const { notifyOrderPaid } = await import("./notifications");
        const orderItems = await storage.getOrderItems(order.id);
        await notifyOrderPaid(updatedOrder, orderItems);
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  app.post("/api/razorpay/webhook", async (req: Request, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Optional: verify if webhook secret is set
      if (process.env.RAZORPAY_WEBHOOK_SECRET && razorpay_signature) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const hmac = createHmac("sha256", secret)
          .update(JSON.stringify(req.body))
          .digest("hex");

        if (hmac !== razorpay_signature) {
          console.warn("Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Find order by razorpay_order_id and update
      const order = await storage.getOrderByRazorpayOrderId(razorpay_order_id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updatedOrder = await storage.updateOrderPaymentVerified(
        order.id,
        razorpay_payment_id,
      );

      // Send notifications
      try {
        const { notifyOrderPaid } = await import("./notifications");
        const orderItems = await storage.getOrderItems(order.id);
        await notifyOrderPaid(updatedOrder, orderItems);
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // === Admin Panel ===

  function isAdmin(email: string | undefined): boolean {
    if (!email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");
    return adminEmails.some((a) => a.trim() === email);
  }

  app.get("/api/admin/orders", async (req: Request, res: Response) => {
    try {
      if (!isAdmin(req.session.email)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/orders/:orderId/status", async (req: Request, res: Response) => {
    try {
      if (!isAdmin(req.session.email)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status required" });
      }

      const order = await storage.updateOrderStatus(
        parseInt(req.params.orderId),
        status,
      );

      res.json(order);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.post("/api/admin/orders/:orderId/create-shipment", async (req: Request, res: Response) => {
    try {
      if (!isAdmin(req.session.email)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(parseInt(req.params.orderId));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderItems = await storage.getOrderItems(order.id);
      const products = await Promise.all(
        orderItems.map((item) => storage.getProduct(item.productId)),
      );

      const { createShipment } = await import("./shiprocket");
      const pickupLocation =
        process.env.SHIPROCKET_PICKUP_LOCATION || "Warehouse Jaipur";

      const result = await createShipment({
        orderId: order.id,
        orderDate: new Date().toISOString().split("T")[0],
        pickupLocation,
        customerName: order.shippingAddress.split("\n")[0],
        customerEmail: "", // Could fetch from user if needed
        customerPhone: order.shippingPhone,
        customerAddress: order.shippingAddress,
        customerCity: "Jaipur",
        customerState: "Rajasthan",
        customerPincode: order.shippingPincode,
        weightKg: Math.max(0.08 * orderItems.reduce((s, i) => s + i.quantity, 0), 0.08),
        items: orderItems.map((item, idx) => ({
          name: products[idx]?.name || `Product ${item.productId}`,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      });

      const updatedOrder = await storage.updateOrderShiprocketId(
        order.id,
        result.shiprocketOrderId,
      );

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Create shipment error:", error);
      res.status(500).json({ error: "Failed to create shipment" });
    }
  });

  app.post("/api/admin/orders/:orderId/assign-courier", async (req: Request, res: Response) => {
    try {
      if (!isAdmin(req.session.email)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { courierId } = req.body;
      if (!courierId) {
        return res.status(400).json({ error: "Courier ID required" });
      }

      const order = await storage.getOrder(parseInt(req.params.orderId));
      if (!order || !order.shiprocketOrderId) {
        return res.status(404).json({ error: "Order or shipment not found" });
      }

      const { assignCourier } = await import("./shiprocket");
      const result = await assignCourier({
        shiprocketOrderId: order.shiprocketOrderId,
        courierId,
      });

      const updatedOrder = await storage.updateOrderShipmentDetails(
        order.id,
        result.shipmentId,
        result.awbCode,
        result.courierName,
      );

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Assign courier error:", error);
      res.status(500).json({ error: "Failed to assign courier" });
    }
  });

  app.get("/api/admin/orders/:orderId/tracking", async (req: Request, res: Response) => {
    try {
      if (!isAdmin(req.session.email)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(parseInt(req.params.orderId));
      if (!order || !order.awbCode) {
        return res.status(404).json({ error: "Tracking info not found" });
      }

      const { trackShipment } = await import("./shiprocket");
      const result = await trackShipment(
        order.shiprocketShipmentId || 0,
        order.awbCode,
      );

      res.json(result);
    } catch (error) {
      console.error("Tracking error:", error);
      res.status(500).json({ error: "Failed to fetch tracking info" });
    }
  });
}
