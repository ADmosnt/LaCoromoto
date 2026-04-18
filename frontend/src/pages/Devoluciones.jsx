import { useEffect, useState } from 'react'
import { getDevoluciones, getClientes } from '../api'
import Alert from '../components/Alert'
import DevolucionModal from '../components/DevolucionModal'

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = () =>
    getDevoluciones({ cliente_id: clienteId || undefined })
      .then((r) => setDevoluciones(r.data))
      .catch(() => setError('Error al cargar devoluciones'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Devoluciones</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nueva devolución
        </button>
      </div>

      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <DevolucionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
