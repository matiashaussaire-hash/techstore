import { Resend } from "resend";
import type { Order } from "@/types/product";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const adminEmail = process.env.EMAIL_ADMIN_ADDRESS;
const fromEmail =
  process.env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev";

/**
 * Returns a human-readable label for a delivery method.
 */
function deliveryMethodLabel(method?: string): string {
  switch (method) {
    case "pickup":
      return "Retiro en local";
    case "delivery":
      return "Envío a domicilio";
    default:
      return method ?? "No especificado";
  }
}

/**
 * Formats an ISO date string into a readable Argentine-format date.
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Builds the HTML body for the admin order notification email.
 */
function buildOrderEmailHtml(order: Order): string {
  const itemsRows = order.items
    .map((item) => {
      const subtotal = item.product.price * item.quantity;
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${item.product.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.product.price.toLocaleString("es-AR")}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${subtotal.toLocaleString("es-AR")}</td>
        </tr>`;
    })
    .join("");

  const addr = order.address;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Nuevo pedido aprobado — ${order.id}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a;">

  <h1 style="color:#0891b2;margin-bottom:4px;">Nuevo pedido aprobado</h1>
  <p style="color:#666;margin-top:0;">Se confirmó un pago en la tienda. Estos son los datos para preparar el pedido.</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr>
      <td style="padding:6px 0;font-weight:bold;width:180px;">Número de pedido:</td>
      <td style="padding:6px 0;">${order.id}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Fecha de compra:</td>
      <td style="padding:6px 0;">${formatDate(order.createdAt)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Estado del pago:</td>
      <td style="padding:6px 0;color:#16a34a;font-weight:bold;">Aprobado</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Método de pago:</td>
      <td style="padding:6px 0;">Mercado Pago${order.paymentId ? ` (ID: ${order.paymentId})` : ""}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Método de entrega:</td>
      <td style="padding:6px 0;">${deliveryMethodLabel(order.deliveryMethod)}</td>
    </tr>
  </table>

  <h2 style="color:#0891b2;font-size:18px;margin-top:24px;">Datos del comprador</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;font-weight:bold;width:180px;">Nombre completo:</td>
      <td style="padding:6px 0;">${order.customerName}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Email:</td>
      <td style="padding:6px 0;">${order.email}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Teléfono:</td>
      <td style="padding:6px 0;">${addr.phone}</td>
    </tr>
  </table>

  <h2 style="color:#0891b2;font-size:18px;margin-top:24px;">Dirección de entrega</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;font-weight:bold;width:180px;">Calle y número:</td>
      <td style="padding:6px 0;">${addr.address}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Ciudad:</td>
      <td style="padding:6px 0;">${addr.city}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Provincia:</td>
      <td style="padding:6px 0;">${addr.state}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Código postal:</td>
      <td style="padding:6px 0;">${addr.postalCode}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">País:</td>
      <td style="padding:6px 0;">${addr.country}</td>
    </tr>
  </table>

  <h2 style="color:#0891b2;font-size:18px;margin-top:24px;">Productos</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Producto</th>
        <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Cantidad</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Precio unit.</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;">Total:</td>
        <td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;color:#0891b2;">$${order.total.toLocaleString("es-AR")}</td>
      </tr>
    </tfoot>
  </table>

  <p style="margin-top:32px;color:#999;font-size:12px;">
    Este es un email automático generado por la tienda online. La logística de envío
    (empresa de envíos, costos, seguimiento y despacho) es responsabilidad del negocio
    y debe coordinarse fuera del sistema.
  </p>
</body>
</html>`;
}

/**
 * Builds the HTML body for the customer order confirmation email.
 */
function buildCustomerConfirmationHtml(order: Order): string {
  const itemsRows = order.items
    .map((item) => {
      const subtotal = item.product.price * item.quantity;
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${item.product.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.product.price.toLocaleString("es-AR")}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${subtotal.toLocaleString("es-AR")}</td>
        </tr>`;
    })
    .join("");

  const addr = order.address;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Tu pedido ${order.id} fue aprobado</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a;">

  <h1 style="color:#0891b2;margin-bottom:4px;">¡Tu pedido fue aprobado!</h1>
  <p style="color:#666;margin-top:0;">Gracias por tu compra. Te confirmamos que recibimos el pago correctamente.</p>

  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr>
      <td style="padding:6px 0;font-weight:bold;width:180px;">Número de pedido:</td>
      <td style="padding:6px 0;">${order.id}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Fecha de compra:</td>
      <td style="padding:6px 0;">${formatDate(order.createdAt)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Estado del pago:</td>
      <td style="padding:6px 0;color:#16a34a;font-weight:bold;">Aprobado</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Método de entrega:</td>
      <td style="padding:6px 0;">${deliveryMethodLabel(order.deliveryMethod)}</td>
    </tr>
  </table>

  <h2 style="color:#0891b2;font-size:18px;margin-top:24px;">Productos</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Producto</th>
        <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Cantidad</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Precio unit.</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;">Total:</td>
        <td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;color:#0891b2;">$${order.total.toLocaleString("es-AR")}</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="color:#0891b2;font-size:18px;margin-top:24px;">Dirección de entrega</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;font-weight:bold;width:180px;">Calle y número:</td>
      <td style="padding:6px 0;">${addr.address}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Ciudad:</td>
      <td style="padding:6px 0;">${addr.city}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Provincia:</td>
      <td style="padding:6px 0;">${addr.state}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">Código postal:</td>
      <td style="padding:6px 0;">${addr.postalCode}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-weight:bold;">País:</td>
      <td style="padding:6px 0;">${addr.country}</td>
    </tr>
  </table>

  <p style="margin-top:32px;color:#999;font-size:12px;">
    La logística de envío (empresa de envíos, costos, seguimiento y despacho) es responsabilidad del negocio
    y debe coordinarse fuera del sistema. Te contactaremos a la brevedad para coordinar la entrega.
  </p>
</body>
</html>`;
}

/**
 * Sends an order notification email to the store admin when a payment is approved.
 *
 * Requires the following environment variables:
 * - RESEND_API_KEY
 * - EMAIL_ADMIN_ADDRESS
 * - EMAIL_FROM_ADDRESS (optional, defaults to Resend's onboarding address)
 *
 * If any variable is missing, the function logs a warning and returns without
 * throwing — the order is still saved in Supabase regardless of email delivery.
 */
export async function sendOrderApprovedEmail(order: Order): Promise<void> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY no está configurada. No se enviará el email de notificación al administrador.",
    );
    return;
  }

  if (!adminEmail) {
    console.warn(
      "[email] EMAIL_ADMIN_ADDRESS no está configurada. No se enviará el email de notificación al administrador.",
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: `Tienda <${fromEmail}>`,
    to: adminEmail,
    subject: `Nuevo pedido aprobado — ${order.id}`,
    html: buildOrderEmailHtml(order),
  });

  if (error) {
    console.error("[email] Error enviando email al administrador:", error);
    return;
  }

  console.info(`[email] Notificación de pedido ${order.id} enviada a ${adminEmail}`);
}

/**
 * Sends an order confirmation email to the customer when a payment is approved.
 */
export async function sendCustomerConfirmationEmail(order: Order): Promise<void> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY no está configurada. No se enviará el email de confirmación al comprador.",
    );
    return;
  }

  const customerEmail = order.email;
  if (!customerEmail) {
    console.warn(
      "[email] El pedido no tiene email del comprador. No se enviará la confirmación.",
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: `Tienda <${fromEmail}>`,
    to: customerEmail,
    subject: `Tu pedido ${order.id} fue aprobado`,
    html: buildCustomerConfirmationHtml(order),
  });

  if (error) {
    console.error("[email] Error enviando confirmación al comprador:", error);
    return;
  }

  console.info(`[email] Confirmación de pedido ${order.id} enviada a ${customerEmail}`);
}