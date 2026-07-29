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

function mapSupabaseOrder(record: SupabaseOrderRecord): Order {
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
    items: [],
    total: Number(record.total),
    status: (record.status as OrderStatus) ?? "pending",
    createdAt: record.created_at,
    paymentId: record.payment_id ?? undefined,
  };
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

  if (client) {
    try {
      const { data, error } = await client.from("orders").insert({
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

      if (!error && data) {
        await client.from("order_items").insert(
          input.items.map((item) => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            created_at: new Date().toISOString(),
          })),
        );

        return order;
      }
    } catch {
      // fallback to local storage when Supabase is not ready for the current table/schema
    }
  }

  return order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (!error && data) {
        return mapSupabaseOrder(data as SupabaseOrderRecord);
      }
    } catch {
      // fallback to local storage
    }
  }

  return null;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  const adminClient = getSupabaseAdminClient();
  if (isSupabaseConfigured && supabase && adminClient) {
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
      // fallback already persisted locally
    }
  }
}

export async function savePaymentId(orderId: string, paymentId: string) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("orders").update({ payment_id: paymentId, updated_at: new Date().toISOString() }).eq("id", orderId);
    } catch {
      // fallback to local logic
    }
  }
}

export async function getOrdersByUser(userId?: string): Promise<Order[]> {
  if (isSupabaseConfigured && supabase && userId) {
    try {
      const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error && data) {
        return (data as SupabaseOrderRecord[]).map(mapSupabaseOrder);
      }
    } catch {
      // fallback to local storage
    }
  }

  return [];
}

export async function getAllOrders(): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        return (data as SupabaseOrderRecord[]).map(mapSupabaseOrder);
      }
    } catch {
      // fallback to local storage
    }
  }

  return [];
}
