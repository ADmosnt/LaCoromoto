import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { createEntrada, getProductos, getGruposProductos } from '../api'
import Alert from './Alert'

export default function EntradaInventarioModal({ open, onClose, onSaved }) {
  const [productos, setProductos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [productoId, setProductoId] = useState('')
  const [bultos, setBultos] = useState('')
  const [sueltas, setSueltas] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setGrupoFiltro('')
    setProductoId('')
    setBultos('')
    setSueltas('')
    setNota('')
    setFecha(new Date().toISOString().slice(0, 10))
    Promise.all([
      getProductos({ activo: true }),
      getGruposProductos(),
    ]).then(([p, g]) => { setProductos(p.data); setGrupos(g.data) })
  }, [open])

  const producto = productos.find((p) => String(p.id) === String(productoId))
  const upb = producto?.unidades_por_bulto || 1
  const totalUds = (Number(bultos) || 0) * upb + (Number(sueltas) || 0)

  const productosFiltrados = grupoFiltro
    ? productos.filter((p) => String(p.grupo_id) === grupoFiltro)
    : productos

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!productoId) { setError('Seleccione un producto'); return }
    if (totalUds <= 0) { setError('Ingrese al menos un bulto o unidad'); return }
    setLoading(true)
    try {
      await createEntrada({
        producto_id: Number(productoId),
        cantidad_unidades: totalUds,
        fecha,
        nota: nota || undefined,
      })
      toast.success('Entrada registrada al almacén')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar la entrada')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const inpNum = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Registrar Entrada al Almacén">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">

          {/* Filtro de grupo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Grupo de productos</label>
              <select
                className={inp}
                value={grupoFiltro}
                onChange={(e) => { setGrupoFiltro(e.target.value); setProductoId('') }}
              >
                <option value="">Todos los grupos</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Producto *</label>
              <select
                className={inp}
                value={productoId}
                onChange={(e) => { setProductoId(e.target.value); setBultos(''); setSueltas('') }}
                required
              >
                <option value="">Seleccionar...</option>
                {productosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>{p.descripcion} ({p.codigo})</option>
                ))}
              </select>
              {producto && (
                <p className="text-xs text-gray-400 mt-1">
                  {producto.unidades_por_bulto} uds/bulto
                  {producto.grupo ? ` — ${producto.grupo}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Bultos + Sueltas + Fecha */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Bultos *</label>
              <input
                type="number" min={0}
                className={inpNum}
                value={bultos}
                onChange={(e) => setBultos(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={lbl}>Uds. sueltas</label>
              <input
                type="number" min={0} max={upb - 1}
                className={inpNum}
                value={sueltas}
                onChange={(e) => setSueltas(e.target.value)}
                placeholder="0"
              />
              {upb > 1 && (
                <p className="text-xs text-gray-400 mt-1 text-center">máx {upb - 1}</p>
              )}
            </div>
            <div>
              <label className={lbl}>Fecha</label>
              <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          {/* Total preview */}
          {totalUds > 0 && producto && (
            <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-2 text-sm text-blue-800">
              Total a ingresar: <span className="font-bold">{totalUds} unidades</span>
              <span className="text-blue-500 ml-2">
                ({Number(bultos) || 0}B + {Number(sueltas) || 0}u)
              </span>
            </div>
          )}

          <div>
            <label className={lbl}>Nota (opcional)</label>
            <input
              type="text" className={inp} value={nota}
              onChange={(e) => setNota(e.target.value)}
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
