import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getClientes, deleteCliente, getGruposClientes } from '../api'
import PageHeader from '../components/PageHeader'
import ClienteModal from '../components/ClienteModal'
import ConsolidadoGrupoModal from '../components/ConsolidadoGrupoModal'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [consolidadoOpen, setConsolidadoOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { setSearch(urlSearch) }, [urlSearch])
  useEffect(() => { getGruposClientes().then((r) => setGrupos(r.data)) }, [])

  const load = () =>
    getClientes({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setClientes(r.data))
      .catch(() => toast.error('Error al cargar clientes'))

  useEffect(() => { load() }, [search, grupoId])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar a "${nombre}"?`)) return
    try {
      await deleteCliente(id)
      toast.success(`"${nombre}" desactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar cliente')
    }
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
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar por nombre, código o RIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={grupoId}
            onChange={(e) => { setGrupoId(e.target.value); setConsolidadoOpen(false) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          {grupoId && (
            <button
              onClick={() => setConsolidadoOpen(true)}
              className="border border-purple-400 text-purple-600 hover:bg-purple-50 text-sm font-medium px-3 py-2 rounded-md"
            >
              Ver consolidado del grupo
            </button>
          )}
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
                    <button onClick={() => navigate(`/clientes/${c.id}`)} className="text-purple-600 hover:underline text-xs">Ver ficha</button>
                    <button onClick={() => openEdit(c.id)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(c.id, c.razon_social)} className="text-red-500 hover:underline text-xs">Desactivar</button>
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
      <ConsolidadoGrupoModal
        open={consolidadoOpen}
        onClose={() => setConsolidadoOpen(false)}
        grupoId={grupoId ? Number(grupoId) : null}
        grupoNombre={grupos.find((g) => String(g.id) === grupoId)?.nombre}
      />
    </div>
  )
}
