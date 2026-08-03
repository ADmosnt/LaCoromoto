# Phase 3 Plan B — Component Migration (Regular-Use Pages)

**Date:** 2026-06-27
**Branch:** superpowers/rewind
**Status:** Approved
**Depends on:** Phase 1/2 components + Phase 3 Plan A (Select.jsx already has `id` prop)

## Objective

Migrate five regular-use pages to the shared component system. Same visual direction and rules as Plan A — the only new judgment calls are documented below.

## Reference

`frontend/src/pages/Clientes.jsx` (Phase 2) and the four Plan A pages are the reference implementations.

## Migration Rules (inherited from Plan A)

**Always migrate:**
- Inline primary `<button>` → `<Button>` (primary)
- Inline cancel/secondary `<button>` → `<Button variant="secondary">`
- `<select>` filter controls (nullable, show-all) → `<Select nullable noneLabel="...">`
- `<select>` required choosers (page shows nothing until selected) → `<Select placeholder="...">`
- `<label>` + `<input className={inputClass}>` form fields → `<FormField id="...">` + `<Input id="...">`
- `<label>` + `<select>` form fields → `<FormField id="...">` + `<Select id="...">`
- Page-level action area → `<PageHeader title="...">` + children
- Standard list tables → `<Table borderless>` inside cards
- Empty state `<tr colSpan>` → `<EmptyState>`

**Never migrate:**
- Inline text-link action buttons inside table rows (`text-xs text-brand-600 hover:underline`) — stays native
- Tables that use `<Fragment>` for expand/collapse rows — stays native
- Tables with a `<tfoot>` — stays native (Table component has no tfoot)
- Nested sub-tables inside expanded rows — stays native
- Collapsible section toggle buttons (full-width `w-full flex items-center justify-between`) — stays native
- Small action buttons in data rows (`text-xs bg-brand-600 … px-3 py-1.5 rounded`) — stays native
- "← Volver" back link buttons — stays native
- Business logic, state, API calls, effects

**FormField `id` wiring:** Every `<FormField>` must receive `id` matching the child `<Input id="...">` or `<Select id="...">`.

## New judgment calls for Plan B

**Productos.jsx "Actualizar precios masivo" button** — custom brand-outline style (`border border-brand-400 text-brand-600 hover:bg-brand-50`). No Button variant matches this exactly. Keep as native `<button>` — it's a one-off tone, not a standard action.

**Stock.jsx main table** — uses `<Fragment>` for accordion rows + `<tfoot>` for totals. Both disqualify it from Table migration. All table markup stays native. Only the selector bar and page header are migrated.

**Devoluciones.jsx main table** — uses `<Fragment>` for expand/collapse (inline detail sub-table in second row). Stays native. The filter bar and page header are migrated.

**ProductoForm.jsx `lbl` local variable** — a class string shortcut (`'block text-sm font-medium text-gray-700 mb-1'`) used in place of a Label component. Remove it when migrating to FormField.

**DevolucionForm.jsx cliente select** — currently uses `className={`w-full ${inputClass}`}` on a `<select>` (wrong element type for inputClass). Migrates naturally to `<Select>` inside `<FormField>`.

**Productos.jsx deactivated table** — inside a collapsible accordion. Rows have custom `className="bg-gray-50 opacity-75"`. Can use `<Table borderless>` since `Table.Row` accepts `className`. Migrate it.

## Pages

### 1. `frontend/src/pages/Productos.jsx`

