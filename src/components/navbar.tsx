"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/carrito", label: "Carrito" },
  { href: "/checkout", label: "Checkout" },
];

export function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="cursor-pointer text-lg font-semibold tracking-wide text-cyan-400">
          TechStore
        </Link>
        <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`cursor-pointer ${pathname === link.href ? "text-white" : "hover:text-cyan-400"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/perfil" className="cursor-pointer rounded-full border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300">
                {user.name}
              </Link>
              <button type="button" onClick={logout} className="cursor-pointer text-sm text-slate-300 hover:text-white">
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="cursor-pointer rounded-full border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300">
              Iniciar sesión
            </Link>
          )}
          <Link href="/carrito" className="cursor-pointer rounded-full bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950">
            🛒 {itemCount}
          </Link>
        </div>
      </div>
    </header>
  );
}
