import { supabase, isSupabaseConfigured } from "./supabase";
import { getSupabaseAdminClient } from "./supabase-server";
import { categories, initialProducts } from "./mock-data";
import { ADMIN_EMAIL } from "./admin";
import type { Product } from "@/types/product";

/**
 * Checks if a user is an admin by looking up their profile.
 *
 * PRIMARY: profiles.role === "admin"
 * DEVELOPMENT FALLBACK: profiles.email === ADMIN_EMAIL (for testing only)
 *
 * When moving to production, remove the email fallback and ensure
 * the real admin's profile has role='admin' in Supabase.
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId || !isSupabaseConfigured || !supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (error || !data) return false;

  // Primary: role-based authorization
  if (data.role === "admin") return true;

  // DEV ONLY: Allow ADMIN_EMAIL for testing. Remove before production.
  if (data.email === ADMIN_EMAIL) return true;

  return false;
}

type SupabaseProductRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

function mapProduct(record: SupabaseProductRecord): Product {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    price: Number(record.price),
    image: record.image,
    category: record.category,
    stock: record.stock,
    rating: Number(record.rating),
    featured: record.featured,
  };
}

/**
 * Fetches all products from Supabase, falling back to mock data if unavailable.
 */
export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    return initialProducts;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[products] Error fetching products:", error);
    return initialProducts;
  }

  if (!data || data.length === 0) {
    return initialProducts;
  }

  return (data as SupabaseProductRecord[]).map(mapProduct);
}

/**
 * Fetches a single product by slug, falling back to mock data.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !supabase) {
    const { getProductBySlug: getMock } = await import("./mock-data");
    return getMock(slug) ?? null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    const { getProductBySlug: getMock } = await import("./mock-data");
    return getMock(slug) ?? null;
  }

  return mapProduct(data as SupabaseProductRecord);
}

/**
 * Fetches featured products, falling back to mock data.
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  const featured = all.filter((p) => p.featured);
  if (featured.length > 0) return featured;
  // Fallback: get first 3
  return all.slice(0, 3);
}

/**
 * Fetches products by category, falling back to mock data.
 */
export async function getProductsByCategory(categoryId?: string): Promise<Product[]> {
  const all = await getAllProducts();
  if (!categoryId || categoryId === "all") return all;
  return all.filter((p) => p.category === categoryId);
}

/**
 * Creates a product in Supabase (admin only).
 */
export async function createProduct(
  product: Omit<Product, "id" | "rating">,
): Promise<Product> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("No hay conexión con Supabase para crear productos.");
  }

  const slug = product.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data, error } = await adminClient
    .from("products")
    .insert({
      name: product.name,
      slug,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image,
      category: product.category,
      rating: 0,
      featured: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[products] Error creating product:", error);
    throw new Error(`No se pudo crear el producto: ${error.message}`);
  }

  return mapProduct(data as SupabaseProductRecord);
}

/**
 * Updates a product in Supabase (admin only).
 */
export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, "id">>,
): Promise<Product> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("No hay conexión con Supabase para actualizar productos.");
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.stock !== undefined) updateData.stock = updates.stock;
  if (updates.image !== undefined) updateData.image = updates.image;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.featured !== undefined) updateData.featured = updates.featured;
  if (updates.slug !== undefined) updateData.slug = updates.slug;

  if (updates.name) {
    updateData.slug = updates.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const { data, error } = await adminClient
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[products] Error updating product:", error);
    throw new Error(`No se pudo actualizar el producto: ${error.message}`);
  }

  return mapProduct(data as SupabaseProductRecord);
}

/**
 * Deletes a product from Supabase (admin only).
 */
export async function deleteProduct(id: string): Promise<void> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("No hay conexión con Supabase para eliminar productos.");
  }

  const { error } = await adminClient.from("products").delete().eq("id", id);

  if (error) {
    console.error("[products] Error deleting product:", error);
    throw new Error(`No se pudo eliminar el producto: ${error.message}`);
  }
}

export { categories };