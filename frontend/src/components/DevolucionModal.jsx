import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from './ui/Dialog'
import { createDevolucion, getClientes, getOrdenes, getOrden } from '../api'
import Alert from './Alert'

export default function DevolucionModal({ open, onClose, onSaved }) {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [ordenId, setOrdenId] = useState('')
  const [rows, setRows] = useState([])
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(''); setClienteId(''); setOrdenId(''); setRows([]); setNota(''); setOrdenes([])
    getClientes({ activo: true })
      .then((r) => setClientes(r.data))
      .catch(() => setError('Error al cargar clientes'))
  }, [open])

  useEffect(() => {
    if (!clienteId) { setOrdenes([]); setOrdenId(''); setRows([]); return }
    getOrdenes({ cliente_id: clienteId, status: 'activa' })
      .then((r) => setOrdenes(r.data))
      .catch(() => setError('Error al cargar órdenes'))
    setOrdenId('')
    setRows([])
  }, [clienteId])

  useEffect(() => {
    if (!ordenId) { setRows([]); return }
    getOrden(ordenId).then((r) => {
      setRows(
        (r.data.detalles ?? []).map((d) => {
          const upb = d.unidades_por_bulto || 1
          return {
            producto_id: d.producto_id,
            descripcion: d.descripcion,
            codigo: d.codigo,
            upb,
            cantidad_despachada: d.cantidad_unidades,
            bultos: '',
            sueltas: '',
          }
        })
      )
    })
  }, [ordenId])

  const setRowField = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    setRows(rs)
  }

  const totalUnidades = (row) => {
    const upb = row.upb || 1
    return (Number(row.bultos) || 0) * upb + (Number(row.sueltas) || 0)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const detalles = rows
      .map((r) => ({ ...r, cantidad_unidades: totalUnidades(r) }))
      .filter((r) => r.cantidad_unidades > 0)

    if (!detalles.length) { setError('Ingrese al menos una unidad a devolver'); return }

    const excede = detalles.find((r) => r.cantidad_unidades > r.cantidad_despachada)
    if (excede) {
      setError(`"${excede.descripcion}": no puede devolver más de lo despachado (${excede.cantidad_despachada} uds)`)
      return
    }

    setLoading(true)
    try {
      await createDevolucion({
        cliente_id: Number(clienteId),
        orden_origen_id: Number(ordenId),
        nota,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: r.cantidad_unidades,
        })),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar devolución')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'
  const inpNum = 'border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Nueva Devolución" size="lg">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">

          <div>
            <label className={lbl}>Cliente *</label>
            <select className={inp} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </div>

          {clienteId && (
            <div>
              <label className={lbl}>Orden de origen *</label>
              {ordenes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Este cliente no tiene órdenes activas.</p>
              ) : (
                <select className={inp} value={ordenId} onChange={(e) => setOrdenId(e.target.value)} required>
                  <option value="">Seleccionar orden...</option>
                  {ordenes.map((o) => (
                    <option key={o.id} value={o.id}>#{o.numero_orden} — {o.fecha_emision}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <label className={lbl}>Unidades a devolver</label>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Uds/Bulto</th>
                      <th className="px-3 py-2 text-center">Despachado</th>
                      <th className="px-3 py-2 text-center">Bultos</th>
                      <th className="px-3 py-2 text-center">Uds. sueltas</th>
                      <th className="px-3 py-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, i) => {
                      const upb = row.upb || 1
                      const total = totalUnidades(row)
                      const excede = total > row.cantidad_despachada
                      return (
                        <tr key={i} className={excede ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 font-medium">
                            <div>{row.descripcion}</div>
                            <div className="text-xs text-gray-400 font-mono">{row.codigo}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs font-medium">{upb}</td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs">
                            {Math.floor(row.cantidad_despachada / upb)}B+{row.cantidad_despachada % upb}u
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min={0} max={Math.floor(row.cantidad_despachada / upb)}
                              className={inpNum}
                              value={row.bultos}
                              onChange={(e) => setRowField(i, 'bultos', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min={0} max={upb - 1}
                              className={inpNum}
                              value={row.sueltas}
                              onChange={(e) => setRowField(i, 'sueltas', e.target.value)}
                            />
                          </td>
                          <td className={`px-3 py-2 text-center text-xs font-medium ${excede ? 'text-red-600' : 'text-gray-700'}`}>
                            {total > 0 ? `${total} uds` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ordenId && (
            <div>
              <label className={lbl}>Nota / Motivo</label>
              <input className={inp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Producto en mal estado..." />
              <p className="text-xs text-gray-400 mt-1">Las unidades devueltas son retiradas del stock en consignación y no se reincorporan al inventario central.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !ordenId} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Registrando...' : 'Registrar Devolución'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
