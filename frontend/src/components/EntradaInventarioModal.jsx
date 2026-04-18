import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from './ui/Dialog'
import { createEntrada, getProductos } from '../api'
import Alert from './Alert'

export default function EntradaInventarioModal({ open, onClose, onSaved }) {
  const [productos, setProductos] = useState([])
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setProductoId('')
    setCantidad('')
    setNota('')
    setFecha(new Date().toISOString().slice(0, 10))
    getProductos({ activo: true }).then((r) => setProductos(r.data))
  }, [open])

  const producto = productos.find((p) => String(p.id) === String(productoId))
  const cant = Number(cantidad) || 0
  const upb = producto?.unidades_por_bulto || 1
  const bultos = Math.floor(cant / upb)
  const sueltas = cant % upb

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!productoId) { setError('Seleccione un producto'); return }
    if (!cantidad || Number(cantidad) <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setLoading(true)
    try {
      await createEntrada({
        producto_id: Number(productoId),
        cantidad_unidades: Number(cantidad),
        fecha,
        nota: nota || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar la entrada')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Registrar Entrada al Almacén">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={lbl}>Producto *</label>
            <select className={inp} value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
              <option value="">Seleccionar producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.descripcion} ({p.codigo})</option>
              ))}
            </select>
            {producto && (
              <p className="text-xs text-gray-400 mt-1">
                {producto.unidades_por_bulto} uds/bulto — Grupo: {producto.grupo ?? '—'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Cantidad (unidades) *</label>
              <input
                type="number" min={1} className={inp}
                value={cantidad} onChange={(e) => setCantidad(e.target.value)} required
              />
              {cant > 0 && producto && (
                <p className="text-xs text-gray-400 mt-1">
                  {bultos} bulto{bultos !== 1 ? 's' : ''} + {sueltas} suelta{sueltas !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div>
              <label className={lbl}>Fecha</label>
              <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Nota (opcional)</label>
            <input
              type="text" className={inp} value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Factura #123, proveedor XYZ..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
