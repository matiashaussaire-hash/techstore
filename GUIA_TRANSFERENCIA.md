# Guía de Transferencia de Ownership — TechStore

Este documento explica paso a paso cómo transferirle al cliente (owner) la propiedad total de la página: cuentas, credenciales, URLs y control del usuario administrador.

---

## Tabla de contenidos

- [Resumen de lo que se transfiere](#resumen-de-lo-que-se-transfiere)
- [1. Cuentas y servicios externos](#1-cuentas-y-servicios-externos)
- [2. Credenciales y tokens (variables de entorno)](#2-credenciales-y-tokens-variables-de-entorno)
- [3. URLs importantes](#3-urls-importantes)
- [4. Cómo modificar el usuario admin](#4-cómo-modificar-el-usuario-admin)
- [5. Reemplazar `admin@gmail.com` por el Gmail real del owner](#5-reemplazar-admingmailcom-por-el-gmail-real-del-owner)
- [6. Checklist final de transferencia](#6-checklist-final-de-transferencia)

---

## Resumen de lo que se transfiere

| Recurso | Dónde se gestiona | Qué se le entrega al cliente |
|---|---|---|
| **Repositorio GitHub** | [github.com](https://github.com) | Propiedad/colaborador del repo `techstore` |
| **Proyecto Supabase** | [supabase.com](https://supabase.com) | Cuenta owner del proyecto + credenciales |
| **Cuenta Mercado Pago** | [mercadopago.com](https://www.mercadopago.com) | Cuenta con el access token |
| **Deploy en Vercel** | [vercel.com](https://vercel.com) | Proyecto + dominio + variables de entorno |
| **Usuario admin** | Supabase (tabla `profiles`) | Email + contraseña del admin |

---

## 1. Cuentas y servicios externos

El cliente necesita tener (o recibir) el control de estas cuatro cuentas:

### 1.1 GitHub
- **Repositorio**: `https://github.com/matiashaussaire-hash/techstore`
- **Acción**: transferir la propiedad del repo o invitar al cliente como colaborador con permisos de admin.
- **Comando para transferir ownership** (desde GitHub): Settings → Transfer → ingresar el usuario/organización del cliente.

### 1.2 Supabase
- **Proyecto**: `https://ettbuhgvbeihdcigfbcs.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/ettbuhgvbeihdcigfbcs`
- **Acción**: invitar al cliente como Owner del proyecto desde *Project Settings → Members → Add member* con rol **Owner**.
- **Por qué**: el cliente necesita acceso para gestionar usuarios, ver órdenes, ejecutar SQL y rotar credenciales.

### 1.3 Mercado Pago
- **Cuenta**: la cuenta vinculada al access token actual.
- **Panel de desarrolladores**: `https://www.mercadopago.com.ar/developers/panel/app`
- **Acción**: el cliente debe tener acceso a la cuenta de Mercado Pago (o crear la suya y generar un nuevo access token).
- **Importante**: si el cliente crea su propia cuenta, debe generar un **nuevo access token de producción** y actualizarlo en Vercel (ver sección 2).

### 1.4 Vercel
- **Proyecto**: `https://techstore-wine.vercel.app`
- **Dashboard**: `https://vercel.com/dashboard`
- **Acción**: transferir el proyecto al equipo/cuenta del cliente desde *Project Settings → General → Transfer Project*.
- **Por qué**: el cliente necesita controlar el deploy, el dominio y las variables de entorno.

---

## 2. Credenciales y tokens (variables de entorno)

La app usa **5 variables de entorno**. Estas son los "tokens" que el cliente necesita recibir y configurar.

### Variables actuales (desarrollo/producción)

| Variable | Ámbito | Valor actual | Dónde se usa |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | `https://ettbuhgvbeihdcigfbcs.supabase.co` | `src/lib/supabase.ts`, `src/lib/supabase-server.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | *(anon key de Supabase)* | `src/lib/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Secreta | *(service role key de Supabase)* | `src/lib/supabase-server.ts` |
| `MERCADOPAGO_ACCESS_TOKEN` | 🔒 Secreta | `TEST-5811972780768853-...` (sandbox) | `src/app/api/mercadopago/route.ts`, `src/app/api/mercadopago/webhook/route.ts` |
| `NEXT_PUBLIC_SITE_URL` | Pública | `https://techstore-wine.vercel.app` | `src/app/api/mercadopago/route.ts` |

### Dónde obtener cada credencial

| Credencial | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → *Project Settings → API → Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → *Project Settings → API → Project API keys → anon public* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → *Project Settings → API → Project API keys → service_role* ⚠️ **secreto** |
| `MERCADOPAGO_ACCESS_TOKEN` | Mercado Pago → *Tu negocio → Configuración → Credenciales* o *Developers → Panel → Tu aplicación* ⚠️ **secreto** |
| `NEXT_PUBLIC_SITE_URL` | URL pública del deploy en Vercel |

### Dónde se configuran

- **Local**: archivo `.env.local` en la raíz del proyecto.
- **Producción (Vercel)**: *Project Settings → Environment Variables*.

> ⚠️ **Seguridad**: la `SUPABASE_SERVICE_ROLE_KEY` y el `MERCADOPAGO_ACCESS_TOKEN` son **secretos críticos**. Entregarlos por canal seguro (no por chat/email público). **Nunca** subirlos al repositorio Git.

### Token de Mercado Pago: sandbox vs producción

El token actual (`TEST-...`) es de **sandbox** (pruebas). Para producción:

1. El cliente inicia sesión en su cuenta real de Mercado Pago.
2. Va a *Developers → Panel → Tu aplicación → Credenciales*.
3. Copia el **access token de producción** (no dice `TEST-`).
4. Lo reemplaza en Vercel → *Environment Variables* → `MERCADOPAGO_ACCESS_TOKEN`.
5. Hace **redeploy** del proyecto.

---

## 3. URLs importantes

Estas son las URLs que el cliente debe conocer y configurar:

| URL | Propósito |
|---|---|
| `https://techstore-wine.vercel.app` | URL pública del sitio (deploy) |
| `https://ettbuhgvbeihdcigfbcs.supabase.co` | URL del backend (Supabase) |
| `https://techstore-wine.vercel.app/api/mercadopago/webhook` | Webhook de Mercado Pago (notificaciones de pago) |
| `https://techstore-wine.vercel.app/pago/exitoso` | Redirección tras pago aprobado |
| `https://techstore-wine.vercel.app/pago/rechazado` | Redirección tras pago rechazado |
| `https://techstore-wine.vercel.app/pago/pendiente` | Redirección tras pago pendiente |
| `https://techstore-wine.vercel.app/login` | Redirect URL de Supabase Auth (confirmación por email) |

### Configurar el webhook en Mercado Pago

1. Ir a *Mercado Pago → Developers → Panel → Tu aplicación → Webhooks*.
2. Configurar la URL: `https://techstore-wine.vercel.app/api/mercadopago/webhook`
3. Suscribirse al evento **`payment`**.
4. Guardar.

> Si el cliente cambia el dominio, debe actualizar esta URL en Mercado Pago **y** la variable `NEXT_PUBLIC_SITE_URL` en Vercel.

### Configurar redirect URL en Supabase

1. Supabase Dashboard → *Authentication → URL Configuration*.
2. **Site URL**: `https://techstore-wine.vercel.app`
3. **Redirect URLs**: agregar `https://techstore-wine.vercel.app/login`

---

## 4. Cómo modificar el usuario admin

El usuario admin es el que puede **editar productos** y **agregar ventas** desde el panel administrativo (`/admin`).

### Cómo funciona el admin en el código

El sistema verifica el rol admin en **dos niveles**:

1. **Client-side** (`src/lib/admin.ts` → `isAdminUser()`):
   - Verifica `user.role === "admin"` (desde la tabla `profiles`), **O**
   - Fallback de desarrollo: `user.email === ADMIN_EMAIL` (actualmente `admin@gmail.com`).

2. **Server-side** (API Routes `/api/products`):
   - Recibe el `x-user-id` en el header (enviado por el `AdminPanel`).
   - Consulta la tabla `profiles` con la service role key.
   - Verifica `profile.role === "admin"`, **O** `profile.email === ADMIN_EMAIL`.

### Paso a paso: asignar rol admin a un usuario

#### Opción A — El owner ya se registró en la tienda

1. El owner entra a `https://techstore-wine.vercel.app/login` y crea una cuenta con su Gmail real.
2. Si la confirmación por email está activa, verifica su correo.
3. El desarrollador (o el owner) entra al **Supabase Dashboard** → *Table Editor → profiles*.
4. Busca al usuario por su email.
5. Cambia la columna `role` de `user` a `admin`.
6. Guarda.

#### Opción B — Por SQL (más directo)

Ejecutar en *Supabase Dashboard → SQL Editor*:

```sql
-- Asignar rol admin al owner por email
update public.profiles
set role = 'admin'
where email = 'gmail-real-del-owner@gmail.com';
```

Para verificar:

```sql
select id, email, name, role from public.profiles where role = 'admin';
```

#### Opción C — Crear el usuario admin desde Supabase

1. Supabase Dashboard → *Authentication → Users → Add user*.
2. Ingresar el Gmail real del owner + contraseña.
3. Marcar "Auto Confirm User" (para saltear la confirmación por email).
4. El trigger `handle_new_user()` crea automáticamente el perfil con `role = 'user'`.
5. Ejecutar el SQL de la Opción B para cambiar el rol a `admin`.

### Qué puede hacer el admin

Una vez con rol `admin`, el owner puede:

- Acceder a `/admin` (panel administrativo).
- **Agregar productos** (nombre, descripción, precio, stock, imagen, categoría, destacado).
- **Editar productos** existentes.
- **Eliminar productos**.
- Ver todas las órdenes (vía `getAllOrders()`).
- Ver todos los perfiles de usuarios.

---

## 5. Reemplazar `admin@gmail.com` por el Gmail real del owner

Actualmente existe un **fallback de desarrollo** que permite acceder al panel con el email `admin@gmail.com` sin necesidad de tener `role = 'admin'` en la base de datos. Esto está en **4 archivos**:

### Archivos a modificar

| Archivo | Línea | Código actual |
|---|---|---|
| `src/lib/admin.ts` | 7 | `export const ADMIN_EMAIL = "admin@gmail.com";` |
| `src/lib/products.ts` | 31 | `if (data.email === ADMIN_EMAIL) return true;` |
| `src/app/api/products/route.ts` | 52 | `profile.email !== ADMIN_EMAIL` |
| `src/app/api/products/[id]/route.ts` | 28 | `profile.email !== ADMIN_EMAIL` |

### Paso a paso para reemplazarlo

#### Paso 1 — Cambiar el email en `src/lib/admin.ts`

```typescript
// ANTES:
export const ADMIN_EMAIL = "admin@gmail.com";

// DESPUÉS:
export const ADMIN_EMAIL = "gmail-real-del-owner@gmail.com";
```

> Este es el único archivo donde se define el valor. Los otros tres archivos importan `ADMIN_EMAIL` desde aquí, así que con cambiar esta línea se actualizan todos.

#### Paso 2 — Verificar que el owner tiene `role = 'admin'` en Supabase

Aunque el fallback por email sigue funcionando, **se recomienda** asignar `role = 'admin'` al perfil del owner en Supabase (ver sección 4). Así el acceso no depende del email hardcodeado.

#### Paso 3 (Recomendado para producción) — Eliminar el fallback por email

Para mayor seguridad, una vez que el owner tiene `role = 'admin'` en la base de datos, **eliminar el fallback** de los 4 archivos:

**`src/lib/admin.ts`** — eliminar el fallback:
```typescript
export function isAdminUser(user: { role?: string; email?: string } | null): boolean {
  if (!user) return false;
  return user.role === "admin";
}
```

**`src/lib/products.ts`** — eliminar la línea del fallback:
```typescript
// Eliminar esta línea:
// if (data.email === ADMIN_EMAIL) return true;
```

**`src/app/api/products/route.ts`** — simplificar la condición:
```typescript
// ANTES:
if (!profile || (profile.role !== "admin" && profile.email !== ADMIN_EMAIL)) {

// DESPUÉS:
if (!profile || profile.role !== "admin") {
```

**`src/app/api/products/[id]/route.ts`** — simplificar la condición:
```typescript
// ANTES:
if (!profile || (profile.role !== "admin" && profile.email !== ADMIN_EMAIL)) {

// DESPUÉS:
if (!profile || profile.role !== "admin") {
```

#### Paso 4 — Hacer commit y deploy

```bash
git add .
git commit -m "Replace admin email with owner's real Gmail"
git push origin main
```

Vercel hará redeploy automáticamente.

---

## 6. Checklist final de transferencia

### Cuentas

- [ ] Transferir ownership del repositorio GitHub al cliente.
- [ ] Invitar al cliente como **Owner** del proyecto Supabase.
- [ ] Entregar/transferir la cuenta de Mercado Pago (o que el cliente cree la suya).
- [ ] Transferir el proyecto de Vercel al equipo del cliente.

### Credenciales (entregar por canal seguro)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 🔒
- [ ] `MERCADOPAGO_ACCESS_TOKEN` 🔒 (token de **producción**, no `TEST-`)
- [ ] `NEXT_PUBLIC_SITE_URL`

### URLs

- [ ] URL del sitio: `https://techstore-wine.vercel.app`
- [ ] URL de Supabase: `https://ettbuhgvbeihdcigfbcs.supabase.co`
- [ ] Webhook configurado en Mercado Pago: `https://techstore-wine.vercel.app/api/mercadopago/webhook`
- [ ] Redirect URL configurada en Supabase Auth: `https://techstore-wine.vercel.app/login`

### Usuario admin

- [ ] El owner se registró en la tienda con su Gmail real.
- [ ] Se asignó `role = 'admin'` en `profiles` (Supabase).
- [ ] Se reemplazó `ADMIN_EMAIL` en `src/lib/admin.ts` por el Gmail real del owner.
- [ ] (Opcional) Se eliminó el fallback por email en los 4 archivos.
- [ ] Se verificó que el owner puede acceder a `/admin` y editar productos.

### Producción

- [ ] El `MERCADOPAGO_ACCESS_TOKEN` es de **producción** (no `TEST-`).
- [ ] `NEXT_PUBLIC_SITE_URL` apunta al dominio final.
- [ ] Se hizo redeploy en Vercel después de los cambios.
- [ ] Se verificó el flujo de compra completo end-to-end.
- [ ] Se verificó que el webhook actualiza el estado de las órdenes.

---

> **Nota final**: entregar este documento junto con las credenciales. Las claves marcadas con 🔒 son secretos críticos — nunca subirlas al repositorio Git ni enviarlas por canales inseguros.