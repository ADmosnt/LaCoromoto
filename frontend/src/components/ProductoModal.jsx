import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import PrecioInput, { parsePrecio } from './ui/PrecioInput'
import {
  getProducto, createProducto, updateProducto,
  getGruposProductos, getListasPrecios,
} from '../api'
import Alert from './Alert'
import { inputClass, selectClass } from '../lib/styles'

const emptyForm = { codigo: '', descripcion: '', unidades_por_bulto: 1, grupo_id: '', activo: true, precios: [] }

export default function ProductoModal({ open, onClose, productoId, onSaved }) {
  const isEdit = Boolean(productoId)
  const [form, setForm] = useState(emptyForm)
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('form') // 'form' | 'confirm'

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

  // Construye los precios por unidad validados; devuelve null si hay error.
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
      if (parsed > 0) {
        out.push({ lista_id: p.lista_id, precio_usd: parsed / upb })
      }
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

  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

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
              <button type="button" onClick={() => setStep('form')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                ← Volver a editar
              </button>
              <button type="button" onClick={doSave} disabled={loading} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar y guardar' : 'Confirmar y crear')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={goConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Código *</label>
                <input className={inputClass} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required />
                {isEdit && <p className="text-xs text-gray-400 mt-1">Editable. Debe ser único.</p>}
              </div>
              <div>
                <label className={lbl}>Unidades por bulto *</label>
                <input type="number" min={1} className={inputClass} value={form.unidades_por_bulto}
                  onChange={(e) => set('unidades_por_bulto', parseInt(e.target.value) || 1)} required />
              </div>
            </div>

            <div>
              <label className={lbl}>Descripción *</label>
              <input className={inputClass} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} required />
            </div>

            <div>
              <label className={lbl}>Grupo</label>
              <select className={`w-full ${selectClass}`} value={form.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
                <option value="">Sin grupo</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>

            {listas.length > 0 && (
              <div>
                <label className={lbl}>Precios por bulto (USD)</label>
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
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
                Revisar →
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
