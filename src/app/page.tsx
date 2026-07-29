"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProductCard } from "@/components/product-card";
import { categories, getFeaturedProducts } from "@/lib/mock-data";

export default function HomePage() {
  const featured = getFeaturedProducts();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_40%)]">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid items-center gap-8 rounded-[2rem] border border-cyan-400/20 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-500/10 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              Tecnología premium • Entrega rápida
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Descubrí la mejor tecnología para tu día a día.
            </h1>
            <p className="max-w-2xl text-lg text-slate-400">
              Desde notebooks y audio premium hasta wearables y accesorios, TechStore ofrece una experiencia de compra moderna y confiable.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalogo" className="rounded-full bg-cyan-500 px-5 py-3 font-medium text-slate-950">
                Ver catálogo
              </Link>
              <Link href="/checkout" className="rounded-full border border-white/10 px-5 py-3 font-medium text-slate-200 hover:bg-white/10">
                Finalizar compra
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
            <div className="grid gap-4">
              {featured.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-sm text-slate-400">{product.category}</p>
                  </div>
                  <p className="text-cyan-400">${product.price.toLocaleString("es-AR")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Categorías</h2>
            <Link href="/catalogo" className="text-sm text-cyan-400">
              Ver todo
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.id} href={`/catalogo?category=${category.id}`} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 hover:border-cyan-400/40">
                <h3 className="font-semibold text-white">{category.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{category.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Destacados</h2>
            <Link href="/catalogo" className="text-sm text-cyan-400">
              Explorar catálogo
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
