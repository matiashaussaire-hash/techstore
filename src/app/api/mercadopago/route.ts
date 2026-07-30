import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createPendingOrder } from "@/lib/orders-server";
import type { CartItem } from "@/types/product";

// This route uses the Mercado Pago Node SDK which relies on Node.js APIs.
export const runtime = "nodejs";
// Always execute dynamically — every checkout is unique.
export const dynamic = "force-dynamic";

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL no está configurada. Define la URL del sitio (ej: http://localhost:3000 en desarrollo, https://tu-dominio.vercel.app en producción).",
    );
  }
  return url.replace(/\/+$/, ""); // remove trailing slashes
}

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN no está configurada. Obtén tu token en https://www.mercadopago.com.ar/developers/panel/app.",
    );
  }
  return token;
}

type CheckoutRequestBody = {
  userId?: string;
  customerName: string;
  email: string;
  address: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: CartItem[];
  total: number;
};

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken();
    const siteUrl = getSiteUrl();

    const client = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(client);

    const body = (await request.json()) as CheckoutRequestBody;

    // ── Validate required fields ──────────────────────────────────
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío. Agregá productos antes de continuar." },
        { status: 400 },
      );
    }
    if (!body.email || !body.customerName) {
      return NextResponse.json(
        { error: "Faltan datos del comprador (nombre y email son obligatorios)." },
        { status: 400 },
      );
    }
    if (typeof body.total !== "number" || body.total <= 0) {
      return NextResponse.json(
        { error: "El total de la orden es inválido." },
        { status: 400 },
      );
    }

    // Validate each item has the required fields for the Mercado Pago API
    for (const item of body.items) {
      if (!item.product || !item.product.id) {
        return NextResponse.json(
          { error: "Uno de los productos tiene un identificador inválido." },
          { status: 400 },
        );
      }
      if (typeof item.product.price !== "number" || item.product.price <= 0) {
        return NextResponse.json(
          { error: `El producto "${item.product.name || item.product.id}" tiene un precio inválido.` },
          { status: 400 },
        );
      }
      if (!item.product.name) {
        return NextResponse.json(
          { error: "Uno de los productos no tiene nombre." },
          { status: 400 },
        );
      }
      if (typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json(
          { error: "Uno de los productos tiene una cantidad inválida." },
          { status: 400 },
        );
      }
    }

    // ── Create pending order in Supabase ──────────────────────────
    const order = await createPendingOrder({
      userId: body.userId,
      customerName: body.customerName,
      email: body.email,
      address: body.address,
      items: body.items,
      total: body.total,
    });

    // ── Build the preference body exactly as expected by the SDK ──
    // The Items type requires `id`, `title`, `quantity`, `unit_price`.
    // `currency_id` is optional but strongly recommended.
    const preferenceBody = {
      external_reference: order.id,
      items: body.items.map((item) => ({
        id: item.product.id,
        title: item.product.name,
        description: item.product.description,
        picture_url: item.product.image,
        category_id: item.product.category,
        quantity: item.quantity,
        unit_price: item.product.price,
        currency_id: "ARS",
      })),
      payer: {
        name: body.address.fullName,
        email: body.email,
        phone: {
          number: body.address.phone,
        },
        address: {
          zip_code: body.address.postalCode,
          street_name: `${body.address.address}, ${body.address.city}, ${body.address.state}`,
        },
      },
      back_urls: {
        success: `${siteUrl}/pago/exitoso?order=${order.id}`,
        failure: `${siteUrl}/pago/rechazado?order=${order.id}`,
        pending: `${siteUrl}/pago/pendiente?order=${order.id}`,
      },
      auto_return: "approved",
      binary_mode: true,
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      statement_descriptor: "TiendaVS",
    };

    const response = await preferenceClient.create({ body: preferenceBody });

    // Return both the preference ID and the init_point URL.
    // The frontend should use `init_point` (production) or
    // `sandbox_init_point` (test) for the redirect — never a
    // hand-crafted URL.
    return NextResponse.json({
      id: response.id,
      orderId: order.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    });
  } catch (error: unknown) {
    console.error("=== ERROR MERCADO PAGO ===");
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2),
      },
      { status: 500 }
    );
  }
}