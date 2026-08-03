# Phase 3 Plan C — Component Migration (Modal Internals)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all `inputClass`/`selectClass` raw-style dependencies from 7 modal components and replace with the shared `Button`, `Input`, `Select`, and `FormField` components.

**Architecture:** Each task is one modal file — purely presentational migration with zero business logic changes. All tasks are independent. Shared components are already built in `frontend/src/components/ui/`.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3.4, Radix UI. No automated test suite — verification is opening the modal in the Vite dev server (`cd frontend && npm run dev`).

## Global Constraints

- Never touch business logic, state management, API calls, or `useEffect` hooks
- `Select` `onChange` receives the raw string value (not SyntheticEvent) — use `onChange={setter}` or `onChange={(val) => set('field', val)}`
- `Input` `onChange` receives SyntheticEvent — use `onChange={(e) => setter(e.target.value)}`
- Every `<FormField id="X">` must have a child `<Input id="X">` or `<Select id="X">` with the matching id
- `Select` `options` values must be strings: `String(item.id)`, not `item.id`
- Nullable filter selects use `nullable noneLabel="..."` — no `placeholder` prop
- Required-chooser selects use `placeholder="..."` — no `nullable` prop
- `PrecioInput` is a custom parsing component — NOT replaceable with `Input`. Remove `inputClass` dependency by inlining classes: `"border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`
- `FormField` renders `text-sm` labels — do NOT use FormField in sections with `text-xs` labels (OrdenModal, EntradaInventarioModal compact header)
- Textareas use FormField + native `<textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition">`
- Entire dynamic product-row tables stay native in all modals
- `grupo_filtro` transparent selects in product rows stay native; remove `selectClass` interpolation by inlining: `"w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`
- Checkboxes (`<input type="checkbox">`) stay native
- "🔍 Vista previa", "+ Agregar producto", "+ Agregar teléfono", "✕" remove buttons — all stay native
- Import paths from `src/components/`: `'./ui/Button'`, `'./ui/Input'`, `'./ui/Select'`, `'./ui/FormField'`

---

### Task 1: Migrate ProductoModal.jsx

**Files:**
- Modify: `frontend/src/components/ProductoModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select`, `FormField` from `./ui/`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `const lbl`, `{ inputClass, selectClass }` import
- Add `Button`, `Input`, `Select`, `FormField` imports
- 4 form fields → FormField+Input/Select
- "Precios por bulto" section label: `<label className={lbl}>` → `<p className="text-sm font-medium text-gray-700 mb-1">` (section label for a list, not a single input — no FormField)
- `PrecioInput` stays — already has inline `className` (no inputClass)
- Form footer + confirm footer → Button components

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/components/ProductoModal.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import PrecioInput, { parsePrecio } from './ui/PrecioInput'
import {
  getProducto, createProducto, updateProducto,
  getGruposProductos, getListasPrecios,
} from '../api'
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import FormField from './ui/FormField'

const emptyForm = { codigo: '', descripcion: '', unidades_por_bulto: 1, grupo_id: '', activo: true, precios: [] }

