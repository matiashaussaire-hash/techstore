import type { Category, Product } from "@/types/product";

export const categories: Category[] = [
  { id: "laptops", name: "Laptops", description: "Potencia para trabajo y estudio" },
  { id: "audio", name: "Audio", description: "Auriculares y parlantes premium" },
  { id: "wearables", name: "Wearables", description: "Relojes y accesorios inteligentes" },
  { id: "accessories", name: "Accesorios", description: "Periféricos y gadgets" },
];

export const initialProducts: Product[] = [
  {
    id: "1",
    slug: "macbook-air-m3",
    name: "MacBook Air M3",
    description: "Laptop ultraligera con rendimiento excepcional para productividad diaria.",
    price: 1799000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    category: "laptops",
    stock: 14,
    rating: 4.9,
    featured: true,
  },
  {
    id: "2",
    slug: "airpods-max",
    name: "AirPods Max",
    description: "Audio inmersivo con cancelación de ruido y diseño premium.",
    price: 649900,
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80",
    category: "audio",
    stock: 20,
    rating: 4.8,
    featured: true,
  },
  {
    id: "3",
    slug: "apple-watch-ultra-2",
    name: "Apple Watch Ultra 2",
    description: "Monitor de actividad y deportes con GPS avanzado y pantalla brillante.",
    price: 1199900,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80",
    category: "wearables",
    stock: 9,
    rating: 4.7,
  },
  {
    id: "4",
    slug: "logitech-mx-master-3s",
    name: "Logitech MX Master 3S",
    description: "Mouse inalámbrico para productividad con ergonomía profesional.",
    price: 329900,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
    category: "accessories",
    stock: 32,
    rating: 4.6,
  },
  {
    id: "5",
    slug: "sony-wh-1000xm5",
    name: "Sony WH-1000XM5",
    description: "Auriculares con cancelación de ruido de última generación.",
    price: 589900,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    category: "audio",
    stock: 11,
    rating: 4.9,
  },
  {
    id: "6",
    slug: "dell-xps-13",
    name: "Dell XPS 13",
    description: "Notebook premium con pantalla InfinityEdge y batería duradera.",
    price: 1599900,
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    category: "laptops",
    stock: 7,
    rating: 4.5,
  },
];

export function getFeaturedProducts() {
  return initialProducts.filter((product) => product.featured);
}

export function getProductsByCategory(categoryId?: string) {
  return categoryId && categoryId !== "all"
    ? initialProducts.filter((product) => product.category === categoryId)
    : initialProducts;
}

export function getProductBySlug(slug: string) {
  return initialProducts.find((product) => product.slug === slug);
}
