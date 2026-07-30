import { supabase, isSupabaseConfigured } from "./supabase";
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

type SupabaseOrderRecord = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  email: string | null;
  address: Address | null;
  total: number;
  status: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseOrderItemRecord = {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string | null;
};

/**
 * Maps a Supabase order_items row to a CartItem.
 * Product details beyond id, name, and price are not available in the
 * order_items table, so they are filled with empty defaults.
 */
function mapOrderItemToCartItem(item: SupabaseOrderItemRecord): CartItem {
  return {
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
  };
}

function mapSupabaseOrder(
  record: SupabaseOrderRecord,
  items?: CartItem[],
): Order {
  return {
    id: record.id,
    userId: record.user_id ?? undefined,
    customerName: record.customer_name ?? "",
    email: record.email ?? "",
    address: (record.address as Address) ?? {
      fullName: "",
      email: record.email ?? "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Argentina",
    },
    items: items ?? [],
    total: Number(record.total),
    status: (record.status as OrderStatus) ?? "pending",
    createdAt: record.created_at,
    paymentId: record.payment_id ?? undefined,
  };
}

/**
 * Fetches order items from the order_items table for a given order ID.
 */
async function fetchOrderItems(orderId: string): Promise<CartItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity, unit_price, product_name")
    .eq("order_id", orderId);

  if (error) {
    console.error("[orders] Error fetching order items:", error);
    return [];
  }

  return (data as SupabaseOrderItemRecord[]).map(mapOrderItemToCartItem);
}

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
  const client = adminClient ?? (isSupabaseConfigured ? supabase : null);

  if (!client) {
    console.error("[orders] No Supabase client available. Order will not be persisted:", order.id);
    return order;
  }

  const { error } = await client.from("orders").insert({
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
  }).select().single();

  if (error) {
    console.error("[orders] Error inserting order into Supabase:", error);
    throw new Error(`No se pudo crear la orden: ${error.message}`);
  }

  const { error: itemsError } = await client.from("order_items").insert(
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
    console.error("[orders] Error inserting order items into Supabase:", itemsError);
    throw new Error(`No se pudieron guardar los items: ${itemsError.message}`);
  }

  return order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error) {
      console.error("[orders] Error fetching order:", error);
      return null;
    }
    if (data) {
      const items = await fetchOrderItems(orderId);
      return mapSupabaseOrder(data as SupabaseOrderRecord, items);
    }
  }
  return null;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    console.error("[orders] Supabase admin client not configured. Cannot update order:", orderId);
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
    console.error("[orders] Error updating order status:", error);
    throw new Error(`No se pudo actualizar la orden: ${error.message}`);
  }
}

export async function savePaymentId(orderId: string, paymentId: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) {
      console.error("[orders] Error saving payment ID:", error);
      throw new Error(`No se pudo guardar el payment_id: ${error.message}`);
    }
  }
}

export async function getOrdersByUser(userId?: string): Promise<Order[]> {
  if (isSupabaseConfigured && supabase && userId) {
    const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) {
      console.error("[orders] Error fetching orders by user:", error);
      return [];
    }
    if (data) {
      const records = data as SupabaseOrderRecord[];
      const orders = await Promise.all(
        records.map(async (record) => {
          const items = await fetchOrderItems(record.id);
          return mapSupabaseOrder(record, items);
        }),
      );
      return orders;
    }
  }
  return [];
}

export async function getAllOrders(): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[orders] Error fetching all orders:", error);
      return [];
    }
    if (data) {
      const records = data as SupabaseOrderRecord[];
      const orders = await Promise.all(
        records.map(async (record) => {
          const items = await fetchOrderItems(record.id);
          return mapSupabaseOrder(record, items);
        }),
      );
      return orders;
    }
  }
  return [];
}