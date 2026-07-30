"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import type { Address } from "@/types/product";

const initialAddress: Address = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Argentina",
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, addOrder } = useAuth();
  const [address, setAddress] = useState<Address>({ ...initialAddress, email: user?.email ?? "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync email from auth context when it becomes available
      setAddress((current) => ({ ...current, email: user.email }));
    }
  }, [user?.email]);

  const total = useMemo(() => subtotal + 1500, [subtotal]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/mercadopago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          customerName: address.fullName,
          email: address.email,
          address,
          items,
          total,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.id) {
        const message = data?.error ?? "No se pudo iniciar el pago. Intentá nuevamente.";
        setErrorMessage(message);
        setIsSubmitting(false);
        return;
      }

      // Add the order to the local auth context so it appears in /perfil
      addOrder({
        id: data.orderId,
        userId: user?.id,
        customerName: address.fullName,
        email: address.email,
        address,
        items,
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      clearCart();

      // ── Redirect to Mercado Pago Checkout Pro ──────────────────
      // Use the official `init_point` (production) or `sandbox_init_point`
      // (test credentials) returned by the SDK. Never build the URL
      // manually — the format can change between SDK versions.
      const checkoutUrl = data.sandbox_init_point || data.init_point;

      if (!checkoutUrl) {
        setErrorMessage("Mercado Pago no devolvió una URL de checkout válida.");
        setIsSubmitting(false);
        return;
      }

      // Full-page redirect to the official Mercado Pago checkout.
      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error("[checkout] Error al crear la preferencia:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al procesar el pago.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_0.95fr] lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-semibold text-white">Checkout</h1>
          <p className="text-slate-400">Completá tus datos para finalizar la compra.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Nombre completo" />
            <input required type="email" value={address.email} onChange={(event) => setAddress({ ...address, email: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Correo" />
            <input required value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Teléfono" />
            <input required value={address.address} onChange={(event) => setAddress({ ...address, address: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Dirección" />
            <input required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Ciudad" />
            <input required value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Provincia" />
            <input required value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="Código postal" />
            <input required value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none" placeholder="País" />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Procesando…" : "Confirmar compra"}
          </button>
        </form>

        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-white">Resumen</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between">
                <span>{item.product.name} × {item.quantity}</span>
                <span>${(item.product.price * item.quantity).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-slate-300">
            <div className="flex items-center justify-between">Subtotal <span>${subtotal.toLocaleString("es-AR")}</span></div>
            <div className="flex items-center justify-between">Envío <span>$1.500</span></div>
            <div className="flex items-center justify-between text-lg font-semibold text-white">Total <span>${total.toLocaleString("es-AR")}</span></div>
          </div>
        </aside>
      </main>
    </div>
  );
}