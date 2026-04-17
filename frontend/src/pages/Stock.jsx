import { useEffect, useState } from 'react'
import { getClientes, getClienteStock } from '../api'
import PageHeader from '../components/PageHeader'

export default function Stock() {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [stock, setStock] = useState([])
  const [cliente, setCliente] = useState(null)

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
  }, [])

  useEffect(() => {
    if (!clienteId) { setStock([]); setCliente(null); return }
    const c = clientes.find((c) => String(c.id) === clienteId)
    setCliente(c)
    getClienteStock(clienteId).then((r) => setStock(r.data))
  }, [clienteId, clientes])

  const totalUds = stock.reduce((s, x) => s + x.cantidad_unidades, 0)

  return (
    <div>
      <PageHeader title="Stock en Consignación" />

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
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-center">Uds. sueltas</th>
                <th className="px-4 py-3 text-center">Total unidades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.codigo}</td>
                  <td className="px-4 py-3 font-medium">{s.descripcion}</td>
                  <td className="px-4 py-3 text-center">{s.unidades_por_bulto}</td>
                  <td className="px-4 py-3 text-center font-medium">{s.bultos}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{s.unidades_sueltas}</td>
                  <td className="px-4 py-3 text-center font-bold">{s.cantidad_unidades}</td>
                </tr>
              ))}
              {clienteId && stock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Este cliente no tiene stock en consignación
                  </td>
                </tr>
              )}
              {!clienteId && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Seleccione un cliente para ver su stock
                  </td>
                </tr>
              )}
            </tbody>
            {stock.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right font-semibold">Total unidades en consignación:</td>
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
