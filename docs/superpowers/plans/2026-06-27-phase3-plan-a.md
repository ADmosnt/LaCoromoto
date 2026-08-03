# Phase 3 Plan A — Component Migration (Daily-Use Pages)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the four daily-use pages (ReportesVenta, Ordenes, OrdenForm, ReporteVentaForm) from inline Tailwind buttons/inputs/selects to the project's shared component system.

**Architecture:** Each page is a standalone React component. Changes are purely presentational — business logic, API calls, and state management are untouched. The shared components (`Input`, `Select`, `Button`, `FormField`, `Table`, `EmptyState`, `PageHeader`) already exist in `frontend/src/components/ui/`; this plan wires them in. Task 3 also patches `Select.jsx` to accept an `id` prop so `FormField` label-clicking works for selects.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3.4, Radix UI (`@radix-ui/react-select`), lucide-react. No automated test framework — verification is visual in the Vite dev server (`cd frontend && npm run dev`).

## Global Constraints

- Never touch business logic, API calls, `useEffect` hooks, or state management
- Never migrate `<select>` elements inside dynamic product row cells (those in `<tr>` cells for choosing `producto_id`) — they stay native
- Never migrate the "Lista de precios" transparent `<select>` inside OrdenForm precio cells
- Never migrate the `<input type="checkbox">` in Ordenes.jsx accordion rows (has `e.stopPropagation()` and `accent-blue-600`)
- Never migrate buttons inside `OrdenDetailPanel` (`text-xs rounded` sizing, domain-specific)
- Every `<FormField>` must receive an `id` prop matching the `id` on its child `<Input>` or `<Select>`
- All Select option values must be strings: `options={items.map(x => ({ value: String(x.id), label: x.name }))}`
- Import paths from pages: `'../components/ui/Input'`, `'../components/ui/Select'`, etc.
- Cancel buttons: `<Button variant="secondary" type="button">`; submit buttons: `<Button type="submit">` (default primary)
- `tailwind-merge` (used by `cn()` in all components) resolves conflicting classes: `className="w-24 py-1.5"` on `<Input>` correctly overrides the component's default `w-full py-2.5`

---

### Task 1: Migrate ReportesVenta.jsx

**Files:**
- Modify: `frontend/src/pages/ReportesVenta.jsx`

**Interfaces:**
- Consumes: `Select` (nullable, no id needed — standalone filter), `Table` (borderless), `EmptyState`, `PageHeader`
- Produces: Nothing consumed by other tasks

**What changes:**
- 2 raw `<select>` filter elements → `<Select nullable noneLabel="...">`
- Main `<table>` + inline empty `<tr>` → `<Table borderless>` shown conditionally; `<EmptyState>` when `reportes.length === 0`
- Add `<PageHeader title="Reportes de Venta" />` before the card

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/pages/ReportesVenta.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReportesVenta, confirmarReporteVenta, getClientes } from '../api'
import Alert from '../components/Alert'
import PageHeader from '../components/PageHeader'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

