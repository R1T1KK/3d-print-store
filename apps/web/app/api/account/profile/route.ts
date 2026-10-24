import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { syncUserProfile } from "@/lib/supabase/sync-user";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure database profile exists
    await syncUserProfile(authUser);

    // Fetch user details including related addresses, orders, and custom models
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: true,
          },
        },
        models: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            quotes: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email,
        emailVerified: !!authUser.email_confirmed_at,
        name: dbUser?.name || authUser.user_metadata?.name || null,
        role: dbUser?.role || "CUSTOMER",
        createdAt: dbUser?.createdAt || authUser.created_at,
      },
      addresses: dbUser?.addresses || [],
      orders: dbUser?.orders || [],
      models: dbUser?.models || [],
    });
  } catch (err: unknown) {
    console.error("GET /api/account/profile error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve account details." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, line1, line2, city, state, postalCode, country } = body;

    // Strict validation: Prevent modifying role, user ID, or unauthorized fields
    const updatedName = typeof name === "string" ? name.trim() : undefined;

    // Update Prisma User profile
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        ...(updatedName !== undefined ? { name: updatedName } : {}),
      },
    });

    // Also update Supabase auth user_metadata so it stays synchronized
    if (updatedName !== undefined) {
      await supabase.auth.updateUser({
        data: { name: updatedName, full_name: updatedName },
      });
    }

    // If address info was provided, update or create customer address
    if (line1 && city && state && postalCode && country) {
      const existingAddress = await prisma.address.findFirst({
        where: { userId: authUser.id },
      });

      if (existingAddress) {
        await prisma.address.update({
          where: { id: existingAddress.id },
          data: {
            line1,
            line2: line2 || null,
            city,
            state,
            postalCode,
            country,
            phone: phone || null,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            userId: authUser.id,
            line1,
            line2: line2 || null,
            city,
            state,
            postalCode,
            country,
            phone: phone || null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/account/profile error:", err);
    return NextResponse.json(
      { error: "Failed to update profile information." },
      { status: 500 }
    );
  }
}
