"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (mode === "login") {
      const result = await login(email, password);
      if (result.ok) {
        router.push("/perfil");
      } else {
        setError(result.error ?? "Credenciales inválidas");
      }
      return;
    }

    const result = await register(name, email, password);
    if (result.ok) {
      if (result.needsEmailConfirmation) {
        // Email confirmation is enabled in Supabase — user must verify
        // their email before they can log in. Don't redirect to /perfil.
        setInfo(
          "Registro exitoso. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
        );
        // Clear the password field for security; keep email so they remember.
        setPassword("");
      } else {
        // Email confirmation is disabled — user is already logged in.
        router.push("/perfil");
      }
    } else {
      setError(result.error ?? "No se pudo completar el registro");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto flex max-w-5xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className={`cursor-pointer rounded-full px-4 py-2 transition-all duration-200 active:scale-95 ${mode === "login" ? "bg-cyan-500 text-slate-950 hover:brightness-110" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setInfo("");
              }}
              className={`cursor-pointer rounded-full px-4 py-2 transition-all duration-200 active:scale-95 ${mode === "register" ? "bg-cyan-500 text-slate-950 hover:brightness-110" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Crear cuenta
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none"
                placeholder="Nombre"
              />
            ) : null}
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none"
              placeholder="Correo"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none"
              placeholder="Contraseña"
            />
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {info ? (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {info}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full cursor-pointer rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95"
            >
              {mode === "login" ? "Ingresar" : "Registrarme"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            ¿Eres administrador? Usa <span className="text-cyan-400">admin@tiendavs.com</span> con la contraseña <span className="text-cyan-400">admin123</span>.
          </p>
          <Link href="/" className="mt-4 block cursor-pointer text-center text-sm text-cyan-400 transition-colors duration-200 hover:text-cyan-300">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}