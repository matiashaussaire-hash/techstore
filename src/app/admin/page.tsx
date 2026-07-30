"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminPanel } from "@/components/admin-panel";
import { useAuth } from "@/context/auth-context";
import { isAdminUser } from "@/lib/admin";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  const isUserAdmin = isAdminUser(user);

  useEffect(() => {
    // Only run the redirect check after auth has loaded
    if (user === undefined) return; // still loading
    if (!isUserAdmin) {
      router.replace("/");
    } else {
      setAdminPanelOpen(true);
      setChecking(false);
    }
  }, [user, isUserAdmin, router]);

  // Show nothing while checking auth (prevents flash)
  if (checking && user === undefined) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
          Verificando acceso...
        </main>
      </div>
    );
  }

  // Not admin — redirecting
  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
          Redirigiendo...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Panel de Administración</h1>
          <p className="mt-2 text-slate-400">
            Usá el panel lateral para gestionar los productos de la tienda.
          </p>
          <button
            type="button"
            onClick={() => setAdminPanelOpen(true)}
            className="mt-6 cursor-pointer rounded-full bg-cyan-500 px-6 py-3 font-medium text-slate-950 transition-all hover:brightness-110"
          >
            Abrir panel de administración
          </button>
        </div>
      </main>

      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </div>
  );
}