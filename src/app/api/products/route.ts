import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { getAllProducts, createProduct } from "@/lib/products";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/products — Returns all products (public).
 */
export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error("[api/products] Error fetching products:", error);
    const message =
      error instanceof Error ? error.message : "Error al obtener productos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/products — Creates a new product (admin only).
 * Requires x-user-id header to verify admin status.
 */
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Verify admin status using service role key
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase no está configurado." },
        { status: 500 },
      );
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .single();

    if (
      !profile ||
      (profile.role !== "admin" && profile.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "No tenés permisos de administrador." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.price || !body.category) {
      return NextResponse.json(
        { error: "Nombre, precio y categoría son obligatorios." },
        { status: 400 },
      );
    }

    const price = Number(body.price);
    const stock = Number(body.stock) || 0;

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "El precio no puede ser negativo." },
        { status: 400 },
      );
    }
    if (Number.isNaN(stock) || stock < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo." },
        { status: 400 },
      );
    }

    const product = await createProduct({
      name: body.name,
      slug: body.slug ?? "",
      description: body.description ?? "",
      price,
      stock,
      image: body.image ?? "",
      category: body.category,
      featured: body.featured ?? false,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[api/products] Error creating product:", error);
    const message =
      error instanceof Error ? error.message : "Error al crear el producto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}