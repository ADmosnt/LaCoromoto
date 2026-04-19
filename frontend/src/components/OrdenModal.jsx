import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { createOrden, getClientes, getProductos, getTasaHoy } from '../api'
import Alert from './Alert'

const emptyRow = () => ({
  producto_id: '', descripcion: '', codigo: '',
  unidades_por_bulto: 1, precio_usd_momento: '',
  bultos: '', sueltas: '',
  precios: [],
})

const rowUnidades = (row) => {
  const upb = row.unidades_por_bulto || 1
  return (Number(row.bultos) || 0) * upb + (Number(row.sueltas) || 0)
}

export default function OrdenModal({ open, onClose, onSaved }) {
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [tasa, setTasa] = useState(null)
  const [tasaManual, setTasaManual] = useState('')
  const [rows, setRows] = useState([emptyRow()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setClienteId('')
    setNota('')
    setTasaManual('')
    setRows([emptyRow()])
    setFecha(new Date().toISOString().slice(0, 10))
    Promise.all([getClientes({ activo: true }), getProductos({ activo: true })])
      .then(([c, p]) => { setClientes(c.data); setProductos(p.data) })
      .catch(() => setError('Error al cargar clientes y productos'))
    getTasaHoy().then((r) => setTasa(r.data)).catch(() => setTasa(null))
  }, [open])

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
      rs[i].bultos = ''
      rs[i].sueltas = ''
    }
    setRows(rs)
  }

  const addRow = () => setRows([...rows, emptyRow()])
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))

  const totalUsd = rows.reduce((sum, r) => {
    return sum + rowUnidades(r) * (Number(r.precio_usd_momento) || 0)
  }, 0)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!clienteId) { setError('Seleccione un cliente'); return }
    if (!tasaValor) { setError('Ingrese la tasa BCV'); return }
    const detalles = rows.filter((r) => r.producto_id && rowUnidades(r) > 0 && r.precio_usd_momento)
    if (!detalles.length) { setError('Agregue al menos un producto con cantidad y precio'); return }

    setLoading(true)
    try {
      await createOrden({
        cliente_id: Number(clienteId),
        fecha_emision: fecha,
        nota,
        tasa_valor: tasaValor,
        detalles: detalles.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: rowUnidades(r),
          precio_usd_momento: Number(r.precio_usd_momento),
        })),
      })
      toast.success('Orden de despacho creada')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear la orden')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const inpNum = 'border border-gray-300 rounded px-2 py-1.5 text-sm w-full text-center focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Nueva Orden de Despacho" size="xl">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">
          {/* General data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Datos generales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                <select className={inp} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tasa BCV {tasa && <span className="text-gray-400 ml-1">(BCV: {Number(tasa.valor).toFixed(4)})</span>}
                </label>
                <input
                  type="number" step="0.0001" min="0"
                  placeholder={tasa ? Number(tasa.valor).toFixed(4) : 'Ingrese tasa...'}
                  className={inp}
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota</label>
                <input className={inp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones opcionales" />
              </div>
            </div>
          </div>

          {/* Products table */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Productos</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center w-14">Uds/B</th>
                    <th className="px-3 py-2 text-center w-20">Bultos</th>
                    <th className="px-3 py-2 text-center w-20">Sueltas</th>
                    <th className="px-3 py-2 text-center w-20">Total uds</th>
                    <th className="px-3 py-2 text-right w-32">Precio/Bulto</th>
                    <th className="px-3 py-2 text-right w-24">Total USD</th>
                    <th className="px-3 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => {
                    const upb = row.unidades_por_bulto || 1
                    const total = rowUnidades(row)
                    const precio = Number(row.precio_usd_momento) || 0
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
                            value={row.producto_id}
                            onChange={(e) => setRow(i, 'producto_id', e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500 text-xs font-medium">{upb}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0}
                            className={inpNum}
                            value={row.bultos}
                            onChange={(e) => setRow(i, 'bultos', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={upb - 1}
                            className={inpNum}
                            value={row.sueltas}
                            onChange={(e) => setRow(i, 'sueltas', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-medium text-gray-700">
                          {total > 0 ? total : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number" step="0.01" min={0}
                              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full text-right"
                              value={row.precio_usd_momento === '' ? '' : (Number(row.precio_usd_momento) * upb).toFixed(2)}
                              onChange={(e) => {
                                const val = e.target.value
                                setRow(i, 'precio_usd_momento', val === '' ? '' : String(Number(val) / upb))
                              }}
                            />
                            {row.precios?.length > 0 && (
                              <select
                                className="text-xs text-gray-400 border-0 p-0 bg-transparent cursor-pointer w-full text-right"
                                onChange={(e) => setRow(i, 'precio_usd_momento', e.target.value)}
                                defaultValue=""
                              >
                                <option value="" disabled>Lista de precios</option>
                                {row.precios.map((p) => (
                                  <option key={p.lista_id} value={p.precio_usd}>
                                    {p.lista}: ${(Number(p.precio_usd) * upb).toFixed(2)}/bulto
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-sm">
                          {total > 0 ? `$${(total * precio).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {rows.length > 1 && (
                            <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} className="mt-2 text-sm text-blue-600 hover:underline">
              + Agregar producto
            </button>

            <div className="mt-3 flex flex-col items-end border-t pt-3 gap-1">
              <p className="text-sm font-bold">Total USD: <span className="text-base">${totalUsd.toFixed(2)}</span></p>
              {tasaValor > 0 && (
                <p className="text-xs text-gray-600">Total Bs.: <span className="font-medium">Bs. {(totalUsd * tasaValor).toFixed(2)}</span></p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creando...' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
