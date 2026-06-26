# Visual Redesign — La Coromoto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform La Coromoto's frontend from plain Tailwind utilities into a cohesive SaaS-style design with brand identity, consistent components, and a fixed app header with breadcrumbs.

**Architecture:** All visual changes live exclusively in the frontend (`frontend/`). The approach layers from the bottom up: design tokens first, then shared components, then layout shell, then individual pages. No backend changes. No new API endpoints — `getTasaHoy()` already exists in `src/api/index.js`.

**Tech Stack:** React 18, Tailwind CSS 3, lucide-react (already installed), @fontsource/inter (to install), Vite 5. No test framework exists in the project — verification steps are visual (run `npm run dev` and check in browser).

## Global Constraints

- No changes to backend, API endpoints, or business logic
- No changes to PDF generation
- Dark mode not in scope
- Sidebar stays dark (brand-900 background)
- All new components go under `frontend/src/components/ui/` or `frontend/src/components/`
- Run `npm run dev` from `frontend/` for local development
- Brand color: indigo palette (`brand-600` = `#4f46e5`)
- `StatusBadge` must handle all 6 status values: `activa`, `pendiente`, `parcial`, `confirmado`, `anulada`, `devuelta`

---

### Task 1: Foundation — Tokens, Typography, Input Styles

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/lib/styles.js`

**Interfaces:**
- Produces: Tailwind color tokens `brand-*` and `status-*` available globally; `inputClass` export from `src/lib/styles.js`

- [ ] **Step 1: Install Inter font**

```bash
cd frontend && npm install @fontsource/inter
```

Expected: `@fontsource/inter` appears in `package.json` dependencies.

- [ ] **Step 2: Add brand and status tokens to tailwind.config.js**

Replace the entire file content:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
        },
        status: {
          'pending-bg':   '#fef9c3',
          'pending-text': '#854d0e',
          'confirmed-bg':   '#dcfce7',
          'confirmed-text': '#166534',
          'active-bg':   '#e0e7ff',
          'active-text': '#3730a3',
          'returned-bg':   '#ffedd5',
          'returned-text': '#9a3412',
          'partial-bg':  '#ede9fe',
          'partial-text':'#5b21b6',
          'voided-bg':   '#fee2e2',
          'voided-text': '#991b1b',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

- [ ] **Step 3: Import Inter in index.css**

Replace `frontend/src/index.css`:

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-100 text-gray-900;
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 4: Create shared input style**

Create `frontend/src/lib/styles.js`:

```js
export const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'

export const selectClass =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
```

- [ ] **Step 5: Verify visually**

```bash
cd frontend && npm run dev
```

Open browser. Body font should be Inter (compare letter shapes — Inter has distinct `a` and `g`). No layout breakage.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tailwind.config.js frontend/src/index.css frontend/src/lib/styles.js
git commit -m "feat: add Inter font, brand/status design tokens, shared input styles"
```

---

### Task 2: UI Component Library — StatusBadge, Button, KpiCard

**Files:**
- Create: `frontend/src/components/ui/StatusBadge.jsx`
- Create: `frontend/src/components/ui/Button.jsx`
- Create: `frontend/src/components/ui/KpiCard.jsx`

