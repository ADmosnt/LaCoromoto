# Phase 3 Plan C — Component Migration (Modal Internals)

**Date:** 2026-06-27
**Branch:** superpowers/rewind
**Status:** Approved
**Depends on:** Phase 1/2 components + Phase 3 Plan A (Select.jsx `id` prop) + Plan B complete

## Objective

Migrate the 7 modal components that still use raw `inputClass`/`selectClass` from `lib/styles`. Three modals are already clean (ConsolidadoGrupoModal, OrdenEdicionesModal, OrdenesResumenModal) and are out of scope.

## Reference

Phase 3 Plan A/B pages are the reference. All rules carry forward. Modal-specific additions below.

## Migration Rules (inherited + modal-specific additions)

**Always migrate:**
- `<input className={inputClass}>` → `<Input>`
- `<label className={lbl}>` + `<input>` → `<FormField id="...">` + `<Input id="...">` (when label is `text-sm`)
- `<label className={lbl}>` + `<select>` → `<FormField id="...">` + `<Select id="...">` (when label is `text-sm`)
- `<select>` filter controls (nullable, "Todos los...") → `<Select nullable noneLabel="...">`
- `<select>` required choosers (must pick something) → `<Select placeholder="...">`
- Cancel/secondary buttons → `<Button variant="secondary" type="button">`
- Primary submit/confirm buttons → `<Button>`

**Never migrate:**
- `<input type="checkbox">` — stays native
- `PrecioInput` — custom parsing component, not `<Input>`. Remove `inputClass` dependency by inlining classes.
- Dynamic product-row tables (OrdenModal, EntradaInventarioModal, DevolucionModal, ReporteVentaModal) — entire rows table stays native
- `grupo_filtro` transparent filter selects inside product row cells — stays native; when removing `selectClass` interpolation, inline the classes
- The "lista de precios" transparent select in OrdenModal rows — stays native
- "← Volver a editar" / "Volver y corregir" confirm-step back buttons → migrate to `<Button variant="secondary">`
- "🔍 Vista previa" button in ActualizacionPreciosModal — stays native (custom brand-outline)
- "+ Agregar producto", "+ Agregar teléfono" text-link buttons — stays native
- "✕" remove-row buttons — stays native
- `inpRO` / read-only display `<div>` for isEdit fields — stays native
- Business logic, state, API calls, effects

## New Judgment Calls for Plan C

**`text-xs` label sections (OrdenModal, EntradaInventarioModal):** These compact modal sections use `className="block text-xs font-medium text-gray-700 mb-1"` labels instead of the standard `text-sm`. FormField always renders `text-sm` labels — do NOT use FormField in these sections. Migrate `<input>` → `<Input>` and keep native labels. This preserves the compact visual density intended for multi-row form tables.

**`text-sm` label sections (ProductoModal, ClienteModal, DevolucionModal, ReporteVentaModal):** Use FormField where the label has a single `<Input>` or `<Select>` child.

**Textareas (ClienteModal `direccion`, `observaciones`):** `Input` renders only `<input>` — no `as="textarea"` prop exists. Use FormField for the label + native `<textarea>` with inline classes: `className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`.

**Conditional display-or-input fields (DevolucionModal cliente/orden, OrdenModal cliente):** When a field conditionally shows a read-only `<div>` or a Select depending on `isEdit`, the structural asymmetry makes FormField awkward. Keep native `<label>` inline (matching the label string from `lbl`) and use `<Select>` for the editable branch.

**`lbl` const removal:** When removing `const lbl`, replace all usages with the literal string `"block text-sm font-medium text-gray-700 mb-1"` for any label that isn't absorbed by a FormField.

**`selectClass` in native stays-native selects:** The `grupo_filtro` select in product rows can't use Select component — its custom compact styling (`text-xs text-gray-500 bg-gray-50`) would be lost. When removing `selectClass`, inline: `"w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`.

