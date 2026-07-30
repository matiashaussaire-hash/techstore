import Link from "next/link";
import { Navbar } from "@/components/navbar";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PaymentRejectedPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="rounded-[2rem] border border-rose-400/20 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-semibold text-white">Pago rechazado</h1>
          <p className="mt-4 text-slate-400">
            No pudimos completar el pago. Podés intentar nuevamente desde el carrito o revisar los datos del pago.
            {orderId && (
              <>
                <br />
                <span className="text-sm text-slate-500">Orden: {orderId}</span>
              </>
            )}
          </p>
          <Link href="/checkout" className="mt-6 inline-block cursor-pointer rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95">
            Volver al checkout
          </Link>
        </div>
      </main>
    </div>
  );
}