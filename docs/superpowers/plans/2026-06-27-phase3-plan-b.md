# Phase 3 Plan B — Component Migration (Regular-Use Pages)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Productos, ProductoForm, Stock, Devoluciones, and DevolucionForm from inline Tailwind buttons/inputs/selects to the project's shared component system.

**Architecture:** Each page is a standalone React component; changes are purely presentational. The shared components (Input, Select, Button, FormField, Table, EmptyState, PageHeader) exist in `frontend/src/components/ui/` and `frontend/src/components/`. Select.jsx already has the `id` prop from Phase 3 Plan A. Tasks are independent — no cross-task interfaces.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3.4, Radix UI, lucide-react. No automated test suite — verification is visual in the Vite dev server (`cd frontend && npm run dev`).

## Global Constraints

- Never touch business logic, API calls, `useEffect` hooks, or state management
- Never migrate tables that use `<Fragment>` for expand/collapse rows — they stay native (Devoluciones main table, Stock main table)
- Never migrate tables with `<tfoot>` — stays native (Stock main table)
- Never migrate inline text-link action buttons inside table cells (`text-xs text-brand-600 hover:underline`) — stays native
- Never migrate collapsible-section toggle buttons (`w-full flex items-center justify-between`) — stays native
- Never migrate small action buttons in data rows (`text-xs bg-brand-600 … px-3 py-1.5 rounded`) — stays native
- Never migrate "← Volver" back link buttons — stays native
- "Actualizar precios masivo" button in Productos.jsx stays native (brand-outline style, no matching Button variant)
- Every `<FormField>` must receive `id` matching its child `<Input id="...">` or `<Select id="...">`
- All Select option values must be strings: `options={items.map(x => ({ value: String(x.id), label: x.name }))}`
- Select `onChange` receives the raw value (string), not a synthetic event — use `onChange={setter}` or `onChange={(val) => set('field', val)}`
- Import paths from pages: `'../components/ui/Button'`, `'../components/ui/Input'`, etc.
- `tailwind-merge` (used by `cn()`) resolves conflicting Tailwind classes: `className="w-32 py-1.5"` on `<Input>` correctly overrides default `w-full py-2.5`

---

### Task 1: Migrate Productos.jsx

**Files:**
- Modify: `frontend/src/pages/Productos.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` (nullable), `Table` (borderless), `EmptyState`, `PageHeader`
- Produces: Nothing consumed by other tasks