**Interfaces:**
- Produces:
  - `<StatusBadge status="activa|pendiente|parcial|confirmado|anulada|devuelta" />`
  - `<Button variant="primary|secondary|danger|ghost" size="sm|md|lg" onClick disabled children />`
  - `<KpiCard label value prefix sub icon to />` (drop-in for Dashboard's StatCard, adds `icon` prop)

- [ ] **Step 1: Create StatusBadge**

Create `frontend/src/components/ui/StatusBadge.jsx`:

```jsx
const CONFIG = {
  activa:    { label: 'Activa',                bg: '#e0e7ff', text: '#3730a3' },
  pendiente: { label: 'Pendiente',             bg: '#fef9c3', text: '#854d0e' },
  parcial:   { label: 'Parcialmente reportada', bg: '#ede9fe', text: '#5b21b6' },
  confirmado:{ label: 'Confirmado',            bg: '#dcfce7', text: '#166534' },
  anulada:   { label: 'Anulada',               bg: '#fee2e2', text: '#991b1b' },
  devuelta:  { label: 'Devuelta',              bg: '#ffedd5', text: '#9a3412' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, bg: '#f3f4f6', text: '#374151' }
  return (
    <span
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
    >
      {cfg.label}
    </span>
  )
}
```

- [ ] **Step 2: Create Button**

Create `frontend/src/components/ui/Button.jsx`:

```jsx
const VARIANTS = {
  primary:   'bg-brand-600 hover:bg-brand-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Create KpiCard**

Create `frontend/src/components/ui/KpiCard.jsx`:

```jsx
import { Link } from 'react-router-dom'

export default function KpiCard({ label, value, prefix = '', sub, icon: Icon, to }) {
  const inner = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow h-full relative overflow-hidden">
      {Icon && (
        <Icon className="absolute top-4 right-4 text-gray-200" size={32} strokeWidth={1.5} />
      )}
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1 tabular-nums">
        {prefix}{value ?? '—'}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}
```

- [ ] **Step 4: Verify components render**

```bash
cd frontend && npm run dev
```

Components are not yet used in pages — no visible change. Verify no build errors in terminal output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/StatusBadge.jsx frontend/src/components/ui/Button.jsx frontend/src/components/ui/KpiCard.jsx
git commit -m "feat: add StatusBadge, Button, and KpiCard UI components"
```

---

### Task 3: Sidebar Redesign

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `brand-*` tokens from Task 1; lucide-react (already installed)
- Produces: Updated sidebar with brand-900 bg, nav icons, and user avatar footer

- [ ] **Step 1: Rewrite the sidebar section of Layout.jsx**

Replace the entire file `frontend/src/components/Layout.jsx`:

```jsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlobalSearch from './GlobalSearch'
import {
  LayoutDashboard, Users, Box, Warehouse, ClipboardList,
  RotateCcw, Archive, UserCog, Settings, Package, LogOut,
} from 'lucide-react'

const adminNav = [
  { to: '/dashboard',  label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/clientes',   label: 'Clientes',               icon: Users },
  { to: '/productos',  label: 'Productos',              icon: Box },
  { to: '/inventario', label: 'Inventario Central',     icon: Warehouse },
  { to: '/ordenes',    label: 'Órdenes / Historial',    icon: ClipboardList },
  { to: '/devoluciones', label: 'Devoluciones',         icon: RotateCcw },
  { to: '/stock',      label: 'Stock en Consignación',  icon: Archive },
]

const clienteNav = [
  { to: '/mis-ordenes', label: 'Mis Órdenes', icon: ClipboardList },
]

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-brand-600 text-white border-l-[3px] border-brand-400'
      : 'text-gray-300 hover:bg-brand-800 hover:text-white border-l-[3px] border-transparent'
  }`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout, sessionWarning, resetTimer } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  const isAdmin = user?.rol === 'admin'
  const navItems = isAdmin ? adminNav : clienteNav
  const initial = user?.username?.[0]?.toUpperCase() ?? '?'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={close} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-brand-900 text-white flex flex-col flex-shrink-0
          transition-transform duration-200
          md:relative md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-brand-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-brand-400 flex-shrink-0" />
            <h1 className="text-sm font-bold leading-tight">La Coromoto</h1>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white text-lg leading-none"
            onClick={close}
          >
            ✕
          </button>
        </div>

        {isAdmin && <GlobalSearch onNavigate={close} />}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={close}>
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom admin links */}
        <div className="border-t border-brand-800">
          {isAdmin && (
            <>
              <NavLink to="/usuarios" className={navLinkClass} onClick={close}>
                <UserCog size={16} className="flex-shrink-0" />
                Usuarios
              </NavLink>
              <NavLink to="/configuracion" className={navLinkClass} onClick={close}>
                <Settings size={16} className="flex-shrink-0" />
                Configuración
              </NavLink>
            </>
          )}

          {/* User footer */}
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.rol}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-600 hover:text-gray-900 text-xl leading-none"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800 text-sm">La Coromoto</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {sessionWarning && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-yellow-800">Tu sesión expirará en 1 minuto por inactividad.</span>
              <button
                onClick={resetTimer}
                className="text-yellow-700 font-semibold hover:underline ml-4 flex-shrink-0"
              >
                Mantener sesión
              </button>
            </div>
          )}
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify sidebar visually**

