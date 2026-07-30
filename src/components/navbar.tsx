"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { AdminPanel } from "@/components/admin-panel";
import { isAdminUser } from "@/lib/admin";

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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const isUserAdmin = isAdminUser(user);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="cursor-pointer text-lg font-semibold tracking-wide text-cyan-400 transition-colors duration-200 hover:text-cyan-300">
            TechStore
          </Link>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`cursor-pointer transition-colors duration-200 ${pathname === link.href ? "text-white" : "hover:text-cyan-400"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Admin button — only visible to admin users */}
                {isUserAdmin && (
                  <button
                    type="button"
                    onClick={() => setAdminPanelOpen(true)}
                    className="cursor-pointer rounded-full border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 transition-all duration-200 hover:scale-105 hover:border-cyan-400/70 hover:bg-cyan-500/10 active:scale-95"
                  >
                    Admin
                  </button>
                )}
                <Link href="/perfil" className="cursor-pointer rounded-full border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300 transition-all duration-200 hover:scale-105 hover:border-cyan-400/70 hover:bg-cyan-500/10 active:scale-95">
                  {user.name}
                </Link>
                <button type="button" onClick={logout} className="cursor-pointer text-sm text-slate-300 transition-colors duration-200 hover:text-white">
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" className="cursor-pointer rounded-full border border-cyan-400/40 px-3 py-2 text-sm text-cyan-300 transition-all duration-200 hover:scale-105 hover:border-cyan-400/70 hover:bg-cyan-500/10 active:scale-95">
                Iniciar sesión
              </Link>
            )}
            <Link href="/carrito" className="cursor-pointer rounded-full bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95">
              🛒 {itemCount}
            </Link>
          </div>
        </div>
      </header>

      {/* Admin slide-out panel */}
      <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
    </>
  );
}