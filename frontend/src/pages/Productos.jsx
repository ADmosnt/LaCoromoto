import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getProductos, deleteProducto, getGruposProductos } from '../api'
import PageHeader from '../components/PageHeader'
import ProductoModal from '../components/ProductoModal'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [search, setSearch] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = () =>
    getProductos({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setProductos(r.data))
      .catch(() => toast.error('Error al cargar productos'))

  useEffect(() => { getGruposProductos().then((r) => setGrupos(r.data)) }, [])
  useEffect(() => { load() }, [search, grupoId])

  const openNew = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }

  const handleDelete = async (id, desc) => {
    if (!confirm(`¿Desactivar "${desc}"?`)) return
    try {
      await deleteProducto(id)
      toast.success(`"${desc}" desactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al desactivar producto')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Productos</h2>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Nuevo producto
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por descripción o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Grupo</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-left">Precios (USD)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.descripcion}</td>
                  <td className="px-4 py-3 text-gray-600">{p.grupo}</td>
                  <td className="px-4 py-3 text-center">{p.unidades_por_bulto}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.precios?.map((pr) => (
                      <span key={pr.lista_id} className="inline-block mr-2">
                        {pr.lista}: ${Number(pr.precio_usd).toFixed(2)}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button onClick={() => openEdit(p.id)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(p.id, p.descripcion)} className="text-red-500 hover:underline text-xs">Desactivar</button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay productos registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productoId={editId}
        onSaved={load}
      />
    </div>
  )
}
