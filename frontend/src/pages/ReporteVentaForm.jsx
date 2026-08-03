import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReporteVenta, getClientes, getClienteStock, getTasaHoy } from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

export default function ReporteVentaForm() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stockCliente, setStockCliente] = useState([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tasa, setTasa] = useState(null)
  const [tasaManual, setTasaManual] = useState('')
  const [rows, setRows] = useState([])
  const [productoAdd, setProductoAdd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
    getTasaHoy().then((r) => setTasa(r.data)).catch(() => null)
  }, [])

  useEffect(() => {
    if (!clienteId) { setStockCliente([]); setRows([]); setProductoAdd(''); return }
    getClienteStock(clienteId).then((r) => {
      setStockCliente(r.data.stock)
      setRows([])
      setProductoAdd('')
    })
  }, [clienteId])

  const tasaValor = Number(tasaManual || tasa?.valor || 0)

  const stockDisponible = stockCliente.filter(
    (s) => s.cantidad_unidades > 0 && !rows.find((r) => r.producto_id === s.producto_id)
  )

  const addProducto = () => {
    if (!productoAdd) return
    const s = stockCliente.find((x) => String(x.producto_id) === String(productoAdd))
    if (!s) return
    setRows([...rows, {
      producto_id: s.producto_id,
      descripcion: s.descripcion,
      disponible: s.cantidad_unidades,
      cantidad_unidades: '',
      precio_usd_momento: '',
    }])
    setProductoAdd('')
  }

  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))

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
    const detalles = rows.filter((r) => Number(r.cantidad_unidades) > 0 && Number(r.precio_usd_momento) > 0)
    if (!detalles.length) { setError('Ingrese al menos un producto vendido'); return }

    const overstock = detalles.find((r) => Number(r.cantidad_unidades) > r.disponible)
    if (overstock) {
      setError(`Cantidad de "${overstock.descripcion}" supera el disponible (${overstock.disponible} uds)`)
      return
    }

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


  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/reportes-venta')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Nuevo Reporte de Venta</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="cliente" label="Cliente *" className="sm:col-span-2">
              <Select
                id="cliente"
                value={clienteId}
                onChange={setClienteId}
                placeholder="Seleccionar cliente..."
                options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              />
            </FormField>
            <FormField id="fecha" label="Fecha">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField id="tasa" label={<>Tasa BCV {tasa && <span className="text-xs text-gray-400 ml-1">Registrada: {Number(tasa.valor).toFixed(4)}</span>}</>}>
              <Input
                id="tasa"
                type="number"
                step="0.0001"
                min="0"
                className="w-48"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {clienteId && (
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Productos vendidos</h3>

            {stockCliente.length === 0 ? (
              <p className="text-gray-400 text-sm">Este cliente no tiene stock en consignación.</p>
            ) : (
              <>
                {rows.length > 0 && (
                  <div className="overflow-x-auto mb-4"><table className="w-full text-sm mb-0">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-center">Disponible</th>
                        <th className="px-3 py-2 text-center">Cant. vendida</th>
                        <th className="px-3 py-2 text-right">Precio USD</th>
                        <th className="px-3 py-2 text-right">Total USD</th>
                        <th className="px-3 py-2"></th>
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
                              min={1}
                              max={row.disponible}
                              className="w-24 text-center"
                              value={row.cantidad_unidades}
                              onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-28 text-right"
                              value={row.precio_usd_momento}
                              onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ${((Number(row.cantidad_unidades) || 0) * (Number(row.precio_usd_momento) || 0)).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}

                {stockDisponible.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <Select
                      nullable
                      noneLabel="Agregar producto..."
                      value={productoAdd}
                      onChange={setProductoAdd}
                      options={stockDisponible.map((s) => ({
                        value: String(s.producto_id),
                        label: `${s.descripcion} — ${s.cantidad_unidades} uds disponibles`,
                      }))}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={addProducto} disabled={!productoAdd}>
                      Agregar
                    </Button>
                  </div>
                )}

                {rows.length > 0 && (
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
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => nav('/reportes-venta')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Reporte'}</Button>
        </div>
      </form>
    </div>
  )
}
