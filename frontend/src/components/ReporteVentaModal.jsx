import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from './ui/Dialog'
import { createReporteVenta, getTasaHoy } from '../api'
import Alert from './Alert'

export default function ReporteVentaModal({ open, onClose, onSaved, orden }) {
  const [rows, setRows] = useState([])
  const [fecha, setFecha] = useState('')
  const [tasaManual, setTasaManual] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !orden) return
    setError('')
    setFecha(new Date().toISOString().slice(0, 10))
    getTasaHoy().then((r) => {
      if (r.data?.valor) setTasaManual(String(r.data.valor))
    }).catch(() => {})
    setRows(
      (orden.detalles ?? []).map((d) => {
        const upb = d.unidades_por_bulto || 1
        return {
          producto_id: d.producto_id,
          descripcion: d.descripcion,
          codigo: d.codigo,
          upb,
          despacho_uds: d.cantidad_unidades,
          bultos: '',
          sueltas: '',
          precio_bulto: (Number(d.precio_usd_momento) * upb).toFixed(2),
        }
      })
    )
  }, [open, orden])

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

    if (!detalles.length) { setError('Ingrese al menos una unidad vendida'); return }

    const excede = detalles.find((r) => r.cantidad_unidades > r.despacho_uds)
    if (excede) {
      setError(`"${excede.descripcion}": no puede superar las ${excede.despacho_uds} unidades despachadas`)
      return
    }

    if (!tasaManual || Number(tasaManual) <= 0) {
      setError('Ingrese la tasa de cambio al momento del cobro')
      return
    }

    setLoading(true)
    try {
      await createReporteVenta({
        cliente_id: orden.cliente_id,
        orden_id: orden.id,
        fecha,
        tasa_valor: Number(tasaManual),
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: r.cantidad_unidades,
          precio_usd_momento: Number(r.precio_bulto) / (r.upb || 1),
        })),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  if (!orden) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={`Reporte de Venta — Orden ${orden.numero_orden}`} size="xl">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Fecha de cobro</label>
              <input type="date" className={`${inp} w-full`} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div>
              <label className={lbl}>Tasa BCV al cobro (Bs/$)</label>
              <input
                type="number" min="0" step="0.0001"
                className={`${inp} w-full`}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
                placeholder="Ej: 45.50"
                required
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Unidades vendidas</label>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Despachado</th>
                    <th className="px-3 py-2 text-center">Bultos</th>
                    <th className="px-3 py-2 text-center">Uds. sueltas</th>
                    <th className="px-3 py-2 text-center">Total uds</th>
                    <th className="px-3 py-2 text-right">Precio/Bulto $</th>
                    <th className="px-3 py-2 text-right">Total $</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => {
                    const upb = row.upb || 1
                    const total = totalUnidades(row)
                    const excede = total > row.despacho_uds
                    const totalUsd = (total / upb) * Number(row.precio_bulto)
                    return (
                      <tr key={i} className={excede ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 font-medium">
                          <div>{row.descripcion}</div>
                          <div className="text-xs text-gray-400 font-mono">{row.codigo}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500 text-xs">
                          {Math.floor(row.despacho_uds / upb)}B+{row.despacho_uds % upb}u
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} max={Math.floor(row.despacho_uds / upb)}
                            className={`${inp} w-16 text-center`}
                            value={row.bultos}
                            onChange={(e) => setRowField(i, 'bultos', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} max={upb - 1}
                            className={`${inp} w-16 text-center`}
                            value={row.sueltas}
                            onChange={(e) => setRowField(i, 'sueltas', e.target.value)}
                          />
                        </td>
                        <td className={`px-3 py-2 text-center text-xs font-medium ${excede ? 'text-red-600' : 'text-gray-700'}`}>
                          {total > 0 ? `${total} uds` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number" min={0} step="0.01"
                            className={`${inp} w-24 text-right`}
                            value={row.precio_bulto}
                            onChange={(e) => setRowField(i, 'precio_bulto', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-xs">
                          {total > 0 ? `$${totalUsd.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Registrando...' : 'Registrar Reporte'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
