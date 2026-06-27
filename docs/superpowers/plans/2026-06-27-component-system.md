# Component System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared component library (Input, Label, Select, Checkbox, FormField, Table, EmptyState), delete the orphaned Modal.jsx, and migrate Clientes.jsx as the reference page.

**Architecture:** Radix UI primitives wrapped in styled components that match the existing Dialog/Tooltip pattern. All interactive fields share the same "outlined with character" visual system (border-gray-300 at rest → border-gray-400 on hover → brand-500 ring on focus). Clientes.jsx becomes the reference implementation for Phase 3 page migrations.

**Tech Stack:** React 18, Tailwind CSS 3.4, Radix UI (@radix-ui/react-select + @radix-ui/react-label + @radix-ui/react-checkbox), tailwind-merge + clsx via `cn()` from `src/lib/utils.js`

## Global Constraints

- All new components live in `frontend/src/components/ui/`
- Use `cn()` from `../../lib/utils` (already exports `twMerge(clsx(...))`)
- Brand color scale: brand-50 through brand-900 (brand-600 = #1f4d3a is primary)
- `ring-brand-500/20` = subtle focus ring (Tailwind JIT, works with v3.4)
- No test framework is installed — verify visually by running `npm run dev` from `frontend/`
- Import paths are relative; never use path aliases

---

## File Map

| Action | Path |
|--------|------|
| Create | `frontend/src/components/ui/Input.jsx` |
| Create | `frontend/src/components/ui/Label.jsx` |
| Create | `frontend/src/components/ui/Select.jsx` |
| Create | `frontend/src/components/ui/Checkbox.jsx` |
| Create | `frontend/src/components/ui/FormField.jsx` |
| Create | `frontend/src/components/ui/Table.jsx` |
| Create | `frontend/src/components/ui/EmptyState.jsx` |
| Delete | `frontend/src/components/Modal.jsx` |
| Modify | `frontend/package.json` |
| Modify | `frontend/src/pages/Clientes.jsx` |

---

### Task 1: Install Radix deps and remove Modal.jsx

**Files:**
- Modify: `frontend/package.json`
- Delete: `frontend/src/components/Modal.jsx`

**Interfaces:**
- Produces: `@radix-ui/react-select`, `@radix-ui/react-label`, `@radix-ui/react-checkbox` available as npm packages

- [ ] **Step 1: Install the three new Radix packages**

From `frontend/`:
```bash
npm install @radix-ui/react-select @radix-ui/react-label @radix-ui/react-checkbox
```

Expected: packages appear in `package.json` dependencies, no peer-dep warnings.

- [ ] **Step 2: Delete Modal.jsx (it has no importers)**

```bash
rm frontend/src/components/Modal.jsx
```

- [ ] **Step 3: Verify the dev build still starts**

```bash
cd frontend && npm run dev
```

Expected: Vite starts without errors. No "cannot find module Modal" errors in console.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git rm frontend/src/components/Modal.jsx
git commit -m "chore: add Radix select/label/checkbox deps, remove orphaned Modal.jsx"
```

---

### Task 2: Input and Label

**Files:**
- Create: `frontend/src/components/ui/Input.jsx`
- Create: `frontend/src/components/ui/Label.jsx`

**Interfaces:**
- Produces:
  - `Input({ error?: boolean, className?: string, ...nativeInputProps })` — default export
  - `Label({ className?: string, ...RadixLabelProps })` — default export

- [ ] **Step 1: Create Label.jsx**

```jsx
// frontend/src/components/ui/Label.jsx
import * as RadixLabel from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

export default function Label({ className, ...props }) {
  return (
    <RadixLabel.Root
      className={cn('text-sm font-medium text-gray-700', className)}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Create Input.jsx**

```jsx
// frontend/src/components/ui/Input.jsx
import { cn } from '../../lib/utils'

export default function Input({ error, className, ...props }) {
  return (
    <input
      className={cn(
        'w-full border rounded-lg px-3 py-2.5 text-sm bg-white transition-colors',
        'placeholder:text-gray-400',
        'hover:border-gray-400',
        'focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20',
        'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
          : 'border-gray-300',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Verify visually**

Add a temporary test to any page (e.g. Dashboard) — or just run dev and confirm no TS/import errors. Check that `Input` has:
- gray border at rest
- darker border on hover
- green ring on focus
- red border when `error` prop is true

Remove any temporary test code before committing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/Input.jsx frontend/src/components/ui/Label.jsx
git commit -m "feat: add Input and Label components"
```

---

### Task 3: Select

**Files:**
- Create: `frontend/src/components/ui/Select.jsx`

**Interfaces:**
- Consumes: `@radix-ui/react-select`, `lucide-react` (ChevronDown, Check), `cn` from utils
- Produces:
  ```ts
  Select({
    value: string,
    onChange: (value: string) => void,
    options: { value: string, label: string }[],
    placeholder?: string,
    nullable?: boolean,       // adds a "none" item that maps to ''
    noneLabel?: string,       // label for the none item (default: '—')
    error?: boolean,
    disabled?: boolean,
    className?: string,
  })
  ```

**Note on `nullable`:** Radix Select doesn't support empty string values. When `nullable` is true, the component adds a sentinel item `__none__` internally and maps it to `''` on change. Pass `value=""` and `nullable` for filter selects that need a "show all" option.

- [ ] **Step 1: Create Select.jsx**

```jsx
// frontend/src/components/ui/Select.jsx
import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const NONE = '__none__'

export default function Select({
  value,
  onChange,
  options = [],
  placeholder,
  nullable = false,
  noneLabel = '—',
  error,
  disabled,
  className,
}) {
  const radixValue = (value === '' || value == null)
    ? (nullable ? NONE : undefined)
    : value

  const handleChange = (v) => onChange(v === NONE ? '' : v)

  return (
    <RadixSelect.Root value={radixValue} onValueChange={handleChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          'flex items-center justify-between w-full border rounded-lg px-3 py-2.5 text-sm bg-white',
          'transition-colors cursor-pointer',
          'hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          'data-[placeholder]:text-gray-400',
          error
            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
            : 'border-gray-300',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0 ml-2" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden',
            'w-[var(--radix-select-trigger-width)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-150',
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {nullable && (
              <RadixSelect.Item
                value={NONE}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer outline-none',
                  'text-gray-400 italic hover:bg-brand-50 focus:bg-brand-50',
                )}
              >
                <RadixSelect.ItemText>{noneLabel}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-brand-600" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            )}
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer outline-none',
                  'hover:bg-brand-50 focus:bg-brand-50',
                  'data-[state=checked]:text-brand-600 data-[state=checked]:font-medium',
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-brand-600" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
```

- [ ] **Step 2: Verify visually**

Run dev server and verify Select renders on any page that has a select. Confirm:
- Matches Input height and border style
- Dropdown opens below trigger at trigger width
- Item hover shows brand-50 background
- Selected item shows brand-600 text + checkmark
- `nullable` shows the noneLabel item at top in italic

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Select.jsx
git commit -m "feat: add Select component (Radix, with nullable support)"
```

---

### Task 4: Checkbox, FormField, and EmptyState

**Files:**
- Create: `frontend/src/components/ui/Checkbox.jsx`
- Create: `frontend/src/components/ui/FormField.jsx`
- Create: `frontend/src/components/ui/EmptyState.jsx`

**Interfaces:**
- Produces:
  ```ts
  Checkbox({ id?: string, checked: boolean, onCheckedChange: (v: boolean) => void, label?: string, disabled?: boolean, className?: string })
  FormField({ label?: string, hint?: string, error?: string, children: ReactNode, className?: string })
  EmptyState({ icon?: LucideIcon, message: string, action?: ReactNode })
  ```

- [ ] **Step 1: Create Checkbox.jsx**

```jsx
// frontend/src/components/ui/Checkbox.jsx
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import Label from './Label'

export default function Checkbox({ id, checked, onCheckedChange, label, disabled, className }) {
  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded border border-gray-300 bg-white transition-colors',
          'hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
          'data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          className,
        )}
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center">
          <Check size={11} className="text-white" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <Label htmlFor={id} className="font-normal cursor-pointer">
          {label}
        </Label>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create FormField.jsx**

```jsx
// frontend/src/components/ui/FormField.jsx
import Label from './Label'
import { cn } from '../../lib/utils'

export default function FormField({ label, hint, error, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create EmptyState.jsx**

```jsx
// frontend/src/components/ui/EmptyState.jsx
export default function EmptyState({ icon: Icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon size={40} className="text-gray-300 mb-3" strokeWidth={1.5} />}
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/Checkbox.jsx frontend/src/components/ui/FormField.jsx frontend/src/components/ui/EmptyState.jsx
git commit -m "feat: add Checkbox, FormField, and EmptyState components"
```

---

### Task 5: Table

**Files:**
- Create: `frontend/src/components/ui/Table.jsx`

**Interfaces:**
- Produces:
  ```ts
  Table({ children, className?, borderless?: boolean })      // default export + namespace
  Table.Head({ children })
  Table.Body({ children })
  Table.Row({ children, onClick?, className? })
  Table.Th({ children, align?: 'left'|'right'|'center', className? })
  Table.Td({ children, align?: 'left'|'right'|'center', className?, ...tdProps })
  ```
  `borderless` removes the outer border and rounded corners — use when Table lives inside a card that already provides those.

- [ ] **Step 1: Create Table.jsx**

```jsx
// frontend/src/components/ui/Table.jsx
import { cn } from '../../lib/utils'

function TableRoot({ children, className, borderless = false }) {
  return (
    <div className={cn(!borderless && 'rounded-lg border border-gray-200 overflow-hidden', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Head({ children }) {
  return <thead>{children}</thead>
}

function Body({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>
}

function Row({ children, onClick, className }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        onClick && 'cursor-pointer hover:bg-gray-50/60 transition-colors',
        className,
      )}
    >
      {children}
    </tr>
  )
}

function Th({ children, align = 'left', className }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'left', className, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-gray-700',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

const Table = Object.assign(TableRoot, { Head, Body, Row, Th, Td })
export default Table
```

- [ ] **Step 2: Verify visually**

Run dev server. There's no direct usage yet — just confirm no import errors in the build. The reference migration in Task 6 will provide a full visual test.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Table.jsx
git commit -m "feat: add Table component with Head/Body/Row/Th/Td subcomponents"
```

---

### Task 6: Migrate Clientes.jsx (Phase 2 reference)

**Files:**
- Modify: `frontend/src/pages/Clientes.jsx`

**Interfaces:**
- Consumes: `Button` (existing), `Input`, `Select`, `Table`, `EmptyState` (all new), `PageHeader` (existing)
- Produces: reference implementation showing how to use all new components in a real page

**What changes:**
- Add `PageHeader title="Clientes"` wrapping the button (currently it's a bare div with just the button)
- Replace the inline button with `<Button>`
- Replace the filter `<input type="text">` with `<Input>`
- Replace the filter `<select>` with `<Select nullable noneLabel="Todos los grupos">`
- Replace the active clients table with `<Table borderless>` inside the existing `overflow-x-auto` div
- Replace the inline empty state `<td colSpan={7}>` with `<EmptyState>` outside the table
- Replace the desactivados table with `<Table borderless>`

- [ ] **Step 1: Replace the full file content**

```jsx
// frontend/src/pages/Clientes.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { getClientes, deleteCliente, reactivarCliente, getGruposClientes } from '../api'
import PageHeader from '../components/PageHeader'
import ClienteModal from '../components/ClienteModal'
import ConsolidadoGrupoModal from '../components/ConsolidadoGrupoModal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [desactivados, setDesactivados] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [consolidadoOpen, setConsolidadoOpen] = useState(false)
  const [showDesactivados, setShowDesactivados] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { setSearch(urlSearch) }, [urlSearch])
  useEffect(() => { getGruposClientes().then((r) => setGrupos(r.data)) }, [])

  const load = () => {
    getClientes({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setClientes(r.data))
      .catch(() => toast.error('Error al cargar clientes'))
    getClientes({ activo: false })
      .then((r) => setDesactivados(r.data))
      .catch(() => {})
  }

  useEffect(() => { load() }, [search, grupoId])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar a "${nombre}"?`)) return
    try {
      await deleteCliente(id)
      toast.success(`"${nombre}" desactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar cliente')
    }
  }

  const handleReactivar = async (id, nombre) => {
    try {
      await reactivarCliente(id)
      toast.success(`"${nombre}" reactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al reactivar cliente')
    }
  }

  return (
    <div>
      <PageHeader title="Clientes">
        <Button onClick={openNew}>+ Nuevo cliente</Button>
      </PageHeader>

      {/* Active clients */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Buscar por nombre, código o RIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            value={grupoId}
            onChange={(v) => { setGrupoId(v); setConsolidadoOpen(false) }}
            placeholder="Todos los grupos"
            nullable
            noneLabel="Todos los grupos"
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
            className="w-48"
          />
          {grupoId && (
            <Button variant="ghost" onClick={() => setConsolidadoOpen(true)}>
              Ver consolidado del grupo
            </Button>
          )}
        </div>

        {clientes.length === 0 ? (
          <EmptyState
            icon={Users}
            message="No hay clientes registrados"
            action={<Button onClick={openNew}>Nuevo cliente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table borderless>
              <Table.Head>
                <Table.Row>
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Razón Social</Table.Th>
                  <Table.Th>RIF</Table.Th>
                  <Table.Th>Zona</Table.Th>
                  <Table.Th>Vendedor</Table.Th>
                  <Table.Th>Teléfonos</Table.Th>
                  <Table.Th align="center">Acciones</Table.Th>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {clientes.map((c) => (
                  <Table.Row key={c.id}>
                    <Table.Td><span className="font-mono text-xs">{c.codigo}</span></Table.Td>
                    <Table.Td><span className="font-medium">{c.razon_social}</span></Table.Td>
                    <Table.Td>{c.rif}</Table.Td>
                    <Table.Td>{c.zona}</Table.Td>
                    <Table.Td>{c.vendedor}</Table.Td>
                    <Table.Td>{c.telefonos?.join(', ')}</Table.Td>
                    <Table.Td align="center">
                      <span className="space-x-2">
                        <button onClick={() => navigate(`/clientes/${c.id}`)} className="text-purple-600 hover:underline text-xs">Ver ficha</button>
                        <button onClick={() => openEdit(c.id)} className="text-brand-600 hover:underline text-xs">Editar</button>
                        <button onClick={() => handleDelete(c.id, c.razon_social)} className="text-red-500 hover:underline text-xs">Desactivar</button>
                      </span>
                    </Table.Td>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </div>

      {/* Deactivated clients */}
      {desactivados.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setShowDesactivados((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <span className="font-medium">Clientes desactivados ({desactivados.length})</span>
            <span>{showDesactivados ? '▲' : '▼'}</span>
          </button>
          {showDesactivados && (
            <div className="overflow-x-auto border-t">
              <Table borderless>
                <Table.Head>
                  <Table.Row>
                    <Table.Th>Código</Table.Th>
                    <Table.Th>Razón Social</Table.Th>
                    <Table.Th>RIF</Table.Th>
                    <Table.Th>Zona</Table.Th>
                    <Table.Th align="center">Acción</Table.Th>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {desactivados.map((c) => (
                    <Table.Row key={c.id} className="bg-gray-50 opacity-75">
                      <Table.Td><span className="font-mono text-xs text-gray-400">{c.codigo}</span></Table.Td>
                      <Table.Td><span className="text-gray-500 line-through">{c.razon_social}</span></Table.Td>
                      <Table.Td className="text-gray-400">{c.rif}</Table.Td>
                      <Table.Td className="text-gray-400">{c.zona}</Table.Td>
                      <Table.Td align="center">
                        <button onClick={() => handleReactivar(c.id, c.razon_social)} className="text-brand-600 hover:underline text-xs font-medium">
                          Reactivar
                        </button>
                      </Table.Td>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      )}

      <ClienteModal open={modalOpen} onClose={closeModal} clienteId={editId} onSaved={load} />
      <ConsolidadoGrupoModal
        open={consolidadoOpen}
        onClose={() => setConsolidadoOpen(false)}
        grupoId={grupoId ? Number(grupoId) : null}
        grupoNombre={grupos.find((g) => String(g.id) === grupoId)?.nombre}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify Clientes page**

```bash
cd frontend && npm run dev
```

Navigate to `/clientes` and verify:
- PageHeader "Clientes" appears with the "Nuevo cliente" button on the right
- Filter bar: Input has focus ring, Select dropdown opens with grupo options, "Todos los grupos" noneLabel item appears at top
- Table rows render with proper header styling (gray background, uppercase small caps)
- Row hover shows subtle gray highlight
- Empty state (if no clients): shows Users icon + message + button
- Desactivados toggle still works; desactivados table renders with strikethrough names

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Clientes.jsx
git commit -m "feat: migrate Clientes page to new component system (Input, Select, Table, EmptyState)"
```

---

## Phase 3 (follow-on plan)

The remaining pages are out of scope for this plan. A follow-on plan (`2026-06-27-component-system-phase3.md`) should cover:

**Forms** — replace `inputClass`/`selectClass` with `<Input>` / `<Select>` / `<FormField>`:
- `ClienteForm`, `OrdenForm`, `ProductoForm`, `ReporteVentaForm`, `DevolucionForm`, `EntradaInventarioForm`

**Table pages** — replace raw `<table>` with `<Table>` + `<EmptyState>`:
- `Ordenes`, `Productos`, `ReportesVenta`, `Devoluciones`, `InventarioCentral`, `Stock`, `Usuarios`

**Cleanup** — after Phase 3 migrations are complete:
- Remove `inputClass` and `selectClass` exports from `frontend/src/lib/styles.js`
