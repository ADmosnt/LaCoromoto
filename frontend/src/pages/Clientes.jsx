import { useEffect, useState } from 'react'
import { getClientes, deleteCliente } from '../api'
import PageHeader from '../components/PageHeader'
import Alert from '../components/Alert'
import ClienteModal from '../components/ClienteModal'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = () =>
    getClientes({ search, activo: true })
      .then((r) => setClientes(r.data))
      .catch(() => setError('Error al cargar clientes'))

  useEffect(() => { load() }, [search])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar a "${nombre}"?`)) return
    await deleteCliente(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nuevo cliente
        </button>
      </div>
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Buscar por nombre, código o RIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Razón Social</th>
                <th className="px-4 py-3 text-left">RIF</th>
                <th className="px-4 py-3 text-left">Zona</th>
                <th className="px-4 py-3 text-left">Vendedor</th>
                <th className="px-4 py-3 text-left">Teléfonos</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.codigo}</td>
                  <td className="px-4 py-3 font-medium">{c.razon_social}</td>
                  <td className="px-4 py-3 text-gray-600">{c.rif}</td>
                  <td className="px-4 py-3 text-gray-600">{c.zona}</td>
                  <td className="px-4 py-3 text-gray-600">{c.vendedor}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefonos?.join(', ')}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button onClick={() => openEdit(c.id)} className="text-blue-600 hover:underline text-xs">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(c.id, c.razon_social)} className="text-red-500 hover:underline text-xs">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteModal
        open={modalOpen}
        onClose={closeModal}
        clienteId={editId}
        onSaved={load}
      />
    </div>
  )
}
