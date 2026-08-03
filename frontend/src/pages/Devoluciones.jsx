import { useEffect, useState, Fragment } from 'react'
import { getDevoluciones, getDevolucion, getClientes } from '../api'
import Alert from '../components/Alert'
import DevolucionModal from '../components/DevolucionModal'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
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
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <Select
            nullable
            noneLabel="Todos los clientes"
            value={clienteId}
            onChange={setClienteId}
            options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            className="w-56"
          />
          <Button onClick={() => setModalOpen(true)} className="ml-auto">+ Nueva devolución</Button>
        </div>
        {devoluciones.length === 0 ? (
          <EmptyState message="No hay devoluciones registradas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 w-6"></th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Orden origen</th>
                  <th className="px-4 py-3 text-left">Destino</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.map((d) => (
                  <Fragment key={d.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-brand-50 cursor-pointer select-none"
                      onClick={() => toggle(d.id)}
                    >
                      <td className="px-4 py-3 w-6 text-gray-400 text-xs">{expanded === d.id ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 w-16 text-gray-500">#{d.id}</td>
                      <td className="px-4 py-3 font-medium">{d.cliente}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{d.numero_orden_origen ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.reingresar_almacen ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Reingresada</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Merma</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs italic">{d.nota ?? '—'}</td>
                    </tr>
                    {expanded === d.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                          {!details[d.id] ? (
                            <span className="text-xs text-gray-400">Cargando...</span>
                          ) : (
                            <div className="space-y-2">
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
                              <button
                                onClick={() => setEditId(d.id)}
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
                              >
                                Editar Devolución
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DevolucionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <DevolucionModal
        open={editId != null}
        devolucionId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => {
          if (editId != null) setDetails((prev) => { const n = { ...prev }; delete n[editId]; return n })
          load()
        }}
      />
    </div>
  )
}
