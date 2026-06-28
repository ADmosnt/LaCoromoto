import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDevolucion, getClientes, getClienteStock, getOrdenes } from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

export default function DevolucionForm() {
  const nav = useNavigate()
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
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [])

  useEffect(() => {
    if (!clienteId) { setStockCliente([]); setRows([]); setOrdenes([]); return }
    Promise.all([getClienteStock(clienteId), getOrdenes({ cliente_id: clienteId })]).then(([s, o]) => {
      setStockCliente(s.data.stock)
      setRows(s.data.stock.map((st) => ({ producto_id: st.producto_id, descripcion: st.descripcion, disponible: st.cantidad_unidades, cantidad_unidades: '' })))
      setOrdenes(o.data)
    })
  }, [clienteId])

  const setRow = (i, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], cantidad_unidades: val }
    setRows(rs)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const detalles = rows.filter((r) => Number(r.cantidad_unidades) > 0)
    if (!detalles.length) { setError('Ingrese al menos una unidad a devolver'); return }
    setLoading(true)
    try {
      await createDevolucion({
        cliente_id: Number(clienteId),
        orden_origen_id: ordenOrigenId ? Number(ordenOrigenId) : null,
        fecha,
        nota,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: Number(r.cantidad_unidades),
        })),
      })
      nav('/devoluciones')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar devolución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/devoluciones')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Nueva Devolución</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <FormField id="cliente" label="Cliente *">
            <Select
              id="cliente"
              value={clienteId}
              onChange={setClienteId}
              placeholder="Seleccionar cliente..."
              options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="fecha" label="Fecha">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </FormField>
            {ordenes.length > 0 && (
              <FormField id="orden_origen" label="Orden origen (opcional)">
                <Select
                  id="orden_origen"
                  nullable
                  noneLabel="Sin orden específica"
                  value={ordenOrigenId}
                  onChange={setOrdenOrigenId}
                  options={ordenes.map((o) => ({ value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}` }))}
                />
              </FormField>
            )}
          </div>

          <FormField id="nota" label="Nota">
            <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Motivo de la devolución..." />
          </FormField>
        </div>

        {clienteId && (
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Unidades a devolver</h3>
            {rows.length === 0 ? (
              <p className="text-gray-400 text-sm">Este cliente no tiene stock en consignación.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Disponible</th>
                      <th className="px-3 py-2 text-center">Cantidad a devolver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{row.descripcion}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{row.disponible}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={row.disponible}
                            className="w-24 text-center"
                            value={row.cantidad_unidades}
                            onChange={(e) => setRow(i, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => nav('/devoluciones')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar Devolución'}</Button>
        </div>
      </form>
    </div>
  )
}