**OrdenModal isEdit client display div:** Was `className={`${inputClass} bg-gray-100 text-gray-600`}`. Inline as: `className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"` (no focus classes — it's a display div, not interactive).

**ReporteVentaModal tasa label:** Has `className={`${lbl} flex items-center`}` for a HelpTooltip. FormField doesn't support `labelClassName`. Keep native label: `className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"` + `<Input>` (no FormField).

**ActualizacionPreciosModal label style:** Labels in this modal are already inline strings (`"block text-sm font-medium text-gray-700 mb-1"`) — no `lbl` const to remove. The Tipo/Valor fields have button-groups and PrecioInput as children — can't use FormField. Only the two selects get FormField.

**Row inputs that don't use inputClass:** Some row inputs in ReporteVentaModal already have fully inline classes. Leave them unchanged — they're already correctly styled.

## Modals

### 1. `ProductoModal.jsx` (233 lines)

**Remove:** `const lbl`, `{ inputClass, selectClass }` from `'../lib/styles'`
**Add:** `Button`, `Input`, `Select`, `FormField`

**Form step:**
- `codigo`: `<FormField id="codigo" label="Código *"><Input id="codigo" value={form.codigo} onChange={...} /></FormField>` + `{isEdit && <p ...>}` after the FormField
- `unidades_por_bulto`: `<FormField id="upb" label="Unidades por bulto *"><Input id="upb" type="number" min={1} value={form.unidades_por_bulto} onChange={...} /></FormField>`
- `descripcion`: `<FormField id="descripcion" label="Descripción *"><Input id="descripcion" value={form.descripcion} onChange={...} /></FormField>`
- `grupo_id`: `<FormField id="grupo_id" label="Grupo"><Select id="grupo_id" nullable noneLabel="Sin grupo" value={form.grupo_id} onChange={(val) => set('grupo_id', val)} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} /></FormField>`
- PrecioInput rows: stay as-is (already styled without inputClass)
- Footer: Cancel → `<Button variant="secondary" type="button" onClick={onClose}>`, Submit → `<Button type="submit">Revisar →</Button>`

**Confirm step (footer only):**
- "← Volver a editar" → `<Button variant="secondary" type="button" onClick={() => setStep('form')}>`
- "Confirmar y X" → `<Button type="button" onClick={doSave} disabled={loading}>`

### 2. `ClienteModal.jsx` (232 lines)

**Remove:** `const lbl`, `{ inputClass, selectClass }` from `'../lib/styles'`
**Add:** `Button`, `Input`, `Select`, `FormField`

**Form step:**
- `codigo`: `<FormField id="codigo" label="Código *"><Input id="codigo" .../></FormField>` + hint paragraph
- `rif`: `<FormField id="rif" label="RIF"><Input id="rif" .../></FormField>`
- `razon_social`: `<FormField id="razon_social" label="Razón Social *"><Input id="razon_social" .../></FormField>`
- `direccion` (textarea): `<FormField id="direccion" label="Dirección"><textarea id="direccion" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition" rows={2} value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} /></FormField>`
- `zona_id`: `<FormField id="zona_id" label="Zona"><Select id="zona_id" nullable noneLabel="Sin zona" value={form.zona_id} onChange={(val) => set('zona_id', val)} options={zonas.map(z => ({value: String(z.id), label: z.nombre}))} /></FormField>`
- `grupo_id`: `<FormField id="grupo_id" label="Grupo"><Select id="grupo_id" nullable noneLabel="Sin grupo" value={form.grupo_id} onChange={(val) => set('grupo_id', val)} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} /></FormField>`
- `contacto`, `cobrador`, `vendedor`: each `<FormField id="X" label="X"><Input id="X" .../></FormField>`
- Teléfonos dynamic rows: `<Input value={tel} onChange={(e) => setTel(i, e.target.value)} placeholder="04XX-XXXXXXX" />` (no FormField — already in flex row with remove button)
- Listas checkboxes: stay native
- `observaciones` (textarea): `<FormField id="observaciones" label="Observaciones"><textarea id="observaciones" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition" rows={2} .../></FormField>`
- Footer: Cancel → `Button secondary`; Submit → `Button`

**Confirm step (footer only):**
- Same pattern as ProductoModal confirm buttons

### 3. `ActualizacionPreciosModal.jsx` (233 lines)

**Remove:** `{ inputClass }` from `'../lib/styles'`
**Add:** `Button`, `Select`, `FormField`

**Changes:**
- `lista` select → `<FormField id="lista" label="Lista de precios *"><Select id="lista" placeholder="Seleccionar lista..." value={listaId} onChange={setListaId} options={listas.map(l => ({value: String(l.id), label: l.nombre}))} /></FormField>`
- `grupo` select → `<FormField id="grupo" label="Grupo de productos"><Select id="grupo" nullable noneLabel="Todos los grupos" value={grupoId} onChange={setGrupoId} options={grupos.map(g => ({value: String(g.id), label: g.nombre}))} /></FormField>`
- Tipo de ajuste section: label stays native (wraps a button group, not a single input); no FormField
- Valor PrecioInput: stays as `PrecioInput`, but `className={`${inputClass} pl-8`}` → `className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition pl-8"`
- "🔍 Vista previa" → stays native
- Cancel → `Button secondary`; "Aplicar cambios" → `Button`

### 4. `DevolucionModal.jsx` (309 lines)

**Remove:** `const lbl`, `{ inputClass, selectClass }` from `'../lib/styles'`
**Add:** `Button`, `Input`, `Select`, `FormField`

**Keep `inpRO` const** (used 3 times, display-only class, not form input):
```js
const inpRO = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-600'
```

**Changes:**
- Create mode cliente: keep native `<label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>` + `<Select placeholder="Seleccionar cliente..." value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} />`
- Create mode orden: keep native `<label className="block text-sm font-medium text-gray-700 mb-1">Orden de origen *</label>` + `<Select placeholder="Seleccionar orden..." value={ordenId} onChange={setOrdenId} options={ordenes.map(o => ({value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}`}))} />`
- isEdit cliente/orden display divs: `<div className={inpRO}>...</div>` stays as-is
- Nota: `<FormField id="nota" label="Nota / Motivo"><Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Producto en mal estado..." /></FormField>`
- Row bultos/sueltas inputs: already have inline classes (no inputClass) → **no change**
- reingresar checkbox → stays native
- Cancel → `Button secondary`; Submit → `Button disabled={loading || (!isEdit && !ordenId)}`

