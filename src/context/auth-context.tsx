"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getOrdersByUser } from "@/lib/orders";
import { supabase, isSupabaseConfigured, supabaseConfigError } from "@/lib/supabase";
import type { Order } from "@/types/product";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

type AuthResult = {
  ok: boolean;
  error?: string | null;
  needsEmailConfirmation?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  orders: Order[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  addOrder: (order: Order) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSupabaseAuthReady() {
  return isSupabaseConfigured && Boolean(supabase);
}

/**
 * Translates raw Supabase Auth error messages into user-friendly Spanish messages.
 * Prevents leaking internal error details while keeping the message actionable.
 */
function translateAuthError(message?: string | null): string {
  if (!message) {
    return "Ocurrió un error inesperado.";
  }
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam).";
  }
  if (lower.includes("invalid login credentials")) {
    return "Credenciales inválidas. Verificá tu correo y contraseña.";
  }
  if (lower.includes("email rate limit exceeded") || lower.includes("rate limit")) {
    return "Demasiados intentos. Esperá unos minutos e intentá nuevamente.";
  }
  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta con este correo. Iniciá sesión.";
  }
  if (lower.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (lower.includes("unable to validate email address")) {
    return "El correo ingresado no es válido.";
  }
  if (lower.includes("signup is disabled")) {
    return "El registro de nuevos usuarios está deshabilitado.";
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const syncProfile = async (
    client: typeof supabase,
    userId: string,
    name: string,
    email: string,
    role: "user" | "admin" = "user",
  ) => {
    if (!client) {
      return;
    }

    try {
      await client.from("profiles").upsert(
        {
          id: userId,
          email,
          name,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } catch {
      // Ignore profile sync issues and rely on the trigger when available.
    }
  };

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseAuthReady() || !client) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const hydrateUser = async (
      sessionUser: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      },
    ) => {
      try {
        const { data: profileData } = await client
          .from("profiles")
          .select("name, role")
          .eq("id", sessionUser.id)
          .maybeSingle();
        const profile = profileData as { name?: string; role?: string } | null;
        const nextUser: AuthUser = {
          id: sessionUser.id,
          name:
            (profile?.name as string | undefined) ??
            (sessionUser.user_metadata?.name as string | undefined) ??
            (sessionUser.user_metadata?.full_name as string | undefined) ??
            sessionUser.email ??
            "Usuario",
          email: sessionUser.email ?? "",
          role: profile?.role === "admin" ? "admin" : "user",
        };

        if (!profileData) {
          await syncProfile(client, sessionUser.id, nextUser.name, nextUser.email, nextUser.role);
        }

        if (!active) {
          return;
        }

        setUser(nextUser);
        const nextOrders = await getOrdersByUser(nextUser.id);
        if (active) {
          setOrders(nextOrders);
        }
      } catch {
        // If profile fetch fails, still set the user with metadata from the session
        if (!active) {
          return;
        }
        setUser({
          id: sessionUser.id,
          name:
            (sessionUser.user_metadata?.name as string | undefined) ??
            sessionUser.email ??
            "Usuario",
          email: sessionUser.email ?? "",
          role: "user",
        });
      }
    };

    const restoreSession = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!active) {
        return;
      }

      if (session?.user) {
        await hydrateUser(session.user);
      } else {
        setUser(null);
        setOrders([]);
      }

      if (active) {
        setIsLoading(false);
      }
    };

    void restoreSession();

    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) {
          return;
        }

        if (session?.user) {
          await hydrateUser(session.user);
        } else {
          setUser(null);
          setOrders([]);
        }

        if (active) {
          setIsLoading(false);
        }
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    if (typeof window === "undefined") {
      return { ok: false, error: "La sesión no está disponible en este entorno." };
    }

    if (!isSupabaseAuthReady() || !supabase) {
      return { ok: false, error: supabaseConfigError ?? "Supabase no está configurado." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: translateAuthError(error?.message) };
    }

    // Fetch the profile to get the correct role (admin/user)
    let role: "user" | "admin" = "user";
    let name: string = (data.user.user_metadata?.name as string | undefined) ?? data.user.email ?? "Usuario";
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", data.user.id)
        .maybeSingle();
      const profile = profileData as { name?: string; role?: string } | null;
      if (profile?.role === "admin") {
        role = "admin";
      }
      if (profile?.name) {
        name = profile.name;
      }
    } catch {
      // Fall back to user_metadata if profile lookup fails
    }

    const nextUser: AuthUser = {
      id: data.user.id,
      name,
      email: data.user.email ?? email,
      role,
    };

    setUser(nextUser);
    const nextOrders = await getOrdersByUser(nextUser.id);
    setOrders(nextOrders);
    return { ok: true };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    if (typeof window === "undefined") {
      return { ok: false, error: "La sesión no está disponible en este entorno." };
    }

    if (!isSupabaseAuthReady() || !supabase) {
      return { ok: false, error: supabaseConfigError ?? "Supabase no está configurado." };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: "user" },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/login`
            : undefined,
      },
    });

    if (error) {
      return { ok: false, error: translateAuthError(error.message) };
    }

    if (!data.user) {
      return { ok: false, error: "No se pudo crear el usuario." };
    }

    // ──────────────────────────────────────────────────────────────
    // KEY FIX: Handle both email-confirmation scenarios correctly.
    //
    // 1. Email confirmation ENABLED (Supabase default):
    //    signUp() returns { user, session: null }.
    //    The user exists in auth.users but cannot log in until they
    //    click the confirmation link. We must NOT call signInWithPassword()
    //    because it will fail with "Email not confirmed".
    //    Instead, return a success with needsEmailConfirmation = true.
    //
    // 2. Email confirmation DISABLED:
    //    signUp() returns { user, session: <session> }.
    //    The user is already logged in. We just hydrate the profile.
    // ──────────────────────────────────────────────────────────────

    if (!data.session) {
      // Email confirmation is enabled — user must verify their email.
      // The handle_new_user() trigger already created the profile row,
      // so we don't need to call syncProfile here (the user isn't
      // authenticated yet and RLS would block the insert anyway).
      return {
        ok: true,
        needsEmailConfirmation: true,
      };
    }

    // Email confirmation is disabled — user is already logged in.
    // Sync the profile (upsert is safe; trigger may have already created it).
    await syncProfile(supabase, data.user.id, name, email, "user");

    const nextUser: AuthUser = {
      id: data.user.id,
      name,
      email,
      role: "user",
    };
    setUser(nextUser);
    const nextOrders = await getOrdersByUser(nextUser.id);
    setOrders(nextOrders);
    return { ok: true };
  };

  const logout = async () => {
    if (isSupabaseAuthReady() && supabase) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setOrders([]);
  };

  const addOrder = (order: Order) => setOrders((current) => [order, ...current]);

  const value = useMemo(
    () => ({ user, orders, isLoading, login, register, logout, addOrder }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, orders, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}