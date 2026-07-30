import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { updateOrderStatus } from "@/lib/orders-server";
import type { OrderStatus } from "@/types/product";

// This route uses the Mercado Pago Node SDK which relies on Node.js APIs.
export const runtime = "nodejs";
// Always execute dynamically — webhooks must never be cached.
export const dynamic = "force-dynamic";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN no está configurada. El webhook no puede consultar el pago sin el token.",
    );
  }
  return token;
}

/**
 * Maps a Mercado Pago payment status to our internal OrderStatus.
 *
 * MP statuses: approved | rejected | pending | in_process | in_mediation | cancelled | refunded | charged_back
 * Our statuses: approved | rejected | pending | cancelled
 */
function mapPaymentStatus(mpStatus: string | undefined): OrderStatus {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
    case "cancelled":
      return "rejected";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "pending";
    default:
      // refunded, charged_back, or unknown → treat as cancelled
      return "cancelled";
  }
}

type WebhookBody = {
  action?: string;
  api_version?: string;
  data?: {
    id?: string | number;
  };
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  date_created?: string;
  user_id?: number;
};

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken();

    const body = (await request.json()) as WebhookBody;

    // Mercado Pago sends different notification formats depending on the
    // event type. The key fields are `data.id` (webhook) or `id` / `topic`
    // (legacy IPN). We also receive an `action` like "payment.updated".
    const paymentId = body?.data?.id ?? body?.id;

    // Some notifications (e.g. "merchant_order") don't carry a payment id.
    // Acknowledge them so MP doesn't retry indefinitely, but skip processing.
    if (!paymentId) {
      console.warn("[mercadopago/webhook] Notification received without payment id:", JSON.stringify(body));
      return NextResponse.json({ ok: true, message: "notification acknowledged (no payment id)" });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);

    const payment = await paymentClient.get({ id: String(paymentId) });

    if (!payment || !payment.external_reference) {
      console.error("[mercadopago/webhook] Payment not found or missing external_reference:", paymentId);
      return NextResponse.json(
        { ok: false, message: "payment not found or missing external_reference" },
        { status: 404 },
      );
    }

    const orderId = payment.external_reference as string;
    const status = mapPaymentStatus(payment.status);

    await updateOrderStatus(orderId, status, String(paymentId));

    console.info(
      `[mercadopago/webhook] Order ${orderId} updated → status=${status}, payment_id=${paymentId}, mp_status=${payment.status}`,
    );

    return NextResponse.json({ ok: true, orderId, paymentStatus: payment.status });
  } catch (error) {
    console.error("[mercadopago/webhook] Error processing webhook:", error);
    const message =
      error instanceof Error
        ? error.message
        : "webhook processing failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

/**
 * Mercado Pago sometimes sends a GET request to verify the webhook URL is
 * reachable. Respond with 200 so the notification URL is accepted in the
 * dashboard.
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: "webhook endpoint ready" });
}