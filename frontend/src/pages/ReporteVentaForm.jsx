import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReporteVenta, getClientes, getClienteStock, getTasaHoy } from '../api'
import Alert from '../components/Alert'

export default function ReporteVentaForm() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stockCliente, setStockCliente] = useState([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tasa, setTasa] = useState(null)
  const [tasaManual, setTasaManual] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
    getTasaHoy().then((r) => setTasa(r.data)).catch(() => null)
  }, [])

  useEffect(() => {
    if (!clienteId) { setStockCliente([]); setRows([]); return }
    getClienteStock(clienteId).then((r) => {
      setStockCliente(r.data)
      setRows(r.data.map((s) => ({ producto_id: s.producto_id, descripcion: s.descripcion, disponible: s.cantidad_unidades, cantidad_unidades: '', precio_usd_momento: '' })))
    })
  }, [clienteId])

  const tasaValor = Number(tasaManual || tasa?.valor || 0)

  const setRow = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    setRows(rs)
  }

  const totalUsd = rows.reduce((sum, r) => {
    return sum + (Number(r.cantidad_unidades) || 0) * (Number(r.precio_usd_momento) || 0)
  }, 0)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const detalles = rows.filter((r) => r.cantidad_unidades > 0 && r.precio_usd_momento > 0)
    if (!detalles.length) { setError('Ingrese al menos un producto vendido'); return }
    setLoading(true)
    try {
      await createReporteVenta({
        cliente_id: Number(clienteId),
        fecha,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: Number(r.cantidad_unidades),
          precio_usd_momento: Number(r.precio_usd_momento),
        })),
      })
      nav('/reportes-venta')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear el reporte')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/reportes-venta')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">Nuevo Reporte de Venta</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select className={`w-full ${inp}`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" className={`w-full ${inp}`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa BCV {tasa && <span className="text-xs text-gray-400 ml-1">Registrada: {Number(tasa.valor).toFixed(4)}</span>}
            </label>
            <input
              type="number" step="0.0001" min="0"
              className={`w-48 ${inp}`}
              placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
              value={tasaManual}
              onChange={(e) => setTasaManual(e.target.value)}
            />
          </div>
        </div>

        {clienteId && (
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Productos vendidos (stock en consignación)</h3>
            {rows.length === 0 ? (
              <p className="text-gray-400 text-sm">Este cliente no tiene stock en consignación.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Disponible</th>
                    <th className="px-3 py-2 text-center">Cant. vendida</th>
                    <th className="px-3 py-2 text-right">Precio USD</th>
                    <th className="px-3 py-2 text-right">Total USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{row.descripcion}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{row.disponible}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} max={row.disponible}
                          className={`w-24 text-center ${inp}`}
                          value={row.cantidad_unidades}
                          onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min={0}
                          className={`w-28 text-right ${inp}`}
                          value={row.precio_usd_momento}
                          onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        ${((Number(row.cantidad_unidades) || 0) * (Number(row.precio_usd_momento) || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex justify-end border-t pt-4 gap-8 text-sm">
              <div className="text-right">
                <p className="text-gray-500">Total USD</p>
                <p className="text-xl font-bold">${totalUsd.toFixed(2)}</p>
              </div>
              {tasaValor > 0 && (
                <div className="text-right">
                  <p className="text-gray-500">Total Bs.</p>
                  <p className="text-xl font-bold">Bs. {(totalUsd * tasaValor).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav('/reportes-venta')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Crear Reporte'}
          </button>
        </div>
      </form>
    </div>
  )
}
