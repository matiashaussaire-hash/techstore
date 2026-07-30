"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProductCard } from "@/components/product-card";
import { categories, initialProducts } from "@/lib/mock-data";
import type { Product } from "@/types/product";

function CatalogContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") ?? "all");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error("[catalogo] Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const list = selectedCategory === "all" || !selectedCategory
      ? products
      : products.filter((p) => p.category === selectedCategory);
    const normalized = query.toLowerCase();
    return list.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized),
    );
  }, [query, selectedCategory, products]);

  return (
    <>
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-semibold text-white">Catálogo</h1>
        <p className="mt-2 text-slate-400">Explorá productos tecnológicos con filtros y búsqueda rápida.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-full border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none"
            placeholder="Buscar por nombre o descripción"
          />
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="cursor-pointer rounded-full border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 hover:border-white/20 focus:border-cyan-400/50 focus:outline-none"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="text-slate-400">Cargando catálogo...</div>}>
          <CatalogContent />
        </Suspense>
      </main>
    </div>
  );
}