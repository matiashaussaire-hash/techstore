import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="rounded-[2rem] border border-amber-400/20 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Pago pendiente</h1>
          <p className="mt-4 text-slate-400">El pago sigue en revisión. Te notificaremos cuando el estado final quede actualizado.</p>
          <Link href="/perfil" className="mt-6 inline-block rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950">
            Ver mi perfil
          </Link>
        </div>
      </main>
    </div>
  );
}
