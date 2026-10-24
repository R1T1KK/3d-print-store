import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail } from "@/lib/auth-validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserProfile } from "@/lib/supabase/sync-user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : email.split("@")[0];

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      console.error("Supabase listUsers error in complete-registration:", listError);
    }

    const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);

    let finalUser = null;

    if (existingUser) {
      // Update with final password and name
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            name,
            full_name: name,
          },
        }
      );

      if (updateError) {
        console.error("Supabase updateUserById error in complete-registration:", updateError);
        return NextResponse.json(
          { error: updateError.message || "Failed to finalize account." },
          { status: 500 }
        );
      }
      finalUser = updated?.user || existingUser;
    } else {
      // Create new confirmed user
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          full_name: name,
        },
      });

      if (createError) {
        console.error("Supabase createUser error in complete-registration:", createError);
        return NextResponse.json(
          { error: createError.message || "Failed to create account." },
          { status: 500 }
        );
      }
      finalUser = created?.user || null;
    }

    if (finalUser) {
      await syncUserProfile(finalUser);
    }

    return NextResponse.json({
      success: true,
      message: "Account finalized successfully.",
      email,
    });
  } catch (err: unknown) {
    console.error("complete-registration unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while finalizing account." },
      { status: 500 }
    );
  }
}
