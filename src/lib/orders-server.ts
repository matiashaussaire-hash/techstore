import { getSupabaseAdminClient } from "./supabase-server";
import type { Address, CartItem, DeliveryMethod, Order, OrderStatus } from "@/types/product";

type CreatePendingOrderInput = {
  userId?: string;
  customerName: string;
  email: string;
  address: Address;
  deliveryMethod?: DeliveryMethod;
  items: CartItem[];
  total: number;
};

export async function createPendingOrder(input: CreatePendingOrderInput): Promise<Order> {
  const order: Order = {
    id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    userId: input.userId,
    customerName: input.customerName,
    email: input.email,
    address: input.address,
    deliveryMethod: input.deliveryMethod,
    items: input.items,
    total: input.total,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders-server] Supabase admin client is not configured. Order will be returned but NOT persisted:", order.id);
    return order;
  }

  // Insert the order row
  const { error } = await adminClient
    .from("orders")
    .insert({
      id: order.id,
      user_id: input.userId ?? null,
      customer_name: order.customerName,
      email: order.email,
      address: order.address,
      delivery_method: input.deliveryMethod ?? null,
      total: order.total,
      status: order.status,
      payment_id: null,
      created_at: order.createdAt,
      updated_at: order.createdAt,
    })
    .select()
    .single();

  if (error) {
    console.error("[orders-server] Error inserting order into Supabase:", error);
    throw new Error(`No se pudo crear la orden en Supabase: ${error.message}`);
  }

  // Insert order items
  const { error: itemsError } = await adminClient.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      created_at: new Date().toISOString(),
    })),
  );

  if (itemsError) {
    console.error("[orders-server] Error inserting order items into Supabase:", itemsError);
    throw new Error(`No se pudieron guardar los items de la orden: ${itemsError.message}`);
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders-server] Supabase admin client is not configured. Cannot update order:", orderId);
    return;
  }

  const { error } = await adminClient
    .from("orders")
    .update({
      status,
      payment_id: paymentId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[orders-server] Error updating order status in Supabase:", error);
    throw new Error(`No se pudo actualizar el estado de la orden ${orderId}: ${error.message}`);
  }
}

export async function savePaymentId(orderId: string, paymentId: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders-server] Supabase admin client is not configured. Cannot save payment ID:", orderId);
    return;
  }

  const { error } = await adminClient
    .from("orders")
    .update({ payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    console.error("[orders-server] Error saving payment ID in Supabase:", error);
    throw new Error(`No se pudo guardar el payment_id para la orden ${orderId}: ${error.message}`);
  }
}

type SupabaseOrderRecord = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  email: string | null;
  address: Address | null;
  delivery_method: string | null;
  admin_notified_at: string | null;
  total: number;
  status: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseOrderItemRecord = {
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
};

/**
 * Fetches a complete order (with items) by its ID using the admin client.
 * Used by the webhook to build the admin notification email after payment approval.
 */
export async function getOrderByIdForEmail(orderId: string): Promise<Order | null> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders-server] Supabase admin client is not configured. Cannot fetch order:", orderId);
    return null;
  }

  const { data: orderData, error: orderError } = await adminClient
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    console.error("[orders-server] Error fetching order for email:", orderError);
    return null;
  }

  const record = orderData as SupabaseOrderRecord;

  const { data: itemsData, error: itemsError } = await adminClient
    .from("order_items")
    .select("product_id, product_name, quantity, unit_price")
    .eq("order_id", orderId);

  if (itemsError || !itemsData) {
    console.error("[orders-server] Error fetching order items for email:", itemsError);
    return null;
  }

  const items: CartItem[] = (itemsData as SupabaseOrderItemRecord[]).map((item) => ({
    product: {
      id: item.product_id,
      slug: item.product_id,
      name: item.product_name ?? item.product_id,
      description: "",
      price: Number(item.unit_price),
      image: "",
      category: "",
      stock: 0,
      rating: 0,
    },
    quantity: item.quantity,
  }));

  return {
    id: record.id,
    userId: record.user_id ?? undefined,
    customerName: record.customer_name ?? "",
    email: record.email ?? "",
    address: (record.address as Address) ?? {
      fullName: record.customer_name ?? "",
      email: record.email ?? "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Argentina",
    },
    deliveryMethod: (record.delivery_method as DeliveryMethod) ?? undefined,
    adminNotifiedAt: record.admin_notified_at ?? undefined,
    items,
    total: Number(record.total),
    status: (record.status as OrderStatus) ?? "pending",
    createdAt: record.created_at,
    paymentId: record.payment_id ?? undefined,
  };
}

/**
 * Marks an order as "admin notified" by setting admin_notified_at to now.
 * This prevents duplicate emails when Mercado Pago sends multiple
 * webhook notifications for the same approved payment.
 */
export async function markAdminNotified(orderId: string): Promise<void> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders-server] Supabase admin client is not configured. Cannot mark admin notified:", orderId);
    return;
  }

  const { error } = await adminClient
    .from("orders")
    .update({ admin_notified_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    console.error("[orders-server] Error marking admin notified:", error);
  }
}
