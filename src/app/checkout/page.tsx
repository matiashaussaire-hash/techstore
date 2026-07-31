"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import type { Address, DeliveryMethod } from "@/types/product";

// ── Argentine provinces ──────────────────────────────────────────────
const ARGENTINE_PROVINCES = [
  "CABA",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "CABA": ["Buenos Aires"],
  "Buenos Aires": [
    "Bahía Blanca", "Bahía San Blas", "La Plata", "Mar del Plata",
    "Tandil", "Pergamino", "Junín", "San Nicolás", "Necochea",
    "Olavarría", "Azul", "Chivilcoy", "Zárate", "Campana", "Luján",
    "Mercedes", "San Pedro", "Trenque Lauquen", "Pehuajó", "Dolores",
    "Balcarce", "Chascomús", "Rauch", "Ayacucho", "Las Flores",
    "General Villegas", "Lincoln", "Rojas", "Salto",
  ],
  "Catamarca": [
    "San Fernando del Valle de Catamarca", "Andalgalá", "Belén",
    "Tinogasta", "Santa María",
  ],
  "Chaco": [
    "Resistencia", "Barranqueras", "Fontana", "Sáenz Peña",
    "Villa Ángela", "Castelli", "Charata",
  ],
  "Chubut": [
    "Rawson", "Trelew", "Puerto Madryn", "Comodoro Rivadavia",
    "Esquel", "Gaiman", "Dolavon",
  ],
  "Córdoba": [
    "Córdoba", "Villa María", "Río Cuarto", "Villa Carlos Paz",
    "Villa Allende", "Jesús María", "Deán Funes", "Cruz del Eje",
    "Bell Ville", "Mina Clavero", "La Falda", "Cosquín",
  ],
  "Corrientes": [
    "Corrientes", "Goya", "Paso de los Libres", "Mercedes",
    "Curuzú Cuatiá", "Santo Tomé", "Esquina",
  ],
  "Entre Ríos": [
    "Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay",
    "Gualeguay", "Victoria", "Colón", "Diamante", "La Paz", "Nogoyá",
  ],
  "Formosa": ["Formosa", "Clorinda", "Pirané", "El Colorado", "Ibarreta"],
  "Jujuy": [
    "San Salvador de Jujuy", "Palpalá", "Perico", "La Quiaca",
    "Humahuaca", "Tilcara", "Purmamarca",
  ],
  "La Pampa": [
    "Santa Rosa", "General Pico", "General Acha", "Eduardo Castex",
    "Realicó", "Intendente Alvear",
  ],
  "La Rioja": [
    "La Rioja", "Chilecito", "Famatina", "Chepes", "Villa Unión",
    "Aimogasta",
  ],
  "Mendoza": [
    "Mendoza", "Godoy Cruz", "Guaymallén", "Las Heras", "Maipú",
    "San Rafael", "Luján de Cuyo", "Tunuyán", "General Alvear",
    "San Martín",
  ],
  "Misiones": [
    "Posadas", "Oberá", "Eldorado", "Puerto Iguazú", "Apóstoles",
    "San Vicente", "Leandro N. Alem", "Montecarlo",
  ],
  "Neuquén": [
    "Neuquén", "Cutral Có", "Plottier", "Junín de los Andes",
    "San Martín de los Andes", "Zapala", "Villa La Angostura",
    "Chos Malal",
  ],
  "Río Negro": [
    "Viedma", "Roca", "Cipolletti", "Bariloche", "El Bolsón",
    "Villa Regina", "Choele Choel", "San Antonio Oeste",
    "Sierra Grande",
  ],
  "Salta": [
    "Salta", "San Ramón de la Nueva Orán", "Tartagal", "Cafayate",
    "Rosario de la Frontera", "Metán", "Güemes", "Cachi",
  ],
  "San Juan": [
    "San Juan", "Rivadavia", "Rawson", "Chimbas", "Caucete",
    "San José de Jáchal", "Albardón",
  ],
  "San Luis": [
    "San Luis", "Villa Mercedes", "Merlo", "La Toma", "Concarán",
    "Justo Daract",
  ],
  "Santa Cruz": [
    "Río Gallegos", "Caleta Olivia", "El Calafate",
    "Puerto San Julián", "Pico Truncado", "Las Heras",
    "Perito Moreno",
  ],
  "Santa Fe": [
    "Rosario", "Santa Fe", "Rafaela", "Venado Tuerto", "Reconquista",
    "Esperanza", "San Lorenzo", "Cañada de Gómez",
    "Villa Constitución", "Sunchales", "Avellaneda", "Casilda",
    "Firmat",
  ],
  "Santiago del Estero": [
    "Santiago del Estero", "La Banda", "Termas de Río Hondo",
    "Añatuya", "Frías", "Quimilí", "Loreto",
  ],
  "Tierra del Fuego": ["Ushuaia", "Río Grande", "Tolhuin"],
  "Tucumán": [
    "San Miguel de Tucumán", "Tafí Viejo", "Yerba Buena", "Concepción",
    "Tafí del Valle", "Aguilares", "Monteros", "Famaillá", "Bella Vista",
  ],
};