```bash
cd frontend && npm run dev
```

Log in as admin. Verify:
- Sidebar background is deep indigo (not gray)
- Each nav item has its icon on the left
- Active item has a left accent border in lighter indigo
- User footer shows avatar circle with initial, username, role, and LogOut icon
- "La Coromoto" text with Package icon in header

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat: redesign sidebar with brand colors, icons, and user avatar footer"
```

---

### Task 4: AppHeader — Fixed Header with Breadcrumb and BCV Chip

**Files:**
- Create: `frontend/src/components/AppHeader.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `getTasaHoy` from `src/api/index.js` (already exists); `useLocation` from react-router-dom
- Produces: Fixed 56px header visible on desktop, showing breadcrumb + BCV rate chip

- [ ] **Step 1: Create AppHeader component**

Create `frontend/src/components/AppHeader.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getTasaHoy } from '../api'

const ROUTE_LABELS = {
  '/dashboard':    'Dashboard',
  '/clientes':     'Clientes',
  '/productos':    'Productos',
  '/inventario':   'Inventario Central',
  '/ordenes':      'Órdenes',
  '/devoluciones': 'Devoluciones',
  '/stock':        'Stock en Consignación',
  '/reportes-venta': 'Reportes de Venta',
  '/configuracion': 'Configuración',
  '/usuarios':     'Usuarios',
  '/mis-ordenes':  'Mis Órdenes',
}

function resolveBreadcrumb(pathname) {
  // Exact match
  if (ROUTE_LABELS[pathname]) return [{ label: ROUTE_LABELS[pathname] }]

  // Try /section/:id pattern
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length >= 2) {
    const base = `/${parts[0]}`
    const baseLabel = ROUTE_LABELS[base]
    if (baseLabel) {
      return [
        { label: baseLabel, href: base },
        { label: `#${parts[1]}` },
      ]
    }
  }

  return [{ label: pathname }]
}

