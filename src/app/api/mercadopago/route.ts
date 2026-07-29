import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createPendingOrder } from "@/lib/orders-server";

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "" });
const preferenceClient = new Preference(client);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const order = await createPendingOrder({
      userId: body.userId,
      customerName: body.customerName,
      email: body.email,
      address: body.address,
      items: body.items,
      total: body.total,
    });

    const preference = {
      body: {
        external_reference: order.id,
        items: body.items.map((item: { title: string; unit_price: number; quantity: number }) => ({
          title: item.title,
          unit_price: item.unit_price,
          quantity: item.quantity,
        })),
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pago/exitoso?order=${order.id}`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pago/rechazado?order=${order.id}`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pago/pendiente?order=${order.id}`,
        },
        auto_return: "approved",
      },
    };

    const response = await preferenceClient.create(preference);
    return NextResponse.json({ id: response.id, orderId: order.id });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la preferencia" }, { status: 500 });
  }
}
