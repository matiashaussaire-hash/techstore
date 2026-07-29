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
  if (adminClient) {
    try {
      const { data, error } = await adminClient
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

      if (!error && data) {
        await adminClient.from("order_items").insert(
          input.items.map((item) => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            created_at: new Date().toISOString(),
          })),
        );
      }
    } catch {
      // fall back to the returned local order if the server client is not configured
    }
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    try {
      await adminClient
        .from("orders")
        .update({
          status,
          payment_id: paymentId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    } catch {
      // no-op; failures are handled by the route layer
    }
  }
}

export async function savePaymentId(orderId: string, paymentId: string) {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    try {
      await adminClient.from("orders").update({ payment_id: paymentId, updated_at: new Date().toISOString() }).eq("id", orderId);
    } catch {
      // no-op
    }
  }
}