// ── Validation helpers ───────────────────────────────────────────────

function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} es obligatorio.`;
  if (trimmed.length < 3) return `${label} debe tener al menos 3 caracteres.`;
  return null;
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El correo es obligatorio.";
  if (trimmed.includes(" ")) return "El correo no debe contener espacios.";
  if (!trimmed.includes("@")) return "Ingresá un correo válido (ejemplo@dominio.com).";
  const parts = trimmed.split("@");
  if (parts.length !== 2) return "Ingresá un correo válido (ejemplo@dominio.com).";
  const domainParts = parts[1].split(".");
  if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return "Ingresá un correo válido (ejemplo@dominio.com).";
  }
  return null;
}

function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El teléfono es obligatorio.";
  // Remove spaces, hyphens, parentheses for validation
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");
  // Accept: +549291xxxxxxx, +54291xxxxxxx, 0291xxxxxxx, 291xxxxxxx
  if (!/^\+?\d{7,15}$/.test(cleaned)) return "Ingresá un teléfono válido.";
  return null;
}

function validateAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "La dirección es obligatoria.";
  if (trimmed.length < 5) return "La dirección es demasiado corta.";
  return null;
}

function validateProvince(value: string): string | null {
  if (!value) return "Seleccioná una provincia.";
  if (!ARGENTINE_PROVINCES.includes(value)) return "Seleccioná una provincia válida de la lista.";
  return null;
}

function validateCity(value: string, province: string): string | null {
  if (!value) return "La ciudad es obligatoria.";
  const cities = CITIES_BY_PROVINCE[province];
  if (cities && !cities.includes(value)) return "Seleccioná una ciudad válida de la lista.";
  return null;
}

function validatePostalCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "El código postal es obligatorio.";
  const upper = trimmed.toUpperCase();
  // CPA: A1234ABC  or  traditional: 1234
  const isCPA = /^[A-Z]\d{4}[A-Z]{3}$/.test(upper);
  const isNumeric = /^\d{4}$/.test(trimmed);
  if (!isCPA && !isNumeric) {
    return "Ingresá un código postal válido (ej: 8000 o A1234ABC).";
  }
  return null;
}

// ── Autocomplete component ───────────────────────────────────────────

function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  error,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  error?: string | null;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(input.toLowerCase()),
  );

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        required
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so click on option registers first
          setTimeout(() => {
            setOpen(false);
            onBlur?.();
          }, 200);
        }}
        className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:outline-none ${
          error
            ? "border-rose-400/50 focus:border-rose-400/50"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault();
                setInput(opt);
                onChange(opt);
                setOpen(false);
              }}
              className="cursor-pointer px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-cyan-500/20 hover:text-cyan-300"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-1 px-1 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, addOrder } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country] = useState("Argentina");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("Envío a domicilio");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  const total = useMemo(() => subtotal, [subtotal]);

  // ── Run all validations ──────────────────────────────────────────
  const fieldErrors = useMemo(() => {
    const e: Record<string, string> = {};

    const fnErr = validateName(firstName, "El nombre");
    if (fnErr) e.firstName = fnErr;

    const lnErr = validateName(lastName, "El apellido");
    if (lnErr) e.lastName = lnErr;

    const emErr = validateEmail(email);
    if (emErr) e.email = emErr;

    const phErr = validatePhone(phone);
    if (phErr) e.phone = phErr;

    const adErr = validateAddress(addressLine);
    if (adErr) e.address = adErr;

    const prErr = validateProvince(province);
    if (prErr) e.province = prErr;

    const ciErr = validateCity(city, province);
    if (ciErr) e.city = ciErr;

    const cpErr = validatePostalCode(postalCode);
    if (cpErr) e.postalCode = cpErr;

    return e;
  }, [firstName, lastName, email, phone, addressLine, province, city, postalCode, deliveryMethod]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  // ── Set a single field error ─────────────────────────────────────
  function setError(field: string, message: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  const handleBlur = (field: string) => {
    // Re-validate single field on blur
    let msg: string | null = null;
    switch (field) {
      case "firstName":
        msg = validateName(firstName, "El nombre");
        break;
      case "lastName":
        msg = validateName(lastName, "El apellido");
        break;
      case "email":
        msg = validateEmail(email);
        break;
      case "phone":
        msg = validatePhone(phone);
        break;
      case "address":
        msg = validateAddress(addressLine);
        break;
      case "province":
        msg = validateProvince(province);
        break;
      case "city":
        msg = validateCity(city, province);
        break;
      case "postalCode":
        msg = validatePostalCode(postalCode);
        break;
    }
    setError(field, msg);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    // Run all validations again
    const allErrors = fieldErrors;
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSubmitting(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const address: Address = {
      fullName,
      email: email.trim(),
      phone: phone.trim(),
      address: addressLine.trim(),
      city,
      state: province,
      postalCode: postalCode.trim().toUpperCase(),
      country,
    };

    try {
      const response = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          customerName: fullName,
          email: email.trim(),
          address,
          deliveryMethod,
          items,
          total,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.id) {
        setServerError(data?.error ?? "No se pudo iniciar el pago. Intentá nuevamente.");
        setIsSubmitting(false);
        return;
      }

      addOrder({
        id: data.orderId,
        userId: user?.id,
        customerName: fullName,
        email: email.trim(),
        address,
        deliveryMethod,
        items,
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      clearCart();

      const checkoutUrl = data.sandbox_init_point || data.init_point;
      if (!checkoutUrl) {
        setServerError("Mercado Pago no devolvió una URL de checkout válida.");
        setIsSubmitting(false);
        return;
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error("[checkout] Error al crear la preferencia:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al procesar el pago.";
      setServerError(message);
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-2xl border bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:outline-none ${
      errors[field]
        ? "border-rose-400/50 focus:border-rose-400/50"
        : "border-white/10 focus:border-cyan-400/50"
    }`;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_0.95fr] lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-semibold text-white">Checkout</h1>
          <p className="text-slate-400">Completá tus datos para finalizar la compra.</p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* ── First name ── */}
            <div>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => handleBlur("firstName")}
                className={inputClass("firstName")}
                placeholder="Nombre"
              />
              {errors.firstName && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.firstName}</p>
              )}
            </div>

            {/* ── Last name ── */}
            <div>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => handleBlur("lastName")}
                className={inputClass("lastName")}
                placeholder="Apellido"
              />
              {errors.lastName && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.lastName}</p>
              )}
            </div>

            {/* ── Email ── */}
            <div>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                className={inputClass("email")}
                placeholder="Correo"
              />
              {errors.email && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.email}</p>
              )}
            </div>

            {/* ── Phone ── */}
            <div>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => handleBlur("phone")}
                className={inputClass("phone")}
                placeholder="Teléfono"
              />
              {errors.phone && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.phone}</p>
              )}
            </div>

            {/* ── Address ── */}
            <div className="md:col-span-2">
              <input
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                onBlur={() => handleBlur("address")}
                className={inputClass("address")}
                placeholder="Dirección (calle y número)"
              />
              {errors.address && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.address}</p>
              )}
            </div>

            {/* ── Province ── */}
            <div>
              <AutocompleteInput
                value={province}
                onChange={(v) => {
                  setProvince(v);
                  // If province changes, reset city
                  if (v !== province) setCity("");
                }}
                options={ARGENTINE_PROVINCES}
                placeholder="Provincia"
                error={errors.province}
                onBlur={() => handleBlur("province")}
              />
            </div>

            {/* ── City ── */}
            <div>
              <AutocompleteInput
                value={city}
                onChange={setCity}
                options={province ? CITIES_BY_PROVINCE[province] ?? [] : []}
                placeholder={province ? "Ciudad" : "Primero seleccioná una provincia"}
                error={errors.city}
                onBlur={() => handleBlur("city")}
              />
            </div>

            {/* ── Postal code ── */}
            <div>
              <input
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onBlur={() => handleBlur("postalCode")}
                className={inputClass("postalCode")}
                placeholder="Código postal"
              />
              {errors.postalCode && (
                <p className="mt-1 px-1 text-xs text-rose-400">{errors.postalCode}</p>
              )}
            </div>

            {/* ── Country (fixed) ── */}
            <div>
              <input
                readOnly
                value={country}
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-slate-400"
              />
            </div>

            {/* ── Delivery method ── */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-400">
                Método de entrega
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-200 transition-colors duration-200 focus:border-cyan-400/50 focus:outline-none"
              >
                <option value="Envío a domicilio">Envío a domicilio</option>
                <option value="Retiro en local">Retiro en local</option>
                <option value="Envío por Correo Argentino">Envío por Correo Argentino</option>
                <option value="Cadetería propia">Cadetería propia</option>
                <option value="Mensajería">Mensajería</option>
                <option value="Moto">Moto</option>
                <option value="Envío tercerizado">Envío tercerizado</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Si necesitás otra opción, escribila en la dirección o contactanos después de la compra.
              </p>
            </div>
          </div>

          {/* ── Server error ── */}
          {serverError && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {serverError}
            </div>
          )}

          {/* ── Submit button ── */}
          <button
            type="submit"
            disabled={isSubmitting || hasErrors}
            className="w-full cursor-pointer rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Procesando…" : "Confirmar compra"}
          </button>
        </form>

        {/* ── Order summary ── */}
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
            <div className="flex items-center justify-between">
              Subtotal <span>${subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex items-center justify-between">
              Envío <span>$1.500</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              Total <span>${total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}