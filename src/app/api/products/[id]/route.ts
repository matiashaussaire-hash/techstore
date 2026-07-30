import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { updateProduct, deleteProduct } from "@/lib/products";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifies that the request comes from an admin user.
 */
async function verifyAdmin(userId: string | null): Promise<{ ok: false; error: string; status: number } | { ok: true }> {
  if (!userId) {
    return { ok: false, error: "No autorizado.", status: 401 };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ok: false, error: "Supabase no está configurado.", status: 500 };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (!profile || (profile.role !== "admin" && profile.email !== ADMIN_EMAIL)) {
    return { ok: false, error: "No tenés permisos de administrador.", status: 403 };
  }

  return { ok: true };
}

/**
 * PUT /api/products/[id] — Updates a product (admin only).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const auth = await verifyAdmin(userId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();

    // Validate price/stock if present
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (Number.isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "El precio no puede ser negativo." },
          { status: 400 },
        );
      }
    }
    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (Number.isNaN(stock) || stock < 0) {
        return NextResponse.json(
          { error: "El stock no puede ser negativo." },
          { status: 400 },
        );
      }
    }

    const product = await updateProduct(id, body);
    return NextResponse.json({ product });
  } catch (error) {
    console.error("[api/products] Error updating product:", error);
    const message =
      error instanceof Error ? error.message : "Error al actualizar el producto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id] — Deletes a product (admin only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const auth = await verifyAdmin(userId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/products] Error deleting product:", error);
    const message =
      error instanceof Error ? error.message : "Error al eliminar el producto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}