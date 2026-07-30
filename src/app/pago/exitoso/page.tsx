import Link from "next/link";
import { Navbar } from "@/components/navbar";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="rounded-[2rem] border border-emerald-400/20 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Pago aprobado</h1>
          <p className="mt-4 text-slate-400">
            Tu pago fue procesado exitosamente.
            {orderId && (
              <>
                <br />
                <span className="text-sm text-slate-500">Orden: {orderId}</span>
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            La orden se actualizará automáticamente cuando el webhook confirme el estado final.
          </p>
          <Link href="/perfil" className="mt-6 inline-block cursor-pointer rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95">
            Ver mi perfil
          </Link>
        </div>
      </main>
    </div>
  );
}