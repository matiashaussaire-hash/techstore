"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getProductBySlug as getMockProduct } from "@/lib/mock-data";
import { useCart } from "@/context/cart-context";
import type { Product } from "@/types/product";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.products) {
          const found = data.products.find(
            (p: Product) => p.slug === params.slug,
          );
      if (found) {
            setProduct(found);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("[producto] Error fetching products:", err);
      }
      // Fallback to mock data
      const mock = getMockProduct(params.slug);
      if (mock) setProduct(mock);
      setLoading(false);
    }
    load();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10 text-slate-400">Cargando producto...</main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10 text-slate-400">Producto no encontrado.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <img src={product.image} alt={product.name} className="h-[420px] w-full rounded-[2rem] object-cover" />
        <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
          <div>
            <p className="text-sm text-cyan-400">{product.category}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{product.name}</h1>
            <p className="mt-4 text-slate-400">{product.description}</p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div>
              <p className="text-sm text-slate-400">Precio</p>
              <p className="text-2xl font-semibold text-white">${product.price.toLocaleString("es-AR")}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Stock</p>
              <p className="text-lg font-medium text-cyan-300">{product.stock} unidades</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-slate-200 transition-all duration-200 hover:scale-110 hover:border-cyan-400/40 hover:bg-white/10 active:scale-95">
              -
            </button>
            <span className="min-w-10 text-center text-lg text-white">{quantity}</span>
            <button type="button" onClick={() => setQuantity((current) => current + 1)} className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-slate-200 transition-all duration-200 hover:scale-110 hover:border-cyan-400/40 hover:bg-white/10 active:scale-95">
              +
            </button>
          </div>
          <button type="button" onClick={() => addItem(product, quantity)} className="w-full cursor-pointer rounded-full bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95">
            Añadir al carrito
          </button>
          <Link href="/carrito" className="block cursor-pointer text-center text-sm text-cyan-400 transition-colors duration-200 hover:text-cyan-300">
            Ver carrito
          </Link>
        </div>
      </main>
    </div>
  );
}