### 5. `OrdenModal.jsx` (427 lines)

**Remove:** `{ inputClass, selectClass }` from `'../lib/styles'`
**Add:** `Button`, `Input`, `Select` (no FormField — all header labels are `text-xs`)

**Header section (compact, xs labels — no FormField):**
- Create mode cliente: `<Select placeholder="Seleccionar cliente..." value={clienteId} onChange={setClienteId} options={clientes.map(c => ({value: String(c.id), label: c.razon_social}))} className="w-full" />`
- isEdit cliente div: `<div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600">` (no focus classes — display div)
- `fecha`: `<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />`
- `tasaManual`: `<Input type="number" step="0.0001" min="0" placeholder={...} value={tasaManual} onChange={(e) => setTasaManual(e.target.value)} />`
- `nota`: `<Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />`
- isEdit `motivo`: `<Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: el cliente solicitó..." />`
- xs labels (`className="block text-xs font-medium text-gray-700 mb-1"`) → keep as-is

**Product rows table (entire table stays native):**
- `grupo_filtro` selects: stay native; remove `${selectClass}` interpolation → inline: `className="w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`
- `bultos`/`sueltas` inputs: `className={`w-full text-center py-1.5 ${inputClass}`}` → `<Input className="w-full text-center py-1.5">`
- PrecioInput: already has `"border border-gray-300 rounded px-2 py-1.5 text-sm w-full text-right"` → **no change**
- Lista de precios transparent select → **no change**

**Footer:**
- Cancel → `Button secondary`; Submit → `Button disabled={loading}`

### 6. `ReporteVentaModal.jsx` (252 lines)

**Remove:** `const lbl`, `{ inputClass, selectClass }` from `'../lib/styles'` (`selectClass` is unused but present)
**Add:** `Button`, `Input`, `FormField`

**Changes:**
- `fecha`: `<FormField id="fecha" label="Fecha de cobro"><Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></FormField>`
- `tasaManual` (!isCliente, native label due to `flex items-center`):
  ```jsx
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
      Tasa BCV al cobro (Bs/$)
      <HelpTooltip text="..." />
    </label>
    <Input type="number" min="0" step="0.0001" value={tasaManual} onChange={(e) => setTasaManual(e.target.value)} placeholder="Ej: 45.50" required />
  </div>
  ```
- "Unidades vendidas" section label: `<label className="block text-sm font-medium text-gray-700 mb-1">Unidades vendidas</label>` (was `className={lbl}` → inline)
- Row bultos/sueltas: already fully inline → **no change**
- PrecioInput row: already fully inline → **no change**
- Cancel → `Button secondary`; Submit → `Button disabled={loading || rows.length === 0}`

### 7. `EntradaInventarioModal.jsx` (380 lines)

**Remove:** `{ inputClass, selectClass }` from `'../lib/styles'`
**Add:** `Button`, `Input` (no FormField — all section labels are `text-xs`)

**Form step:**
- `fecha`: `<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />` (xs label stays)
- `nota`: `<Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Factura #123..." />` (xs label stays)
- xs labels (`className="block text-xs font-medium text-gray-700 mb-1"`) → keep as-is
- `grupo_filtro` selects in rows: stay native; remove `${selectClass}` → inline: `className="w-full mb-1 text-xs text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"`
- `bultos`/`sueltas`: `className={`w-full text-center py-1.5 ${inputClass}`}` → `<Input className="w-full text-center py-1.5">`
- Form footer: Cancel → `Button secondary`; "Revisar y confirmar →" → `Button`

**Confirm step (display only — no form inputs changed):**
- "← Volver y corregir" → `Button secondary`
- "Confirmar ingreso" / "Confirmar cambios" → `Button disabled={loading}`

## Out of Scope

- ConsolidadoGrupoModal, OrdenEdicionesModal, OrdenesResumenModal — already clean
- Any new component features (e.g., `as="textarea"` on Input, `labelClassName` on FormField)
- Style improvements beyond removing raw class dependencies
