export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
  featured?: boolean;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Address = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Order = {
  id: string;
  userId?: string;
  customerName: string;
  email: string;
  address: Address;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentId?: string;
};
