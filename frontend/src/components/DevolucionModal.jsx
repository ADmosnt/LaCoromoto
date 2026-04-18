import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from './ui/Dialog'
import { createDevolucion, getClientes, getClienteStock, getOrdenes } from '../api'
import Alert from './Alert'

export default function DevolucionModal({ open, onClose, onSaved }) {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stockCliente, setStockCliente] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [ordenOrigenId, setOrdenOrigenId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setClienteId('')
    setOrdenOrigenId('')
    setNota('')
    setRows([])
    setFecha(new Date().toISOString().slice(0, 10))
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [open])

  useEffect(() => {
    if (!clienteId) { setStockCliente([]); setRows([]); setOrdenes([]); return }
    Promise.all([getClienteStock(clienteId), getOrdenes({ cliente_id: clienteId, status: 'activa' })]).then(([s, o]) => {
      setStockCliente(s.data)
      setRows(s.data.map((st) => ({
        producto_id: st.producto_id,
        descripcion: st.descripcion,
        unidades_por_bulto: st.unidades_por_bulto,
        disponible: st.cantidad_unidades,
        bultos: '',
        sueltas: '',
      })))
      setOrdenes(o.data)
    })
  }, [clienteId])

  const setRowField = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    setRows(rs)
  }

  const totalUnidades = (row) => {
    const upb = row.unidades_por_bulto || 1
    return (Number(row.bultos) || 0) * upb + (Number(row.sueltas) || 0)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const detalles = rows
      .map((r) => ({ ...r, cantidad_unidades: totalUnidades(r) }))
      .filter((r) => r.cantidad_unidades > 0)

    if (!detalles.length) { setError('Ingrese al menos una unidad a devolver'); return }

    const overstock = detalles.find((r) => r.cantidad_unidades > r.disponible)
    if (overstock) {
      setError(`Cantidad de "${overstock.descripcion}" supera el disponible (${overstock.disponible} uds)`)
      return
    }

    setLoading(true)
    try {
      await createDevolucion({
        cliente_id: Number(clienteId),
        orden_origen_id: ordenOrigenId ? Number(ordenOrigenId) : null,
        fecha,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Fecha</label>
              <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            {ordenes.length > 0 && (
              <div>
                <label className={lbl}>Orden origen (opcional)</label>
                <select className={inp} value={ordenOrigenId} onChange={(e) => setOrdenOrigenId(e.target.value)}>
                  <option value="">Sin orden específica</option>
                  {ordenes.map((o) => <option key={o.id} value={o.id}>#{o.numero_orden} — {o.fecha_emision}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>Nota</label>
            <input className={inp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Motivo de la devolución..." />
          </div>

          {clienteId && (
            <div>
              <label className={lbl}>Unidades a devolver</label>
              {rows.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Este cliente no tiene stock en consignación.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-center">Disponible</th>
                        <th className="px-3 py-2 text-center">Bultos</th>
                        <th className="px-3 py-2 text-center">Uds. sueltas</th>
                        <th className="px-3 py-2 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row, i) => {
                        const upb = row.unidades_por_bulto || 1
                        const total = totalUnidades(row)
                        return (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-sm">{row.descripcion}</td>
                            <td className="px-3 py-2 text-center text-gray-500 text-xs">
                              {Math.floor(row.disponible / upb)}B+{row.disponible % upb}u
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number" min={0} max={Math.floor(row.disponible / upb)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center"
                                value={row.bultos}
                                onChange={(e) => setRowField(i, 'bultos', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number" min={0} max={upb - 1}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center"
                                value={row.sueltas}
                                onChange={(e) => setRowField(i, 'sueltas', e.target.value)}
                              />
                            </td>
                            <td className={`px-3 py-2 text-center text-xs font-medium ${total > row.disponible ? 'text-red-600' : 'text-gray-700'}`}>
                              {total > 0 ? `${total} uds` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Registrando...' : 'Registrar Devolución'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