**What changes:**
- `PageHeader` is already imported but unused in JSX — wire it in now
- Add imports: `Button`, `Input`, `Select`, `Table`, `EmptyState`
- Manual header div → `<PageHeader title="Productos">` with native "Actualizar precios masivo" button + `<Button onClick={openNew}>+ Nuevo producto</Button>`
- Search `<input>` → `<Input className="w-full sm:w-72">`
- Group filter `<select>` → `<Select nullable noneLabel="Todos los grupos">`
- Active products `<table>` → `<Table borderless className="overflow-x-auto">` (conditional with EmptyState)
- Empty state `<tr><td colSpan={6}>` → `<EmptyState message="No hay productos registrados" />` outside the table
- Deactivated products inner `<table>` → `<Table borderless className="overflow-x-auto border-t">` replacing the `<div className="overflow-x-auto border-t">` + `<table>` combo
- Inline action buttons ("Editar", "Desactivar", "Reactivar") stay native

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/pages/Productos.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getProductos, deleteProducto, reactivarProducto, getGruposProductos } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import ProductoModal from '../components/ProductoModal'
import ActualizacionPreciosModal from '../components/ActualizacionPreciosModal'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [desactivados, setDesactivados] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [preciosModalOpen, setPreciosModalOpen] = useState(false)
  const [showDesactivados, setShowDesactivados] = useState(false)

  useEffect(() => { setSearch(urlSearch) }, [urlSearch])

  const load = () => {
    getProductos({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setProductos(r.data))
      .catch(() => toast.error('Error al cargar productos'))
    getProductos({ activo: false })
      .then((r) => setDesactivados(r.data))
      .catch(() => {})
  }

  useEffect(() => { getGruposProductos().then((r) => setGrupos(r.data)) }, [])
  useEffect(() => { load() }, [search, grupoId])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }

  const handleDelete = async (id, desc) => {
    if (!confirm(`¿Desactivar "${desc}"?`)) return
    try {
      await deleteProducto(id)
      toast.success(`"${desc}" desactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar producto')
    }
  }

  const handleReactivar = async (id, desc) => {
    try {
      await reactivarProducto(id)
      toast.success(`"${desc}" reactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al reactivar producto')
    }
  }

  return (
    <div>
      <PageHeader title="Productos">
        <button
          onClick={() => setPreciosModalOpen(true)}
          className="border border-brand-400 text-brand-600 hover:bg-brand-50 text-sm font-medium px-4 py-2 rounded-md"
        >
          Actualizar precios masivo
        </button>
        <Button onClick={openNew}>+ Nuevo producto</Button>
      </PageHeader>

      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <Input
            type="text"
            placeholder="Buscar por descripción o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            nullable
            noneLabel="Todos los grupos"
            value={grupoId}
            onChange={setGrupoId}
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
          />
        </div>
        {productos.length === 0 ? (
          <EmptyState message="No hay productos registrados" />
        ) : (
          <Table borderless className="overflow-x-auto">
            <Table.Head>
              <Table.Row>
                <Table.Th>Código</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th align="center">Uds/Bulto</Table.Th>
                <Table.Th>Precios (USD)</Table.Th>
                <Table.Th align="center">Acciones</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {productos.map((p) => (
                <Table.Row key={p.id} className="hover:bg-gray-50">
                  <Table.Td className="font-mono text-xs">{p.codigo}</Table.Td>
                  <Table.Td className="font-medium">{p.descripcion}</Table.Td>
                  <Table.Td className="text-gray-600">{p.grupo}</Table.Td>
                  <Table.Td align="center">{p.unidades_por_bulto}</Table.Td>
                  <Table.Td className="text-gray-600 text-xs">
                    {p.precios?.map((pr) => (
                      <span key={pr.lista_id} className="inline-block mr-2">
                        {pr.lista}: ${(Number(pr.precio_usd) * (p.unidades_por_bulto || 1)).toFixed(2)}
                      </span>
                    ))}
                  </Table.Td>
                  <Table.Td align="center" className="space-x-2">
                    <button onClick={() => openEdit(p.id)} className="text-brand-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(p.id, p.descripcion)} className="text-red-500 hover:underline text-xs">Desactivar</button>
                  </Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {desactivados.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setShowDesactivados((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <span className="font-medium">
              Productos desactivados ({desactivados.length})
            </span>
            <span>{showDesactivados ? '▲' : '▼'}</span>
          </button>
          {showDesactivados && (
            <Table borderless className="overflow-x-auto border-t">
              <Table.Head>
                <Table.Row>
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Grupo</Table.Th>
                  <Table.Th align="center">Uds/Bulto</Table.Th>
                  <Table.Th align="center">Acción</Table.Th>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {desactivados.map((p) => (
                  <Table.Row key={p.id} className="bg-gray-50 opacity-75">
                    <Table.Td className="font-mono text-xs text-gray-400">{p.codigo}</Table.Td>
                    <Table.Td className="text-gray-500 line-through">{p.descripcion}</Table.Td>
                    <Table.Td className="text-gray-400">{p.grupo}</Table.Td>
                    <Table.Td align="center" className="text-gray-400">{p.unidades_por_bulto}</Table.Td>
                    <Table.Td align="center">
                      <button
                        onClick={() => handleReactivar(p.id, p.descripcion)}
                        className="text-brand-600 hover:underline text-xs font-medium"
                      >
                        Reactivar
                      </button>
                    </Table.Td>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      )}

      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productoId={editId}
        onSaved={load}
      />
      <ActualizacionPreciosModal
        open={preciosModalOpen}
        onClose={() => setPreciosModalOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in the browser**

```bash
cd frontend && npm run dev
```

Navigate to `/productos`. Verify:
- "Productos" heading on the left, "Actualizar precios masivo" (native button, brand outline) + "Nuevo producto" (brand Button) on the right
- Search input has brand focus ring; typing filters the table
- Group filter is a Radix select with "Todos los grupos" reset option
- Active products table: Código (mono), Descripción, Grupo, Uds/Bulto (centered), Precios, Acciones (centered) — rows hover gray-50
- With no active products: EmptyState "No hay productos registrados" centered
- Deactivated accordion shows/hides with ▼▲ toggle; rows are dimmed (bg-gray-50 opacity-75) with strikethrough descriptions

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Productos.jsx
git commit -m "feat: migrate Productos to component system"
```

---

### Task 2: Migrate ProductoForm.jsx

**Files:**
- Modify: `frontend/src/pages/ProductoForm.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` (nullable for grupo), `FormField`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass, selectClass }` import
- Remove `const lbl = 'block text-sm font-medium text-gray-700 mb-1'` (unused after migration)
- Add imports: `Button`, `Input`, `Select`, `FormField`
- All four main fields → `<FormField id="...">` + `<Input>` or `<Select>`
- "Grupo" Select uses `onChange={(val) => set('grupo_id', val)}` because Select passes the value directly (not a synthetic event)
- Precios-por-lista inputs → `<Input className="w-32 py-1.5">` (no FormField — they're in a `flex items-center gap-3` row with an inline `<span>` label)
- Cancel → `<Button variant="secondary" type="button">`; Submit → `<Button type="submit">`
- "← Volver" back link stays native

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/pages/ProductoForm.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProducto, createProducto, updateProducto,
  getGruposProductos, getListasPrecios,
} from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

const emptyForm = {
  codigo: '', descripcion: '', unidades_por_bulto: 1,
  grupo_id: '', activo: true, precios: [],
}

export default function ProductoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([getGruposProductos(), getListasPrecios()]).then(([g, l]) => {
      setGrupos(g.data)
      setListas(l.data)
    })
    if (isEdit) {
      getProducto(id).then((r) => {
        const p = r.data
        setForm({ ...p, grupo_id: p.grupo_id ?? '' })
      })
    }
  }, [id])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const setPrecio = (listaId, valor) => {
    const precios = [...form.precios]
    const idx = precios.findIndex((p) => p.lista_id === listaId)
    if (idx >= 0) {
      precios[idx] = { ...precios[idx], precio_usd: valor }
    } else {
      precios.push({ lista_id: listaId, precio_usd: valor })
    }
    set('precios', precios)
  }

  const getPrecio = (listaId) =>
    form.precios.find((p) => p.lista_id === listaId)?.precio_usd ?? ''

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        grupo_id: form.grupo_id || null,
        precios: form.precios.filter((p) => p.precio_usd !== '' && Number(p.precio_usd) > 0),
      }
      if (isEdit) await updateProducto(id, payload)
      else await createProducto(payload)
      nav('/productos')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/productos')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="codigo" label="Código *">
            <Input id="codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required disabled={isEdit} />
          </FormField>
          <FormField id="unidades_por_bulto" label="Unidades por bulto *">
            <Input id="unidades_por_bulto" type="number" min={1} value={form.unidades_por_bulto}
              onChange={(e) => set('unidades_por_bulto', parseInt(e.target.value) || 1)} required />
          </FormField>
        </div>

        <FormField id="descripcion" label="Descripción *">
          <Input id="descripcion" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} required />
        </FormField>

        <FormField id="grupo_id" label="Grupo">
          <Select
            id="grupo_id"
            nullable
            noneLabel="Sin grupo"
            value={form.grupo_id}
            onChange={(val) => set('grupo_id', val)}
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
          />
        </FormField>

        {listas.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Precios por lista (USD)</p>
            <div className="space-y-2">
              {listas.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-36">{l.nombre}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-32 py-1.5"
                    value={getPrecio(l.id)}
                    onChange={(e) => setPrecio(l.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => nav('/productos')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `/productos` and click "Editar" on any product (or "+ Nuevo producto"). Verify:
- "Código *" label click focuses the input; disabled when editing
- "Unidades por bulto *" accepts numbers ≥ 1
- "Descripción *" has brand focus ring
- "Grupo" label click opens the Radix select dropdown; "Sin grupo" is the reset option
- Precios section (if listas exist): each lista name is `w-36` span, price input is `w-32` compact
- "Cancelar" is gray secondary; "Guardar" is brand primary, disabled while submitting
- Submitting a new product saves and navigates to /productos

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProductoForm.jsx
git commit -m "feat: migrate ProductoForm to component system"
```

---

### Task 3: Migrate Stock.jsx

**Files:**
- Modify: `frontend/src/pages/Stock.jsx`

**Interfaces:**
- Consumes: `Select` (non-nullable placeholder), `PageHeader`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ selectClass }` import from `'../lib/styles'`
- Add imports: `Select`, `PageHeader`
- Add `<PageHeader title="Stock en Consignación" />` immediately before `<div className="bg-white rounded-lg shadow">`
- Cliente select → `<Select placeholder="Seleccionar cliente..." value={clienteId} onChange={setClienteId} options={...} className="w-72" />`
- Grupo select → `<Select placeholder="Seleccionar grupo..." value={grupoId} onChange={setGrupoId} options={...} className="w-72" />`

**What stays native (do not touch):**
- Modo toggle buttons (cliente/grupo segmented control)
- Entire main stock table (Fragment + tfoot)
- Nested orden-origin sub-tables in expanded rows
- The "Registrar reporte" button in ordenesReportando table
- The ordenesReportando table itself
- All state, effects, business logic

- [ ] **Step 1: Update imports**

In `frontend/src/pages/Stock.jsx`, replace:
```js
import { selectClass } from '../lib/styles'
```
with:
```js
import Select from '../components/ui/Select'
import PageHeader from '../components/PageHeader'
```

- [ ] **Step 2: Add PageHeader**

Replace:
```jsx
  return (
    <div>
      <div className="bg-white rounded-lg shadow">
```
with:
```jsx
  return (
    <div>
      <PageHeader title="Stock en Consignación" />
      <div className="bg-white rounded-lg shadow">
```

- [ ] **Step 3: Replace cliente select**

Replace:
```jsx
          {modo === 'cliente' ? (
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={`w-72 ${selectClass}`}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          ) : (
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={`w-72 ${selectClass}`}>
              <option value="">Seleccionar grupo...</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
```
with:
```jsx
          {modo === 'cliente' ? (
            <Select
              placeholder="Seleccionar cliente..."
              value={clienteId}
              onChange={setClienteId}
              options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              className="w-72"
            />
          ) : (
            <Select
              placeholder="Seleccionar grupo..."
              value={grupoId}
              onChange={setGrupoId}
              options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
              className="w-72"
            />
          )}
```

- [ ] **Step 4: Verify in the browser**

Navigate to `/stock`. Verify:
- "Stock en Consignación" heading appears above the card
- "Por cliente" / "Por grupo" segmented control works
- Cliente/grupo Radix selects show the placeholder when nothing is selected; selecting a client/group loads the stock table
- Switching modo clears the selection (select resets to placeholder)
- Accordion rows expand to show orden-origin sub-table
- Total footer row appears when stock is present
- ordenesReportando section shows below when applicable; "Registrar reporte" button opens the modal

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Stock.jsx
git commit -m "feat: migrate Stock selector bar to component system"
```

---

### Task 4: Migrate Devoluciones.jsx

**Files:**
- Modify: `frontend/src/pages/Devoluciones.jsx`

**Interfaces:**
- Consumes: `Button`, `Select` (nullable), `EmptyState`, `PageHeader`
- Produces: Nothing consumed by other tasks

**What changes:**
- Add imports: `Button`, `Select`, `EmptyState`, `PageHeader`
- Replace header div with `<PageHeader title="Devoluciones">` + `<Button>`
- Move `<Alert>` below PageHeader (it's already after the header div — keep it there)
- Cliente filter `<select>` → `<Select nullable noneLabel="Todos los clientes">`
- Empty state: move outside the table. Render `<EmptyState>` when `devoluciones.length === 0` and the `<table>` only when `devoluciones.length > 0`

**What stays native:**
- Entire main `<table>` with `<Fragment>` expand/collapse — stays native, just conditional
- "Editar Devolución" action button inside expanded rows — stays native
- All state, toggle logic, API calls

- [ ] **Step 1: Update imports**

In `frontend/src/pages/Devoluciones.jsx`, add after the existing imports:
```js
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/PageHeader'
```

- [ ] **Step 2: Replace header div with PageHeader**

Replace:
```jsx
      <div className="flex items-center justify-end mb-6 flex-wrap gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nueva devolución
        </button>
      </div>
```
with:
```jsx
      <PageHeader title="Devoluciones">
        <Button onClick={() => setModalOpen(true)}>+ Nueva devolución</Button>
      </PageHeader>
```

- [ ] **Step 3: Replace cliente filter select**

Replace:
```jsx
        <div className="p-4 border-b">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
```
with:
```jsx
        <div className="p-4 border-b">
          <Select
            nullable
            noneLabel="Todos los clientes"
            value={clienteId}
            onChange={setClienteId}
            options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            className="w-56"
          />
        </div>
```

- [ ] **Step 4: Replace empty state and make table conditional**

Replace the entire `<div className="overflow-x-auto">` block that contains the table and the empty state `<tr>`:
```jsx
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Orden origen</th>
                <th className="px-4 py-3 text-left">Destino</th>
                <th className="px-4 py-3 text-left">Nota</th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.map((d) => (
                <Fragment key={d.id}>
                  <tr
                    className="border-b border-gray-100 hover:bg-brand-50 cursor-pointer select-none"
                    onClick={() => toggle(d.id)}
                  >
                    <td className="px-4 py-3 w-6 text-gray-400 text-xs">{expanded === d.id ? '▼' : '▶'}</td>
                    <td className="px-4 py-3 w-16 text-gray-500">#{d.id}</td>
                    <td className="px-4 py-3 font-medium">{d.cliente}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{d.numero_orden_origen ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.reingresar_almacen ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Reingresada</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Merma</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs italic">{d.nota ?? '—'}</td>
                  </tr>
                  {expanded === d.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                        {!details[d.id] ? (
                          <span className="text-xs text-gray-400">Cargando...</span>
                        ) : (
                          <div className="space-y-2">
                            <table className="text-xs">
                              <thead className="text-gray-500 uppercase">
                                <tr>
                                  <th className="py-1 pr-6 text-left">Código</th>
                                  <th className="py-1 pr-6 text-left">Descripción</th>
                                  <th className="py-1 text-center">Uds devueltas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-orange-100">
                                {details[d.id].detalles?.map((det) => (
                                  <tr key={det.id}>
                                    <td className="py-1.5 pr-6 font-mono">{det.codigo}</td>
                                    <td className="py-1.5 pr-6 font-medium">{det.descripcion}</td>
                                    <td className="py-1.5 text-center font-semibold text-orange-700">{det.cantidad_unidades} uds</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              onClick={() => setEditId(d.id)}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
                            >
                              Editar Devolución
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {devoluciones.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay devoluciones registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
```
with:
```jsx
        {devoluciones.length === 0 ? (
          <EmptyState message="No hay devoluciones registradas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 w-6"></th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Orden origen</th>
                  <th className="px-4 py-3 text-left">Destino</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.map((d) => (
                  <Fragment key={d.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-brand-50 cursor-pointer select-none"
                      onClick={() => toggle(d.id)}
                    >
                      <td className="px-4 py-3 w-6 text-gray-400 text-xs">{expanded === d.id ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 w-16 text-gray-500">#{d.id}</td>
                      <td className="px-4 py-3 font-medium">{d.cliente}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{d.numero_orden_origen ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.reingresar_almacen ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Reingresada</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Merma</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs italic">{d.nota ?? '—'}</td>
                    </tr>
                    {expanded === d.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                          {!details[d.id] ? (
                            <span className="text-xs text-gray-400">Cargando...</span>
                          ) : (
                            <div className="space-y-2">
                              <table className="text-xs">
                                <thead className="text-gray-500 uppercase">
                                  <tr>
                                    <th className="py-1 pr-6 text-left">Código</th>
                                    <th className="py-1 pr-6 text-left">Descripción</th>
                                    <th className="py-1 text-center">Uds devueltas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                  {details[d.id].detalles?.map((det) => (
                                    <tr key={det.id}>
                                      <td className="py-1.5 pr-6 font-mono">{det.codigo}</td>
                                      <td className="py-1.5 pr-6 font-medium">{det.descripcion}</td>
                                      <td className="py-1.5 text-center font-semibold text-orange-700">{det.cantidad_unidades} uds</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                onClick={() => setEditId(d.id)}
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
                              >
                                Editar Devolución
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
```

- [ ] **Step 5: Verify in the browser**

Navigate to `/devoluciones`. Verify:
- "Devoluciones" heading on the left, "Nueva devolución" brand Button on the right
- Cliente filter is a Radix select with "Todos los clientes" reset option; filtering works
- With devoluciones: rows are clickable, accordion expands to show sub-table + "Editar Devolución" button
- With no devoluciones: EmptyState "No hay devoluciones registradas" centered
- Clicking "+ Nueva devolución" opens DevolucionModal

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Devoluciones.jsx
git commit -m "feat: migrate Devoluciones to component system"
```

---

### Task 5: Migrate DevolucionForm.jsx

**Files:**
- Modify: `frontend/src/pages/DevolucionForm.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select`, `FormField`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass }` import from `'../lib/styles'`
- Add imports: `Button`, `Input`, `Select`, `FormField`
- "Cliente *" → `<FormField id="cliente">` + `<Select id="cliente" placeholder="Seleccionar cliente...">`
- "Fecha" → `<FormField id="fecha">` + `<Input id="fecha" type="date">`
- "Orden origen (opcional)" (conditional) → `<FormField id="orden_origen">` + `<Select id="orden_origen" nullable noneLabel="Sin orden específica">`
- "Nota" → `<FormField id="nota">` + `<Input id="nota" placeholder="Motivo...">`
- Row cantidad inputs → `<Input className="w-24 text-center">`
- Cancel → `<Button variant="secondary" type="button">`; Submit → `<Button type="submit">`
- "← Volver" back link stays native
- "Este cliente no tiene stock en consignación." paragraph stays native

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/pages/DevolucionForm.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDevolucion, getClientes, getClienteStock, getOrdenes } from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

export default function DevolucionForm() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stockCliente, setStockCliente] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [ordenOrigenId, setOrdenOrigenId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [])

  useEffect(() => {
    if (!clienteId) { setStockCliente([]); setRows([]); setOrdenes([]); return }
    Promise.all([getClienteStock(clienteId), getOrdenes({ cliente_id: clienteId })]).then(([s, o]) => {
      setStockCliente(s.data.stock)
      setRows(s.data.stock.map((st) => ({ producto_id: st.producto_id, descripcion: st.descripcion, disponible: st.cantidad_unidades, cantidad_unidades: '' })))
      setOrdenes(o.data)
    })
  }, [clienteId])

  const setRow = (i, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], cantidad_unidades: val }
    setRows(rs)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const detalles = rows.filter((r) => Number(r.cantidad_unidades) > 0)
    if (!detalles.length) { setError('Ingrese al menos una unidad a devolver'); return }
    setLoading(true)
    try {
      await createDevolucion({
        cliente_id: Number(clienteId),
        orden_origen_id: ordenOrigenId ? Number(ordenOrigenId) : null,
        fecha,
        nota,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: Number(r.cantidad_unidades),
        })),
      })
      nav('/devoluciones')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar devolución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/devoluciones')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Nueva Devolución</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <FormField id="cliente" label="Cliente *">
            <Select
              id="cliente"
              value={clienteId}
              onChange={setClienteId}
              placeholder="Seleccionar cliente..."
              options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="fecha" label="Fecha">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </FormField>
            {ordenes.length > 0 && (
              <FormField id="orden_origen" label="Orden origen (opcional)">
                <Select
                  id="orden_origen"
                  nullable
                  noneLabel="Sin orden específica"
                  value={ordenOrigenId}
                  onChange={setOrdenOrigenId}
                  options={ordenes.map((o) => ({ value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}` }))}
                />
              </FormField>
            )}
          </div>

          <FormField id="nota" label="Nota">
            <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Motivo de la devolución..." />
          </FormField>
        </div>

        {clienteId && (
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Unidades a devolver</h3>
            {rows.length === 0 ? (
              <p className="text-gray-400 text-sm">Este cliente no tiene stock en consignación.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Disponible</th>
                      <th className="px-3 py-2 text-center">Cantidad a devolver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{row.descripcion}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{row.disponible}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={row.disponible}
                            className="w-24 text-center"
                            value={row.cantidad_unidades}
                            onChange={(e) => setRow(i, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => nav('/devoluciones')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar Devolución'}</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `/devoluciones/nueva`. Verify:
- "Cliente *" label click opens the Radix select
- Selecting a client loads the stock rows and (if applicable) the orden-origen select
- "Fecha" has brand focus ring
- "Orden origen (opcional)" Radix select appears when there are ordenes; "Sin orden específica" is the reset option
- "Nota" has brand focus ring
- Row cantidad inputs are `w-24` compact with focus rings
- "Cancelar" gray secondary; "Registrar Devolución" brand primary

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DevolucionForm.jsx
git commit -m "feat: migrate DevolucionForm to component system"
```