**What changes:**
- Remove unused `PageHeader` import (it's imported but never used in JSX) — actually, wire it in now
- Replace the manual header `<div className="flex items-center justify-end mb-6 flex-wrap gap-3">` with `<PageHeader title="Productos">`, keeping "Actualizar precios masivo" as native `<button>` and "Nuevo producto" as `<Button onClick={openNew}>+ Nuevo producto</Button>`
- Search `<input>` → `<Input placeholder="Buscar por descripción o código..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />`
- Group filter `<select>` → `<Select nullable noneLabel="Todos los grupos" value={grupoId} onChange={setGrupoId} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} />`
- Active products `<table>` → `<Table borderless>` (rows are plain `hover:bg-gray-50`, no expand/collapse)
- Empty state `<tr><td colSpan={6}>` → `<EmptyState message="No hay productos registrados" />`
- Deactivated products inner `<table>` → `<Table borderless>`. Row: `<Table.Row className="bg-gray-50 opacity-75">`. No empty state needed (section is hidden when `desactivados.length === 0`)
- Inline text-link buttons ("Editar", "Desactivar", "Reactivar") inside table cells → stay native

### 2. `frontend/src/pages/ProductoForm.jsx`

**What changes:**
- Remove `{ inputClass, selectClass }` import from `'../lib/styles'`
- Remove `const lbl = 'block text-sm font-medium text-gray-700 mb-1'` local variable
- Add imports: `Button`, `Input`, `Select`, `FormField`
- "Código *" + "Unidades por bulto *" grid: `<FormField id="codigo" label="Código *">` + `<Input id="codigo" disabled={isEdit}>` and `<FormField id="unidades_por_bulto" label="Unidades por bulto *">` + `<Input id="unidades_por_bulto" type="number" min={1}>`
- "Descripción *": `<FormField id="descripcion" label="Descripción *">` + `<Input id="descripcion">`
- "Grupo": `<FormField id="grupo_id" label="Grupo">` + `<Select id="grupo_id" nullable noneLabel="Sin grupo" value={form.grupo_id} onChange={(val) => set('grupo_id', val)} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))}>`
- Precios por lista inputs: stay as compact inline inputs (`w-32 py-1.5`) but replace with `<Input type="number" step="0.01" min="0" placeholder="0.00" className="w-32 py-1.5">` — no FormField (they sit inside a `flex items-center gap-3` row alongside a label `<span>`)
- Cancel button → `<Button variant="secondary" type="button">`
- Submit button → `<Button type="submit" disabled={loading}>`
- Back link → stays native

**Note on `set('grupo_id', val)`:** The Radix Select `onChange` callback receives the value directly (a string), not an event. The current handler `(e) => set('grupo_id', e.target.value)` must become `(val) => set('grupo_id', val)`.

### 3. `frontend/src/pages/Stock.jsx`

**What changes:**
- Remove `{ selectClass }` import from `'../lib/styles'`
- Add imports: `Select`, `PageHeader`
- Add `<PageHeader title="Stock en Consignación" />` above the card div
- Cliente select: `<Select placeholder="Seleccionar cliente..." value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} className="w-72" />`
- Grupo select: `<Select placeholder="Seleccionar grupo..." value={grupoId} onChange={setGrupoId} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} className="w-72" />`

**What stays native:**
- Modo toggle buttons (Cliente/Grupo segmented control) — custom styling
- Entire main stock table (Fragment + tfoot)
- Nested orden-origin sub-tables in expanded rows
- "Registrar reporte" action button in the ordenesReportando table
- The ordenesReportando table itself
- All business logic

**Note on `onChange`:** Current selects use `onChange={(e) => setClienteId(e.target.value)}`. With Select component: `onChange={setClienteId}` directly (receives string value, not event).

### 4. `frontend/src/pages/Devoluciones.jsx`

**What changes:**
- Add imports: `Button`, `Select`, `EmptyState`, `PageHeader`
- Replace header `<div className="flex items-center justify-end mb-6 flex-wrap gap-3">` with `<PageHeader title="Devoluciones">` + `<Button onClick={() => setModalOpen(true)}>+ Nueva devolución</Button>`
- Alert stays where it is (after PageHeader)
- Cliente filter `<select>` → `<Select nullable noneLabel="Todos los clientes" value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} />`
- Empty state `<tr><td colSpan={7}>` → `<EmptyState message="No hay devoluciones registradas" />`

**What stays native:**
- Entire main table with Fragment expand/collapse — stays native
- "Editar Devolución" action button inside expanded row — stays native
- All business logic, toggle, details loading

### 5. `frontend/src/pages/DevolucionForm.jsx`

**What changes:**
- Remove `{ inputClass }` import from `'../lib/styles'`
- Add imports: `Button`, `Input`, `Select`, `FormField`
- "Cliente *": `<FormField id="cliente" label="Cliente *">` + `<Select id="cliente" value={clienteId} onChange={setClienteId} placeholder="Seleccionar cliente..." options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))}>`
- "Fecha": `<FormField id="fecha" label="Fecha">` + `<Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}>`
- "Orden origen (opcional)" (conditional, inside the grid): `<FormField id="orden_origen" label="Orden origen (opcional)">` + `<Select id="orden_origen" nullable noneLabel="Sin orden específica" value={ordenOrigenId} onChange={setOrdenOrigenId} options={ordenes.map(o => ({value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}`}))}>`
- "Nota": `<FormField id="nota" label="Nota">` + `<Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Motivo de la devolución...">`
- Row cantidad inputs → `<Input type="number" min={0} max={row.disponible} className="w-24 text-center" value={row.cantidad_unidades} onChange={(e) => setRow(i, e.target.value)}>`
- Cancel button → `<Button variant="secondary" type="button">`
- Submit button → `<Button type="submit" disabled={loading}>`
- Back link → stays native
- "Este cliente no tiene stock en consignación." paragraph → stays native

## Out of Scope

- Modal internals (ProductoModal, ActualizacionPreciosModal, DevolucionModal) — Plan C
- ReporteVentaModal invoked from Stock.jsx — already migrated in Phase 1/2
- Any page not in this list
