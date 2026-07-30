# Flujo post-pago en Mercado Pago — explicación técnica

Este documento explica, paso a paso, qué sucede desde que el usuario paga en Mercado Pago hasta que se envían los emails. Está pensado como material de apoyo temporal para entender el flujo completo.

---

## 1. El usuario paga en Mercado Pago

1. El usuario completa el checkout en la tienda y es redirigido a Mercado Pago.
2. Ingresa los datos de su tarjeta y confirma el pago.
3. Mercado Pago procesa el pago y lo aprueba (o lo rechaza/deja pendiente).
4. Mercado Pago redirige al usuario a una de estas URLs:
   - `https://[dominio]/pago/exitoso` (aprobado)
   - `https://[dominio]/pago/rechazado` (rechazado)
   - `https://[dominio]/pago/pendiente` (pendiente)

> Estas URLs son solo para mostrarle el resultado al usuario. **No** actualizan el estado de la orden en la base de datos.

---

## 2. Mercado Pago envía el webhook

Pocos segundos después del pago, Mercado Pago envía una notificación HTTP POST a:

```
https://[dominio]/api/mercadopago/webhook
```

El cuerpo de la notificación incluye el `payment.id` y el `external_reference` (que es el ID de nuestra orden).

### ¿Qué hace el webhook?

1. **Recibe la notificación** de Mercado Pago.
2. **Consulta el estado real del pago** usando el SDK de Mercado Pago (no confía en la notificación, consulta directamente).
3. **Actualiza la orden en Supabase**:
   - Cambia el `status` de `pending` a `approved` (o `rejected`/`cancelled` según corresponda).
   - Guarda el `payment_id` de Mercado Pago.
   - Actualiza el `updated_at`.
4. **Si el pago es aprobado**, envía los emails (ver siguiente sección).
5. **Responde con 200 OK** a Mercado Pago para confirmar que recibió la notificación.

---

## 3. Envío de emails (solo si el pago es aprobado)

Cuando el webhook detecta que el pago fue aprobado, envía **dos emails** usando Resend:

### 3.1 Email al administrador

**Destinatario**: el email definido en `EMAIL_ADMIN_ADDRESS` (ej. `admin@gmail.com`).

**Asunto**: `Nuevo pedido aprobado — ORD-1234567890-ABC123`

**Contenido**:
- Número de pedido
- Fecha y hora de la compra
- Estado del pago: Aprobado
- Método de pago: Mercado Pago (con ID de pago)
- Método de entrega seleccionado
- Datos del comprador: nombre, email, teléfono
- Dirección completa de entrega
- Lista de productos: nombre, cantidad, precio unitario, subtotal
- Total de la orden

**Propósito**: notificar al negocio para que prepare el pedido y coordine la entrega.

### 3.2 Email al comprador

**Destinatario**: el email del comprador (el que ingresó en el checkout).

**Asunto**: `Tu pedido ORD-1234567890-ABC123 fue aprobado`

**Contenido**:
- Número de pedido
- Fecha y hora de la compra
- Estado del pago: Aprobado
- Método de entrega seleccionado
- Lista de productos: nombre, cantidad, precio unitario, subtotal
- Total de la orden
- Dirección de entrega
- Aclaración sobre logística: "Te contactaremos a la brevedad para coordinar la entrega"

**Propósito**: confirmar al cliente que su pago fue recibido y su pedido está siendo procesado.

---

## 4. Protección contra emails duplicados

Mercado Pago puede enviar **varias notificaciones** del mismo pago (por ejemplo, si el webhook falla y lo reintenta).

Para evitar enviar emails repetidos, el sistema usa el campo `admin_notified_at` en la tabla `orders`:

1. Antes de enviar los emails, el webhook verifica si `admin_notified_at` tiene una fecha.
2. Si **tiene fecha**, significa que ya se envió el email anteriormente → **no envía nada**.
3. Si **no tiene fecha**, envía los emails y luego guarda la fecha/hora actual en `admin_notified_at`.

Esto garantiza que, sin importar cuántas veces notifique Mercado Pago, los emails se envíen **una sola vez** por pedido.

---

## 5. Resumen visual del flujo

```text
Usuario paga en Mercado Pago
    │
    ▼
Mercado Pago redirige al usuario a /pago/exitoso
    │
    ▼
Mercado Pago envía webhook a /api/mercadopago/webhook
    │
    ▼
Webhook consulta el estado real del pago en Mercado Pago
    │
    ▼
Webhook actualiza la orden en Supabase (status, payment_id)
    │
    ▼
Si status = approved:
    │
    ├──► Verifica si admin_notified_at está vacío
    │       │
    │       ├── Sí (primera notificación):
    │       │       ├──► Envía email al administrador (Resend)
    │       │       ├──► Envía email al comprador (Resend)
    │       │       └──► Marca admin_notified_at = now()
    │       │
    │       └── No (ya notificado):
    │               └──► No envía emails (evita duplicados)
    │
    ▼
Webhook responde 200 OK a Mercado Pago
```

---

## 6. Código responsable de cada paso

| Paso | Archivo | Función |
|---|---|---|
| Recibir webhook | `src/app/api/mercadopago/webhook/route.ts` | `POST()` |
| Consultar pago en MP | `src/app/api/mercadopago/webhook/route.ts` | `paymentClient.get()` |
| Actualizar orden | `src/lib/orders-server.ts` | `updateOrderStatus()` |
| Obtener orden completa | `src/lib/orders-server.ts` | `getOrderByIdForEmail()` |
| Enviar email al admin | `src/lib/email.ts` | `sendOrderApprovedEmail()` |
| Enviar email al comprador | `src/lib/email.ts` | `sendCustomerConfirmationEmail()` |
| Marcar como notificado | `src/lib/orders-server.ts` | `markAdminNotified()` |

---

## 7. Variables de entorno necesarias

| Variable | Para qué sirve |
|---|---|
| `RESEND_API_KEY` | Autenticación con Resend para enviar emails |
| `EMAIL_ADMIN_ADDRESS` | Email del administrador que recibe la notificación |
| `EMAIL_FROM_ADDRESS` | Email remitente (debe estar verificado en Resend) |

---

## 8. Posibles fallos y cómo se manejan

| Fallo | Qué pasa |
|---|---|
| Resend no está configurado | Se loguea un warning, pero el webhook igual responde 200. La orden ya está guardada en Supabase. |
| El email del comprador no existe | Se loguea un warning y no se envía el email al comprador. El email al admin sí se envía. |
| Mercado Pago envía el webhook 2 veces | El campo `admin_notified_at` previene el envío duplicado. |
| El webhook falla temporalmente | Mercado Pago reintenta automáticamente. Cuando el webhook funcione, procesará la notificación. |
| Resend falla al enviar el email | Se loguea el error, pero la orden ya está actualizada en Supabase. El webhook responde 200. |

---

## 9. Notas importantes

- Los emails **solo** se envían cuando el pago es `approved`. No se envían para `pending`, `rejected` o `cancelled`.
- El sistema **no** integra empresas de envío. La logística (despacho, costos, seguimiento) es responsabilidad del negocio.
- El webhook **siempre** actualiza el estado de la orden en Supabase, incluso si falla el envío de emails. El fallo de email no rompe el flujo de pago.
- El campo `admin_notified_at` es la única fuente de verdad para saber si se envió el email. No se usa un flag booleano porque necesitamos saber **cuándo** se envió (para debugging y auditoría).

---

> **Este archivo es temporal. Una vez entendido el flujo, se puede borrar.**