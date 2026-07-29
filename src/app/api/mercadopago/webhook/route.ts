import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { updateOrderStatus } from "@/lib/orders-server";

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "" });
const paymentClient = new Payment(client);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = body?.data?.id;

    if (!paymentId) {
      return NextResponse.json({ ok: false, message: "payment id missing" }, { status: 400 });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ ok: false, message: "mercadopago token missing" }, { status: 400 });
    }

    const payment = await paymentClient.get({ id: paymentId });

    if (!payment || !payment.external_reference) {
      return NextResponse.json({ ok: false, message: "payment not found" }, { status: 404 });
    }

    const orderId = payment.external_reference as string;
    const status = payment.status === "approved"
      ? "approved"
      : payment.status === "rejected"
        ? "rejected"
        : payment.status === "pending"
          ? "pending"
          : "cancelled";

    await updateOrderStatus(orderId, status, paymentId);

    return NextResponse.json({ ok: true, orderId, paymentStatus: payment.status });
  } catch {
    return NextResponse.json({ ok: false, message: "webhook processing failed" }, { status: 500 });
  }
}
