# Component System — La Coromoto

**Date:** 2026-06-27
**Branch:** superpowers/rewind
**Status:** Approved

## Objective

Standardize UI components across the app to eliminate code duplication, consolidate two competing modal implementations, and give every interactive element a consistent, polished visual identity. The visual direction is "outlined with character" (Stripe/Vercel style): borders that darken on hover, a prominent colored focus ring, intentional padding.

## Current State

- `Button.jsx` exists but many pages write inline Tailwind buttons
- `Dialog.jsx` (Radix) and `Modal.jsx` (plain div) coexist — duplicated pattern
- `inputClass` / `selectClass` in `lib/styles.js` are exported strings, not components — no Label, no error state, no composition
- No table component — every page builds its own from scratch
- No empty state component
- `@radix-ui/react-dialog` and `@radix-ui/react-tooltip` already installed — Radix pattern is established

## Approach

**Radix UI expansion.** Add missing Radix primitives (`@radix-ui/react-select`, `@radix-ui/react-label`, `@radix-ui/react-checkbox`) and build styled wrappers matching the existing codebase pattern. Full brand control, no new abstraction patterns, accessibility for free.

## Visual System

All interactive fields share this state language:

| State    | Style |
|----------|-------|
| Rest     | `border border-gray-300 rounded-lg bg-white` |
| Hover    | `hover:border-gray-400` |
| Focus    | `focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20` |
| Error    | `border-red-400 focus:ring-red-400/20` |
| Disabled | `bg-gray-50 text-gray-400 cursor-not-allowed` |

The focus ring uses `ring-brand-500/20` (20% opacity) for depth without noise.

## Components

### New: `src/components/ui/Input.jsx`

Thin wrapper over `<input>`. Accepts all native input props plus `error: boolean`.

```jsx
<Input placeholder="Buscar..." value={v} onChange={fn} />
<Input error placeholder="Campo requerido" />
```

### New: `src/components/ui/Label.jsx`

Wrapper over `@radix-ui/react-label`. `text-sm font-medium text-gray-700`.

### New: `src/components/ui/Select.jsx`

Wrapper over `@radix-ui/react-select`. Matches Input dimensions exactly.

```jsx
<Select
  value={grupoId}
  onChange={setGrupoId}
  placeholder="Todos los grupos"
  options={grupos.map(g => ({ value: String(g.id), label: g.nombre }))}
/>
```

Options prop is `{ value: string, label: string }[]`. Supports disabled state.

### New: `src/components/ui/Checkbox.jsx`

Wrapper over `@radix-ui/react-checkbox`. Brand-colored checked state.

```jsx
<Checkbox id="activo" checked={activo} onCheckedChange={setActivo} label="Activo" />
```

### New: `src/components/ui/FormField.jsx`

Composes Label + child field + optional hint + optional error message. Eliminates the `<label>…<input>` boilerplate repeated in every form.

```jsx
<FormField label="RIF" hint="Ej: J-12345678-9" error={errors.rif}>
  <Input placeholder="J-00000000-0" value={rif} onChange={fn} error={!!errors.rif} />
</FormField>
```

Props: `label`, `hint?`, `error?` (string — displays below field in red).

### New: `src/components/ui/Table.jsx`

Subcomponent pattern. Container handles border, overflow, and rounded corners.

```jsx
<Table>
  <Table.Head>
    <Table.Row><Table.Th>Nombre</Table.Th><Table.Th align="right">Acciones</Table.Th></Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row onClick={fn}><Table.Td>…</Table.Td></Table.Row>
  </Table.Body>
</Table>
```

- `Table.Th`: `text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50`
- `Table.Row` with `onClick`: adds `cursor-pointer hover:bg-gray-50/60 transition-colors`
- `Table.Td align="right"`: right-aligns action columns

### New: `src/components/ui/EmptyState.jsx`

```jsx
<EmptyState icon={Users} message="No hay clientes registrados" action={<Button onClick={fn}>Nuevo cliente</Button>} />
```

Props: `icon` (lucide component), `message` (string), `action?` (ReactNode).

### Delete: `src/components/Modal.jsx`

Has 5 usages: `ActualizacionPreciosModal`, `ConsolidadoGrupoModal`, `EntradaInventarioModal`, `OrdenEdicionesModal`, `OrdenesResumenModal`. All migrate to `DialogContent` from `Dialog.jsx`. The Radix version already handles mobile bottom-sheet, animation, and focus trap — no behavior is lost.

### Keep unchanged

`Dialog.jsx`, `Button.jsx`, `Tooltip.jsx`, `StatusBadge.jsx`, `KpiCard.jsx`, `PageHeader.jsx`, `Alert.jsx`, `PrecioInput.jsx`, `ProductoCombobox.jsx`, `TasaBoard.jsx`.

## Migration Plan

### Phase 1 — Build components (no page changes)
1. Install new Radix deps
2. Create all 7 new components in `src/components/ui/`
3. Migrate the 5 modals from `Modal.jsx` to `Dialog`
4. Delete `Modal.jsx`

### Phase 2 — Reference page: `Clientes.jsx`
- Replace inline button with `<Button>`
- Replace filter inputs/selects with `<Input>` / `<Select>`
- Replace table markup with `<Table>`
- Add `<EmptyState>` when list is empty

### Phase 3 — Propagate
- Forms: `ClienteForm`, `OrdenForm`, `ProductoForm`, `ReporteVentaForm`, `DevolucionForm`, `EntradaInventarioForm`
- Tables: `Ordenes`, `Productos`, `ReportesVenta`, `Devoluciones`, `InventarioCentral`, `Stock`, `Usuarios`
- Deprecate `inputClass` / `selectClass` from `lib/styles.js`

## Out of Scope

- Business logic, API calls, state management
- `PrecioInput`, `ProductoCombobox`, `TasaBoard` (domain-specific, not generic)
- Internal fields of complex modals (`OrdenModal`, `ClienteModal`) — their form fields migrate in Phase 3
