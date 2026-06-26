# Visual Redesign — La Coromoto

**Fecha:** 2026-06-26
**Alcance:** Rediseño visual completo (Opción C) — tokens, tipografía, sidebar, layout, login, componentes

---

## Contexto

El sistema de consignaciones La Coromoto usa Tailwind CSS con colores hardcoded en cada archivo. No existe identidad visual de marca, no hay componentes UI reutilizables, y el layout carece de header en desktop. El objetivo es transformar la apariencia en un SaaS moderno con personalidad propia, sin modificar lógica de negocio ni flujos de trabajo.

---

## 1. Fundación — Tokens y Tipografía

### Tipografía

- **Fuente:** Inter, self-hosted via `@fontsource/inter` (evita dependencia de Google CDN)
- Importar pesos: 400, 500, 600, 700
- Aplicar en `index.css`: `font-family: 'Inter', sans-serif`

### Paleta brand (azul/índigo)

Definida en `tailwind.config.js` bajo `theme.extend.colors.brand`:

| Token       | Valor     | Uso                                      |
|-------------|-----------|------------------------------------------|
| brand-50    | #eef2ff   | Fondos de highlight suave                |
| brand-100   | #e0e7ff   | Fondos de badge, hover suave             |
| brand-400   | #818cf8   | Borde de item activo en sidebar          |
| brand-500   | #6366f1   | Color principal (indigo-500)             |
| brand-600   | #4f46e5   | Botones primarios, sidebar active        |
| brand-700   | #4338ca   | Hover de botones primarios               |
| brand-800   | #3730a3   | Hover de items en sidebar                |
| brand-900   | #1e1b4b   | Sidebar background                       |

### Colores semánticos de status

Definidos en `tailwind.config.js` bajo `theme.extend.colors.status`:

| Estado      | Fondo     | Texto     |
|-------------|-----------|-----------|
| pending     | #fef9c3   | #854d0e   |
| confirmed   | #dcfce7   | #166534   |
| active      | #e0e7ff   | #3730a3   |
| returned    | #ffedd5   | #9a3412   |

---

## 2. Sidebar

### Cambios estructurales

- Background: `brand-900` (reemplaza `gray-900`)
- Item activo: fondo `brand-600` + borde izquierdo 3px `brand-400`
- Item hover: `brand-800` (reemplaza `gray-700`)

### Header del sidebar

- Ícono: `Package` (lucide-react) + texto "La Coromoto" en bold
- Reemplaza el texto genérico "Sistema de Consignación"

### Navegación con íconos

Cada nav item recibe un ícono de lucide-react a la izquierda del label:

| Ícono            | Ruta                    |
|------------------|-------------------------|
| LayoutDashboard  | Dashboard               |
| Users            | Clientes                |
| Box              | Productos               |
| Warehouse        | Inventario Central      |
| ClipboardList    | Órdenes / Historial     |
| RotateCcw        | Devoluciones            |
| Archive          | Stock en Consignación   |
| UserCog          | Usuarios                |
| Settings         | Configuración           |

### Footer del sidebar

- Avatar circular con inicial del usuario (color `brand-600`)
- Nombre de usuario + rol en texto `text-xs text-gray-400`
- Ícono `LogOut` con tooltip "Cerrar sesión" (reemplaza el botón "Salir")

---

## 3. Layout y Header

### Header superior fijo

Nuevo componente `<AppHeader />` fijo en la parte superior, visible en desktop y móvil:

- **Altura:** 56px (`h-14`)
- **Fondo:** blanco, `border-b border-gray-200`
- **Izquierda:** Breadcrumb dinámico basado en la ruta actual
  - Página de primer nivel: solo nombre (ej. "Órdenes")
  - Página de detalle: `Órdenes / ORD-000123`
  - Implementado con `useLocation` + mapa de rutas conocidas
- **Derecha:** Chip de tasa BCV del día — `Bs. 36.45 · hoy` — visible si hay tasa registrada para la fecha actual. Fetched en el header vía `GET /api/tasas/hoy`.
- **Móvil:** botón hamburger se ubica en el extremo izquierdo del header

### Ajustes al layout principal

- El `<main>` agrega `pt-14` para compensar el header fijo
- Se elimina el `<h2>` suelto al inicio de cada página — el título vive en el breadcrumb
- El `PageHeader` existente (`/components/PageHeader.jsx`) se simplifica: solo slot de acciones

### Banner de sesión

El banner amarillo de "tu sesión expirará" se mueve por encima del header como barra fija (z-index mayor), para no interrumpir el scroll del contenido.

---

## 4. Página de Login

### Layout split panel

```
┌─────────────────────┬─────────────────────┐
│  Panel izquierdo    │  Panel derecho      │
│  bg: brand-900      │  bg: white          │
│                     │                     │
│  [Package icon]     │  "Bienvenido"       │
│  "La Coromoto"      │  "Inicia sesión"    │
│                     │                     │
│  "Sistema de        │  [Usuario    ]      │
│   Consignaciones"   │  [Contraseña ]      │
│                     │                     │
│  © 2026             │  [ Entrar ]         │
│                     │  ¿Olvidaste tu      │
│                     │  contraseña?        │
└─────────────────────┴─────────────────────┘
```

- Proporción: 45% izquierdo / 55% derecho en desktop
- Móvil: panel izquierdo colapsa a header compacto (`h-24`), formulario ocupa el resto
- El flujo de recuperación de contraseña se mantiene en el panel derecho (sin cambios funcionales)
- Inputs con más espacio vertical (`py-3`), focus ring `brand-500`
- Botón "Entrar": `brand-600`, hover `brand-700`, `py-3`, ancho completo

