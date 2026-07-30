"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { categories } from "@/lib/mock-data";
import { isAdminUser } from "@/lib/admin";
import type { Product } from "@/types/product";

type ProductFormData = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image: string;
  category: string;
  featured: boolean;
};

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  image: "",
  category: categories[0]?.id ?? "",
  featured: false,
};

type AdminPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Fetch products ────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("[admin] Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setActiveSection(null);
      setShowForm(false);
      setEditingProduct(null);
      setMessage(null);
    }
  }, [isOpen, fetchProducts]);

  // ── Close on Escape ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // ── Group products by category ─────────────────────────────────────
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const cat of categories) {
      groups[cat.id] = products.filter((p) => p.category === cat.id);
    }
    return groups;
  }, [products]);

  // ── Admin check ────────────────────────────────────────────────────
  const isUserAdmin = isAdminUser(user);

  // ── API helpers ────────────────────────────────────────────────────
  async function apiCall(url: string, options: RequestInit) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "x-user-id": user?.id ?? "",
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error en la solicitud");
    return data;
  }

  async function handleCreate() {
    if (!formData.name || !formData.price || !formData.category) {
      setMessage({ type: "error", text: "Completá nombre, precio y categoría." });
      return;
    }
    try {
      await apiCall("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          image: formData.image,
          category: formData.category,
          featured: formData.featured,
        }),
      });
      setMessage({ type: "success", text: "Producto agregado correctamente." });
      setShowForm(false);
      setFormData(emptyForm);
      fetchProducts();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al crear." });
    }
  }

  async function handleUpdate() {
    if (!editingProduct || !formData.name || !formData.price) {
      setMessage({ type: "error", text: "Completá nombre y precio." });
      return;
    }
    try {
      await apiCall(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          category: formData.category,
          featured: formData.featured,
        }),
      });
      setMessage({ type: "success", text: "Cambios guardados." });
      setEditingProduct(null);
      setShowForm(false);
      setFormData(emptyForm);
      fetchProducts();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al actualizar." });
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm("¿Eliminar este producto definitivamente?")) return;
    try {
      await apiCall(`/api/products/${productId}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Producto eliminado correctamente." });
      fetchProducts();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al eliminar." });
    }
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      image: product.image,
      category: product.category,
      featured: product.featured ?? false,
    });
    setShowForm(true);
    setActiveSection(product.category);
  }

  function startAdd(categoryId: string) {
    setEditingProduct(null);
    setFormData({ ...emptyForm, category: categoryId });
    setShowForm(true);
  }

  // ── Render ────────────────────────────────────────────────────────
  if (!isUserAdmin) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg transform border-l border-white/10 bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-cyan-400">Panel Administrador</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-24">
          <div className="space-y-2 px-6 pt-6">
            {/* Category sections */}
            {categories.map((cat) => {
              const catProducts = groupedByCategory[cat.id] ?? [];
              const isActive = activeSection === cat.id;

              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(isActive ? null : cat.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-left transition-all hover:border-cyan-400/30"
                  >
                    <span className="font-medium text-white">{cat.name}</span>
                    <span className="text-sm text-slate-500">
                      {catProducts.length} {isActive ? "▲" : "▼"}
                    </span>
                  </button>

                  {isActive && (
                    <div className="ml-2 mt-2 space-y-2 border-l border-white/10 pl-4">
                      {catProducts.length === 0 && (
                        <p className="py-2 text-sm text-slate-500">Sin productos</p>
                      )}

                      {catProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="rounded-xl border border-white/5 bg-slate-900/40 p-3"
                        >
                          <p className="text-sm font-medium text-white">{prod.name}</p>
                          <p className="text-xs text-slate-400">
                            Precio: ${prod.price.toLocaleString("es-AR")} • Stock: {prod.stock}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(prod)}
                              className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(prod.id)}
                              className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => startAdd(cat.id)}
                        className="w-full cursor-pointer rounded-xl border border-dashed border-cyan-400/30 py-2 text-sm text-cyan-400 transition-all hover:bg-cyan-500/10"
                      >
                        + Agregar producto
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Product form (add/edit) ── */}
          {showForm && (
            <div className="mt-4 border-t border-white/10 px-6 pt-4">
              <h3 className="mb-3 text-sm font-medium text-white">
                {editingProduct ? "Editar producto" : "Nuevo producto"}
              </h3>

              <div className="space-y-3">
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                  placeholder="Nombre"
                />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                  placeholder="Descripción"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Precio"
                    type="number"
                  />
                  <input
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Stock"
                    type="number"
                  />
                </div>
                <input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                  placeholder="URL de imagen"
                />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="accent-cyan-500"
                  />
                  Destacado
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={editingProduct ? handleUpdate : handleCreate}
                    className="flex-1 cursor-pointer rounded-full bg-cyan-500 py-2 text-sm font-medium text-slate-950 transition-all hover:brightness-110"
                  >
                    {editingProduct ? "Guardar cambios" : "Crear producto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
                      setFormData(emptyForm);
                    }}
                    className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400 transition-all hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {message && (
            <div className="px-6 pt-4">
              <div
                className={`rounded-xl border px-4 py-2 text-sm ${
                  message.type === "success"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-400/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="px-6 pt-4 text-sm text-slate-500">Cargando productos...</div>
          )}
        </div>
      </div>
    </>
  );
}