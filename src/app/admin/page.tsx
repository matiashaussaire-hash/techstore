"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { categories, initialProducts } from "@/lib/mock-data";
import type { Product } from "@/types/product";

export default function AdminPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const totalSales = useMemo(() => products.reduce((sum, product) => sum + product.price * 1, 0), [products]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">Acceso restringido al panel de administración.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm text-cyan-400">Productos</p>
            <p className="mt-2 text-3xl font-semibold text-white">{products.length}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm text-cyan-400">Ventas</p>
            <p className="mt-2 text-3xl font-semibold text-white">${totalSales.toLocaleString("es-AR")}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm text-cyan-400">Categorías</p>
            <p className="mt-2 text-3xl font-semibold text-white">{categories.length}</p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <h2 className="text-2xl font-semibold text-white">Gestión de productos</h2>
          <div className="mt-6 grid gap-4">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="text-sm text-slate-400">Stock: {product.stock} • Precio: ${product.price.toLocaleString("es-AR")}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="cursor-pointer rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition-all duration-200 hover:scale-105 hover:border-cyan-400/40 hover:bg-white/10 active:scale-95">Editar</button>
                  <button type="button" className="cursor-pointer rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition-all duration-200 hover:scale-105 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