export default function ProductoModal({ open, onClose, productoId, onSaved }) {
  const isEdit = Boolean(productoId)
  const [form, setForm] = useState(emptyForm)
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('form')

  useEffect(() => {
    if (!open) return
    setError('')
    setStep('form')
    Promise.all([getGruposProductos(), getListasPrecios()]).then(([g, l]) => {
      setGrupos(g.data); setListas(l.data)
    })
    if (isEdit) {
      getProducto(productoId).then((r) => {
        const upb = r.data.unidades_por_bulto || 1
        const precios = (r.data.precios ?? []).map((p) => ({
          lista_id: p.lista_id,
          precio_bulto_str: String(Number(p.precio_usd) * upb),
        }))
        setForm({ ...r.data, grupo_id: r.data.grupo_id ?? '', precios })
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, productoId])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const setPrecio = (listaId, valorBulto) => {
    const precios = [...form.precios]
    const idx = precios.findIndex((p) => p.lista_id === listaId)
    if (idx >= 0) precios[idx] = { ...precios[idx], precio_bulto_str: valorBulto }
    else precios.push({ lista_id: listaId, precio_bulto_str: valorBulto })
    set('precios', precios)
  }

  const getPrecio = (listaId) =>
    form.precios.find((p) => p.lista_id === listaId)?.precio_bulto_str ?? ''

  const buildPreciosOut = () => {
    const upb = Number(form.unidades_por_bulto) || 1
    const out = []
    for (const p of form.precios) {
      if (p.precio_bulto_str === '' || p.precio_bulto_str == null) continue
      const parsed = parsePrecio(p.precio_bulto_str)
      if (parsed == null || parsed < 0) {
        setError('Precio inválido. Usa números con "." o "," como separador decimal.')
        return null
      }
      if (parsed > 0) out.push({ lista_id: p.lista_id, precio_usd: parsed / upb })
    }
    return out
  }

  const goConfirm = (e) => {
    e.preventDefault()
    setError('')
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      setError('Código y descripción son requeridos')
      return
    }
    if (buildPreciosOut() === null) return
    setStep('confirm')
  }

  const doSave = async () => {
    setError('')
    const preciosOut = buildPreciosOut()
    if (preciosOut === null) { setStep('form'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        codigo: form.codigo.trim(),
        grupo_id: form.grupo_id || null,
        precios: preciosOut,
      }
      if (isEdit) await updateProducto(productoId, payload)
      else await createProducto(payload)
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const upb = Number(form.unidades_por_bulto) || 1
  const nombreGrupo = grupos.find((g) => String(g.id) === String(form.grupo_id))?.nombre
  const preciosResumen = listas
    .map((l) => ({ nombre: l.nombre, str: getPrecio(l.id) }))
    .filter((x) => x.str !== '' && x.str != null)

  const SummaryRow = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={
        step === 'confirm'
          ? (isEdit ? 'Confirmar cambios del producto' : 'Confirmar nuevo producto')
          : (isEdit ? 'Editar producto' : 'Nuevo producto')
      }>
        <Alert type="error" message={error} />

        {step === 'confirm' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Revisa los datos antes de {isEdit ? 'guardar los cambios' : 'crear el producto'}:
            </p>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <SummaryRow label="Código" value={<span className="font-mono font-medium">{form.codigo.trim()}</span>} />
              <SummaryRow label="Descripción" value={<span className="font-medium">{form.descripcion}</span>} />
              <SummaryRow label="Unidades por bulto" value={String(upb)} />
              <SummaryRow label="Grupo" value={nombreGrupo} />
              <SummaryRow label="Estado" value={form.activo ? 'Activo' : 'Inactivo'} />
              <SummaryRow
                label="Precios por bulto"
                value={
                  preciosResumen.length ? (
                    <ul className="space-y-0.5">
                      {preciosResumen.map((p) => (
                        <li key={p.nombre}>
                          <span className="text-gray-500">{p.nombre}:</span>{' '}
                          <span className="font-medium">${parsePrecio(p.str)?.toFixed(2)}/bulto</span>
                        </li>
                      ))}
                    </ul>
                  ) : null
                }
              />
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={() => setStep('form')}>
                ← Volver a editar
              </Button>
              <Button type="button" onClick={doSave} disabled={loading}>
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar y guardar' : 'Confirmar y crear')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={goConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormField id="codigo" label="Código *">
                  <Input id="codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required />
                </FormField>
                {isEdit && <p className="text-xs text-gray-400 mt-1">Editable. Debe ser único.</p>}
              </div>
              <FormField id="upb" label="Unidades por bulto *">
                <Input id="upb" type="number" min={1} value={form.unidades_por_bulto}
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
                <p className="text-sm font-medium text-gray-700 mb-1">Precios por bulto (USD)</p>
                <p className="text-xs text-gray-400 mb-2">Usa punto o coma como separador decimal (ej: 10.50 o 10,50)</p>
                <div className="space-y-2">
                  {listas.map((l) => (
                    <div key={l.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 flex-1">{l.nombre}</span>
                      <PrecioInput
                        placeholder="0.00"
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={getPrecio(l.id)}
                        onChange={(v) => setPrecio(l.id, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Revisar →</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `/productos` → click "Editar" on any product (or "+ Nuevo producto"). Verify:
- Labels click-focus their inputs (FormField `htmlFor` wiring)
- "Código *", "Unidades por bulto *", "Descripción *" have brand focus ring
- "Grupo" label click opens Radix select; "Sin grupo" resets
- PrecioInput rows still accept decimal pricing
- "Cancelar" is gray secondary; "Revisar →" is brand primary
- Confirm step shows summary; "← Volver a editar" is gray secondary; "Confirmar y X" is brand primary

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ProductoModal.jsx
git commit -m "feat: migrate ProductoModal to component system"
```

---

### Task 2: Migrate ClienteModal.jsx

**Files:**
- Modify: `frontend/src/components/ClienteModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select`, `FormField` from `./ui/`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `const lbl`, `{ inputClass, selectClass }` import
- Add `Button`, `Input`, `Select`, `FormField` imports
- 7 text/number inputs → FormField+Input
- 2 textareas → FormField + native textarea (inline classes)
- 2 selects → FormField+Select nullable
- Teléfono inputs in dynamic rows → Input (no FormField — already in flex row)
- Checkboxes for listas_precios stay native
- Form + confirm footers → Button

- [ ] **Step 1: Write the migrated file**

Replace the entire contents of `frontend/src/components/ClienteModal.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import {
  getCliente, createCliente, updateCliente,
  getZonas, getGruposClientes, getListasPrecios,
} from '../api'
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import FormField from './ui/FormField'

const emptyForm = {
  codigo: '', razon_social: '', rif: '', direccion: '',
  zona_id: '', grupo_id: '', contacto: '', cobrador: '',
  vendedor: '', observaciones: '', activo: true,
  telefonos: [''], listas_precios: [],
}

export default function ClienteModal({ open, onClose, clienteId, onSaved }) {
  const isEdit = Boolean(clienteId)
  const [form, setForm] = useState(emptyForm)
  const [zonas, setZonas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('form')

  useEffect(() => {
    if (!open) return
    setError('')
    setStep('form')
    Promise.all([getZonas(), getGruposClientes(), getListasPrecios()]).then(
      ([z, g, l]) => { setZonas(z.data); setGrupos(g.data); setListas(l.data) }
    )
    if (isEdit) {
      getCliente(clienteId).then((r) => {
        const c = r.data
        setForm({ ...c, telefonos: c.telefonos?.length ? c.telefonos : [''], zona_id: c.zona_id ?? '', grupo_id: c.grupo_id ?? '' })
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, clienteId])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))
  const setTel = (i, val) => { const t = [...form.telefonos]; t[i] = val; set('telefonos', t) }
  const addTel = () => set('telefonos', [...form.telefonos, ''])
  const removeTel = (i) => set('telefonos', form.telefonos.filter((_, idx) => idx !== i))
  const toggleLista = (id) => set('listas_precios', form.listas_precios.includes(id) ? form.listas_precios.filter((x) => x !== id) : [...form.listas_precios, id])

  const goConfirm = (e) => {
    e.preventDefault()
    setError('')
    if (!form.codigo.trim() || !form.razon_social.trim()) {
      setError('Código y razón social son requeridos')
      return
    }
    setStep('confirm')
  }

  const doSave = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, codigo: form.codigo.trim(), telefonos: form.telefonos.filter((t) => t.trim()), zona_id: form.zona_id || null, grupo_id: form.grupo_id || null }
      if (isEdit) await updateCliente(clienteId, payload)
      else await createCliente(payload)
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const nombreZona = zonas.find((z) => String(z.id) === String(form.zona_id))?.nombre
  const nombreGrupo = grupos.find((g) => String(g.id) === String(form.grupo_id))?.nombre
  const nombresListas = listas.filter((l) => form.listas_precios.includes(l.id)).map((l) => l.nombre)
  const telefonosLlenos = form.telefonos.filter((t) => t.trim())

  const SummaryRow = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )

  const tareaClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={
        step === 'confirm'
          ? (isEdit ? 'Confirmar cambios del cliente' : 'Confirmar nuevo cliente')
          : (isEdit ? 'Editar cliente' : 'Nuevo cliente')
      }>
        <Alert type="error" message={error} />

        {step === 'confirm' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Revisa los datos antes de {isEdit ? 'guardar los cambios' : 'crear el cliente'}:
            </p>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <SummaryRow label="Código" value={<span className="font-mono font-medium">{form.codigo.trim()}</span>} />
              <SummaryRow label="Razón social" value={<span className="font-medium">{form.razon_social}</span>} />
              <SummaryRow label="RIF" value={form.rif} />
              <SummaryRow label="Dirección" value={form.direccion} />
              <SummaryRow label="Zona" value={nombreZona} />
              <SummaryRow label="Grupo" value={nombreGrupo} />
              <SummaryRow label="Contacto" value={form.contacto} />
              <SummaryRow label="Cobrador" value={form.cobrador} />
              <SummaryRow label="Vendedor" value={form.vendedor} />
              <SummaryRow label="Teléfonos" value={telefonosLlenos.length ? telefonosLlenos.join(', ') : null} />
              <SummaryRow label="Listas de precios" value={nombresListas.length ? nombresListas.join(', ') : null} />
              <SummaryRow label="Observaciones" value={form.observaciones} />
              <SummaryRow label="Estado" value={form.activo ? 'Activo' : 'Inactivo'} />
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={() => setStep('form')}>
                ← Volver a editar
              </Button>
              <Button type="button" onClick={doSave} disabled={loading}>
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar y guardar' : 'Confirmar y crear')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={goConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormField id="codigo" label="Código *">
                  <Input id="codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required />
                </FormField>
                {isEdit && <p className="text-xs text-gray-400 mt-1">Editable. Debe ser único.</p>}
              </div>
              <FormField id="rif" label="RIF">
                <Input id="rif" value={form.rif ?? ''} onChange={(e) => set('rif', e.target.value)} />
              </FormField>
            </div>

            <FormField id="razon_social" label="Razón Social *">
              <Input id="razon_social" value={form.razon_social} onChange={(e) => set('razon_social', e.target.value)} required />
            </FormField>

            <FormField id="direccion" label="Dirección">
              <textarea id="direccion" className={tareaClass} rows={2} value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="zona_id" label="Zona">
                <Select
                  id="zona_id"
                  nullable
                  noneLabel="Sin zona"
                  value={form.zona_id}
                  onChange={(val) => set('zona_id', val)}
                  options={zonas.map((z) => ({ value: String(z.id), label: z.nombre }))}
                />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField id="contacto" label="Contacto">
                <Input id="contacto" value={form.contacto ?? ''} onChange={(e) => set('contacto', e.target.value)} />
              </FormField>
              <FormField id="cobrador" label="Cobrador">
                <Input id="cobrador" value={form.cobrador ?? ''} onChange={(e) => set('cobrador', e.target.value)} />
              </FormField>
              <FormField id="vendedor" label="Vendedor">
                <Input id="vendedor" value={form.vendedor ?? ''} onChange={(e) => set('vendedor', e.target.value)} />
              </FormField>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Teléfonos</p>
              {form.telefonos.map((tel, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={tel} onChange={(e) => setTel(i, e.target.value)} placeholder="04XX-XXXXXXX" />
                  {form.telefonos.length > 1 && (
                    <button type="button" onClick={() => removeTel(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTel} className="text-sm text-brand-600 hover:underline">+ Agregar teléfono</button>
            </div>

            {listas.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Listas de precios</p>
                <div className="flex flex-wrap gap-3">
                  {listas.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.listas_precios.includes(l.id)} onChange={() => toggleLista(l.id)} className="rounded" />
                      {l.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <FormField id="observaciones" label="Observaciones">
              <textarea id="observaciones" className={tareaClass} rows={2} value={form.observaciones ?? ''} onChange={(e) => set('observaciones', e.target.value)} />
            </FormField>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Revisar →</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `/clientes` → click "Editar" on any client (or "+ Nuevo cliente"). Verify:
- All labels click-focus their inputs
- "Dirección" and "Observaciones" are textareas with brand focus ring
- "Zona" and "Grupo" open Radix selects with "Sin zona"/"Sin grupo" reset options
- Teléfono rows: Input + "✕" button; "+ Agregar teléfono" stays native
- Listas checkboxes stay native
- Confirm step shows summary table; buttons are correct

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ClienteModal.jsx
git commit -m "feat: migrate ClienteModal to component system"
```

---

### Task 3: Migrate ActualizacionPreciosModal.jsx

**Files:**
- Modify: `frontend/src/components/ActualizacionPreciosModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Select`, `FormField` from `./ui/`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass }` import from `'../lib/styles'`
- Add `Button`, `Select`, `FormField` imports
- "Lista de precios" select → FormField+Select (placeholder — required chooser)
- "Grupo de productos" select → FormField+Select (nullable "Todos los grupos")
- PrecioInput `className`: remove `${inputClass}` interpolation → inline classes
- "Tipo de ajuste" + "Valor" sections: keep native labels (button group and PrecioInput can't use FormField)
- Cancel → Button secondary; "Aplicar cambios" → Button
- "🔍 Vista previa" stays native

- [ ] **Step 1: Update imports**

In `frontend/src/components/ActualizacionPreciosModal.jsx`, replace:
```js
import { inputClass } from '../lib/styles'
```
with:
```js
import Button from './ui/Button'
import Select from './ui/Select'
import FormField from './ui/FormField'
```

- [ ] **Step 2: Replace the two selects**

Replace:
```jsx
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios *</label>
            <select className={inputClass} value={listaId} onChange={(e) => setListaId(e.target.value)}>
              <option value="">Seleccionar lista...</option>
              {listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de productos</label>
            <select className={inputClass} value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              <option value="">Todos los grupos</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
```
with:
```jsx
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormField id="lista" label="Lista de precios *">
            <Select
              id="lista"
              placeholder="Seleccionar lista..."
              value={listaId}
              onChange={setListaId}
              options={listas.map((l) => ({ value: String(l.id), label: l.nombre }))}
            />
          </FormField>
          <FormField id="grupo" label="Grupo de productos">
            <Select
              id="grupo"
              nullable
              noneLabel="Todos los grupos"
              value={grupoId}
              onChange={setGrupoId}
              options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
            />
          </FormField>
```

- [ ] **Step 3: Inline PrecioInput className**

Replace:
```jsx
              <PrecioInput
                allowNegative
                placeholder={tipo === 'porcentaje' ? 'Ej: 10 o -5' : 'Ej: 0.50 o -1.00'}
                className={`${inputClass} pl-8`}
                value={valor}
                onChange={setValor}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              />
```
with:
```jsx
              <PrecioInput
                allowNegative
                placeholder={tipo === 'porcentaje' ? 'Ej: 10 o -5' : 'Ej: 0.50 o -1.00'}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition pl-8"
                value={valor}
                onChange={setValor}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              />
```

- [ ] **Step 4: Replace footer buttons**

Replace:
```jsx
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !preview || preview.total === 0}
            className="px-5 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {applying ? 'Aplicando...' : preview ? `Aplicar ${preview.total} cambio${preview.total !== 1 ? 's' : ''}` : 'Aplicar cambios'}
          </button>
        </div>
```
with:
```jsx
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applying || !preview || preview.total === 0}
          >
            {applying ? 'Aplicando...' : preview ? `Aplicar ${preview.total} cambio${preview.total !== 1 ? 's' : ''}` : 'Aplicar cambios'}
          </Button>
        </div>
```

- [ ] **Step 5: Verify in the browser**

Navigate to `/productos` → click "Actualizar precios masivo". Verify:
- "Lista de precios *" click-focuses the Radix select; shows placeholder until selected
- "Grupo de productos" Radix select with "Todos los grupos" reset
- "Tipo de ajuste" segmented buttons remain native
- "Valor" PrecioInput has brand focus ring
- "🔍 Vista previa" stays as native brand-outline button
- "Cancelar" gray secondary; "Aplicar cambios" brand primary (disabled until preview)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ActualizacionPreciosModal.jsx
git commit -m "feat: migrate ActualizacionPreciosModal to component system"
```

---

### Task 4: Migrate DevolucionModal.jsx

**Files:**
- Modify: `frontend/src/components/DevolucionModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select`, `FormField` from `./ui/`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `const lbl`, `{ inputClass, selectClass }` imports
- Add `Button`, `Input`, `Select`, `FormField` imports
- Keep `const inpRO` (used 3× for read-only display divs)
- Create mode: cliente select → Select placeholder; native label inline
- Create mode: orden select → Select placeholder; native label inline
- isEdit display divs: `className={inpRO}` stays
- Nota → FormField+Input
- Row bultos/sueltas inputs: already fully inline — **no change**
- Reingresar checkbox: stays native
- Cancel → Button secondary; Submit → Button

- [ ] **Step 1: Update imports and remove lbl**

Replace:
```js
import Alert from './Alert'
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import FormField from './ui/FormField'
```

Remove the line:
```js
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'
```

- [ ] **Step 2: Replace cliente section**

Replace:
```jsx
          <div>
            <label className={lbl}>Cliente *</label>
            {isEdit ? (
              <div className={inpRO}>{clienteNombre}</div>
            ) : (
              <select className={`w-full ${selectClass}`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            )}
          </div>
```
with:
```jsx
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            {isEdit ? (
              <div className={inpRO}>{clienteNombre}</div>
            ) : (
              <Select
                placeholder="Seleccionar cliente..."
                value={clienteId}
                onChange={setClienteId}
                options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              />
            )}
          </div>
```

- [ ] **Step 3: Replace orden section**

Replace:
```jsx
          {isEdit ? (
            <div>
              <label className={lbl}>Orden de origen</label>
              <div className={inpRO}>#{ordenNumero}</div>
            </div>
          ) : clienteId && (
            <div>
              <label className={lbl}>Orden de origen *</label>
              {ordenes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Este cliente no tiene órdenes activas.</p>
              ) : (
                <select className={`w-full ${selectClass}`} value={ordenId} onChange={(e) => setOrdenId(e.target.value)} required>
                  <option value="">Seleccionar orden...</option>
                  {ordenes.map((o) => (
                    <option key={o.id} value={o.id}>#{o.numero_orden} — {o.fecha_emision}</option>
                  ))}
                </select>
              )}
            </div>
          )}
```
with:
```jsx
          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de origen</label>
              <div className={inpRO}>#{ordenNumero}</div>
            </div>
          ) : clienteId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de origen *</label>
              {ordenes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Este cliente no tiene órdenes activas.</p>
              ) : (
                <Select
                  placeholder="Seleccionar orden..."
                  value={ordenId}
                  onChange={setOrdenId}
                  options={ordenes.map((o) => ({ value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}` }))}
                />
              )}
            </div>
          )}
```

- [ ] **Step 4: Replace nota input**

Replace:
```jsx
              <div>
                <label className={lbl}>Nota / Motivo</label>
                <input className={inputClass} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Producto en mal estado..." />
              </div>
```
with:
```jsx
              <FormField id="nota" label="Nota / Motivo">
                <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Producto en mal estado..." />
              </FormField>
```

- [ ] **Step 5: Replace footer buttons**

Replace:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || (!isEdit && !ordenId)} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar Devolución')}
            </button>
          </div>
```
with:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || (!isEdit && !ordenId)}>
              {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar Devolución')}
            </Button>
          </div>
```

- [ ] **Step 6: Verify in the browser**

Navigate to `/devoluciones` → click "+ Nueva devolución". Verify:
- "Cliente *" label inline; Select placeholder "Seleccionar cliente..."
- Selecting a client shows "Orden de origen *" Select
- "Orden de origen *" with no active orders shows the gray text paragraph
- Rows table (bultos/sueltas) unchanged — existing inline classes still work
- "Nota / Motivo" label click-focuses via FormField wiring
- Reingresar checkbox stays native
- Cancel gray secondary; Submit brand primary

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/DevolucionModal.jsx
git commit -m "feat: migrate DevolucionModal to component system"
```

---

### Task 5: Migrate OrdenModal.jsx

**Files:**
- Modify: `frontend/src/components/OrdenModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Select` from `./ui/` (no FormField — compact xs labels)
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass, selectClass }` import
- Add `Button`, `Input`, `Select` imports
- Header: cliente → Select (create) or display div (isEdit); fecha/tasa/nota/motivo → Input
- xs labels (`text-xs font-medium`) stay native — no FormField
- Rows table stays entirely native; `grupo_filtro` selects → inline classes; bultos/sueltas → Input
- isEdit display div: `${inputClass} bg-gray-100 text-gray-600` → inline
- Footer → Button

- [ ] **Step 1: Update imports**

Replace:
```js
import Alert from './Alert'
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
```

- [ ] **Step 2: Replace cliente field**

Replace:
```jsx
              {isEdit ? (
                <div className={`${inputClass} bg-gray-100 text-gray-600`}>{clienteNombre}</div>
              ) : (
                <select className={`w-full ${selectClass}`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              )}
```
with:
```jsx
              {isEdit ? (
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600">{clienteNombre}</div>
              ) : (
                <Select
                  placeholder="Seleccionar cliente..."
                  value={clienteId}
                  onChange={setClienteId}
                  options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
                  className="w-full"
                />
              )}
```

- [ ] **Step 3: Replace fecha input**

Replace:
```jsx
                <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
```
with:
```jsx
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
```

- [ ] **Step 4: Replace tasa input**

Replace:
```jsx
                <input
                  type="number" step="0.0001" min="0"
                  placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                  className={inputClass}
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                />
```
with:
```jsx
                <Input
                  type="number" step="0.0001" min="0"
                  placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                />
```

- [ ] **Step 5: Replace nota input**

Replace:
```jsx
                <input className={inputClass} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
```
with:
```jsx
                <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
```

- [ ] **Step 6: Replace grupo_filtro selects in rows**

Replace (there is exactly one instance of this pattern):
```jsx
                          <select
                            className={`w-full mb-1 text-xs text-gray-500 bg-gray-50 ${selectClass}`}
                            value={row.grupo_filtro}
                            onChange={(e) => setRow(i, 'grupo_filtro', e.target.value)}
                          >
```
with:
```jsx
                          <select
                            className="w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                            value={row.grupo_filtro}
                            onChange={(e) => setRow(i, 'grupo_filtro', e.target.value)}
                          >
```

- [ ] **Step 7: Replace bultos and sueltas inputs in rows**

Replace:
```jsx
                        <td className="px-3 py-2">
                          <input
                            type="text" inputMode="numeric"
                            className={`w-full text-center py-1.5 ${inputClass}`}
                            value={row.bultos}
                            onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRow(i, 'bultos', e.target.value) }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text" inputMode="numeric"
                            className={`w-full text-center py-1.5 ${inputClass}`}
                            value={row.sueltas}
                            onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRow(i, 'sueltas', e.target.value) }}
                          />
                        </td>
```
with:
```jsx
                        <td className="px-3 py-2">
                          <Input
                            type="text" inputMode="numeric"
                            className="w-full text-center py-1.5"
                            value={row.bultos}
                            onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRow(i, 'bultos', e.target.value) }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text" inputMode="numeric"
                            className="w-full text-center py-1.5"
                            value={row.sueltas}
                            onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRow(i, 'sueltas', e.target.value) }}
                          />
                        </td>
```

- [ ] **Step 8: Replace motivo input (isEdit)**

Replace:
```jsx
              <input
                className={inputClass} value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: el cliente solicitó cambiar el precio de Mini Velón"
              />
```
with:
```jsx
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: el cliente solicitó cambiar el precio de Mini Velón"
              />
```

- [ ] **Step 9: Replace footer buttons**

Replace:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
              {loading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar cambios' : 'Crear Orden')}
            </button>
          </div>
```
with:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar cambios' : 'Crear Orden')}
            </Button>
          </div>
```

- [ ] **Step 10: Verify in the browser**

Navigate to `/ordenes` → click "+ Nueva orden". Verify:
- Cliente Radix Select shows placeholder; selecting a client works
- Fecha/tasa/nota all have brand focus ring
- Product rows: group filter still works; bultos/sueltas have brand focus ring; PrecioInput unchanged
- "Lista de precios" transparent select in rows stays native
- "Cancelar" gray secondary; "Crear Orden" brand primary
- Edit mode: cliente shown as gray display div; motivo Input at bottom

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/OrdenModal.jsx
git commit -m "feat: migrate OrdenModal to component system"
```

---

### Task 6: Migrate ReporteVentaModal.jsx

**Files:**
- Modify: `frontend/src/components/ReporteVentaModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `FormField` from `./ui/`
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `const lbl`, `{ inputClass, selectClass }` import (`selectClass` was unused but imported)
- Add `Button`, `Input`, `FormField` imports
- `fecha` → FormField+Input
- `tasaManual` (!isCliente): keep native label (has `flex items-center` for HelpTooltip) + Input
- "Unidades vendidas" section label: `className={lbl}` → inline string
- Row bultos/sueltas inputs: already fully inline classes — **no change**
- PrecioInput: already fully inline — **no change**
- Cancel + Submit → Button

- [ ] **Step 1: Update imports and remove lbl**

Replace:
```js
import Alert from './Alert'
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import FormField from './ui/FormField'
```

Remove the line:
```js
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'
```

- [ ] **Step 2: Replace fecha field**

Replace:
```jsx
            <div>
              <label className={lbl}>Fecha de cobro</label>
              <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
```
with:
```jsx
            <FormField id="fecha" label="Fecha de cobro">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </FormField>
```

- [ ] **Step 3: Replace tasa field**

Replace:
```jsx
              <div>
                <label className={`${lbl} flex items-center`}>
                Tasa BCV al cobro (Bs/$)
                <HelpTooltip text="Tipo de cambio del BCV al momento en que el cliente realizó el pago. Puede diferir de la tasa del despacho original." />
              </label>
                <input
                  type="number" min="0" step="0.0001"
                  className={inputClass}
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                  placeholder="Ej: 45.50"
                  required
                />
              </div>
```
with:
```jsx
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Tasa BCV al cobro (Bs/$)
                  <HelpTooltip text="Tipo de cambio del BCV al momento en que el cliente realizó el pago. Puede diferir de la tasa del despacho original." />
                </label>
                <Input
                  type="number" min="0" step="0.0001"
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                  placeholder="Ej: 45.50"
                  required
                />
              </div>
```

- [ ] **Step 4: Inline the "Unidades vendidas" section label**

Replace:
```jsx
            <label className={lbl}>Unidades vendidas</label>
```
with:
```jsx
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidades vendidas</label>
```

- [ ] **Step 5: Replace footer buttons**

Replace:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || rows.length === 0} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Registrando...' : 'Registrar Reporte'}
            </button>
          </div>
```
with:
```jsx
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || rows.length === 0}>
              {loading ? 'Registrando...' : 'Registrar Reporte'}
            </Button>
          </div>
```

- [ ] **Step 6: Verify in the browser**

Navigate to `/ordenes` → expand an active order → click "Registrar Reporte". Verify:
- "Fecha de cobro" label click-focuses via FormField; brand focus ring
- "Tasa BCV al cobro" label shows HelpTooltip icon inline; Input has brand focus ring
- Product rows unchanged (bultos/sueltas/precio inline)
- Cancel gray secondary; "Registrar Reporte" brand primary (disabled when no rows)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ReporteVentaModal.jsx
git commit -m "feat: migrate ReporteVentaModal to component system"
```

---

### Task 7: Migrate EntradaInventarioModal.jsx

**Files:**
- Modify: `frontend/src/components/EntradaInventarioModal.jsx`

**Interfaces:**
- Consumes: `Button`, `Input` from `./ui/` (no FormField — xs labels; no Select — grupo_filtro stays native)
- Produces: Nothing consumed by other tasks

**What changes:**
- Remove `{ inputClass, selectClass }` import
- Add `Button`, `Input` imports
- `fecha` → Input (xs label stays native — no FormField)
- `nota` → Input (xs label stays native — no FormField)
- `grupo_filtro` selects in rows: stays native; remove `${selectClass}` → inline classes
- `bultos`/`sueltas` in rows → Input className="w-full text-center py-1.5"
- Form footer: Cancel → Button secondary; "Revisar y confirmar →" → Button
- Confirm footer: "← Volver y corregir" → Button secondary; "Confirmar ingreso/cambios" → Button

- [ ] **Step 1: Update imports**

Replace:
```js
import Alert from './Alert'
import { inputClass, selectClass } from '../lib/styles'
```
with:
```js
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
```

- [ ] **Step 2: Replace header fecha and nota inputs**

Replace:
```jsx
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input
                  className={inputClass} value={nota} onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Factura #123, proveedor XYZ..."
                />
              </div>
```
with:
```jsx
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Factura #123, proveedor XYZ..." />
              </div>
```

- [ ] **Step 3: Replace grupo_filtro selects in rows**

Replace:
```jsx
                            <select
                              className={`w-full mb-1 text-xs text-gray-500 bg-gray-50 ${selectClass}`}
                              value={row.grupo_filtro}
                              onChange={(e) => setRow(i, 'grupo_filtro', e.target.value)}
                            >
```
with:
```jsx
                            <select
                              className="w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                              value={row.grupo_filtro}
                              onChange={(e) => setRow(i, 'grupo_filtro', e.target.value)}
                            >
```

- [ ] **Step 4: Replace bultos and sueltas inputs in rows**

Replace:
```jsx
                          <td className="px-3 py-2">
                            <input
                              type="number" min={0} className={`w-full text-center py-1.5 ${inputClass}`}
                              value={row.bultos}
                              onChange={(e) => setRow(i, 'bultos', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min={0} max={upb - 1} className={`w-full text-center py-1.5 ${inputClass}`}
                              value={row.sueltas}
                              onChange={(e) => setRow(i, 'sueltas', e.target.value)}
                            />
                          </td>
```
with:
```jsx
                          <td className="px-3 py-2">
                            <Input
                              type="number" min={0}
                              className="w-full text-center py-1.5"
                              value={row.bultos}
                              onChange={(e) => setRow(i, 'bultos', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number" min={0} max={upb - 1}
                              className="w-full text-center py-1.5"
                              value={row.sueltas}
                              onChange={(e) => setRow(i, 'sueltas', e.target.value)}
                            />
                          </td>
```

- [ ] **Step 5: Replace form footer buttons**

Replace:
```jsx
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
                Revisar y confirmar →
              </button>
            </div>
```
with:
```jsx
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Revisar y confirmar →</Button>
            </div>
```

- [ ] **Step 6: Replace confirm footer buttons**

Replace:
```jsx
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setStep('form')} disabled={loading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                ← Volver y corregir
              </button>
              <button type="button" onClick={submit} disabled={loading}
                className="px-5 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 font-medium">
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar cambios' : 'Confirmar ingreso')}
              </button>
            </div>
```
with:
```jsx
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="secondary" type="button" onClick={() => setStep('form')} disabled={loading}>
                ← Volver y corregir
              </Button>
              <Button type="button" onClick={submit} disabled={loading}>
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar cambios' : 'Confirmar ingreso')}
              </Button>
            </div>
```

- [ ] **Step 7: Verify in the browser**

Navigate to `/inventario` (or wherever EntradaInventarioModal is opened). Verify:
- "Fecha" and "Nota (opcional)" xs labels stay small; Input focus ring
- Product rows: group filter still works (native select, compact styling intact); bultos/sueltas have brand focus ring
- "Revisar y confirmar →" is brand primary Button
- Confirm step: "← Volver y corregir" gray secondary; "Confirmar ingreso" brand primary

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/EntradaInventarioModal.jsx
git commit -m "feat: migrate EntradaInventarioModal to component system"
```
