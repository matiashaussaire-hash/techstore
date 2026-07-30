import { getSupabaseAdminClient } from "./supabase-server";
import type { Address, CartItem, Order, OrderStatus } from "@/types/product";

type CreatePendingOrderInput = {
  userId?: string;
  customerName: string;
  email: string;
  address: Address;
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