import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getInventario, getEntradas, deleteEntrada } from '../api'
import EntradaInventarioModal from '../components/EntradaInventarioModal'

export default function InventarioCentral() {
  const [inventario, setInventario] = useState([])
  const [entradas, setEntradas] = useState([])
  const [tab, setTab] = useState('stock')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    getInventario().then((r) => setInventario(r.data)).catch(() => toast.error('Error al cargar inventario'))
    getEntradas().then((r) => setEntradas(r.data)).catch(() => toast.error('Error al cargar entradas'))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }

  const totalUds = inventario.reduce((s, i) => s + i.cantidad_unidades, 0)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEntrada(deleteTarget.id)
      toast.success(`Entrada ${deleteTarget.numero_entrada} eliminada`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al eliminar la entrada')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Inventario Central (Almacén)</h2>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Registrar entrada
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['stock', 'entradas'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md font-medium ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'stock' ? 'Stock actual' : 'Historial de entradas'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Grupo</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-center">Uds. sueltas</th>
                <th className="px-4 py-3 text-center">Total uds.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventario.map((i) => (
                <tr key={i.id} className={`hover:bg-gray-50 ${i.cantidad_unidades === 0 ? 'text-gray-400' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{i.codigo}</td>
                  <td className="px-4 py-3 font-medium">{i.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{i.grupo}</td>
                  <td className="px-4 py-3 text-center">{i.unidades_por_bulto}</td>
                  <td className="px-4 py-3 text-center font-medium">{i.bultos}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{i.unidades_sueltas}</td>
                  <td className={`px-4 py-3 text-center font-bold ${i.cantidad_unidades === 0 ? 'text-red-400' : 'text-gray-800'}`}>
                    {i.cantidad_unidades}
                  </td>
                </tr>
              ))}
              {inventario.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay productos en inventario.{' '}
                    <button onClick={openNew} className="text-blue-600 hover:underline">
                      Registrar primera entrada.
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            {inventario.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold text-sm">Total unidades en almacén:</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{totalUds}</td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
      )}

      {tab === 'entradas' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {entradas.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Sin entradas registradas</div>
          ) : (
            entradas.map((e) => (
              <div key={e.id} className="border-b border-gray-100 last:border-b-0">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpanded((prev) => (prev === e.id ? null : e.id))}
                >
                  <span className="text-gray-400 text-xs w-3 flex-shrink-0">
                    {expanded === e.id ? '▼' : '▶'}
                  </span>
                  <span className="font-mono text-xs text-blue-600 w-28 flex-shrink-0">
                    {e.numero_entrada || `#${e.id}`}
                  </span>
                  <span className="text-sm text-gray-500 w-24 flex-shrink-0 hidden sm:block">{e.fecha}</span>
                  <span className="flex-1 text-sm text-gray-600 truncate min-w-0">
                    {e.total_productos} producto{e.total_productos !== 1 ? 's' : ''}
                    {e.nota && <span className="ml-2 italic text-gray-400">"{e.nota}"</span>}
                  </span>
                  <span className="text-sm font-bold text-blue-700 flex-shrink-0">
                    {e.total_unidades} uds
                  </span>
                </div>
                {expanded === e.id && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-200 text-gray-600 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-center">Uds/Bulto</th>
                            <th className="px-3 py-2 text-center">Bultos</th>
                            <th className="px-3 py-2 text-center">Sueltas</th>
                            <th className="px-3 py-2 text-center">Total uds</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(e.detalles ?? []).map((d) => (
                            <tr key={d.id} className="hover:bg-gray-100">
                              <td className="px-3 py-2 font-mono">{d.codigo}</td>
                              <td className="px-3 py-2">{d.descripcion}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{d.unidades_por_bulto}</td>
                              <td className="px-3 py-2 text-center font-medium">{d.bultos}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{d.unidades_sueltas}</td>
                              <td className="px-3 py-2 text-center font-bold">{d.cantidad_unidades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(e.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <EntradaInventarioModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditId(null) }}
        onSaved={load}
        entradaId={editId}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Eliminar entrada {deleteTarget.numero_entrada}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Esta acción restará del inventario lo que esta entrada agregó:
            </p>
            <ul className="text-sm space-y-1 mb-4 bg-red-50 border border-red-200 rounded p-3">
              {(deleteTarget.detalles ?? []).map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.descripcion}</span>:{' '}
                  <span className="text-red-700 font-semibold">−{d.cantidad_unidades} uds</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-4">
              Si el inventario actual no alcanza para revertir (porque ya se despacharon esas unidades), la eliminación fallará.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
