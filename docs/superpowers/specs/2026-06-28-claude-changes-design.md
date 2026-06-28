# Cambios hechos por Claude (no-superpowers) — Identidad "Almacén" + refactor de Órdenes

**Date:** 2026-06-28
**Branch:** superpowers/rewind
**Status:** Aplicado y en `main` de la rama
**Author:** Claude (fuera del flujo de superpowers)

> **Para la próxima corrida de superpowers:** este documento resume cambios
> que hice yo (Claude) directamente, NO superpowers. Si vas a seguir
> trabajando el front, respeta las convenciones de la sección "Convenciones a
> respetar" para no revertir estas decisiones sin querer.

## Objetivo

Tres bloques de trabajo, en orden cronológico:

1. **Identidad visual "Almacén"** — reemplacé el look genérico (índigo + Inter +
   ícono `Package`) que había quedado del rediseño inicial por una identidad
   propia de distribuidora venezolana de víveres en consignación.
2. **El header es el dueño del título** — el título de cada vista lo dibuja
   `AppHeader` desde `lib/routeLabels.js`; las páginas ya NO renderizan su
   propio `<h2>` ni usan `PageHeader`.
3. **Refactor de la vista Órdenes** — migración de botones a `Button`, variante
   `purple`, y banners de estado derivados de `StatusBadge`.

---

## 1. Identidad "Almacén" (tokens, tipografía, firma)

### Paleta (`tailwind.config.js`)
Reemplaza el índigo genérico. **`brand` ahora es verde pino, no índigo.**

| Token | Uso |
|---|---|
| `brand-50..900` | Verde pino (puertas de depósito / cajas de mercado). Color primario. |
| `maiz-400/500/600` | Ámbar maíz. **Reservado** para la tasa del día y acentos de alta jerarquía. No usar como primario. |
| `brick-500/600` | Rojo ladrillo para destructivas / negativos. |
| `paper` (`#f5f3ef`) | Fondo de la app (cálido). |
| `ink` (`#211f1a`) | Texto principal. |

### Tipografía (`index.css`)
Tres familias con rol fijo (self-hosted vía `@fontsource`):
- **Bricolage Grotesque** (`font-display`) — wordmark, títulos, números KPI. Usar con moderación.
- **IBM Plex Sans Variable** (`font-sans`, body) — cuerpo, con `font-feature-settings: 'tnum'` (cifras tabulares para tablas).
- **IBM Plex Mono** (`font-mono`) — **exclusivo** del tablero de la tasa.

`@fontsource/inter` fue **eliminado**. No reintroducir Inter.

### Elemento de firma: `components/ui/TasaBoard.jsx`
La tasa BCV del día tratada como un tablero de cambio (fondo pino, cifra mono
ámbar, punto "del día"). Se alimenta desde `AppHeader` → `getTasaHoy()` →
`GET /api/tasas/hoy` (que cae al scraper `services/bcv_scraper.py` si no hay
tasa de hoy). Variantes `sm` (header) y `lg` (Dashboard).

### Marca
- Monograma "LC" (maíz sobre pino) en sidebar/login/móvil — reemplaza el ícono `Package`.
- Favicon SVG con el monograma en `public/favicon.svg` + `<title>` "La Coromoto · Consignaciones".

### Barrido de color
Migré **todo el azul** (primario viejo) a `brand`, y los **botones de acción
verdes** (PDF/confirmar/guardar) a `brand`. El **verde semántico** (positivos,
antigüedad, badges de éxito, deltas +/−) se mantiene. No quedan utilidades
`*-blue-*` ni `indigo` en `src/`.

---

## 2. El header es el dueño del título (no más `PageHeader`)

`components/PageHeader.jsx` fue **eliminado**. El título de la vista lo resuelve
`AppHeader` (desktop) y la barra móvil de `Layout.jsx`, ambos desde
`lib/routeLabels.js`:
- `ROUTE_LABELS` — mapa ruta→nombre (única fuente de los nombres de vista).
- `resolveBreadcrumb(pathname)` — breadcrumb (match exacto, `#id` anidado, fallback).
- `resolveTitle(pathname)` — última miga, para la barra móvil.

**Regla:** una página de primer nivel NO debe renderizar su propio título.
Si necesitas un botón de acción de cabecera (ej. "+ Nuevo X"), va **dentro de
la barra de filtros/toolbar de la página**, alineado a la derecha con
`className="ml-auto"` — no en un header aparte (eso dejaba una fila vacía con
un botón suelto). Las páginas de **detalle/formulario** sí conservan su título
propio porque llevan info del registro ("Orden #123", "Editar cliente"), en
`font-display`.

Páginas ajustadas a este patrón: Ordenes, Clientes, Productos, Inventario
Central, Devoluciones, ReportesVenta, Stock, Historial.

