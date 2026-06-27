# Phase 3 Plan A — Component Migration (Daily-Use Pages)

**Date:** 2026-06-27
**Branch:** superpowers/rewind
**Status:** Approved
**Depends on:** `2026-06-27-component-system-design.md` (Phase 1/2 — components already built)

## Objective

Migrate the four highest-traffic pages to use the new component system. These pages are the daily core of the consignment workflow: creating dispatch orders, reviewing order status, submitting sales reports, and confirming them.

## Reference Implementation

`frontend/src/pages/Clientes.jsx` (migrated in Phase 2) is the reference. All patterns follow it.

## Migration Rules

**Always migrate:**
- Inline `<button className="bg-brand-600...">` → `<Button>` (primary variant)
- Inline `<button className="...border...">` → `<Button variant="ghost">` or `variant="secondary"`
- `<select className={selectClass}>` filter controls → `<Select nullable noneLabel="Todos...">` 
- `<input type="date" className={selectClass}>` → `<Input type="date">`
- `<label>` + `<input className={inputClass}>` header form fields → `<FormField id="...">` + `<Input id="...">`
- `<label>` + `<select className={selectClass}>` header form fields → `<FormField id="...">` + `<Select id="...">`
- Simple empty state `<td colSpan>` or `<div>No hay...</div>` → `<EmptyState>`
- Standard list/data `<table>` → `<Table>` (with `borderless` inside cards)

**Never migrate:**
- `<select>` inside dynamic product row cells — specialized UX, stays native
- The "lista de precios" transparent select in `OrdenForm` rows — stays native
- `OrdenDetailPanel`'s internal order-detail table — read-only view with dynamic columns (devolucion/reporte conditional), stays native
- `<input type="checkbox">` for order batch selection in `Ordenes.jsx` — stays native (has `e.stopPropagation()` and `accent-blue-600` styling)
- Buttons inside `OrdenDetailPanel` — small action buttons (`text-xs rounded`) in the detail panel, domain-specific styling, stays native

**FormField + id wiring:** Every `<FormField>` must receive an `id` prop matching the `id` on its child `<Input>` or `<Select>`, so the `<Label>` renders with the correct `htmlFor`.

## Pages

### 1. `frontend/src/pages/Ordenes.jsx`

**What changes:**
- Import `Button`, `Input`, `Select` from `components/ui/`; remove `selectClass` import
- "Nueva orden" button → `<Button onClick={() => setModalOpen(true)}>+ Nueva orden</Button>` inside `<PageHeader title="Órdenes de Despacho">`
- Filter bar cliente select → `<Select nullable noneLabel="Todos" value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} />`
- Filter bar grupo select → `<Select nullable noneLabel="Todos" value={grupoId} onChange={setGrupoId} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} />`
- "Desde" and "Hasta" date inputs → `<Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />`
- Empty state div `<div className="...text-gray-400">No hay órdenes</div>` → `<EmptyState message="No hay órdenes registradas" />`
- The `modo` toggle buttons (Cliente/Grupo) — keep as-is (custom segmented control styling)
- "Limpiar" text button — keep as-is (text-only, no button component needed)

**What stays:**
- `OrdenDetailPanel` entirely — internal table, action buttons, checkbox input
- Floating selection bar — custom design, stays native
- Month grouping accordion — stays native

### 2. `frontend/src/pages/OrdenForm.jsx`

**What changes:**
- Remove `inputClass`, `selectClass` imports; add `Button`, `Input`, `Select`, `FormField`
- Header section "Datos generales":
  - Cliente: `<FormField id="cliente" label="Cliente *"><Select id="cliente" value={clienteId} onChange={setClienteId} placeholder="Seleccionar cliente..." options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} /></FormField>`
  - Fecha: `<FormField id="fecha" label="Fecha"><Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></FormField>`
  - Tasa BCV: `<FormField id="tasa" label={<>Tasa BCV (Bs.) {tasa && <span className="text-xs text-gray-400 ml-1">BCV: {Number(tasa.valor).toFixed(4)}</span>}</>}><Input id="tasa" type="number" step="0.0001" min="0" ... /></FormField>`
  - Nota: `<FormField id="nota" label="Nota"><Input id="nota" value={nota} onChange={...} placeholder="Observaciones opcionales" /></FormField>`