export default function AppHeader() {
  const { pathname } = useLocation()
  const [tasa, setTasa] = useState(null)
  const crumbs = resolveBreadcrumb(pathname)

  useEffect(() => {
    getTasaHoy()
      .then((r) => setTasa(r.data))
      .catch(() => setTasa(null))
  }, [])

  return (
    <header className="hidden md:flex h-14 bg-white border-b border-gray-200 items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <span className={i === crumbs.length - 1 ? 'font-semibold text-gray-800' : 'text-gray-400'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* BCV chip */}
      {tasa && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5">
          <span className="text-xs text-brand-600 font-medium">
            Bs. {Number(tasa.valor).toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">hoy</span>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Integrate AppHeader into Layout.jsx**

In `frontend/src/components/Layout.jsx`, find the `<div className="flex-1 flex flex-col min-w-0">` block and add `<AppHeader />` as the first child on desktop (after the mobile header). Update the import:

Add to imports at top:
```jsx
import AppHeader from './AppHeader'
```

Inside the `<div className="flex-1 flex flex-col min-w-0">` block, add `<AppHeader />` directly after the mobile `<header>` element:

```jsx
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-600 hover:text-gray-900 text-xl leading-none"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800 text-sm">La Coromoto</span>
        </header>

        {/* Desktop fixed header */}
        <AppHeader />

        <main className="flex-1 overflow-y-auto">
          {sessionWarning && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-yellow-800">Tu sesión expirará en 1 minuto por inactividad.</span>
              <button
                onClick={resetTimer}
                className="text-yellow-700 font-semibold hover:underline ml-4 flex-shrink-0"
              >
                Mantener sesión
              </button>
            </div>
          )}
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
```

- [ ] **Step 3: Verify AppHeader visually**

```bash
cd frontend && npm run dev
```

On desktop (≥768px width):
- White header bar appears below the sidebar top edge, full width of content area
- Shows current page name (e.g. "Dashboard" when on `/dashboard`)
- If a tasa BCV exists for today, shows the indigo chip on the right
- On `/clientes/123` shows "Clientes / #123" breadcrumb

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AppHeader.jsx frontend/src/components/Layout.jsx
git commit -m "feat: add fixed AppHeader with dynamic breadcrumb and BCV rate chip"
```

---

### Task 5: Modal and PageHeader Updates

**Files:**
- Modify: `frontend/src/components/Modal.jsx`
- Modify: `frontend/src/components/PageHeader.jsx`

**Interfaces:**
- Produces: Rounder modal panels; PageHeader that accepts optional Button children instead of Link action

- [ ] **Step 1: Update Modal.jsx**

Replace `frontend/src/components/Modal.jsx`:

```jsx
export default function Modal({ title, onClose, children, size = 'lg' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update PageHeader.jsx**

Replace `frontend/src/components/PageHeader.jsx`:

```jsx
export default function PageHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
```

Note: `title` is kept as an optional prop so existing pages using `<PageHeader title="..." />` don't break immediately. Pages will be cleaned up in subsequent tasks.

- [ ] **Step 3: Verify no regressions**

```bash
cd frontend && npm run dev
```

Open any modal (e.g. Nueva Orden from Dashboard). Verify the modal corners are more rounded (`rounded-2xl`). All existing pages using PageHeader should still render.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Modal.jsx frontend/src/components/PageHeader.jsx
git commit -m "feat: rounder modal corners, flexible PageHeader for action children"
```

---

### Task 6: Login Split Panel

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `authLogin`, `recoverPassword` from api (no change); `inputClass` from `src/lib/styles.js`
- Produces: Split-panel login page (left: brand panel, right: form)

- [ ] **Step 1: Rewrite Login.jsx**

Replace `frontend/src/pages/Login.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLogin, recoverPassword } from '../api'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'
import { Package } from 'lucide-react'
import { inputClass } from '../lib/styles'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'recover'

  const [recForm, setRecForm] = useState({ username: '', recovery_code: '', new_password: '', confirm: '' })
  const [recError, setRecError] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recDone, setRecDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await authLogin({ username, password })
      login(r.data.token, r.data.user)
      navigate(r.data.user.rol === 'cliente' ? '/mis-ordenes' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const submitRecover = async (e) => {
    e.preventDefault()
    setRecError('')
    if (recForm.new_password !== recForm.confirm) {
      setRecError('Las contraseñas no coinciden')
      return
    }
    setRecLoading(true)
    try {
      await recoverPassword({
        username: recForm.username,
        recovery_code: recForm.recovery_code,
        new_password: recForm.new_password,
      })
      setRecDone(true)
    } catch (err) {
      setRecError(err.response?.data?.error ?? 'Error al recuperar la contraseña')
    } finally {
      setRecLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="bg-brand-900 text-white flex flex-col items-center justify-center md:w-[45%] px-10 py-8 md:py-0 min-h-[96px] md:min-h-screen">
        <div className="flex flex-col items-center gap-3 md:gap-5">
          <div className="bg-brand-800 rounded-2xl p-4 md:p-5">
            <Package size={32} className="text-brand-400 md:hidden" />
            <Package size={48} className="text-brand-400 hidden md:block" />
          </div>
          <div className="text-center">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">La Coromoto</h1>
            <p className="text-brand-400 text-sm md:text-base mt-1">Sistema de Consignaciones</p>
          </div>
        </div>
        <p className="text-brand-800 text-xs mt-auto pt-6 hidden md:block">© 2026 La Coromoto</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-sm">
          {mode === 'login' ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
              <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>
              <Alert type="error" message={error} />
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input autoFocus className={inputClass} value={username}
                    onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input type="password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              <button onClick={() => setMode('recover')}
                className="mt-5 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : recDone ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Contraseña restablecida</h2>
              <p className="text-sm text-gray-500 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button
                onClick={() => { setMode('login'); setRecDone(false); setRecForm({ username: '', recovery_code: '', new_password: '', confirm: '' }) }}
                className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mb-5">Ingresa tu usuario y el código de recuperación que guardaste.</p>
              <Alert type="error" message={recError} />
              <form onSubmit={submitRecover} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input autoFocus className={inputClass} value={recForm.username}
                    onChange={(e) => setRecForm({ ...recForm, username: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de recuperación</label>
                  <input className={inputClass} value={recForm.recovery_code}
                    onChange={(e) => setRecForm({ ...recForm, recovery_code: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input type="password" className={inputClass} value={recForm.new_password}
                    onChange={(e) => setRecForm({ ...recForm, new_password: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input type="password" className={inputClass} value={recForm.confirm}
                    onChange={(e) => setRecForm({ ...recForm, confirm: e.target.value })} required />
                </div>
                <button type="submit" disabled={recLoading}
                  className="w-full bg-brand-600 text-white font-medium py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {recLoading ? 'Verificando...' : 'Restablecer contraseña'}
                </button>
              </form>
              <button onClick={() => setMode('login')}
                className="mt-5 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
                ← Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify login page**

```bash
cd frontend && npm run dev
```

Navigate to `/login` (or log out). Verify:
- Desktop: left indigo panel (45%) with Package icon + "La Coromoto" + tagline; right white panel with form
- Mobile: indigo strip at top, form fills rest of screen
- Login flow still works end-to-end (enter credentials, reach dashboard)
- "¿Olvidaste tu contraseña?" link shows recovery form

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: redesign login page with brand split-panel layout"
```

---

### Task 7: Dashboard — KpiCard, StatusBadge, Brand Colors

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `KpiCard` from Task 2; `StatusBadge` from Task 2; `Button` from Task 2
- Produces: Dashboard using new components; chart colors aligned with brand tokens

- [ ] **Step 1: Rewrite Dashboard.jsx**

Replace `frontend/src/pages/Dashboard.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboard } from '../api'
import OrdenModal from '../components/OrdenModal'
import DevolucionModal from '../components/DevolucionModal'
import KpiCard from '../components/ui/KpiCard'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import { Users, Box, TrendingUp, CheckCircle } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

const PERIODOS = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
]

const PERIODO_TITLE = {
  semanal:    'últimas 10 semanas',
  mensual:    'últimos 6 meses',
  trimestral: 'últimos 6 trimestres',
  semestral:  'últimos 4 semestres',
}

const fmt = (v) => `$${Number(v).toFixed(0)}`

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [periodo, setPeriodo] = useState('mensual')
  const [ordenModalOpen, setOrdenModalOpen] = useState(false)
  const [devModalOpen, setDevModalOpen] = useState(false)
  const navigate = useNavigate()

  const load = () => getDashboard({ periodo }).then((r) => setData(r.data))
  useEffect(() => { load() }, [periodo])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Button onClick={() => setOrdenModalOpen(true)} className="w-full justify-center py-3">
          + Nueva Orden
        </Button>
        <Button variant="ghost" onClick={() => setDevModalOpen(true)} className="w-full justify-center py-3 border-orange-300 text-orange-600 hover:bg-orange-50">
          + Nueva Devolución
        </Button>
        <Button variant="secondary" onClick={() => navigate('/ordenes')} className="w-full justify-center py-3">
          Ver Órdenes
        </Button>
        <Button variant="secondary" onClick={() => navigate('/stock')} className="w-full justify-center py-3 text-teal-700 hover:text-teal-800">
          Stock Consignación
        </Button>
      </div>

      {data?.tasa_hoy && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-brand-600 font-medium">Tasa BCV hoy ({data.tasa_hoy.fecha})</p>
            <p className="text-2xl font-bold text-brand-900">Bs. {Number(data.tasa_hoy.valor).toFixed(4)}</p>
          </div>
          <span className="text-xs bg-brand-100 text-brand-600 px-2.5 py-1 rounded-full font-medium">
            {data.tasa_hoy.fuente}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <KpiCard label="Clientes activos"       value={data?.total_clientes}                         to="/clientes"  icon={Users} />
        <KpiCard label="Productos activos"      value={data?.total_productos}                        to="/productos" icon={Box} />
        <KpiCard label="Despachos este mes"     value={data?.total_despachos_mes?.toFixed(2)} prefix="$" to="/ordenes" sub={`${data?.ordenes_mes ?? '—'} órdenes`} icon={TrendingUp} />
        <KpiCard label="Ventas confirmadas mes" value={data?.total_ventas_mes?.toFixed(2)}    prefix="$" sub={`${data?.reportes_pendientes ?? '—'} pendientes`} icon={CheckCircle} />
      </div>

      {data?.mensual && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-700">
              Despachos vs Ventas confirmadas —{' '}
              <span className="text-gray-400 font-normal">{PERIODO_TITLE[periodo]}</span>
            </h3>
            <div className="flex gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    periodo === p.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.mensual} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="despachos" name="Despachos"           fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ventas"    name="Ventas confirmadas"  fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.ultimos_reportes?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-700">Actividad reciente — Reportes de Venta</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Fecha cobro</th>
                  <th className="px-5 py-3 text-left">Orden</th>
                  <th className="px-5 py-3 text-right">Total USD</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ultimos_reportes.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-5 py-3 font-medium">{r.cliente}</td>
                    <td className="px-5 py-3">{r.fecha}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{r.orden_id ? `#${r.orden_id}` : '—'}</td>
                    <td className="px-5 py-3 text-right">${Number(r.total_usd).toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.ultimas_ordenes?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Últimas órdenes de despacho</h3>
            <Link to="/ordenes" className="text-sm text-brand-600 hover:underline">Ver todas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">N° Orden</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ultimas_ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-brand-600">{o.numero_orden}</td>
                    <td className="px-5 py-3">{o.cliente}</td>
                    <td className="px-5 py-3">{o.fecha_emision}</td>
                    <td className="px-5 py-3 text-right font-medium">${Number(o.total_usd).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrdenModal open={ordenModalOpen} onClose={() => setOrdenModalOpen(false)} onSaved={load} />
      <DevolucionModal open={devModalOpen} onClose={() => setDevModalOpen(false)} onSaved={() => {}} />
    </div>
  )
}
```

- [ ] **Step 2: Verify Dashboard**

```bash
cd frontend && npm run dev
```

Go to `/dashboard`. Verify:
- KPI cards show lucide icons in the corner
- Chart bar for Despachos is indigo (`#6366f1`), not the old blue
- Report table uses `<StatusBadge>` (colored pill badges)
- Table row hover is `brand-50` (light indigo tint)
- Tasa BCV box is indigo-tinted instead of blue-tinted

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: update Dashboard with KpiCard, StatusBadge, and brand colors"
```

---

### Task 8: Ordenes — StatusBadge Adoption

**Files:**
- Modify: `frontend/src/pages/Ordenes.jsx`

**Interfaces:**
- Consumes: `StatusBadge` from Task 2
- Produces: Ordenes page using StatusBadge; removes local `statusBadge` / `statusLabel` objects

- [ ] **Step 1: Add StatusBadge import to Ordenes.jsx**

At the top of `frontend/src/pages/Ordenes.jsx`, add:

```jsx
import StatusBadge from '../components/ui/StatusBadge'
```

- [ ] **Step 2: Remove local statusBadge and statusLabel objects**

Delete these lines from `Ordenes.jsx` (lines ~28-43):

```jsx
const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  parcial: 'bg-indigo-100 text-indigo-700',
  confirmado: 'bg-blue-100 text-blue-700',
  anulada: 'bg-red-100 text-red-700',
}

const statusLabel = {
  activa: 'Activa',
  pendiente: 'Pendiente',
  parcial: 'Parcialmente reportada',
  confirmado: 'Confirmado',
  anulada: 'Anulada',
}
```

- [ ] **Step 3: Replace all inline badge spans with StatusBadge**

Search `Ordenes.jsx` for patterns like:
```jsx
<span className={`... ${statusBadge[...]}`}>{statusLabel[...]}</span>
```
Replace each occurrence with:
```jsx
<StatusBadge status={o.status} />
```

Also update table row hover classes from `hover:bg-gray-50` to `hover:bg-brand-50`.

- [ ] **Step 4: Verify Ordenes page**

```bash
cd frontend && npm run dev
```

Go to `/ordenes`. Verify status badges render as colored pills matching the design system. All order rows show correct badge colors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Ordenes.jsx
git commit -m "feat: replace inline status badges with StatusBadge in Ordenes"
```

---

### Task 9: ReportesVenta, ReporteVentaDetalle, Devoluciones — StatusBadge Adoption

**Files:**
- Modify: `frontend/src/pages/ReportesVenta.jsx`
- Modify: `frontend/src/pages/ReporteVentaDetalle.jsx`
- Modify: `frontend/src/pages/Devoluciones.jsx`

**Interfaces:**
- Consumes: `StatusBadge` from Task 2
- Produces: Consistent status badges across all list pages

- [ ] **Step 1: Update ReportesVenta.jsx**

Add import:
```jsx
import StatusBadge from '../components/ui/StatusBadge'
```

Remove the local `statusBadge` object:
```jsx
const statusBadge = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-green-100 text-green-700',
}
```

Search for inline badge spans in ReportesVenta.jsx and replace with `<StatusBadge status={r.status} />`.

Update table row hover: `hover:bg-gray-50` → `hover:bg-brand-50`.

- [ ] **Step 2: Update ReporteVentaDetalle.jsx**

Open `frontend/src/pages/ReporteVentaDetalle.jsx`. Add import:
```jsx
import StatusBadge from '../components/ui/StatusBadge'
```

Find any inline status badge span (typically shows report status at top of detail view) and replace with `<StatusBadge status={reporte.status} />`.

- [ ] **Step 3: Update Devoluciones.jsx**

Add import:
```jsx
import StatusBadge from '../components/ui/StatusBadge'
```

Devoluciones doesn't use `statusBadge` objects but may have inline status rendering. Update any status-colored spans to use `<StatusBadge>`. Update table row hover to `hover:bg-brand-50`.

- [ ] **Step 4: Verify all three pages**

```bash
cd frontend && npm run dev
```

Navigate to `/reportes-venta`, a report detail, and `/devoluciones`. Verify status badges are consistent colored pills everywhere.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReportesVenta.jsx frontend/src/pages/ReporteVentaDetalle.jsx frontend/src/pages/Devoluciones.jsx
git commit -m "feat: adopt StatusBadge in ReportesVenta, ReporteVentaDetalle, Devoluciones"
```

---

### Task 10: MisOrdenes — StatusBadge Adoption

**Files:**
- Modify: `frontend/src/pages/MisOrdenes.jsx`

**Interfaces:**
- Consumes: `StatusBadge` from Task 2

- [ ] **Step 1: Update MisOrdenes.jsx**

Add import:
```jsx
import StatusBadge from '../components/ui/StatusBadge'
```

Remove local `statusBadge` / `statusLabel` objects:
```jsx
const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  anulada: 'bg-red-100 text-red-700',
}
const statusLabel = { activa: 'Activa', pendiente: 'Pendiente', confirmado: 'Confirmado', anulada: 'Anulada' }
```

Replace all inline badge spans with `<StatusBadge status={o.status} />`.

Update table row hover: `hover:bg-gray-50` → `hover:bg-brand-50`.

- [ ] **Step 2: Verify MisOrdenes**

```bash
cd frontend && npm run dev
```

Log in as a cliente user (or check with an admin account that can see the page structure). Verify `/mis-ordenes` shows consistent StatusBadge pills.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MisOrdenes.jsx
git commit -m "feat: adopt StatusBadge in MisOrdenes"
```

---

### Task 11: Forms and Modals — inputClass Adoption

**Files:**
- Modify: `frontend/src/pages/ClienteForm.jsx` (if exists as standalone; else `ClienteModal.jsx`)
- Modify: `frontend/src/pages/ProductoForm.jsx`
- Modify: `frontend/src/pages/OrdenForm.jsx`
- Modify: `frontend/src/pages/ReporteVentaForm.jsx`
- Modify: `frontend/src/components/OrdenModal.jsx`
- Modify: `frontend/src/components/DevolucionModal.jsx`
- Modify: `frontend/src/components/ReporteVentaModal.jsx`
- Modify: `frontend/src/components/ClienteModal.jsx`
- Modify: `frontend/src/components/ProductoModal.jsx`
- Modify: `frontend/src/components/EntradaInventarioModal.jsx`

**Interfaces:**
- Consumes: `inputClass`, `selectClass` from `src/lib/styles.js` (Task 1)
- Produces: Unified input/select focus rings across all forms

- [ ] **Step 1: Update each form file**

For each file listed above, add the import at the top:

```jsx
import { inputClass, selectClass } from '../lib/styles'
```

(Adjust the import path: pages use `'../lib/styles'`, components use `'../lib/styles'` — both are one level up from their directory.)

Then find and remove the local `const inp = '...'` variable (or any equivalent), and replace all usages of it with `{inputClass}`. For `<select>` elements using the old `border border-gray-300 rounded-md...` inline class, replace with `{selectClass}`.

The old pattern to find and remove in each file:
```jsx
const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
```

- [ ] **Step 2: Verify forms**

```bash
cd frontend && npm run dev
```

Open the following and verify focus rings are indigo (brand-500) not blue:
- Create new client modal
- Create new product
- Create new order modal
- Create new devolucion modal
- Inventory entry modal

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ClienteForm.jsx frontend/src/pages/ProductoForm.jsx frontend/src/pages/OrdenForm.jsx frontend/src/pages/ReporteVentaForm.jsx frontend/src/components/OrdenModal.jsx frontend/src/components/DevolucionModal.jsx frontend/src/components/ReporteVentaModal.jsx frontend/src/components/ClienteModal.jsx frontend/src/components/ProductoModal.jsx frontend/src/components/EntradaInventarioModal.jsx
git commit -m "feat: unify input/select focus styles across all forms and modals"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Inter typography | Task 1 |
| Brand palette tokens (brand-50 → brand-900) | Task 1 |
| Status semantic colors | Task 1 + Task 2 (StatusBadge) |
| Sidebar brand-900, brand-400/800, icons, avatar footer, LogOut | Task 3 |
| AppHeader fixed with breadcrumb + BCV chip | Task 4 |
| Modal rounded-2xl | Task 5 |
| PageHeader simplification | Task 5 |
| Login split panel (desktop + mobile) | Task 6 |
| Dashboard: KpiCard, StatusBadge, brand chart colors | Task 7 |
| Table hover brand-50 | Tasks 7–10 |
| StatusBadge replacing inline badges: Ordenes | Task 8 |
| StatusBadge: ReportesVenta, ReporteVentaDetalle, Devoluciones | Task 9 |
| StatusBadge: MisOrdenes | Task 10 |
| inputClass adoption: forms + modals | Task 11 |

All spec requirements have a corresponding task. No gaps found.

**Placeholder check:** No TBD or TODO items in any task. All code blocks are complete.

**Type consistency:** `StatusBadge` accepts `status` string across all tasks. `Button` accepts `variant`, `size`, `className`, and rest-props (spread). `KpiCard` accepts `label`, `value`, `prefix`, `sub`, `icon`, `to` — matches Dashboard usage in Task 7. `inputClass` and `selectClass` are string constants imported consistently.
