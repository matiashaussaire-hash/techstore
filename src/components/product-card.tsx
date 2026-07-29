import Link from "next/link";
import type { Product } from "@/types/product";
import { useCart } from "@/context/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/20 transition-all duration-300 hover:border-cyan-400/30 hover:shadow-cyan-500/10">
      <img src={product.image} alt={product.name} className="h-48 w-full object-cover transition duration-300 group-hover:scale-105" />
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-cyan-400">{product.category}</p>
            <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          </div>
          <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm text-cyan-300">★ {product.rating}</span>
        </div>
        <p className="text-sm text-slate-400">{product.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-white">${product.price.toLocaleString("es-AR")}</p>
          <span className="text-sm text-slate-400">Stock: {product.stock}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/producto/${product.slug}`} className="flex-1 cursor-pointer rounded-full border border-white/10 px-4 py-2 text-center text-sm text-slate-200 transition-all duration-200 hover:scale-105 hover:border-cyan-400/40 hover:bg-white/10 active:scale-95">
            Ver detalle
          </Link>
          <button type="button" onClick={() => addItem(product, 1)} className="cursor-pointer rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95">
            Añadir
          </button>
        </div>
      </div>
    </article>
  );
}