- Product rows dynamic table — `<input>` inside cells:
  - Cantidad (uds): `<Input type="number" min={1} className="w-24 text-center py-1.5" value={...} onChange={...} />`
  - Precio/Bulto: `<Input type="number" step="0.01" min={0} className="w-28 text-right py-1.5" value={...} onChange={...} />`
  - Product `<select>` in rows: **stays native** (`className={`w-full ${selectClass}`}` → `className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"`)
  - Lista de precios transparent `<select>`: **stays native**
- Cancel button → `<Button variant="secondary" type="button" onClick={() => nav('/ordenes')}>Cancelar</Button>`
- Submit button → `<Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Orden'}</Button>`
- Back link → keep as-is (`<button className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>`)

### 3. `frontend/src/pages/ReportesVenta.jsx`

**What changes:**
- Add imports: `Button` (not needed), `Select`, `Table`, `EmptyState`; remove raw select styles
- Add `<PageHeader title="Reportes de Venta" />` before the card
- Filter cliente select → `<Select nullable noneLabel="Todos los clientes" value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} className="w-56" />`
- Filter status select → `<Select nullable noneLabel="Todos los estados" value={status} onChange={setStatus} options={[{value:'pendiente',label:'Pendiente'},{value:'confirmado',label:'Confirmado'}]} className="w-44" />`
- Main `<table>` → `<Table borderless>` inside the existing `bg-white rounded-lg shadow` card
- Row hover: `<Table.Row key={r.id} className="hover:bg-brand-50">` (brand-50 matches original)
- Empty state `<td colSpan={7}>` → `<EmptyState message="No hay reportes registrados" />` rendered outside the table when `reportes.length === 0`

### 4. `frontend/src/pages/ReporteVentaForm.jsx`

**What changes:**
- Remove `inputClass`, `selectClass`; add `Button`, `Input`, `Select`, `FormField`
- Header section:
  - Cliente: `<FormField id="cliente" label="Cliente *"><Select id="cliente" value={clienteId} onChange={setClienteId} placeholder="Seleccionar cliente..." options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} /></FormField>`
  - Fecha: `<FormField id="fecha" label="Fecha"><Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></FormField>`
  - Tasa BCV: `<FormField id="tasa" label={<>Tasa BCV {tasa && <span...>...</span>}</>}><Input id="tasa" type="number" step="0.0001" min="0" className="w-48" ... /></FormField>`
- Product rows: replace inline-styled inputs with `<Input>`:
  - Cantidad: `<Input type="number" min={1} max={row.disponible} className="w-24 text-center" value={...} onChange={...} />`
  - Precio: `<Input type="number" step="0.01" min={0} className="w-28 text-right" value={...} onChange={...} />`
- "Add product" select (`stockDisponible` dropdown) → `<Select value={productoAdd} onChange={setProductoAdd} placeholder="Agregar producto..." options={stockDisponible.map(s => ({value: String(s.producto_id), label: `${s.descripcion} — ${s.cantidad_unidades} uds disponibles`}))} className="flex-1" />`
- "Agregar" button → `<Button type="button" variant="secondary" onClick={addProducto} disabled={!productoAdd}>Agregar</Button>`
- Cancel button → `<Button variant="secondary" type="button" onClick={() => nav('/reportes-venta')}>Cancelar</Button>`
- Submit button → `<Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Reporte'}</Button>`
- Back link → keep as-is

## Out of Scope

- `OrdenModal`, `ReporteVentaModal`, `OrdenEdicionesModal`, `OrdenesResumenModal` internals — migrated in Phase 3 Plan B/C
- `OrdenDetalle`, `ReporteVentaDetalle` pages — Plan B
- Any business logic, API calls, state management
