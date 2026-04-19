import { useEffect, useState, Fragment } from 'react'
import { getDevoluciones, getDevolucion, getClientes } from '../api'
import Alert from '../components/Alert'
import DevolucionModal from '../components/DevolucionModal'

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [details, setDetails] = useState({})

  const load = () =>
    getDevoluciones({ cliente_id: clienteId || undefined })
      .then((r) => setDevoluciones(r.data))
      .catch(() => setError('Error al cargar devoluciones'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId])

  const toggle = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!details[id]) {
      try {
        const r = await getDevolucion(id)
        setDetails((prev) => ({ ...prev, [id]: r.data }))
      } catch {
        setError('Error al cargar detalle de la devolución')
      }
    }
  }

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
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Orden origen</th>
                <th className="px-4 py-3 text-left">Nota</th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.map((d) => (
                <Fragment key={d.id}>
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer select-none"
                    onClick={() => toggle(d.id)}
                  >
                    <td className="px-4 py-3 w-6 text-gray-400 text-xs">{expanded === d.id ? '▼' : '▶'}</td>
                    <td className="px-4 py-3 w-16 text-gray-500">#{d.id}</td>
                    <td className="px-4 py-3 font-medium">{d.cliente}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{d.numero_orden_origen ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs italic">{d.nota ?? '—'}</td>
                  </tr>
                  {expanded === d.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                        {!details[d.id] ? (
                          <span className="text-xs text-gray-400">Cargando...</span>
                        ) : (
                          <table className="text-xs">
                            <thead className="text-gray-500 uppercase">
                              <tr>
                                <th className="py-1 pr-6 text-left">Código</th>
                                <th className="py-1 pr-6 text-left">Descripción</th>
                                <th className="py-1 text-center">Uds devueltas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                              {details[d.id].detalles?.map((det) => (
                                <tr key={det.id}>
                                  <td className="py-1.5 pr-6 font-mono">{det.codigo}</td>
                                  <td className="py-1.5 pr-6 font-medium">{det.descripcion}</td>
                                  <td className="py-1.5 text-center font-semibold text-orange-700">{det.cantidad_unidades} uds</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {devoluciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay devoluciones registradas</td>
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
