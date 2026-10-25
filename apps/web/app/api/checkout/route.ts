import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { syncUserProfile } from "@/lib/supabase/sync-user";
import { calculateDeterministicQuote } from "@/lib/pricing/calculator";
import {
  isRazorpayConfigured,
  createRazorpayOrderSession,
} from "@/lib/razorpay";
import { OrderStatus, ModelStatus } from "@prisma/client";

interface CheckoutItemPayload {
  productId?: string;
  quoteId?: string;
  quantity: number;
}

interface ShippingAddressPayload {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    // 1b. Guarantee user row exists in public.User (syncs Supabase auth.users → Prisma).
    const dbUser = await syncUserProfile(user);
    const effectiveUserId = dbUser?.id || user.id;

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Checkout cart cannot be empty." },
        { status: 400 }
      );
    }

    const itemsPayload = body.items as CheckoutItemPayload[];
    const addressPayload = body.shippingAddress as ShippingAddressPayload;

    if (!addressPayload) {
      return NextResponse.json(
        { error: "Shipping address is required." },
        { status: 400 }
      );
    }

    // 3. Validate shipping address fields
    const fullName = String(addressPayload.fullName || "").trim();
    const phone = String(addressPayload.phone || "").trim().replace(/\s+/g, "");
    const line1 = String(addressPayload.line1 || "").trim();
    const line2 = addressPayload.line2 ? String(addressPayload.line2).trim() : null;
    const city = String(addressPayload.city || "").trim();
    const state = String(addressPayload.state || "").trim();
    const postalCode = String(addressPayload.postalCode || "").trim().replace(/\s+/g, "");
    const country = String(addressPayload.country || "India").trim();

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid full recipient name." },
        { status: 400 }
      );
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit contact phone number." },
        { status: 400 }
      );
    }

    if (!line1 || line1.length < 5) {
      return NextResponse.json(
        { error: "Please enter a valid street delivery address." },
        { status: 400 }
      );
    }

    if (!city || !state) {
      return NextResponse.json(
        { error: "City and state are required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(postalCode)) {
      return NextResponse.json(
        { error: "Please provide a valid 6-digit Indian PIN code." },
        { status: 400 }
      );
    }

    // 4. Save/update customer's default address record in database
    await prisma.address.create({
      data: {
        userId: effectiveUserId,
        line1,
        line2,
        city,
        state,
        postalCode,
        country,
        phone,
      },
    }).catch(() => {}); // Non-blocking if address already exists

    // 5. Server-Side Price & Item Recalculation (NEVER TRUST CLIENT PRICES)
    const verifiedOrderItems: Array<{
      productId?: string;
      quoteId?: string;
      quantity: number;
      unitPricePaise: number;
      title: string;
    }> = [];

    let verifiedSubtotalPaise = 0;

    for (const item of itemsPayload) {
      const quantity = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));

      // Enforce constraint: Exactly ONE of productId or quoteId
      const hasProduct = Boolean(item.productId);
      const hasQuote = Boolean(item.quoteId);

      if ((hasProduct && hasQuote) || (!hasProduct && !hasQuote)) {
        return NextResponse.json(
          { error: "Each cart item must reference either a productId or a quoteId." },
          { status: 400 }
        );
      }

      if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.active) {
          return NextResponse.json(
            { error: `Catalog product '${item.productId}' is not available.` },
            { status: 400 }
          );
        }

        if (product.stock < quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${quantity}.`,
            },
            { status: 400 }
          );
        }

        const unitPricePaise = product.basePrice;
        verifiedSubtotalPaise += unitPricePaise * quantity;

        verifiedOrderItems.push({
          productId: product.id,
          quantity,
          unitPricePaise,
          title: product.name,
        });
      } else if (item.quoteId) {
        const quote = await prisma.quote.findUnique({
          where: { id: item.quoteId },
          include: { model: true },
        });

        if (!quote) {
          return NextResponse.json(
            { error: "Custom print quote record not found." },
            { status: 404 }
          );
        }

        // Ownership verification (SECURITY.md §1.2)
        if (quote.model.userId !== user.id) {
          return NextResponse.json(
            { error: "Unauthorized access to custom model quote." },
            { status: 403 }
          );
        }

        // Expiry verification
        if (new Date(quote.expiresAt) < new Date()) {
          return NextResponse.json(
            { error: `Quote for '${quote.model.fileName}' has expired. Please recalculate quote.` },
            { status: 400 }
          );
        }

        // Model status check
        if (quote.model.status !== ModelStatus.VALID || !quote.model.volumeMm3) {
          return NextResponse.json(
            { error: "Custom model is not validated for manufacturing." },
            { status: 400 }
          );
        }

        // Check against duplicate reuse in an already-paid order
        const priorPaidUse = await prisma.orderItem.findFirst({
          where: {
            quoteId: quote.id,
            order: {
              status: {
                in: [
                  OrderStatus.PAID,
                  OrderStatus.IN_PRODUCTION,
                  OrderStatus.SHIPPED,
                  OrderStatus.DELIVERED,
                ],
              },
            },
          },
        });

        if (priorPaidUse) {
          return NextResponse.json(
            { error: "This custom quote has already been ordered and paid." },
            { status: 400 }
          );
        }

        // Recompute quote pricing deterministically server-side
        const recomputed = calculateDeterministicQuote({
          volumeMm3: quote.model.volumeMm3,
          material: quote.material,
          infillPct: quote.infillPct,
          layerHeight: quote.layerHeight,
          quantity,
        });

        const unitPricePaise = recomputed.unitPricePaise;
        verifiedSubtotalPaise += unitPricePaise * quantity;

        verifiedOrderItems.push({
          quoteId: quote.id,
          quantity,
          unitPricePaise,
          title: `Custom Print: ${quote.model.fileName} (${quote.material})`,
        });
      }
    }

    // 6. Calculate verified shipping fee
    const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999.00
    const STANDARD_SHIPPING_FEE_PAISE = 7900;   // ₹79.00
    const hasTestProduct = verifiedOrderItems.some((i) => i.productId === "test-print-1");
    const shippingFeePaise =
      hasTestProduct || verifiedSubtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
        ? 0
        : STANDARD_SHIPPING_FEE_PAISE;

    const finalTotalPaise = verifiedSubtotalPaise + shippingFeePaise;

    // 7. Atomic transaction: create pending Order & OrderItems in PostgreSQL
    const sanitizedAddressJson = {
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
    };

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: effectiveUserId,
          status: OrderStatus.PENDING_PAYMENT,
          total: finalTotalPaise,
          currency: "INR",
          addressJson: sanitizedAddressJson,
          items: {
            create: verifiedOrderItems.map((item) => ({
              productId: item.productId || null,
              quoteId: item.quoteId || null,
              quantity: item.quantity,
              unitPrice: item.unitPricePaise,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return createdOrder;
    });

    // 8. Razorpay Order Session Creation
    if (isRazorpayConfigured()) {
      try {
        const razorpaySession = await createRazorpayOrderSession({
          amountPaise: finalTotalPaise,
          currency: "INR",
          receipt: order.id,
          notes: {
            orderId: order.id,
            userId: user.id,
          },
        });

        // Store Razorpay Order ID as paymentRef
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentRef: razorpaySession.id },
        });

        return NextResponse.json({
          orderId: order.id,
          razorpayOrderId: razorpaySession.id,
          amountPaise: finalTotalPaise,
          amountInr: Math.round(finalTotalPaise / 100),
          currency: "INR",
          keyId: razorpaySession.keyId,
          customer: {
            name: fullName,
            email: user.email,
            phone,
          },
          items: verifiedOrderItems,
          isConfigured: true,
        });
      } catch (razorpayErr: unknown) {
        console.error("Razorpay order creation error:", razorpayErr);
        return NextResponse.json(
          {
            error: "Payment gateway error. Please verify test credentials or try again.",
            orderId: order.id,
          },
          { status: 502 }
        );
      }
    }

    // Safe Test/Unconfigured mode notice
    return NextResponse.json({
      orderId: order.id,
      amountPaise: finalTotalPaise,
      amountInr: Math.round(finalTotalPaise / 100),
      currency: "INR",
      keyId: null,
      razorpayOrderId: null,
      isConfigured: false,
      setupNotice:
        "Razorpay test keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are pending in .env.local.",
      items: verifiedOrderItems,
    });
  } catch (err: unknown) {
    console.error("POST /api/checkout error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during checkout processing." },
      { status: 500 }
    );
  }
}
