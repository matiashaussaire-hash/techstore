"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";

export default function ProfilePage() {
  const { user, orders, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
          Cargando perfil...
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
          Iniciá sesión para ver tu perfil.
          <div className="mt-4">
            <Link href="/login" className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">
              Ir a login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Perfil</h1>
          <p className="mt-2 text-slate-400">Bienvenido, {user.name}.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm text-cyan-400">Email</p>
              <p className="mt-2 text-white">{user.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm text-cyan-400">Rol</p>
              <p className="mt-2 text-white">{user.role === "admin" ? "Administrador" : "Cliente"}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <h2 className="text-2xl font-semibold text-white">Historial de compras</h2>
          <div className="mt-6 space-y-4">
            {orders.length === 0 ? (
              <p className="text-slate-400">Todavía no hay compras registradas.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{order.id}</p>
                      <p className="text-sm text-slate-400">{order.address.city}, {order.address.country}</p>
                    </div>
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">{order.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Total: ${order.total.toLocaleString("es-AR")}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
