import type { Request, Response } from "express";
import { prisma } from "../storage";
import { mutationLimiter } from "../auth/rateLimiter";
import { optionalAuth } from "../auth/middleware";
import { validate } from "../middleware/validate";
import { createOrderDTO } from "../dto/order.dto";

// ============================================
// 🛡️ BHARAT-OS: SAFE ORDER CREATION
// ============================================

export function registerOrderRoutes(app: any) {
  // 🛒 BULK ORDER CREATION WITH ATOMIC TRANSACTIONS
  app.post("/api/orders", mutationLimiter, validate(createOrderDTO), async (req: Request, res: Response) => {
    try {
      // 🔐 SOVEREIGN GUARD: Strict district context check
      if (!req.districtId) {
        throw new Error("District context required for order creation");
      }

      // ✅ DTO VALIDATION: Request body is guaranteed to be valid
      const { items, shippingAddress, contactPhone, paymentMethod, notes } = req.body;

      // Process order items
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No order items provided" });
      }

      // Calculate total amount
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { price: true, stock: true, approved: true }
        });

        if (!product || !product.approved) {
          return res.status(400).json({ message: `Product ${item.productId} not available` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for product ${item.productId}` });
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          totalPrice: itemTotal.toString(),
        });
      }

      // Process order in atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        const createdOrders: any[] = [];
        const paymentSessions = [];

        // Create the order
        const created = await tx.order.create({
          data: {
            status: "PENDING",
            districtId: req.districtId,
            customerName: req.user?.username || "Guest Customer",
            customerPhone: contactPhone || "0000000000",
            customerAddress: shippingAddress,
            paymentMethod: paymentMethod,
            notes: notes || null,
            totalAmount: totalAmount.toString(),
            userId: req.userId || null,
          }
        });

        // Create order items
        for (const item of validatedItems) {
          await tx.orderItem.create({
            data: {
              orderId: created.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price.toString(),
              totalPrice: item.totalPrice,
            }
          });

          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }

        createdOrders.push(created);

        // TODO: Add payment integration here if needed

        return { createdOrders };
      });

      const { createdOrders } = result;

      // WhatsApp alerts (outside transaction for performance)
      for (let i = 0; i < createdOrders.length; i++) {
        const created = createdOrders[i];
        try {
          // Fetch product and vendor details from orderItems
          const firstItem = created.orderItems?.[0];
          const product = firstItem ? await prisma.product.findUnique({
            where: { id: firstItem.productId },
            include: { vendor: true }
          }) : null;

          const vendorPhone = product?.vendor?.phone || product?.vendor?.mobile;
          const masterAdminNumber = process.env.WHATSAPP_ALERT_NUMBER;

          if (vendorPhone || masterAdminNumber) {
            const productName = product?.title || "Multiple Items";
            const whatsappMessage = `📦 Naya Order (BharatOS)! \n\n` +
              `Customer: ${created.customerName} \n` +
              `Items: ${productName} x ${firstItem?.quantity || created.quantity} \n` +
              `Total: ₹${created.totalPrice} \n` +
              `Address: ${created.customerAddress}`;

            // Send WhatsApp alert (implementation depends on your webhook)
            console.log("📱 WhatsApp Alert:", { to: vendorPhone || masterAdminNumber, orderId: created.id });
          }
        } catch (alertErr) {
          console.error("⚠️ WhatsApp Alert Failed:", alertErr);
        }
      }

      // Return response
      const firstOrder = createdOrders[0];
      const paymentDetails = paymentSessions.map((session, index) => ({
        ...createdOrders[index],
        payment_session_id: session.payment_session_id,
        payment_page_url: session.payment_page_url
      }));

      return res.status(201).json({
        ...firstOrder,
        orderId: firstOrder?.id,
        paymentDetails: paymentDetails,
        multipleOrders: createdOrders.length > 1 ? createdOrders : undefined
      });

    } catch (e: any) {
      console.error("Order create failed", e?.message);
      return res.status(400).json({ message: e?.message || "Order create failed" });
    }
  });

  // 📋 GET ORDERS
  app.get("/api/orders", optionalAuth, async (req: Request, res: Response) => {
    try {
      const includeAll = String(req.query?.includeAll || "").toLowerCase() === "true";
      const phone = typeof req.query?.phone === "string" ? req.query.phone.trim() : "";

      // Security check for admin access
      if (includeAll) {
        if (!req.user || (!req.user.isAdmin && req.user.role !== 'SUPER_ADMIN')) {
          return res.status(403).json({ message: "Super admin access required" });
        }
      }

      if (!includeAll && !phone) {
        return res.status(400).json({ message: "Phone required" });
      }

      const orders = await prisma.order.findMany({
        where: includeAll ? {} : { customerPhone: phone },
        include: {
          product: {
            include: {
              vendor: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(orders);
    } catch (e: any) {
      console.error("Order fetch failed", e?.message);
      return res.status(500).json({ message: e?.message || "Failed to fetch orders" });
    }
  });

  // 🔄 UPDATE ORDER STATUS WITH SOVEREIGN LOG
  app.put("/api/orders/:id/status", optionalAuth, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ message: "Valid order ID required" });
      }

      // Validate status
      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      // Get current order for logging
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { product: { include: { vendor: true } } }
      });

      if (!currentOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // 🔐 AUTHORIZATION: Only vendor, customer, or admin can update
      const userId = req.user?.id;
      const isCustomer = currentOrder.customerPhone === req.user?.phone;
      const isVendor = currentOrder.vendorId === req.user?.id;
      const isAdmin = req.user?.isAdmin || req.user?.role === 'SUPER_ADMIN';

      if (!isCustomer && !isVendor && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized to update this order" });
      }

      // Prevent invalid status transitions (basic validation)
      if (currentOrder.status === 'DELIVERED' && status !== 'DELIVERED') {
        return res.status(400).json({ message: "Cannot change status of delivered order" });
      }

      if (currentOrder.status === 'CANCELLED' && status !== 'CANCELLED') {
        return res.status(400).json({ message: "Cannot change status of cancelled order" });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          product: {
            include: {
              vendor: true,
              category: true
            }
          }
        }
      });

      // 🛡️ SOVEREIGN LOG: Create audit trail for status changes
      await prisma.analyticsEvent.create({
        data: {
          eventType: "order_status_change",
          action: "status_update",
          value: {
            orderId: orderId,
            previousStatus: currentOrder.status,
            newStatus: status,
            changedBy: req.user?.id || 'guest',
            changedByRole: req.user?.role || 'guest',
            timestamp: new Date().toISOString(),
            productId: currentOrder.productId,
            vendorId: currentOrder.vendorId,
            customerPhone: currentOrder.customerPhone,
            districtId: currentOrder.districtId
          },
          districtId: currentOrder.districtId || req.districtId,
          userId: req.user?.id,
          source: "order_status_update_api"
        }
      }).catch((logErr) => {
        console.error("⚠️ [SOVEREIGN LOG] Failed to log status change:", logErr);
        // Don't fail the request if logging fails
      });

      // Log to console for immediate visibility
      console.log(`📋 [SOVEREIGN LOG] Order ${orderId} status changed: ${currentOrder.status} → ${status} by ${req.user?.id || 'guest'}`);

      // 🔔 SOVEREIGN NOTIFICATION: AI-Triggered WhatsApp Updates
      if (status === 'CONFIRMED' || status === 'SHIPPED' || status === 'DELIVERED') {
        // AI automatically sends customer notification for key status changes
        const notificationMessage = status === 'CONFIRMED'
          ? `✅ Your BharatOS Order #${orderId} has been confirmed! We'll start preparing it soon.`
          : status === 'SHIPPED'
          ? `🚚 Your BharatOS Order #${orderId} has been shipped! Track your delivery at ${process.env.CLIENT_URL || 'https://shahdolbazaar.com'}/track/${orderId}`
          : `🎉 Your BharatOS Order #${orderId} has been delivered! Thank you for shopping with us. Rate your experience at ${process.env.CLIENT_URL || 'https://shahdolbazaar.com'}/review/${orderId}`;

        // Send via WhatsApp webhook
        const whatsappWebhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
        const whatsappApiKey = process.env.WHATSAPP_API_KEY;

        if (updatedOrder.customerPhone && whatsappWebhookUrl) {
          fetch(whatsappWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${whatsappApiKey || ""}`
            },
            body: JSON.stringify({
              to: updatedOrder.customerPhone,
              message: notificationMessage,
              type: "order_status_update",
              metadata: {
                orderId: orderId,
                status: status,
                customerName: updatedOrder.customerName,
                timestamp: new Date().toISOString()
              }
            })
          })
          .then(() => console.log(`📱 [SOVEREIGN AI] WhatsApp notification sent for Order ${orderId}: ${status}`))
          .catch((err) => console.error(`⚠️ [SOVEREIGN AI] WhatsApp notification failed for Order ${orderId}:`, err));
        } else {
          console.log(`📱 [SOVEREIGN AI] WhatsApp notification skipped for Order ${orderId} (no phone/webhook)`);
        }
      }

      return res.json({
        success: true,
        order: updatedOrder,
        message: `Order status updated to ${status}`
      });

    } catch (e: any) {
      console.error("Order status update failed", e?.message);
      return res.status(500).json({ message: e?.message || "Failed to update order status" });
    }
  });
}
