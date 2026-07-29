"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useCart } from "@/context/cart-context";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold text-white">Carrito</h1>
          {items.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 text-slate-400">
              Tu carrito está vacío.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img src={item.product.image} alt={item.product.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div>
                    <h2 className="font-semibold text-white">{item.product.name}</h2>
                    <p className="text-sm text-slate-400">${item.product.price.toLocaleString("es-AR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-slate-200">-</button>
                  <span className="text-white">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-slate-200">+</button>
                  <button type="button" onClick={() => removeItem(item.product.id)} className="ml-2 cursor-pointer text-sm text-rose-400">Eliminar</button>
                </div>
              </div>
            ))
          )}
          {items.length > 0 ? (
            <button type="button" onClick={clearCart} className="cursor-pointer text-sm text-slate-400 hover:text-white">
              Vaciar carrito
            </button>
          ) : null}
        </section>
        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-white">Resumen</h2>
          <div className="mt-4 flex items-center justify-between text-slate-400">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("es-AR")}</span>
          </div>
          <Link href="/checkout" className="mt-6 block cursor-pointer rounded-full bg-cyan-500 px-4 py-3 text-center font-medium text-slate-950">
            Continuar al checkout
          </Link>
        </aside>
      </main>
    </div>
  );
}
