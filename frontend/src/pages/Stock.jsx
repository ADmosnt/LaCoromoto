import { useEffect, useState, Fragment } from 'react'
import { getClientes, getClienteStock } from '../api'

const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
}

export default function Stock() {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stock, setStock] = useState([])
  const [cliente, setCliente] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [])

  useEffect(() => {
    if (!clienteId) { setStock([]); setCliente(null); setExpanded(null); return }
    const c = clientes.find((c) => String(c.id) === clienteId)
    setCliente(c)
    setExpanded(null)
    getClienteStock(clienteId).then((r) => setStock(r.data))
  }, [clienteId, clientes])

  const totalUds = stock.reduce((s, x) => s + x.cantidad_unidades, 0)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Stock en Consignación</h2>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>

        {cliente && (
          <div className="px-5 py-3 bg-blue-50 border-b text-sm">
            <span className="font-medium">{cliente.razon_social}</span>
            {cliente.rif && <span className="text-gray-500 ml-3">RIF: {cliente.rif}</span>}
            {cliente.zona && <span className="text-gray-500 ml-3">Zona: {cliente.zona}</span>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-center">Uds. sueltas</th>
                <th className="px-4 py-3 text-center">Total unidades</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <Fragment key={s.id}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 ${s.ordenes?.length > 0 ? 'cursor-pointer select-none' : ''}`}
                    onClick={() => s.ordenes?.length > 0 && setExpanded(expanded === s.id ? null : s.id)}
                  >
                    <td className="px-4 py-3 w-6 text-gray-400 text-xs">
                      {s.ordenes?.length > 0 ? (expanded === s.id ? '▼' : '▶') : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.codigo}</td>
                    <td className="px-4 py-3 font-medium">{s.descripcion}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.unidades_por_bulto}</td>
                    <td className="px-4 py-3 text-center font-medium">{s.bultos}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{s.unidades_sueltas}</td>
                    <td className="px-4 py-3 text-center font-bold">{s.cantidad_unidades}</td>
                  </tr>
                  {expanded === s.id && s.ordenes?.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-2 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase">Órdenes de origen</p>
                        <table className="text-xs w-full max-w-md">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="py-1 text-left pr-4">N° Orden</th>
                              <th className="py-1 text-left pr-4">Fecha</th>
                              <th className="py-1 text-center pr-4">Cant. despachada</th>
                              <th className="py-1 text-left">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100">
                            {s.ordenes.map((o) => {
                              const upb = s.unidades_por_bulto || 1
                              return (
                                <tr key={o.id}>
                                  <td className="py-1.5 pr-4 font-mono font-medium text-blue-700">{o.numero_orden}</td>
                                  <td className="py-1.5 pr-4 text-gray-600">{o.fecha_emision}</td>
                                  <td className="py-1.5 pr-4 text-center">
                                    {Math.floor(o.cantidad_unidades / upb)}B+{o.cantidad_unidades % upb}u
                                  </td>
                                  <td className="py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                      {o.status}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {clienteId && stock.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Este cliente no tiene stock en consignación
                  </td>
                </tr>
              )}
              {!clienteId && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Seleccione un cliente para ver su stock
                  </td>
                </tr>
              )}
            </tbody>
            {stock.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold">Total unidades en consignación:</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{totalUds}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