---

## 3. Refactor de la vista Órdenes (`pages/Ordenes.jsx`)

### Botones → `components/ui/Button.jsx`
Todos los botones de acción del panel de detalle se migraron de `<button>`
crudo a `<Button>`:
- Descargar PDF / Registrar Reporte / Confirmar Venta → `variant="primary" size="sm"`
- Anular Orden → `variant="danger" size="sm"`
- Editar Orden → `variant="purple" size="sm"`

### Nueva variante `purple` en `Button.jsx`
```js
purple: 'bg-purple-600 hover:bg-purple-700 text-white'
```
Para la acción "Editar". **Nota:** la píldora suave "✎ Editada — ver historial"
y el badge "✎" del listado se dejaron como están a propósito (son indicadores
de "fue editada", no acciones; soft purple ≠ purple sólido).

### Banners de estado derivados de `StatusBadge`
`components/ui/StatusBadge.jsx` ahora **exporta** `STATUS_CONFIG` (antes era un
`const CONFIG` privado). Los 4 banners hardcodeados del panel (que repetían
colores por estado) se reemplazaron por un componente `StatusNotice` en
`Ordenes.jsx` que toma `bg`/`text`/`border` de `STATUS_CONFIG[status]`.
**Regla:** cualquier elemento nuevo que coloree por estado de orden debe leer
de `STATUS_CONFIG`, no inventar colores.

---

## 4. `Select.jsx` — scroll en listas largas

`components/ui/Select.jsx` (Radix) desbordaba la pantalla con muchas opciones
(ej. lista de clientes). Se acotó el `Viewport`:
```
max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-y-auto
```
Da scrollbar real, tope de 18rem y respeta el espacio disponible del popper.

---

## 5. Fix de backup (no revertir)

`pages/Configuracion.jsx` (~línea 173): la validación de import de backup acepta
versiones `'1'` y `'2'` (el backend exporta v2). No volver a restringir a `'1'`.

---

## 6. Refactor de Órdenes (componentización + tabla real)

Tras una revisión de código, partí `pages/Ordenes.jsx` (era ~530 líneas):

- **`lib/fechas.js`** (nuevo) — `MESES`, `labelMes`, `groupByMonth(items, dateField='fecha_emision')` (utilidades puras compartibles).
- **`components/OrdenDetailPanel.jsx`** (nuevo) — el panel de detalle expandible, antes incrustado en `Ordenes.jsx`. Incluye `StatusNotice` + `STATUS_NOTICE`. El cálculo de `devueltoMap`/`reportadoMap` ya **no** es un IIFE en el JSX: está en un `useMemo([detail])`.
- **`pages/Ordenes.jsx`** ahora solo gestiona filtros, carga y el mapeo de la lista. `meses` y `grandTotal` están en `useMemo([ordenes])`.
- **La lista de órdenes usa el componente `Table`** (no `<div>` con flex). Esto arregla el desfase de columnas: la `<table>` real alinea columnas entre filas de forma nativa, sobrevive a anchos variables (la píldora "Parcialmente reportada" ya no descuadra el total), y la columna del icono "✎" reserva su espacio aunque esté vacía. El truco de columnas: celdas de contenido fijo con `w-px whitespace-nowrap`, y la celda de cliente con `w-full max-w-0` + `truncate`. La fecha es `hidden sm:table-cell` (en móvil la celda no reserva espacio, a diferencia de un grid con px fijos).
- El detalle expandido va en una fila `<tr><td colSpan={8}>` siguiente a cada fila de orden (patrón estándar de tabla expandible).
- El checkbox de selección usa `accent-brand-600` (antes `accent-blue-600`, fuera de paleta).

**Nota:** la tabla de productos *dentro* de `OrdenDetailPanel` sigue con su header
legacy `bg-gray-200`; es un detalle pendiente, no se tocó en este refactor.

## Convenciones a respetar (para superpowers)

- `brand` = **verde pino**, no índigo. `maiz` solo para la tasa/acentos. No reintroducir Inter ni el ícono `Package`.
- **No reintroducir `PageHeader`** ni títulos `<h2>` en páginas de primer nivel; el header los dibuja vía `routeLabels`.
- Botón de acción de cabecera → dentro del toolbar de la página con `ml-auto`.
- Colores de estado de orden → siempre desde `StatusBadge.STATUS_CONFIG`.
- `Button` tiene variantes: `primary | secondary | danger | ghost | purple`.
- Cifras numéricas en tablas dependen de `tnum` global (no romper `font-feature-settings`).
- Para datos tabulares usar el componente `Table` (alineación nativa), no `<div>` con flex/grid de px fijos. `OrdenDetailPanel` vive en `components/`, las utilidades de fecha en `lib/fechas.js`.