---

## 5. Librería de Componentes

### `<StatusBadge status />`

**Archivo:** `src/components/ui/StatusBadge.jsx`

Props: `status: 'pendiente' | 'confirmado' | 'activa' | 'devuelta'`

Usa los tokens semánticos de status. Reemplaza todos los `<span>` con clases inline en:
- `Dashboard.jsx` (tabla de reportes recientes)
- `ReportesVenta.jsx`
- `ReporteVentaDetalle.jsx`
- `Ordenes.jsx`
- `Devoluciones.jsx`
- `MisOrdenes.jsx`

### `<Button variant size />`

**Archivo:** `src/components/ui/Button.jsx`

Props:
- `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`
- `size: 'sm' | 'md' | 'lg'` (default: `md`)

Variantes:
- `primary`: `brand-600` bg, texto blanco, hover `brand-700`
- `secondary`: `gray-100` bg, texto `gray-700`, hover `gray-200`
- `danger`: `red-600` bg, texto blanco, hover `red-700`
- `ghost`: transparente, borde `gray-300`, hover `gray-50`

### `<KpiCard label value prefix sub icon />`

**Archivo:** `src/components/ui/KpiCard.jsx`

Evolución del `StatCard` del Dashboard. Agrega prop `icon` (componente lucide) que se renderiza en gris suave en la esquina superior derecha de la card.

Usado en: `Dashboard.jsx`. Disponible para `Stock.jsx` e `InventarioCentral.jsx` si se desea en el futuro.

### `<AppHeader />`

**Archivo:** `src/components/AppHeader.jsx`

Componente del header superior fijo. Lee la ruta actual con `useLocation` y resuelve el breadcrumb. Fetcha la tasa BCV del día en mount. Se integra en `Layout.jsx`.

### Estilos base de inputs

**Archivo:** `src/lib/styles.js`

Exporta constante reutilizable:
```js
export const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
```

Reemplaza las variables locales `const inp = ...` en: `Login.jsx`, `ClienteForm.jsx`, `ProductoForm.jsx`, `OrdenForm.jsx`, `ReporteVentaForm.jsx`, y modales.

### Modales

`Modal.jsx` existente: actualizar `rounded-lg` → `rounded-2xl` en el panel interno. Sin otros cambios estructurales.

---

## 6. Cambios a nivel de página

### Dashboard

- `StatCard` → `<KpiCard>` con íconos: `Users`, `Box`, `TrendingUp`, `CheckCircle`
- Gráfico de barras: `fill` de Despachos → `brand-500` (#6366f1); Ventas confirmadas mantiene `emerald-500`
- Tabla de reportes recientes: `<StatusBadge>` en columna Estado
- Acciones rápidas: botón "Nueva Orden" usa `<Button variant="primary">`

### Todas las páginas con tablas

- Hover de filas: `hover:bg-brand-50` (reemplaza `hover:bg-gray-50`)
- Estado vacío: componente inline con ícono lucide centrado + mensaje descriptivo

### Páginas sin cambios de fondo

`ClienteDetalle`, `Configuracion`, `Usuarios`, `Stock`, `InventarioCentral` — heredan tokens y componentes automáticamente sin edición manual.

---

## Fuera de scope

- Lógica de negocio y endpoints de API: sin cambios
- Generación de PDF: sin cambios
- Dark mode: no incluido en este ciclo
- Colapso del sidebar a solo íconos: no incluido
- Features nuevas: ninguna

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---|---|
| `frontend/package.json` | Agregar `@fontsource/inter` |
| `frontend/tailwind.config.js` | Tokens brand + status |
| `frontend/src/index.css` | Import Inter, font-family |
| `frontend/src/lib/styles.js` | Crear: inputClass exportado |
| `frontend/src/components/Layout.jsx` | Integrar AppHeader, ajustar padding |
| `frontend/src/components/AppHeader.jsx` | Crear: header fijo con breadcrumb + tasa BCV |
| `frontend/src/components/ui/StatusBadge.jsx` | Crear |
| `frontend/src/components/ui/Button.jsx` | Crear |
| `frontend/src/components/ui/KpiCard.jsx` | Crear |
| `frontend/src/components/Modal.jsx` | rounded-2xl |
| `frontend/src/components/PageHeader.jsx` | Simplificar: solo acciones |
| `frontend/src/pages/Login.jsx` | Split panel |
| `frontend/src/pages/Dashboard.jsx` | KpiCard, StatusBadge, Button |
| `frontend/src/pages/Ordenes.jsx` | StatusBadge, Button |
| `frontend/src/pages/ReportesVenta.jsx` | StatusBadge, Button |
| `frontend/src/pages/ReporteVentaDetalle.jsx` | StatusBadge |
| `frontend/src/pages/Devoluciones.jsx` | StatusBadge, Button |
| `frontend/src/pages/MisOrdenes.jsx` | StatusBadge |
| `frontend/src/pages/ClienteForm.jsx` | inputClass |
| `frontend/src/pages/ProductoForm.jsx` | inputClass |
| `frontend/src/pages/OrdenForm.jsx` | inputClass |
| `frontend/src/pages/ReporteVentaForm.jsx` | inputClass |
| Todos los modales (`*Modal.jsx`) | Button, inputClass |
