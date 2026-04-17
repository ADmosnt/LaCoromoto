import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrden, getClientes, getProductos, getTasaHoy, getListasPrecios } from '../api'
import Alert from '../components/Alert'

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

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/ordenes')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">Nueva Orden de Despacho</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Datos generales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select className={inp} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa BCV (Bs.) {tasa && <span className="text-xs text-gray-400 ml-1">BCV: {Number(tasa.valor).toFixed(4)}</span>}
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                className={inp}
                value={tasaManual}
                onChange={(e) => setTasaManual(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
              <input className={inp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-center">Uds/Bulto</th>
                  <th className="px-3 py-2 text-center">Cantidad (uds)</th>
                  <th className="px-3 py-2 text-center">Bultos</th>
                  <th className="px-3 py-2 text-right">Precio USD</th>
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
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-64"
                          value={row.producto_id}
                          onChange={(e) => setRow(i, 'producto_id', e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{row.unidades_por_bulto}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24 text-center"
                          value={row.cantidad_unidades}
                          onChange={(e) => setRow(i, 'cantidad_unidades', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 text-xs">
                        {cant > 0 ? `${Math.floor(cant / upb)}B + ${cant % upb}u` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 text-right"
                            value={row.precio_usd_momento}
                            onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                          />
                          {row.precios?.length > 0 && (
                            <select
                              className="text-xs text-gray-400 border-0 p-0 bg-transparent cursor-pointer"
                              onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Lista de precios</option>
                              {row.precios.map((p) => (
                                <option key={p.lista_id} value={p.precio_usd}>{p.lista}: ${p.precio_usd}</option>
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
          <button type="button" onClick={addRow} className="mt-3 text-sm text-blue-600 hover:underline">+ Agregar producto</button>

          <div className="mt-4 flex flex-col items-end border-t pt-4 gap-1">
            <p className="text-sm font-bold">Total USD: <span className="text-lg">${totalUsd.toFixed(2)}</span></p>
            {tasaValor > 0 && (
              <p className="text-sm text-gray-600">Total Bs.: <span className="font-medium">Bs. {(totalUsd * tasaValor).toFixed(2)}</span></p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav('/ordenes')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </div>
  )
}
