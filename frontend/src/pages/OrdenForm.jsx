import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrden, getClientes, getProductos, getTasaHoy, getListasPrecios } from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

const emptyRow = () => ({ producto_id: '', descripcion: '', codigo: '', unidades_por_bulto: 1, precio_usd_momento: '', cantidad_unidades: '', precios: [] })

export default function OrdenForm() {
  const nav = useNavigate()
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [listas, setListas] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [tasa, setTasa] = useState(null)
  const [tasaManual, setTasaManual] = useState('')
  const [rows, setRows] = useState([emptyRow()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      getClientes({ activo: true }),
      getProductos({ activo: true }),
      getListasPrecios(),
    ]).then(([c, p, l]) => {
      setClientes(c.data)
      setProductos(p.data)
      setListas(l.data)
    })
    getTasaHoy()
      .then((r) => setTasa(r.data))
      .catch(() => setTasa(null))
  }, [])

  const tasaValor = Number(tasaManual || tasa?.valor || 0)

  const setRow = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    if (field === 'producto_id') {
      const prod = productos.find((p) => String(p.id) === String(val))
      if (prod) {
        rs[i].descripcion = prod.descripcion
        rs[i].codigo = prod.codigo
        rs[i].unidades_por_bulto = prod.unidades_por_bulto
        rs[i].precios = prod.precios
        rs[i].precio_usd_momento = prod.precios?.[0]?.precio_usd ?? ''
      }
    }
    setRows(rs)
  }

  const addRow = () => setRows([...rows, emptyRow()])
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))

  const totalUsd = rows.reduce((sum, r) => {
    const cant = Number(r.cantidad_unidades) || 0
    const precio = Number(r.precio_usd_momento) || 0
    return sum + cant * precio
  }, 0)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!clienteId) { setError('Seleccione un cliente'); return }
    if (!tasaValor) { setError('Ingrese la tasa BCV'); return }
    const detalles = rows.filter((r) => r.producto_id && r.cantidad_unidades && r.precio_usd_momento)
    if (!detalles.length) { setError('Agregue al menos un producto'); return }

    setLoading(true)
    try {
      const r = await createOrden({
        cliente_id: Number(clienteId),
        fecha_emision: fecha,
        nota,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: Number(r.cantidad_unidades),
          precio_usd_momento: Number(r.precio_usd_momento),
        })),
      })
      nav(`/ordenes/${r.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear la orden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/ordenes')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Nueva Orden de Despacho</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Datos generales</h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <FormField id="tasa" label={<>Tasa BCV (Bs.) {tasa && <span className="text-xs text-gray-400 ml-1">BCV: {Number(tasa.valor).toFixed(4)}</span>}</>}>
              <Input
                id="tasa"
                type="number"
                step="0.0001"
                min="0"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </FormField>
            <FormField id="nota" label="Nota" className="sm:col-span-2">
              <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
            </FormField>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-center">Uds/Caja</th>
                  <th className="px-3 py-2 text-center">Cantidad (uds)</th>
                  <th className="px-3 py-2 text-center">Cajas</th>
                  <th className="px-3 py-2 text-right">Precio/Caja USD</th>
                  <th className="px-3 py-2 text-right">Total USD</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const cant = Number(row.cantidad_unidades) || 0
                  const precio = Number(row.precio_usd_momento) || 0
                  const upb = row.unidades_por_bulto || 1
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select
                          className="w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          value={row.producto_id}
                          onChange={(e) => setRow(i, 'producto_id', e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{row.unidades_por_bulto}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          className="w-24 text-center py-1.5"
                          value={row.cantidad_unidades}
                          onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 text-xs">
                        {cant > 0 ? `${Math.floor(cant / upb)}B + ${cant % upb}u` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-end gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-28 text-right py-1.5"
                            value={row.precio_usd_momento === '' ? '' : (Number(row.precio_usd_momento) * upb).toFixed(2)}
                            onChange={(e) => {
                              const val = e.target.value
                              setRow(i, 'precio_usd_momento', val === '' ? '' : String(Number(val) / upb))
                            }}
                          />
                          {row.precios?.length > 0 && (
                            <select
                              className="text-xs text-gray-400 border-0 p-0 bg-transparent cursor-pointer"
                              onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Lista de precios</option>
                              {row.precios.map((p) => (
                                <option key={p.lista_id} value={p.precio_usd}>
                                  {p.lista}: ${(Number(p.precio_usd) * (row.unidades_por_bulto || 1)).toFixed(2)}/caja
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        ${(cant * precio).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600">✕</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addRow} className="mt-3 text-sm text-brand-600 hover:underline">+ Agregar producto</button>

          <div className="mt-4 flex flex-col items-end border-t pt-4 gap-1">
            <p className="text-sm font-bold">Total USD: <span className="text-lg">${totalUsd.toFixed(2)}</span></p>
            {tasaValor > 0 && (
              <p className="text-sm text-gray-600">Total Bs.: <span className="font-medium">Bs. {(totalUsd * tasaValor).toFixed(2)}</span></p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => nav('/ordenes')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Orden'}</Button>
        </div>
      </form>
    </div>
  )
}
