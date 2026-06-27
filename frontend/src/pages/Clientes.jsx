// frontend/src/pages/Clientes.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { getClientes, deleteCliente, reactivarCliente, getGruposClientes } from '../api'
import PageHeader from '../components/PageHeader'
import ClienteModal from '../components/ClienteModal'
import ConsolidadoGrupoModal from '../components/ConsolidadoGrupoModal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [desactivados, setDesactivados] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [grupoId, setGrupoId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [consolidadoOpen, setConsolidadoOpen] = useState(false)
  const [showDesactivados, setShowDesactivados] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { setSearch(urlSearch) }, [urlSearch])
  useEffect(() => { getGruposClientes().then((r) => setGrupos(r.data)) }, [])

  const load = () => {
    getClientes({ search, grupo_id: grupoId || undefined, activo: true })
      .then((r) => setClientes(r.data))
      .catch(() => toast.error('Error al cargar clientes'))
    getClientes({ activo: false })
      .then((r) => setDesactivados(r.data))
      .catch(() => {})
  }

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

  const handleReactivar = async (id, nombre) => {
    try {
      await reactivarCliente(id)
      toast.success(`"${nombre}" reactivado`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al reactivar cliente')
    }
  }

  return (
    <div>
      <PageHeader title="Clientes">
        <Button onClick={openNew}>+ Nuevo cliente</Button>
      </PageHeader>

      {/* Active clients */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Buscar por nombre, código o RIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            value={grupoId}
            onChange={(v) => { setGrupoId(v); setConsolidadoOpen(false) }}
            placeholder="Todos los grupos"
            nullable
            noneLabel="Todos los grupos"
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
            className="w-48"
          />
          {grupoId && (
            <Button variant="ghost" onClick={() => setConsolidadoOpen(true)}>
              Ver consolidado del grupo
            </Button>
          )}
        </div>

        {clientes.length === 0 ? (
          <EmptyState
            icon={Users}
            message="No hay clientes registrados"
            action={<Button onClick={openNew}>Nuevo cliente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table borderless>
              <Table.Head>
                <Table.Row>
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Razón Social</Table.Th>
                  <Table.Th>RIF</Table.Th>
                  <Table.Th>Zona</Table.Th>
                  <Table.Th>Vendedor</Table.Th>
                  <Table.Th>Teléfonos</Table.Th>
                  <Table.Th align="center">Acciones</Table.Th>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {clientes.map((c) => (
                  <Table.Row key={c.id} className="hover:bg-gray-50">
                    <Table.Td><span className="font-mono text-xs">{c.codigo}</span></Table.Td>
                    <Table.Td><span className="font-medium">{c.razon_social}</span></Table.Td>
                    <Table.Td>{c.rif}</Table.Td>
                    <Table.Td>{c.zona}</Table.Td>
                    <Table.Td>{c.vendedor}</Table.Td>
                    <Table.Td>{c.telefonos?.join(', ')}</Table.Td>
                    <Table.Td align="center">
                      <span className="space-x-2">
                        <button onClick={() => navigate(`/clientes/${c.id}`)} className="text-purple-600 hover:underline text-xs">Ver ficha</button>
                        <button onClick={() => openEdit(c.id)} className="text-brand-600 hover:underline text-xs">Editar</button>
                        <button onClick={() => handleDelete(c.id, c.razon_social)} className="text-red-500 hover:underline text-xs">Desactivar</button>
                      </span>
                    </Table.Td>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </div>

      {/* Deactivated clients */}
      {desactivados.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setShowDesactivados((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <span className="font-medium">Clientes desactivados ({desactivados.length})</span>
            <span>{showDesactivados ? '▲' : '▼'}</span>
          </button>
          {showDesactivados && (
            <div className="overflow-x-auto border-t">
              <Table borderless>
                <Table.Head>
                  <Table.Row>
                    <Table.Th>Código</Table.Th>
                    <Table.Th>Razón Social</Table.Th>
                    <Table.Th>RIF</Table.Th>
                    <Table.Th>Zona</Table.Th>
                    <Table.Th align="center">Acción</Table.Th>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {desactivados.map((c) => (
                    <Table.Row key={c.id} className="bg-gray-50 opacity-75">
                      <Table.Td><span className="font-mono text-xs text-gray-400">{c.codigo}</span></Table.Td>
                      <Table.Td><span className="text-gray-500 line-through">{c.razon_social}</span></Table.Td>
                      <Table.Td className="text-gray-400">{c.rif}</Table.Td>
                      <Table.Td className="text-gray-400">{c.zona}</Table.Td>
                      <Table.Td align="center">
                        <button onClick={() => handleReactivar(c.id, c.razon_social)} className="text-brand-600 hover:underline text-xs font-medium">
                          Reactivar
                        </button>
                      </Table.Td>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      )}

      <ClienteModal open={modalOpen} onClose={closeModal} clienteId={editId} onSaved={load} />
      <ConsolidadoGrupoModal
        open={consolidadoOpen}
        onClose={() => setConsolidadoOpen(false)}
        grupoId={grupoId ? Number(grupoId) : null}
        grupoNombre={grupos.find((g) => String(g.id) === grupoId)?.nombre}
      />
    </div>
  )
}
