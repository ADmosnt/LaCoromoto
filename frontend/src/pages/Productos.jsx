import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getProductos, deleteProducto, reactivarProducto, getGruposProductos } from '../api'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import ProductoModal from '../components/ProductoModal'
import ActualizacionPreciosModal from '../components/ActualizacionPreciosModal'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [desactivados, setDesactivados] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [preciosModalOpen, setPreciosModalOpen] = useState(false)
  const [showDesactivados, setShowDesactivados] = useState(false)

  useEffect(() => { setSearch(urlSearch) }, [urlSearch])

  const load = () => {
    getProductos({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setProductos(r.data))
      .catch(() => toast.error('Error al cargar productos'))
    getProductos({ activo: false })
      .then((r) => setDesactivados(r.data))
      .catch(() => {})
  }

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

  const handleReactivar = async (id, desc) => {
    try {
      await reactivarProducto(id)
      toast.success(`"${desc}" reactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al reactivar producto')
    }
  }

  return (
    <div>
      <PageHeader title="Productos">
        <button
          onClick={() => setPreciosModalOpen(true)}
          className="border border-brand-400 text-brand-600 hover:bg-brand-50 text-sm font-medium px-4 py-2 rounded-md"
        >
          Actualizar precios masivo
        </button>
        <Button onClick={openNew}>+ Nuevo producto</Button>
      </PageHeader>

      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <Input
            type="text"
            placeholder="Buscar por descripción o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            nullable
            noneLabel="Todos los grupos"
            value={grupoId}
            onChange={setGrupoId}
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
          />
        </div>
        {productos.length === 0 ? (
          <EmptyState message="No hay productos registrados" />
        ) : (
          <Table borderless className="overflow-x-auto">
            <Table.Head>
              <Table.Row>
                <Table.Th>Código</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th>Grupo</Table.Th>
                <Table.Th align="center">Uds/Bulto</Table.Th>
                <Table.Th>Precios (USD)</Table.Th>
                <Table.Th align="center">Acciones</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {productos.map((p) => (
                <Table.Row key={p.id} className="hover:bg-gray-50">
                  <Table.Td className="font-mono text-xs">{p.codigo}</Table.Td>
                  <Table.Td className="font-medium">{p.descripcion}</Table.Td>
                  <Table.Td className="text-gray-600">{p.grupo}</Table.Td>
                  <Table.Td align="center">{p.unidades_por_bulto}</Table.Td>
                  <Table.Td className="text-gray-600 text-xs">
                    {p.precios?.map((pr) => (
                      <span key={pr.lista_id} className="inline-block mr-2">
                        {pr.lista}: ${(Number(pr.precio_usd) * (p.unidades_por_bulto || 1)).toFixed(2)}
                      </span>
                    ))}
                  </Table.Td>
                  <Table.Td align="center" className="space-x-2">
                    <button onClick={() => openEdit(p.id)} className="text-brand-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(p.id, p.descripcion)} className="text-red-500 hover:underline text-xs">Desactivar</button>
                  </Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {desactivados.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setShowDesactivados((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <span className="font-medium">
              Productos desactivados ({desactivados.length})
            </span>
            <span>{showDesactivados ? '▲' : '▼'}</span>
          </button>
          {showDesactivados && (
            <Table borderless className="overflow-x-auto border-t">
              <Table.Head>
                <Table.Row>
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Grupo</Table.Th>
                  <Table.Th align="center">Uds/Bulto</Table.Th>
                  <Table.Th align="center">Acción</Table.Th>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {desactivados.map((p) => (
                  <Table.Row key={p.id} className="bg-gray-50 opacity-75">
                    <Table.Td className="font-mono text-xs text-gray-400">{p.codigo}</Table.Td>
                    <Table.Td className="text-gray-500 line-through">{p.descripcion}</Table.Td>
                    <Table.Td className="text-gray-400">{p.grupo}</Table.Td>
                    <Table.Td align="center" className="text-gray-400">{p.unidades_por_bulto}</Table.Td>
                    <Table.Td align="center">
                      <button
                        onClick={() => handleReactivar(p.id, p.descripcion)}
                        className="text-brand-600 hover:underline text-xs font-medium"
                      >
                        Reactivar
                      </button>
                    </Table.Td>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      )}

      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productoId={editId}
        onSaved={load}
      />
      <ActualizacionPreciosModal
        open={preciosModalOpen}
        onClose={() => setPreciosModalOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