export default function ReportesVenta() {
  const [reportes, setReportes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    getReportesVenta({ cliente_id: clienteId || undefined, status: status || undefined })
      .then((r) => setReportes(r.data))
      .catch(() => setError('Error al cargar reportes'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId, status])

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar este reporte? Se descontará del stock en consignación.')) return
    try {
      await confirmarReporteVenta(id)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al confirmar')
    }
  }

  return (
    <div>
      <PageHeader title="Reportes de Venta" />
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-3">
          <Select
            nullable
            noneLabel="Todos los clientes"
            value={clienteId}
            onChange={setClienteId}
            options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            className="w-56"
          />
          <Select
            nullable
            noneLabel="Todos los estados"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmado', label: 'Confirmado' },
            ]}
            className="w-44"
          />
        </div>
        {reportes.length === 0 ? (
          <EmptyState message="No hay reportes registrados" />
        ) : (
          <Table borderless>
            <Table.Head>
              <Table.Row>
                <Table.Th>ID</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th align="right">Total USD</Table.Th>
                <Table.Th align="right">Total Bs.</Table.Th>
                <Table.Th align="center">Estado</Table.Th>
                <Table.Th align="center">Acciones</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {reportes.map((r) => (
                <Table.Row key={r.id} className="hover:bg-brand-50">
                  <Table.Td className="text-gray-500">#{r.id}</Table.Td>
                  <Table.Td className="font-medium">{r.cliente}</Table.Td>
                  <Table.Td>{r.fecha}</Table.Td>
                  <Table.Td align="right">${Number(r.total_usd).toFixed(2)}</Table.Td>
                  <Table.Td align="right">Bs. {Number(r.total_bs).toFixed(2)}</Table.Td>
                  <Table.Td align="center"><StatusBadge status={r.status} /></Table.Td>
                  <Table.Td align="center" className="space-x-2">
                    <Link to={`/reportes-venta/${r.id}`} className="text-brand-600 hover:underline text-xs">Ver</Link>
                    {r.status === 'pendiente' && (
                      <button onClick={() => handleConfirmar(r.id)} className="text-brand-600 hover:underline text-xs">
                        Confirmar
                      </button>
                    )}
                  </Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in the browser**

```bash
cd frontend && npm run dev
```

Navigate to `/reportes-venta`. Verify:
- "Reportes de Venta" heading appears (PageHeader, left-aligned)
- Both filter dropdowns are Radix selects (chevron icon, brand focus ring on click, dropdown animates in)
- Choosing a cliente filters the list; resetting returns all
- Choosing an estado filters; resetting returns all
- With rows: table columns match — ID, Cliente, Fecha, Total USD (right-aligned), Total Bs. (right-aligned), Estado (centered badge), Acciones (centered)
- Rows hover brand-50
- With no rows: centered "No hay reportes registrados" EmptyState

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportesVenta.jsx
git commit -m "feat: migrate ReportesVenta to component system"
```

---

### Task 2: Migrate Ordenes.jsx (filter bar, header, empty state)

**Files:**
- Modify: `frontend/src/pages/Ordenes.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` (nullable, standalone — no FormField), `EmptyState`, `PageHeader`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `selectClass` import from `'../lib/styles'`
- Add imports: `Button`, `Input`, `Select`, `EmptyState`, `PageHeader`
- Inline "Nueva orden" `<button>` → `<Button>` inside `<PageHeader title="Órdenes de Despacho">`
- Filter cliente/grupo `<select className={selectClass}>` → `<Select nullable noneLabel="Todos">`
- Filter "Desde"/"Hasta" `<input type="date" className={selectClass}>` → `<Input type="date">`
- Empty state `<div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">` → `<EmptyState>`

**What stays (do not touch):**
- Entire `OrdenDetailPanel` component (lines 31–295) — internal table, action buttons, checkbox, all native
- The `modo` segmented control buttons (Cliente/Grupo) — custom styling, stays native
- "Limpiar" text button — stays inline
- Floating selection bar at the bottom — stays native
- Month accordion, per-orden rows, checkboxes — stays native
- All five modal instances at the bottom

- [ ] **Step 1: Update imports**

In `frontend/src/pages/Ordenes.jsx`, replace:
```js
import { selectClass } from '../lib/styles'
```
with:
```js
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/PageHeader'
```

- [ ] **Step 2: Replace "Nueva orden" button with PageHeader**

Replace:
```jsx
      <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nueva orden
        </button>
      </div>
```
with:
```jsx
      <PageHeader title="Órdenes de Despacho">
        <Button onClick={() => setModalOpen(true)}>+ Nueva orden</Button>
      </PageHeader>
```

- [ ] **Step 3: Replace filter cliente/grupo selects**

Replace:
```jsx
          {modo === 'cliente' ? (
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          ) : (
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
```
with:
```jsx
          {modo === 'cliente' ? (
            <Select
              nullable
              noneLabel="Todos"
              value={clienteId}
              onChange={setClienteId}
              options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            />
          ) : (
            <Select
              nullable
              noneLabel="Todos"
              value={grupoId}
              onChange={setGrupoId}
              options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
            />
          )}
```

- [ ] **Step 4: Replace date inputs**

Replace:
```jsx
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={selectClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={selectClass} />
        </div>
```
with:
```jsx
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
```

- [ ] **Step 5: Replace empty state div**

Replace:
```jsx
      {meses.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">No hay órdenes registradas</div>
      )}
```
with:
```jsx
      {meses.length === 0 && (
        <EmptyState message="No hay órdenes registradas" />
      )}
```

- [ ] **Step 6: Verify in the browser**

Navigate to `/ordenes`. Verify:
- "Órdenes de Despacho" heading on the left, "Nueva orden" brand button on the right
- Clicking "Nueva orden" opens OrdenModal as before
- Cliente/Grupo filter select is Radix (chevron icon, brand focus ring), "Todos" resets filter
- Switching Cliente/Grupo mode swaps the select options
- "Desde" / "Hasta" date pickers show brand focus ring
- "Limpiar" clears all filters
- Accordion rows open/close, checkboxes work, OrdenDetailPanel loads detail
- If no órdenes match: EmptyState "No hay órdenes registradas" centered

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Ordenes.jsx
git commit -m "feat: migrate Ordenes filter bar and header to component system"
```

---

### Task 3: Patch Select.jsx + migrate OrdenForm.jsx

**Files:**
- Modify: `frontend/src/components/ui/Select.jsx`
- Modify: `frontend/src/pages/OrdenForm.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` (patched with `id`), `FormField`
- Produces: `Select` now accepts `id` prop — used by Task 4 as well

**Select.jsx patch:** The Radix Select Trigger is a `<button>`. Adding `id` to it allows `<Label htmlFor="id">` clicks to open the dropdown, matching the same accessibility wiring Input already has.

**What changes in OrdenForm.jsx:**
- Remove `{ inputClass, selectClass }` import
- Add imports: `Button`, `Input`, `Select`, `FormField`
- "Datos generales" section: replace bare `<label>` + `<input>`/`<select>` pairs with `<FormField id="..." label="...">` + `<Input id="...">` / `<Select id="...">`
- Product row quantity and price `<input>` (which already had explicit inline classes): replace with `<Input className="w-XX text-XX py-1.5">`
- Product row native `<select>` for `producto_id`: keep native, remove `${selectClass}` interpolation, inline the equivalent Tailwind classes directly
- Cancel/submit buttons: replace with `<Button>`

**What stays unchanged in OrdenForm.jsx:**
- "← Volver" back link button — stays native (`className="text-gray-500 hover:text-gray-700 text-sm"`)
- "Lista de precios" transparent `<select>` inside the precio `<div>` — untouched
- `+ Agregar producto` text link — stays native
- `emptyRow`, `setRow`, `addRow`, `removeRow`, `submit`, totals — zero changes

- [ ] **Step 1: Add `id` prop to Select.jsx**

In `frontend/src/components/ui/Select.jsx`, replace:
```jsx
export default function Select({
  value,
  onChange,
```
with:
```jsx
export default function Select({
  id,
  value,
  onChange,
```

And replace:
```jsx
      <RadixSelect.Trigger
        className={cn(
```
with:
```jsx
      <RadixSelect.Trigger
        id={id}
        className={cn(
```

- [ ] **Step 2: Update imports in OrdenForm.jsx**

Replace:
```js
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'
```

- [ ] **Step 3: Replace "Datos generales" header fields**

Replace the entire content of the two grid `<div>`s inside the `<div className="bg-white rounded-lg shadow p-5">` Datos generales card (the grids at lines ~105–137, which contain the four bare label+input/select groups):

```jsx
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select className={`w-full ${selectClass}`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa BCV (Bs.) {tasa && <span className="text-xs text-gray-400 ml-1">BCV: {Number(tasa.valor).toFixed(4)}</span>}
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                className={inputClass}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
              <input className={inputClass} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
            </div>
          </div>
```
with:
```jsx
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="cliente" label="Cliente *" className="sm:col-span-2">
              <Select
                id="cliente"
                value={clienteId}
                onChange={setClienteId}
                placeholder="Seleccionar cliente..."
                options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              />
            </FormField>
            <FormField id="fecha" label="Fecha">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <FormField id="tasa" label={<>Tasa BCV (Bs.) {tasa && <span className="text-xs text-gray-400 ml-1">BCV: {Number(tasa.valor).toFixed(4)}</span>}</>}>
              <Input
                id="tasa"
                type="number"
                step="0.0001"
                min="0"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </FormField>
            <FormField id="nota" label="Nota" className="sm:col-span-2">
              <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
            </FormField>
          </div>
```

- [ ] **Step 4: Inline native product select className**

Replace:
```jsx
                        <select
                          className={`w-64 ${selectClass}`}
                          value={row.producto_id}
                          onChange={(e) => setRow(i, 'producto_id', e.target.value)}
                        >
```
with:
```jsx
                        <select
                          className="w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          value={row.producto_id}
                          onChange={(e) => setRow(i, 'producto_id', e.target.value)}
                        >
```

- [ ] **Step 5: Replace row quantity input**

Replace:
```jsx
                        <input
                          type="number"
                          min={1}
                          className="w-24 text-center py-1.5 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          value={row.cantidad_unidades}
                          onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                        />
```
with:
```jsx
                        <Input
                          type="number"
                          min={1}
                          className="w-24 text-center py-1.5"
                          value={row.cantidad_unidades}
                          onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                        />
```

- [ ] **Step 6: Replace row price input**

Replace:
```jsx
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-28 text-right py-1.5 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            value={row.precio_usd_momento === '' ? '' : (Number(row.precio_usd_momento) * upb).toFixed(2)}
                            onChange={(e) => {
                              const val = e.target.value
                              setRow(i, 'precio_usd_momento', val === '' ? '' : String(Number(val) / upb))
                            }}
                          />
```
with:
```jsx
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-28 text-right py-1.5"
                            value={row.precio_usd_momento === '' ? '' : (Number(row.precio_usd_momento) * upb).toFixed(2)}
                            onChange={(e) => {
                              const val = e.target.value
                              setRow(i, 'precio_usd_momento', val === '' ? '' : String(Number(val) / upb))
                            }}
                          />
```

- [ ] **Step 7: Replace form buttons**

Replace:
```jsx
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav('/ordenes')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
```
with:
```jsx
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => nav('/ordenes')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Orden'}</Button>
        </div>
```

- [ ] **Step 8: Verify in the browser**

Navigate to `/ordenes` and click "+ Nueva orden" to open the modal, or navigate to the form path. Check:
- "Cliente *" label is clickable and opens the Radix select dropdown
- Selecting a cliente persists correctly
- "Fecha" input has brand focus ring
- "Tasa BCV (Bs.)" label shows the BCV hint span inline when a rate is loaded; field accepts 4-decimal input
- "Nota" field has brand focus ring
- Product row: the native `<select>` dropdown works to choose products
- Row quantity input (`w-24`) and price input (`w-28`) are compact with focus rings; `py-1.5` keeps them slim
- "Lista de precios" transparent select below price still works
- Bultos calculation column updates correctly
- "Cancelar" is gray secondary; "Crear Orden" is brand primary
- Submitting with no cliente shows "Seleccione un cliente" error

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ui/Select.jsx frontend/src/pages/OrdenForm.jsx
git commit -m "feat: add Select id prop, migrate OrdenForm to component system"
```

---

### Task 4: Migrate ReporteVentaForm.jsx

**Files:**
- Modify: `frontend/src/pages/ReporteVentaForm.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` (with `id` prop from Task 3), `FormField`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass, selectClass }` import
- Add imports: `Button`, `Input`, `Select`, `FormField`
- Header grid: bare `<label>` + `<select>`/`<input>` pairs → `<FormField>` + `<Select>`/`<Input>`
- Tasa BCV field: inline Tailwind class → `<Input id="tasa" className="w-48">`
- Product row cantidad input: long inline class → `<Input className="w-24 text-center">`
- Product row precio input: long inline class → `<Input className="w-28 text-right">`
- "Agregar producto" `<select className={`flex-1 ${selectClass}`}>` → `<Select placeholder="Agregar producto..." options={...} className="flex-1">`
- "Agregar" `<button>` → `<Button variant="secondary">`
- Cancel/submit buttons → `<Button>`

**What stays:**
- Back link `<button className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>` — unchanged
- "Este cliente no tiene stock en consignación." paragraph — unchanged
- All state, API calls, `addProducto`, `removeRow`, `setRow`, `submit` — zero changes

- [ ] **Step 1: Update imports**

Replace:
```js
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'
```

- [ ] **Step 2: Replace header fields with FormField**

Replace the header section (inside the first `<div className="bg-white rounded-lg shadow p-5">`):

```jsx
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select className={`w-full ${selectClass}`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa BCV {tasa && <span className="text-xs text-gray-400 ml-1">Registrada: {Number(tasa.valor).toFixed(4)}</span>}
            </label>
            <input
              type="number" step="0.0001" min="0"
              className="w-48 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
              value={tasaManual}
              onChange={(e) => setTasaManual(e.target.value)}
            />
          </div>
```
with:
```jsx
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="cliente" label="Cliente *" className="sm:col-span-2">
              <Select
                id="cliente"
                value={clienteId}
                onChange={setClienteId}
                placeholder="Seleccionar cliente..."
                options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              />
            </FormField>
            <FormField id="fecha" label="Fecha">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField id="tasa" label={<>Tasa BCV {tasa && <span className="text-xs text-gray-400 ml-1">Registrada: {Number(tasa.valor).toFixed(4)}</span>}</>}>
              <Input
                id="tasa"
                type="number"
                step="0.0001"
                min="0"
                className="w-48"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </FormField>
          </div>
```

- [ ] **Step 3: Replace product row cantidad input**

Replace:
```jsx
                            <input
                              type="number" min={1} max={row.disponible}
                              className="w-24 text-center border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              value={row.cantidad_unidades}
                              onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                            />
```
with:
```jsx
                            <Input
                              type="number"
                              min={1}
                              max={row.disponible}
                              className="w-24 text-center"
                              value={row.cantidad_unidades}
                              onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                            />
```

- [ ] **Step 4: Replace product row precio input**

Replace:
```jsx
                            <input
                              type="number" step="0.01" min={0}
                              className="w-28 text-right border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              value={row.precio_usd_momento}
                              onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                            />
```
with:
```jsx
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-28 text-right"
                              value={row.precio_usd_momento}
                              onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                            />
```

- [ ] **Step 5: Replace "Agregar producto" select and button**

Replace:
```jsx
                  <div className="flex gap-2 items-center">
                    <select
                      className={`flex-1 ${selectClass}`}
                      value={productoAdd}
                      onChange={(e) => setProductoAdd(e.target.value)}
                    >
                      <option value="">Agregar producto...</option>
                      {stockDisponible.map((s) => (
                        <option key={s.producto_id} value={s.producto_id}>
                          {s.descripcion} — {s.cantidad_unidades} uds disponibles
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addProducto}
                      disabled={!productoAdd}
                      className="px-3 py-2 text-sm bg-brand-50 text-brand-700 border border-brand-200 rounded-md hover:bg-brand-100 disabled:opacity-40"
                    >
                      Agregar
                    </button>
                  </div>
```
with:
```jsx
                  <div className="flex gap-2 items-center">
                    <Select
                      value={productoAdd}
                      onChange={setProductoAdd}
                      placeholder="Agregar producto..."
                      options={stockDisponible.map((s) => ({
                        value: String(s.producto_id),
                        label: `${s.descripcion} — ${s.cantidad_unidades} uds disponibles`,
                      }))}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={addProducto} disabled={!productoAdd}>
                      Agregar
                    </Button>
                  </div>
```

- [ ] **Step 6: Replace form buttons**

Replace:
```jsx
          <button type="button" onClick={() => nav('/reportes-venta')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Crear Reporte'}
          </button>
```
with:
```jsx
          <Button variant="secondary" type="button" onClick={() => nav('/reportes-venta')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Reporte'}</Button>
```

- [ ] **Step 7: Verify in the browser**

Navigate to `/reportes-venta/nueva`. Verify:
- "Cliente *" label click opens the Radix select
- Selecting a cliente triggers stock load and shows the products panel
- "Fecha" has brand focus ring
- "Tasa BCV" is `w-48` wide with inline hint span in label when rate is loaded
- "Agregar producto..." Radix select lists available stock items with "N uds disponibles"
- Clicking "Agregar" adds the row; the select resets to placeholder
- Row cantidad (`w-24`, centered) and precio (`w-28`, right-aligned) inputs have focus rings
- Total USD and Total Bs. update as values change
- "Cancelar" gray secondary; "Crear Reporte" brand primary

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/ReporteVentaForm.jsx
git commit -m "feat: migrate ReporteVentaForm to component system"
```
