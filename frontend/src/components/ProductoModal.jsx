import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import PrecioInput, { parsePrecio } from './ui/PrecioInput'
import {
  getProducto, createProducto, updateProducto,
  getGruposProductos, getListasPrecios,
} from '../api'
import Alert from './Alert'

const emptyForm = { codigo: '', descripcion: '', unidades_por_bulto: 1, grupo_id: '', activo: true, precios: [] }

export default function ProductoModal({ open, onClose, productoId, onSaved }) {
  const isEdit = Boolean(productoId)
  const [form, setForm] = useState(emptyForm)
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
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

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const upb = Number(form.unidades_por_bulto) || 1
    const preciosOut = []
    for (const p of form.precios) {
      if (p.precio_bulto_str === '' || p.precio_bulto_str == null) continue
      const parsed = parsePrecio(p.precio_bulto_str)
      if (parsed == null || parsed < 0) {
        setError('Precio inválido. Usa números con "." o "," como separador decimal.')
        return
      }
      if (parsed > 0) {
        preciosOut.push({ lista_id: p.lista_id, precio_usd: parsed / upb })
      }
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
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
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={isEdit ? 'Editar producto' : 'Nuevo producto'}>
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Código *</label>
              <input className={inp} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required disabled={isEdit} />
            </div>
            <div>
              <label className={lbl}>Unidades por bulto *</label>
              <input type="number" min={1} className={inp} value={form.unidades_por_bulto}
                onChange={(e) => set('unidades_por_bulto', parseInt(e.target.value) || 1)} required />
            </div>
          </div>

          <div>
            <label className={lbl}>Descripción *</label>
            <input className={inp} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} required />
          </div>

          <div>
            <label className={lbl}>Grupo</label>
            <select className={inp} value={form.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
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
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
