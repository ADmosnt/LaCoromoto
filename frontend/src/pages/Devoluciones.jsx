import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDevoluciones, getClientes } from '../api'
import PageHeader from '../components/PageHeader'
import Alert from '../components/Alert'

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    getDevoluciones({ cliente_id: clienteId || undefined })
      .then((r) => setDevoluciones(r.data))
      .catch(() => setError('Error al cargar devoluciones'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId])

  return (
    <div>
      <PageHeader title="Devoluciones" action={{ to: '/devoluciones/nueva', label: '+ Nueva devolución' }} />
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Orden origen</th>
                <th className="px-4 py-3 text-left">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devoluciones.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">#{d.id}</td>
                  <td className="px-4 py-3 font-medium">{d.cliente}</td>
                  <td className="px-4 py-3">{d.fecha}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.numero_orden_origen ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.nota}</td>
                </tr>
              ))}
              {devoluciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay devoluciones registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
