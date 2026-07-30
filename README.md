# TechStore

TechStore es una tienda online de tecnología desarrollada con Next.js, React, Supabase y Mercado Pago. Ofrece una experiencia de e-commerce completa con catálogo de productos, carrito de compras, checkout con pagos integrados, autenticación de usuarios y un panel administrativo con CRUD de productos.

> **Documentación de transferencia**: para el proceso de entrega al cliente (cuentas, credenciales, URLs y configuración del administrador), ver [`GUIA_TRANSFERENCIA.md`](./GUIA_TRANSFERENCIA.md).

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura General](#arquitectura-general)
- [Funcionalidades](#funcionalidades)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Roles](#roles)
- [Flujos de la aplicación](#flujos-de-la-aplicación)
- [Base de datos y Supabase](#base-de-datos-y-supabase)
- [Arquitectura de Supabase](#arquitectura-de-supabase)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Configuración externa](#configuración-externa)
- [Seguridad](#seguridad)
- [Proceso de Deploy](#proceso-de-deploy)
- [Verificación y testing](#verificación-y-testing)
- [Pendientes](#pendientes)
- [Roadmap](#roadmap)
- [Historial de cambios](#historial-de-cambios)

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.2.12 | Framework fullstack (App Router) |
| React | 19.2.4 | Librería de UI |
| TypeScript | 5 | Tipado estático |
| Tailwind CSS | 4 | Estilos utilitarios |
| Supabase JS | 2.111.0 | Auth y base de datos (PostgreSQL) |
| Mercado Pago SDK | 3.2.1 | Procesamiento de pagos |
| Resend | SDK oficial | Envío de emails transaccionales |
| ESLint | 9 | Linting |

## Arquitectura General

```text
Cliente (Navegador)
    │
    ▼
Vercel (Next.js)
    │
    ├──────────────► Supabase Auth
    │                   (login, registro, sesión)
    │
    ├──────────────► Supabase Database
    │                   (products, orders, order_items, profiles)
    │
    ├──────────────► Mercado Pago
    │                   (preferencias de pago)
    │
    └──────────────► Resend
                        (emails al admin y al comprador)
```

### Componentes principales

- **Cliente (Navegador)**: ejecuta la app de React, maneja el carrito en `localStorage` y la sesión con Supabase Auth.
- **Vercel (Next.js)**: hospeda la aplicación y las API Routes. Sirve páginas SSR/estáticas y ejecuta código servidor.
- **Supabase Auth**: gestiona registro, login, confirmación por email y persistencia de sesión.
- **Supabase Database (PostgreSQL)**: almacena perfiles, productos, órdenes e items de órdenes con RLS habilitado.
- **Mercado Pago**: procesa el pago y envía notificaciones al webhook para actualizar el estado de las órdenes.
- **Resend**: envía emails transaccionales al administrador (nuevo pedido aprobado) y al comprador (confirmación de compra).

## Funcionalidades

### E-commerce (Storefront)

- **Página de inicio**: Hero section con productos destacados y grid de categorías navegables.
- **Catálogo**: Listado de productos con buscador por nombre/descripción y filtro por categoría.
- **Detalle de producto**: Vista individual con imagen, descripción, precio, stock, rating y selector de cantidad.
- **Carrito de compras**:
  - Agregar productos desde el catálogo o la vista de detalle.
  - Actualizar cantidades (incrementar/decrementar).
  - Eliminar items individuales o vaciar el carrito completo.
  - Cálculo de subtotal en tiempo real.
  - Persistencia en `localStorage` (clave: `tiendavs-cart`).
- **Checkout**:
  - Formulario de datos de envío (nombre, email, teléfono, dirección, ciudad, provincia, código postal, país).
  - Selector de método de entrega (envío a domicilio, retiro en local, correo, cadetería, etc.).
  - Resumen de compra con subtotal, envío fijo ($1.500) y total.
  - Creación de orden pendiente antes de generar la preferencia de Mercado Pago.
  - Redirección a Mercado Pago para completar el pago.
- **Páginas de resultado de pago**:
  - `/pago/exitoso` — pago aprobado.
  - `/pago/rechazado` — pago rechazado.
  - `/pago/pendiente` — pago en revisión.

### Usuarios y autenticación

- **Registro de usuarios** mediante Supabase Auth con confirmación por email.
- **Login** con email y contraseña.
- **Persistencia de sesión**: restauración automática al recargar (`getSession` + `onAuthStateChange`).
- **Perfil de usuario**: muestra nombre, email y rol (cliente/administrador).
- **Historial de compras**: órdenes asociadas al usuario autenticado, obtenidas desde Supabase.
- **Logout**: cierra la sesión en Supabase y limpia el estado local.
- **Mensajes de error traducidos al español** para errores comunes de autenticación.

### Administración

- **Panel administrativo** accesible solo para usuarios con rol `admin`.
- **Métricas básicas**: total de productos, ventas y categorías.
- **CRUD de productos**: crear, editar y eliminar productos desde el panel (operaciones reales contra Supabase).
- **Gestión de pedidos**: visualización de todas las órdenes con datos del comprador, método de entrega, dirección, productos y total.
- **Autorización dual**: verificación client-side (`isAdminUser`) y server-side (API Routes con `isAdmin`).
- **Gestión por categorías**: productos agrupados por categoría con formulario de alta/edición.

### Pagos (Mercado Pago)

- **API Route** `POST /api/mercadopago`:
  - Recibe los datos del checkout.
  - Crea una orden pendiente en Supabase (vía admin client).
  - Genera una preferencia de pago en Mercado Pago con `external_reference` = ID de orden.
  - Configura `back_urls` para redirección según el resultado del pago.
  - Devuelve el `preference_id` y `init_point` para redirigir al usuario al checkout de Mercado Pago.
- **Webhook** `POST /api/mercadopago/webhook`:
  - Recibe notificaciones de Mercado Pago.
  - Consulta el estado real del pago usando el SDK.
  - Actualiza el estado de la orden correspondiente (`approved`, `rejected`, `pending`, `cancelled`).
  - **Cuando el pago es aprobado**, envía automáticamente un email al administrador con todos los datos del pedido (número, fecha, comprador, dirección, método de entrega, productos y total) para que el negocio pueda preparar y coordinar la entrega.
  - **Cuando el pago es aprobado**, envía automáticamente un email al comprador con la confirmación y el resumen del pedido.
  - Incluye protección contra envíos duplicados mediante el campo `admin_notified_at`.

### Notificaciones por email (Resend)

- **Proveedor**: [Resend](https://resend.com) para el envío de emails transaccionales.
- **Trigger**: el webhook de Mercado Pago dispara el envío **solo cuando el pago queda aprobado**. No se envía email para pagos pendientes, rechazados o cancelados.
- **Destinatarios**:
  - **Administrador**: email definido en `EMAIL_ADMIN_ADDRESS`. Recibe notificación interna con datos completos del pedido.
  - **Comprador**: email del comprador. Recibe confirmación de compra con resumen del pedido.
- **Contenido del email al admin**: número de pedido, fecha, estado del pago, datos del comprador (nombre, email, teléfono), dirección completa de entrega, método de entrega seleccionado, lista de productos (nombre, cantidad, precio unitario, subtotal), total y método de pago.
- **Contenido del email al comprador**: número de pedido, fecha, estado del pago, método de entrega, lista de productos, total, dirección de entrega.
- **Logística**: el sistema **no** integra empresas de envío (Correo Argentino, Andreani, OCA, etc.), cálculo automático de envíos ni seguimiento de paquetes. La logística de envío (despacho, costos, seguimiento) es responsabilidad del negocio y debe coordinarse fuera del sistema.

### Método de entrega

- El checkout incluye un selector para que el comprador elija cómo recibir el pedido:
  - Envío a domicilio
  - Retiro en local
  - Envío por Correo Argentino
  - Cadetería propia
  - Mensajería
  - Moto
  - Envío tercerizado
- El dato se guarda en la columna `delivery_method` de la tabla `orders` en Supabase como texto libre.
- Se incluye en el email de notificación al administrador, en el email de confirmación al comprador y en el panel de pedidos del admin.

## Estructura del proyecto

```text
techstore/
├── src/
│   ├── app/                          # App Router de Next.js
│   │   ├── layout.tsx                # Layout raíz: envuelve la app con AuthProvider y CartProvider
│   │   ├── page.tsx                  # Página de inicio
│   │   ├── globals.css               # Estilos globales (Tailwind)
│   │   ├── admin/
│   │   │   └── page.tsx              # Panel administrativo (rol admin)
│   │   ├── api/
│   │   │   ├── mercadopago/
│   │   │   │   ├── route.ts          # API Route: crear preferencia de pago
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts      # Webhook: actualizar estado de orden
│   │   │   └── products/
│   │   │       ├── route.ts          # API Route: listar (GET) y crear (POST) productos
│   │   │       └── [id]/route.ts     # API Route: actualizar (PUT) y eliminar (DELETE) productos
│   │   ├── carrito/
│   │   │   └── page.tsx              # Carrito de compras
│   │   ├── catalogo/
│   │   │   └── page.tsx              # Catálogo con búsqueda y filtros
│   │   ├── checkout/
│   │   │   └── page.tsx              # Checkout con formulario de envío
│   │   ├── login/
│   │   │   └── page.tsx              # Login y registro
│   │   ├── pago/
│   │   │   ├── exitoso/page.tsx      # Resultado: pago aprobado
│   │   │   ├── rechazado/page.tsx    # Resultado: pago rechazado
│   │   │   └── pendiente/page.tsx    # Resultado: pago pendiente
│   │   ├── perfil/
│   │   │   └── page.tsx              # Perfil de usuario e historial de compras
│   │   └── producto/
│   │       └── [slug]/page.tsx       # Detalle de producto (ruta dinámica)
│   ├── components/
│   │   ├── admin-panel.tsx           # Panel administrativo con CRUD de productos
│   │   ├── navbar.tsx                # Barra de navegación con carrito y auth
│   │   └── product-card.tsx          # Tarjeta de producto reutilizable
│   ├── context/
│   │   ├── auth-context.tsx          # AuthProvider: sesión, login, register, logout, órdenes
│   │   └── cart-context.tsx          # CartProvider: items, subtotal, addItem, updateQuantity, removeItem
│   ├── lib/
│   │   ├── admin.ts                  # Configuración centralizada del email admin y isAdminUser()
│   │   ├── email.ts                  # Envío de emails con Resend (admin + comprador)
│   │   ├── mock-data.ts              # Catálogo de productos y categorías mockeados (fallback)
│   │   ├── orders.ts                 # Capa de órdenes (cliente): usa Supabase o fallback local
│   │   ├── orders-server.ts          # Capa de órdenes (servidor): usa Supabase admin client
│   │   ├── products.ts               # Capa de productos: getAllProducts, createProduct, updateProduct, deleteProduct, isAdmin
│   │   ├── supabase.ts               # Cliente Supabase (navegador) con variables públicas
│   │   └── supabase-server.ts        # Cliente Supabase admin (servidor) con service role key
│   └── types/
│       └── product.ts                # Tipos compartidos: Product, CartItem, Address, Order, OrderStatus
├── supabase/
│   └── schema.sql                    # Esquema SQL: tablas, triggers, funciones y políticas RLS
├── public/                           # Assets estáticos (SVGs)
├── next.config.ts                    # Configuración de Next.js
├── tsconfig.json                     # Configuración de TypeScript (path alias @/* → ./src/*)
├── eslint.config.mjs                 # Configuración de ESLint
├── postcss.config.mjs                # Configuración de PostCSS (Tailwind)
└── package.json                      # Dependencias y scripts
```

### Rutas de la aplicación

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Página | Inicio con productos destacados y categorías |
| `/catalogo` | Página | Catálogo con búsqueda y filtros por categoría |
| `/producto/[slug]` | Página dinámica | Detalle de producto individual |
| `/carrito` | Página | Carrito de compras |
| `/checkout` | Página | Formulario de checkout y resumen de compra |
| `/login` | Página | Login y registro de usuarios |
| `/perfil` | Página | Perfil de usuario e historial de compras (requiere auth) |
| `/admin` | Página | Panel administrativo (requiere rol admin) |
| `/pago/exitoso` | Página | Resultado de pago aprobado |
| `/pago/rechazado` | Página | Resultado de pago rechazado |
| `/pago/pendiente` | Página | Resultado de pago pendiente |
| `/api/products` | API Route (GET) | Lista todos los productos (público) |
| `/api/products` | API Route (POST) | Crea un producto (admin) |
| `/api/products/[id]` | API Route (PUT) | Actualiza un producto (admin) |
| `/api/products/[id]` | API Route (DELETE) | Elimina un producto (admin) |
| `/api/mercadopago` | API Route (POST) | Crea preferencia de pago y orden pendiente |
| `/api/mercadopago/webhook` | API Route (POST) | Webhook de Mercado Pago para actualizar órdenes |

## Modelo de datos

Los tipos compartidos se definen en `src/types/product.ts`:

```typescript
type Category = {
  id: string;
  name: string;
  description: string;
};

type Product = {
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

type CartItem = {
  product: Product;
  quantity: number;
};

type Address = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

/**
 * Delivery method is a free-form string so the business can define
 * its own options (e.g. "Retiro en local", "Envío a domicilio",
 * "Envío por Correo Argentino", "Cadetería propia", etc.).
 */
export type DeliveryMethod = string;

export type OrderStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Order = {
  id: string;
  userId?: string;
  customerName: string;
  email: string;
  address: Address;
  deliveryMethod?: DeliveryMethod;
  adminNotifiedAt?: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentId?: string;
};
```

El contexto de autenticación usa internamente:

```typescript
type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};
```

## Roles

El sistema define dos roles de usuario almacenados en la columna `role` de la tabla `profiles`:

| Rol | Descripción | Permisos |
|---|---|---|
| `user` | Cliente estándar (rol por defecto al registrarse) | Navegar el catálogo, agregar productos al carrito, realizar compras, ver su propio perfil, ver su historial de compras, cerrar sesión. |
| `admin` | Administrador (asignado manualmente en la base de datos) | Todos los permisos de `user` más: acceder al panel administrativo `/admin`, ver métricas básicas (productos, ventas, categorías), crear/editar/eliminar productos, ver todas las órdenes mediante `getAllOrders()`. |

### Cómo asignar el rol admin

El rol `admin` no se puede asignar desde la interfaz. Para otorgarlo:

1. Acceder al dashboard de Supabase.
2. Ir a **Table Editor → profiles**.
3. Buscar el usuario por su email o ID.
4. Cambiar el valor de la columna `role` de `user` a `admin`.

También se puede ejecutar SQL:

```sql
update public.profiles
set role = 'admin'
where email = '[email-del-administrador]';
```

> **Nota**: la verificación de rol se realiza en dos niveles. Client-side mediante `isAdminUser()` en `src/lib/admin.ts` y server-side mediante `isAdmin()` en `src/lib/products.ts` y las API Routes de productos. Existe un fallback de desarrollo basado en `ADMIN_EMAIL` que debe reemplazarse o eliminarse en producción (ver `GUIA_TRANSFERENCIA.md`).

## Flujos de la aplicación

### Flujo de compra

1. El usuario navega el **catálogo** o la página de **inicio**.
2. Entra al **detalle de un producto**, selecciona cantidad y agrega al carrito.
3. Revisa el **carrito** (puede ajustar cantidades o eliminar items).
4. Avanza al **checkout** y completa el formulario de envío, seleccionando el método de entrega.
5. Al confirmar la compra:
   - Se envían los datos a `POST /api/mercadopago`.
   - La API crea una **orden pendiente** en Supabase (tabla `orders` + `order_items`).
   - Se genera una **preferencia de pago** en Mercado Pago con `external_reference` = ID de orden.
   - El usuario es redirigido al checkout de Mercado Pago.
6. Tras completar el pago, Mercado Pago redirige al usuario a `/pago/exitoso`, `/pago/rechazado` o `/pago/pendiente`.
7. El **webhook** de Mercado Pago consulta el estado real del pago y actualiza la orden en Supabase.
8. Si el pago es aprobado, el sistema envía:
   - Un email al **administrador** con todos los datos del pedido.
   - Un email al **comprador** con la confirmación de la compra.
9. El usuario puede ver su **historial de compras** en `/perfil`.

### Flujo de autenticación

1. El usuario se **registra** en `/login` (pestaña "Crear cuenta").
   - Si la confirmación por email está habilitada (default de Supabase), recibe un email de confirmación y debe verificarlo antes de iniciar sesión.
   - Si la confirmación está deshabilitada, queda logueado automáticamente.
   - El trigger `handle_new_user()` crea automáticamente el perfil en la tabla `profiles`.
2. El usuario **inicia sesión** con email y contraseña.
   - Se obtiene el perfil desde Supabase para determinar el rol (`user` o `admin`).
   - Se cargan las órdenes asociadas al usuario.
3. La sesión se **restaura automáticamente** al recargar la página.
4. El usuario puede **cerrar sesión** desde la navbar.

### Flujo de administración

1. Un usuario con rol `admin` accede a `/admin`.
2. Ve métricas básicas (productos, ventas, categorías) y el panel administrativo con productos agrupados por categoría.
3. Puede **crear**, **editar** y **eliminar** productos mediante formularios que consumen las API Routes `/api/products`.
4. Puede **ver todos los pedidos** con datos del comprador, método de entrega, dirección, productos y total.
5. Las operaciones se persisten en Supabase (tabla `products`) con autorización server-side.

## Base de datos y Supabase

El esquema SQL está en `supabase/schema.sql` e incluye:

### Tabla `profiles`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Referencia a `auth.users(id)` |
| `email` | text | Email único del usuario |
| `name` | text | Nombre del usuario |
| `role` | text | `user` o `admin` (default: `user`) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

### Tabla `products`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Auto-generado |
| `name` | text | Nombre del producto |
| `slug` | text | Slug único para URLs |
| `description` | text | Descripción del producto |
| `price` | numeric(12,2) | Precio (>= 0) |
| `stock` | integer | Stock disponible (>= 0) |
| `image` | text | URL de la imagen |
| `category` | text | Categoría del producto |
| `rating` | numeric(2,1) | Rating (default: 0) |
| `featured` | boolean | Producto destacado (default: false) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

### Tabla `orders`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | text (PK) | ID generado (`ORD-{timestamp}-{random}`) |
| `user_id` | uuid | Referencia a `auth.users(id)` (nullable) |
| `customer_name` | text | Nombre del comprador |
| `email` | text | Email del comprador |
| `address` | jsonb | Dirección de envío completa |
| `delivery_method` | text | Método de entrega seleccionado (texto libre) |
| `admin_notified_at` | timestamptz | Fecha/hora de envío de email al admin (para deduplicación) |
| `total` | numeric(12,2) | Total de la orden |
| `status` | text | `pending`, `approved`, `rejected`, `cancelled` |
| `payment_id` | text | ID de pago de Mercado Pago |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

### Tabla `order_items`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Auto-generado |
| `order_id` | text | Referencia a `orders(id)` |
| `product_id` | text | ID del producto |
| `product_name` | text | Nombre del producto al momento de la compra |
| `quantity` | integer | Cantidad (must be > 0) |
| `unit_price` | numeric(12,2) | Precio unitario al momento de la compra |
| `created_at` | timestamptz | Fecha de creación |

### Funciones y triggers

- **`handle_new_user()`**: Trigger `after insert on auth.users` que crea automáticamente un perfil en `profiles` al registrar un usuario.
- **`is_admin()`**: Función `security definer` que verifica si el usuario actual tiene rol `admin`.
- **`set_updated_at()`**: Trigger `before update` que actualiza `updated_at` automáticamente en `profiles`, `orders` y `products`.

### Políticas RLS

- **Profiles**: el propietario puede ver, crear y actualizar su perfil. Los admins pueden ver cualquier perfil.
- **Products**: cualquiera puede ver productos (SELECT público). Solo los admins pueden insertar, actualizar y eliminar.
- **Orders**: los usuarios pueden ver, crear y actualizar sus propias órdenes. Los admins pueden gestionar todas.
- **Order items**: los usuarios pueden ver e insertar items de sus propias órdenes. Los admins tienen acceso total.

## Arquitectura de Supabase

El proyecto utiliza **dos clientes Supabase** con propósitos y niveles de acceso distintos:

### `src/lib/supabase.ts` — Cliente del navegador

| Aspecto | Detalle |
|---|---|
| **Ámbito** | Cliente (navegador) |
| **Variables** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **RLS** | Respeta Row Level Security |
| **Inicialización** | Se crea solo si ambas variables están presentes; si faltan, exporta `null` |
| **Uso** | `AuthProvider` (login, registro, sesión), `orders.ts` (consultar órdenes del usuario), `products.ts` (consultar productos), sincronización de perfiles |

Este cliente opera con la `anon key`, por lo que todas las operaciones pasan por las políticas RLS definidas en `supabase/schema.sql`. Un usuario solo puede acceder a sus propios perfiles y órdenes.

### `src/lib/supabase-server.ts` — Cliente servidor (admin)

| Aspecto | Detalle |
|---|---|
| **Ámbito** | Servidor (API Routes, código servidor) |
| **Variables** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| **RLS** | Omite Row Level Security |
| **Inicialización** | Se crea solo si ambas variables están presentes; si faltan, exporta `null` |
| **Configuración** | `persistSession: false`, `autoRefreshToken: false` |
| **Uso** | `orders-server.ts` (crear órdenes pendientes, actualizar estado), `products.ts` (crear, actualizar, eliminar productos), webhook de Mercado Pago |

Este cliente usa la `service role key`, que **omite todas las políticas RLS**. Por eso **solo debe utilizarse en código servidor** (API Routes, Server Components, Server Actions). Nunca debe importarse en componentes del cliente ni exponerse al navegador.

### Cuándo usar cada cliente

| Operación | Cliente | Archivo |
|---|---|---|
| Login / registro / logout | Navegador | `auth-context.tsx` |
| Restaurar sesión | Navegador | `auth-context.tsx` |
| Sincronizar perfil | Navegador | `auth-context.tsx` |
| Obtener órdenes del usuario | Navegador | `orders.ts` |
| Listar productos (público) | Navegador | `products.ts` |
| Crear orden pendiente | Servidor (admin) | `orders-server.ts` |
| Actualizar estado de orden | Servidor (admin) | `orders-server.ts` |
| Guardar payment_id | Servidor (admin) | `orders-server.ts` |
| Crear/actualizar/eliminar producto | Servidor (admin) | `products.ts` |
| Webhook de Mercado Pago | Servidor (admin) | `webhook/route.ts` |

## Variables de entorno

El proyecto requiere las siguientes variables de entorno. El cliente debe configurarlas con los valores de **sus propias cuentas**.

| Variable | Ámbito | Para qué sirve | Dónde obtenerla |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase del cliente | Supabase → *Project Settings → API → Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Clave pública (anon) de Supabase para el navegador | Supabase → *Project Settings → API → anon public* |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Secreta | Clave de servicio de Supabase (servidor, omite RLS) | Supabase → *Project Settings → API → service_role* |
| `MERCADOPAGO_ACCESS_TOKEN` | 🔒 Secreta | Token de acceso de Mercado Pago para procesar pagos | Mercado Pago → *Tu negocio → Configuración → Credenciales* |
| `NEXT_PUBLIC_SITE_URL` | Pública | URL pública del sitio para construir URLs de retorno | URL del deploy en Vercel |
| `RESEND_API_KEY` | 🔒 Secreta | API key de Resend para enviar notificaciones de pedidos al administrador | Resend → *API Keys* (https://resend.com/api-keys) |
| `EMAIL_ADMIN_ADDRESS` | 🔒 Secreta | Email del administrador que recibe las notificaciones de pedidos aprobados | Email del administrador del negocio |
| `EMAIL_FROM_ADDRESS` | 🔒 Secreta | Email remitente verificado en Resend (opcional, default: `onboarding@resend.dev`) | Resend → *Domains* o *Emails* verificados |

Estas variables deben definirse en un archivo `.env.local` en la raíz del proyecto (desarrollo) o en *Project Settings → Environment Variables* de Vercel (producción).

> ⚠️ **Seguridad**: `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` y `RESEND_API_KEY` son secretos críticos. Nunca subirlos al repositorio Git ni enviarlos por canales inseguros.

## Instalación y ejecución local

### 1. Requisitos previos

- Node.js 20 o superior
- npm

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto con los valores del proyecto Supabase y cuenta de Mercado Pago del cliente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
MERCADOPAGO_ACCESS_TOKEN=[access-token]
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email / Resend (notificaciones al administrador)
RESEND_API_KEY=[resend-api-key]
EMAIL_ADMIN_ADDRESS=[email-del-administrador]
EMAIL_FROM_ADDRESS=[email-remitente-verificado]
```

### 4. Inicializar la base de datos

1. Abrir el **SQL Editor** del proyecto Supabase.
2. Copiar y pegar el contenido de `supabase/schema.sql`.
3. Ejecutar el script.
4. Verificar que las tablas `profiles`, `products`, `orders`, `order_items` existan y que RLS esté habilitado.

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### 6. Build de producción

```bash
npm run build
npm run start
```

### 7. Linting

```bash
npm run lint
```

## Configuración externa

### Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Obtener `URL`, `anon key` y `service role key` desde *Project Settings → API*.
3. Configurar las variables de entorno en `.env.local`.
4. Ejecutar el SQL de `supabase/schema.sql` en el *SQL Editor* del dashboard.
5. Verificar que RLS esté habilitado y las políticas estén activas.
6. Opcional: deshabilitar la confirmación por email en *Authentication → Settings* para desarrollo.
7. En **Authentication → URL Configuration**, configurar la **Site URL** y la **Redirect URL** a `https://[dominio-del-cliente]/login`.

### Mercado Pago

1. Crear una cuenta en [mercadopago.com](https://www.mercadopago.com).
2. Obtener el `access_token` desde *Tu negocio → Configuración → Credenciales*.
3. Configurar `MERCADOPAGO_ACCESS_TOKEN` en `.env.local`.
4. Configurar la URL del webhook: `https://[dominio-del-cliente]/api/mercadopago/webhook`.
5. Suscribirse al evento `payment`.
6. Usar credenciales de prueba (sandbox, prefijo `TEST-`) durante el desarrollo y credenciales de producción para el deploy final.

### Resend (emails transaccionales)

1. Crear una cuenta en [resend.com](https://resend.com).
2. Generar una **API Key** desde *Dashboard → API Keys → Create API Key*.
3. Verificar el dominio del cliente en Resend (recomendado para producción) o usar `onboarding@resend.dev` (solo testing).
4. Configurar `RESEND_API_KEY`, `EMAIL_ADMIN_ADDRESS` y `EMAIL_FROM_ADDRESS` en `.env.local`.

> **Dominio verificado**: para producción, Resend requiere un dominio verificado. El cliente debe agregar los registros DNS que Resend indique. Si usa `onboarding@resend.dev`, los emails pueden caer a spam o tener limitaciones.

### Dominio y hosting

- Configurar `NEXT_PUBLIC_SITE_URL` con la URL pública del dominio.
- Mercado Pago requiere un dominio accesible desde Internet para callbacks y webhooks.
- Recomendado para deploy: [Vercel](https://vercel.com) (integración nativa con Next.js).

## Seguridad

### Medidas implementadas

- Los secretos se leen desde variables de entorno, no están hardcodeados.
- Autenticación delegada a Supabase Auth.
- RLS habilitado en todas las tablas con políticas por propietario.
- Cliente admin (service role) usado solo en el servidor (API Routes).
- Autorización de admin verificada server-side en las API Routes de productos.
- Mensajes de error de auth traducidos para no exponer detalles internos.
- Protección contra envío duplicado de emails de notificación mediante `admin_notified_at`.

### Limitaciones actuales

- El webhook de Mercado Pago **no valida la firma** ni el origen de la notificación.
- El carrito se persiste en `localStorage` (no en servidor).
- Las rutas protegidas (`/perfil`, `/admin`) no tienen middleware de servidor; la protección se basa en verificación client-side + autorización en las API Routes.
- Existe un fallback de desarrollo basado en `ADMIN_EMAIL` que debe eliminarse en producción.

### Recomendaciones para producción

- Implementar middleware de Next.js para proteger rutas en el servidor.
- Validar la firma del webhook de Mercado Pago.
- Eliminar el fallback por email (`ADMIN_EMAIL`) y depender únicamente de `profiles.role = 'admin'`.
- Revisar y testear todas las políticas RLS.
- Considerar rate limiting en las API Routes.

## Proceso de Deploy

### 1. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[usuario]/[repositorio].git
git push -u origin main
```

### 2. Conectar GitHub con Vercel

1. Ir a [vercel.com](https://vercel.com) e iniciar sesión.
2. Click en **Add New → Project**.
3. Importar el repositorio desde GitHub.
4. Vercel detecta automáticamente Next.js; no requiere configuración adicional.

### 3. Configurar variables de entorno en Vercel

En **Settings → Environment Variables** del proyecto en Vercel, agregar:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[proyecto].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase del cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase del cliente |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de Mercado Pago del cliente |
| `NEXT_PUBLIC_SITE_URL` | URL pública del deploy (ej. `https://[dominio-del-cliente]`) |
| `RESEND_API_KEY` | API key de Resend del cliente |
| `EMAIL_ADMIN_ADDRESS` | Email del administrador del negocio |
| `EMAIL_FROM_ADDRESS` | Email remitente verificado en Resend (opcional) |

### 4. Configurar dominio

- Vercel asigna automáticamente un dominio `*.vercel.app`.
- Para un dominio personalizado: **Settings → Domains → Add**.
- Actualizar `NEXT_PUBLIC_SITE_URL` con el dominio final.

### 5. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ejecutar `supabase/schema.sql` en el **SQL Editor**.
3. Verificar que RLS esté habilitado en `profiles`, `products`, `orders` y `order_items`.
4. Verificar que las políticas y triggers estén activos.
5. En **Authentication → URL Configuration**, configurar la URL del sitio y la redirect URL a `https://[dominio-del-cliente]/login`.

### 6. Configurar Mercado Pago

1. Crear una cuenta en [mercadopago.com](https://www.mercadopago.com).
2. Obtener el `access_token` desde **Tu negocio → Configuración → Credenciales**.
3. En producción usar credenciales reales (no sandbox).

### 7. Configurar Webhook

1. En el dashboard de Mercado Pago, ir a **Webhooks**.
2. Configurar la URL: `https://[dominio-del-cliente]/api/mercadopago/webhook`.
3. Suscribirse al evento `payment`.
4. Verificar que el webhook reciba notificaciones y actualice las órdenes.

### 8. Configurar Resend

1. Verificar el dominio del cliente en Resend (agregar registros DNS).
2. Configurar `EMAIL_FROM_ADDRESS` con un email del dominio verificado.

### 9. Verificar autenticación

- Registrar un usuario nuevo y confirmar el email.
- Iniciar sesión y verificar que el perfil se cargue correctamente.
- Asignar rol `admin` a un usuario y verificar el acceso a `/admin`.

### 10. Verificar flujo de compra

- Agregar productos al carrito.
- Completar el checkout y redirigir a Mercado Pago.
- Confirmar que la orden se cree en Supabase con estado `pending`.
- Completar el pago y verificar que el webhook actualice el estado a `approved`.
- Verificar que la orden aparezca en el historial de compras del perfil.
- Verificar que el administrador reciba el email de notificación.
- Verificar que el comprador reciba el email de confirmación.

### 11. Verificar panel administrativo

- Iniciar sesión con el usuario admin.
- Acceder a `/admin`.
- Crear un producto nuevo y verificar que aparezca en el catálogo.
- Editar un producto y verificar los cambios.
- Eliminar un producto y verificar que desaparezca.
- Ver la sección de pedidos y verificar que se muestre el método de entrega.

## Verificación y testing

### Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| Desarrollo | `npm run dev` | Servidor de desarrollo |
| Build | `npm run build` | Build de producción |
| Start | `npm run start` | Servidor de producción |
| Lint | `npm run lint` | Análisis de código con ESLint |

### Verificaciones realizadas

- Build de producción exitoso con Next.js.
- Rutas generadas y compiladas correctamente.
- Páginas y componentes con handlers y estilos implementados.
- CRUD de productos funcional contra Supabase.
- No se realizaron pruebas reales de pago ni integración con Supabase por falta de credenciales en el entorno de desarrollo.

## Pendientes

### Crítico

- [ ] Verificar el flujo completo de Mercado Pago end-to-end con credenciales reales.
- [ ] Validar la firma y el origen del webhook de Mercado Pago.
- [ ] Implementar middleware de Next.js para proteger rutas (`/perfil`, `/admin`) en el servidor.
- [ ] Eliminar el fallback por email (`ADMIN_EMAIL`) y depender únicamente de `profiles.role`.

### Importante

- [ ] Crear panel de órdenes en `/admin` para ver y gestionar todas las órdenes.
- [ ] Implementar gestión de stock: descontar inventario al confirmar una orden.
- [ ] Reemplazar los productos mockeados (`mock-data.ts`) por datos exclusivamente de Supabase.

### Opcional

- [ ] Mejorar la experiencia de búsqueda y filtros.
- [ ] Agregar tests automatizados.

## Roadmap

Mejoras futuras planificadas para el proyecto:

| Mejora | Descripción |
|---|---|
| **Cupones de descuento** | Sistema de códigos promocionales aplicables en el checkout |
| **Favoritos / Wishlist** | Permitir a los usuarios guardar productos favoritos |
| **Reviews y calificaciones** | Los usuarios podrán dejar reseñas en los productos |
| **Emails automáticos** | Confirmación de registro, confirmación de compra, actualización de estado de orden |
| **Dashboard de ventas** | Panel avanzado para admins con gráficos de ventas, métricas y reportes |
| **SEO** | Optimización para motores de búsqueda: metadata, sitemap, robots.txt |
| **Inventario** | Gestión avanzada de stock con alertas de bajo inventario |
| **Facturación** | Generación de facturas PDF por compra |
| **Multiidioma** | Soporte para múltiples idiomas (español, inglés, portugués) |
| **Pasarelas adicionales** | Integrar otros métodos de pago (Stripe, PayPal) |
| **Búsqueda avanzada** | Búsqueda por precio, rating, filtros combinados |
| **Notificaciones push** | Avisar al usuario sobre el estado de su orden |

## Historial de cambios

- **2026-07-30**: README actualizado con flujo de notificaciones por email (Resend) tras pago aprobado, selector de método de entrega en checkout, columna `delivery_method` en tabla `orders`, panel de pedidos en `/admin` y variables de entorno `RESEND_API_KEY`, `EMAIL_ADMIN_ADDRESS`, `EMAIL_FROM_ADDRESS`.
- **2026-07-30**: README actualizado al estado real del código: CRUD de productos implementado, tabla `products` documentada, API Routes de productos, `admin-panel.tsx`, `admin.ts` y `products.ts` agregados a la estructura. Secciones de Roles, Seguridad y Pendientes corregidas. URLs y credenciales reemplazadas por placeholders profesionales.
- **2026-07-29**: README actualizado con secciones de Arquitectura General, Arquitectura de Supabase, Roles, Proceso de Deploy, Roadmap y pendientes corregidos según el estado real del proyecto.
- **2026-07-29**: README actualizado con documentación completa: estructura, modelo de datos, flujos, esquema SQL, variables de entorno y requerimientos.
- **2026-07-29**: README anterior actualizado para reflejar la arquitectura de órdenes preparada para Supabase, el flujo de Mercado Pago y los pasos pendientes para producción.