# TechStore

TechStore es una tienda online de tecnología desarrollada con Next.js, React, Supabase y Mercado Pago. Ofrece una experiencia de e-commerce completa con catálogo de productos, carrito de compras, checkout con pagos integrados, autenticación de usuarios y un panel administrativo.

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
- [Entregables al cliente](#entregables-al-cliente)
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
    │                   (orders, order_items, profiles)
    │
    └──────────────► Mercado Pago
                         │
                         ▼
                    Webhook (/api/mercadopago/webhook)
                         │
                         ▼
                Actualiza Orders en Supabase
```

### Componentes principales

- **Cliente (Navegador)**: ejecuta la app de React, maneja el carrito en `localStorage` y la sesión con Supabase Auth.
- **Vercel (Next.js)**: hospeda la aplicación y las API Routes. Sirve páginas SSR/estáticas y ejecuta código servidor.
- **Supabase Auth**: gestiona registro, login, confirmación por email y persistencia de sesión.
- **Supabase Database (PostgreSQL)**: almacena perfiles, órdenes e items de órdenes con RLS habilitado.
- **Mercado Pago**: procesa el pago y envía notificaciones al webhook para actualizar el estado de las órdenes.

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
- **Gestión de productos**: listado con botones de editar y eliminar (visuales, sin CRUD real aún).
- **Acceso controlado en el cliente** verificando el rol del usuario autenticado.

### Pagos (Mercado Pago)

- **API Route** `POST /api/mercadopago`:
  - Recibe los datos del checkout.
  - Crea una orden pendiente en Supabase (vía admin client).
  - Genera una preferencia de pago en Mercado Pago con `external_reference` = ID de orden.
  - Configura `back_urls` para redirección según el resultado del pago.
  - Devuelve el `preference_id` para redirigir al usuario al checkout de Mercado Pago.
- **Webhook** `POST /api/mercadopago/webhook`:
  - Recibe notificaciones de Mercado Pago.
  - Consulta el estado real del pago usando el SDK.
  - Actualiza el estado de la orden correspondiente (`approved`, `rejected`, `pending`, `cancelled`).

## Estructura del proyecto

```text
tiendavs-app/
├── src/
│   ├── app/                          # App Router de Next.js
│   │   ├── layout.tsx                # Layout raíz: envuelve la app con AuthProvider y CartProvider
│   │   ├── page.tsx                  # Página de inicio
│   │   ├── globals.css               # Estilos globales (Tailwind)
│   │   ├── admin/
│   │   │   └── page.tsx              # Panel administrativo (rol admin)
│   │   ├── api/
│   │   │   └── mercadopago/
│   │   │       ├── route.ts          # API Route: crear preferencia de pago
│   │   │       └── webhook/
│   │   │           └── route.ts      # Webhook: actualizar estado de orden
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
│   │   ├── navbar.tsx                # Barra de navegación con carrito y auth
│   │   └── product-card.tsx          # Tarjeta de producto reutilizable
│   ├── context/
│   │   ├── auth-context.tsx          # AuthProvider: sesión, login, register, logout, órdenes
│   │   └── cart-context.tsx          # CartProvider: items, subtotal, addItem, updateQuantity, removeItem
│   ├── lib/
│   │   ├── mock-data.ts              # Catálogo de productos y categorías mockeados
│   │   ├── orders.ts                 # Capa de órdenes (cliente): usa Supabase o fallback local
│   │   ├── orders-server.ts          # Capa de órdenes (servidor): usa Supabase admin client
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

type OrderStatus = "pending" | "approved" | "rejected" | "cancelled";

type Order = {
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
| `admin` | Administrador (asignado manualmente en la base de datos) | Todos los permisos de `user` más: acceder al panel administrativo `/admin`, ver métricas básicas (productos, ventas, categorías), ver listado de productos con opciones de editar/eliminar (visuales), ver todas las órdenes mediante `getAllOrders()`. |

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
where email = 'admin@tiendavs.com';
```

> **Nota**: la verificación de rol se realiza actualmente en el cliente (client-side). No hay middleware de servidor que proteja la ruta `/admin`.

## Flujos de la aplicación

### Flujo de compra

1. El usuario navega el **catálogo** o la página de **inicio**.
2. Entra al **detalle de un producto**, selecciona cantidad y agrega al carrito.
3. Revisa el **carrito** (puede ajustar cantidades o eliminar items).
4. Avanza al **checkout** y completa el formulario de envío.
5. Al confirmar la compra:
   - Se envían los datos a `POST /api/mercadopago`.
   - La API crea una **orden pendiente** en Supabase (tabla `orders` + `order_items`).
   - Se genera una **preferencia de pago** en Mercado Pago con `external_reference` = ID de orden.
   - El usuario es redirigido al checkout de Mercado Pago.
6. Tras completar el pago, Mercado Pago redirige al usuario a `/pago/exitoso`, `/pago/rechazado` o `/pago/pendiente`.
7. El **webhook** de Mercado Pago consulta el estado real del pago y actualiza la orden en Supabase.
8. El usuario puede ver su **historial de compras** en `/perfil`.

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
2. Ve métricas básicas (productos, ventas, categorías) y un listado de productos.
3. Los botones de editar/eliminar están presentes pero no implementan CRUD real.

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

### Tabla `orders`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | text (PK) | ID generado (`ORD-{timestamp}-{random}`) |
| `user_id` | uuid | Referencia a `auth.users(id)` (nullable) |
| `customer_name` | text | Nombre del comprador |
| `email` | text | Email del comprador |
| `address` | jsonb | Dirección de envío completa |
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
| `quantity` | integer | Cantidad (must be > 0) |
| `unit_price` | numeric(12,2) | Precio unitario al momento de la compra |
| `created_at` | timestamptz | Fecha de creación |

### Funciones y triggers

- **`handle_new_user()`**: Trigger `after insert on auth.users` que crea automáticamente un perfil en `profiles` al registrar un usuario.
- **`is_admin()`**: Función `security definer` que verifica si el usuario actual tiene rol `admin`.
- **`set_updated_at()`**: Trigger `before update` que actualiza `updated_at` automáticamente en `profiles` y `orders`.

### Políticas RLS

- **Profiles**: el propietario puede ver, crear y actualizar su perfil. Los admins pueden ver cualquier perfil.
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
| **Uso** | `AuthProvider` (login, registro, sesión), `orders.ts` (consultar órdenes del usuario), sincronización de perfiles |

Este cliente opera con la `anon key`, por lo que todas las operaciones pasan por las políticas RLS definidas en `supabase/schema.sql`. Un usuario solo puede acceder a sus propios perfiles y órdenes.

### `src/lib/supabase-server.ts` — Cliente servidor (admin)

| Aspecto | Detalle |
|---|---|
| **Ámbito** | Servidor (API Routes, código servidor) |
| **Variables** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| **RLS** | Omite Row Level Security |
| **Inicialización** | Se crea solo si ambas variables están presentes; si faltan, exporta `null` |
| **Configuración** | `persistSession: false`, `autoRefreshToken: false` |
| **Uso** | `orders-server.ts` (crear órdenes pendientes, actualizar estado de órdenes), webhook de Mercado Pago |

Este cliente usa la `service role key`, que **omite todas las políticas RLS**. Por eso **solo debe utilizarse en código servidor** (API Routes, Server Components, Server Actions). Nunca debe importarse en componentes del cliente ni exponerse al navegador.

### Cuándo usar cada cliente

| Operación | Cliente | Archivo |
|---|---|---|
| Login / registro / logout | Navegador | `auth-context.tsx` |
| Restaurar sesión | Navegador | `auth-context.tsx` |
| Sincronizar perfil | Navegador | `auth-context.tsx` |
| Obtener órdenes del usuario | Navegador | `orders.ts` |
| Crear orden pendiente | Servidor (admin) | `orders-server.ts` |
| Actualizar estado de orden | Servidor (admin) | `orders-server.ts` |
| Guardar payment_id | Servidor (admin) | `orders-server.ts` |
| Webhook de Mercado Pago | Servidor (admin) | `webhook/route.ts` |

## Variables de entorno

El proyecto requiere las siguientes variables de entorno:

| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Anon key de Supabase (cliente navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta | Service role key de Supabase (servidor, omite RLS) |
| `MERCADOPAGO_ACCESS_TOKEN` | Secreta | Access token de Mercado Pago |
| `NEXT_PUBLIC_SITE_URL` | Pública | URL del sitio para construir URLs de retorno |

Estas variables deben definirse en un archivo `.env.local` en la raíz del proyecto.

## Instalación y ejecución local

### 1. Requisitos previos

- Node.js 20 o superior
- npm

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
MERCADOPAGO_ACCESS_TOKEN=tu-token-de-mercadopago
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### 5. Build de producción

```bash
npm run build
npm run start
```

### 6. Linting

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

### Mercado Pago

1. Crear una cuenta en [mercadopago.com](https://www.mercadopago.com).
2. Obtener el `access_token` desde *Tu negocio → Configuración → Credenciales*.
3. Configurar `MERCADOPAGO_ACCESS_TOKEN` en `.env.local`.
4. Configurar la URL del webhook: `https://tu-dominio.com/api/mercadopago/webhook`.
5. Usar credenciales de prueba (sandbox) durante el desarrollo.

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
- Mensajes de error de auth traducidos para no exponer detalles internos.

### Limitaciones actuales

- La protección del panel administrativo es **client-side** (visual, no autorización de servidor).
- El webhook de Mercado Pago **no valida la firma** ni el origen de la notificación.
- El carrito se persiste en `localStorage` (no en servidor).
- Las rutas protegidas (`/perfil`, `/admin`) no tienen middleware de servidor.

### Recomendaciones para producción

- Implementar middleware de Next.js para proteger rutas en el servidor.
- Validar la firma del webhook de Mercado Pago.
- Mover la lógica de autorización de admin al servidor.
- Revisar y testear todas las políticas RLS.
- Considerar rate limiting en las API Routes.

## Proceso de Deploy

### 1. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/usuario/tiendavs-app.git
git push -u origin main
```

### 2. Conectar GitHub con Vercel

1. Ir a [vercel.com](https://vercel.com) e iniciar sesión.
2. Click en **Add New → Project**.
3. Importar el repositorio `tiendavs-app` desde GitHub.
4. Vercel detecta automáticamente Next.js; no requiere configuración adicional.

### 3. Configurar variables de entorno en Vercel

En **Settings → Environment Variables** del proyecto en Vercel, agregar:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de Mercado Pago |
| `NEXT_PUBLIC_SITE_URL` | URL pública del deploy (ej. `https://tiendavs.vercel.app`) |

### 4. Configurar dominio

- Vercel asigna automáticamente un dominio `*.vercel.app`.
- Para un dominio personalizado: **Settings → Domains → Add**.
- Actualizar `NEXT_PUBLIC_SITE_URL` con el dominio final.

### 5. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ejecutar `supabase/schema.sql` en el **SQL Editor**.
3. Verificar que RLS esté habilitado en `profiles`, `orders` y `order_items`.
4. Verificar que las políticas y triggers estén activos.
5. En **Authentication → URL Configuration**, configurar la URL del sitio y la redirect URL a `https://tu-dominio.com/login`.

### 6. Configurar Mercado Pago

1. Crear una cuenta en [mercadopago.com](https://www.mercadopago.com).
2. Obtener el `access_token` desde **Tu negocio → Configuración → Credenciales**.
3. En producción usar credenciales reales (no sandbox).

### 7. Configurar Webhook

1. En el dashboard de Mercado Pago, ir a **Webhooks**.
2. Configurar la URL: `https://tu-dominio.com/api/mercadopago/webhook`.
3. Suscribirse al evento `payment`.
4. Verificar que el webhook reciba notificaciones y actualice las órdenes.

### 8. Verificar autenticación

- Registrar un usuario nuevo y confirmar el email.
- Iniciar sesión y verificar que el perfil se cargue correctamente.
- Asignar rol `admin` a un usuario y verificar el acceso a `/admin`.

### 9. Verificar flujo de compra

- Agregar productos al carrito.
- Completar el checkout y redirigir a Mercado Pago.
- Confirmar que la orden se cree en Supabase con estado `pending`.
- Completar el pago y verificar que el webhook actualice el estado a `approved`.
- Verificar que la orden aparezca en el historial de compras del perfil.

## Entregables al cliente

Al finalizar el proyecto, se entregan los siguientes elementos:

| Entregable | Descripción |
|---|---|
| **Código fuente** | Repositorio de GitHub con todo el código del proyecto |
| **Proyecto Supabase** | Proyecto creado en Supabase con URL, anon key y service role key |
| **Base de datos** | Esquema SQL ejecutado (`supabase/schema.sql`): tablas `profiles`, `orders`, `order_items` con triggers, funciones y políticas RLS |
| **Proyecto Mercado Pago** | Cuenta configurada con access token y webhook registrado |
| **Variables de entorno** | Documentación de las 5 variables necesarias con sus valores reales |
| **Dominio** | Dominio configurado en Vercel (si corresponde) |
| **Proyecto desplegado en Vercel** | URL pública de la aplicación funcionando en producción |

### Credenciales a entregar

- URL del proyecto Supabase + anon key + service role key
- Access token de Mercado Pago
- URL del deploy en Vercel
- Credenciales de usuario admin (email + contraseña)

> **Importante**: las service role key y el access token de Mercado Pago son secretos. Entregarlos por un canal seguro y no incluirlos en el repositorio.

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
- No se realizaron pruebas reales de pago ni integración con Supabase por falta de credenciales en el entorno de desarrollo.

## Pendientes

### Crítico

- [ ] Verificar el flujo completo de Mercado Pago end-to-end con credenciales reales.
- [ ] Validar la firma y el origen del webhook de Mercado Pago.
- [ ] Implementar middleware de Next.js para proteger rutas (`/perfil`, `/admin`) en el servidor.

### Importante

- [ ] Implementar CRUD real de productos en el panel administrativo (crear, editar, eliminar).
- [ ] Crear panel de órdenes en `/admin` para ver y gestionar todas las órdenes.
- [ ] Implementar gestión de stock: descontar inventario al confirmar una orden.
- [ ] Reemplazar los productos mockeados (`mock-data.ts`) por una tabla `products` en Supabase.

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

- **2026-07-29**: README actualizado con secciones de Arquitectura General, Arquitectura de Supabase, Roles, Proceso de Deploy, Entregables al cliente, Roadmap y pendientes corregidos según el estado real del proyecto.
- **2026-07-29**: README actualizado con documentación completa: estructura, modelo de datos, flujos, esquema SQL, variables de entorno y requerimientos.
- **2026-07-29**: README anterior actualizado para reflejar la arquitectura de órdenes preparada para Supabase, el flujo de Mercado Pago y los pasos pendientes para producción.
