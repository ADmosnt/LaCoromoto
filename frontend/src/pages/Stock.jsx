import { useEffect, useState, Fragment } from 'react'
import { toast } from 'sonner'
import { getClientes, getClienteStock, getGruposClientes, getGrupoStock, getOrden } from '../api'
import { HelpTooltip } from '../components/ui/Tooltip'
import ReporteVentaModal from '../components/ReporteVentaModal'
import { selectClass } from '../lib/styles'

const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  parcial: 'bg-brand-100 text-brand-700',
  confirmado: 'bg-brand-100 text-brand-700',
}

const statusLabel = {
  activa: 'Activa',
  pendiente: 'Pendiente',
  parcial: 'Parcialmente reportada',
  confirmado: 'Confirmada',
}

const agingClass = (dias) => {
  if (dias == null) return 'bg-gray-100 text-gray-500'
  if (dias < 30) return 'bg-green-100 text-green-700'
  if (dias < 60) return 'bg-yellow-100 text-yellow-700'
  if (dias < 90) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const agingLabel = (dias) => {
  if (dias == null) return '—'
  if (dias === 0) return 'Hoy'
  if (dias === 1) return '1 día'
  return `${dias} días`
}

export default function Stock() {
  const [modo, setModo] = useState('cliente') // 'cliente' | 'grupo'
  const [clientes, setClientes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [stock, setStock] = useState([])
  const [ordenesReportando, setOrdenesReportando] = useState([])
  const [cliente, setCliente] = useState(null)
  const [grupo, setGrupo] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [reporteOrden, setReporteOrden] = useState(null)
  const [reporteModalOpen, setReporteModalOpen] = useState(false)

  const reload = () => {
    if (modo === 'cliente' && clienteId) {
      getClienteStock(clienteId).then((r) => { setStock(r.data.stock); setOrdenesReportando(r.data.ordenes_reportando) })
    } else if (modo === 'grupo' && grupoId) {
      getGrupoStock(grupoId).then((r) => { setStock(r.data.stock); setOrdenesReportando(r.data.ordenes_reportando) })
    }
  }

  useEffect(() => {
    getClientes({ activo: true }).then((r) => setClientes(r.data))
    getGruposClientes().then((r) => setGrupos(r.data))
  }, [])

  const cambiarModo = (m) => {
    if (m === modo) return
    setModo(m)
    setClienteId('')
    setGrupoId('')
    setStock([])
    setOrdenesReportando([])
    setCliente(null)
    setGrupo(null)
    setExpanded(null)
  }

  useEffect(() => {
    if (modo !== 'cliente') return
    if (!clienteId) { setStock([]); setOrdenesReportando([]); setCliente(null); setExpanded(null); return }
    const c = clientes.find((c) => String(c.id) === clienteId)
    setCliente(c)
    setExpanded(null)
    getClienteStock(clienteId).then((r) => { setStock(r.data.stock); setOrdenesReportando(r.data.ordenes_reportando) })
  }, [modo, clienteId, clientes])

  useEffect(() => {
    if (modo !== 'grupo') return
    if (!grupoId) { setStock([]); setOrdenesReportando([]); setGrupo(null); setExpanded(null); return }
    const g = grupos.find((g) => String(g.id) === grupoId)
    setGrupo(g)
    setExpanded(null)
    getGrupoStock(grupoId).then((r) => { setStock(r.data.stock); setOrdenesReportando(r.data.ordenes_reportando) })
  }, [modo, grupoId, grupos])

  const abrirReporte = async (id) => {
    try {
      const r = await getOrden(id)
      setReporteOrden(r.data)
      setReporteModalOpen(true)
    } catch {
      toast.error('Error al cargar la orden')
    }
  }

  const totalUds = stock.reduce((s, x) => s + x.cantidad_unidades, 0)
  const seleccionado = modo === 'cliente' ? clienteId : grupoId

  return (
    <div>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => cambiarModo('cliente')}
              className={`px-3 py-2 font-medium ${modo === 'cliente' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Por cliente
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('grupo')}
              className={`px-3 py-2 font-medium border-l border-gray-300 ${modo === 'grupo' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Por grupo
            </button>
          </div>

          {modo === 'cliente' ? (
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={`w-72 ${selectClass}`}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          ) : (
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={`w-72 ${selectClass}`}>
              <option value="">Seleccionar grupo...</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
        </div>

        {modo === 'cliente' && cliente && (
          <div className="px-5 py-3 bg-brand-50 border-b text-sm">
            <span className="font-medium">{cliente.razon_social}</span>
            {cliente.rif && <span className="text-gray-500 ml-3">RIF: {cliente.rif}</span>}
            {cliente.zona && <span className="text-gray-500 ml-3">Zona: {cliente.zona}</span>}
          </div>
        )}
        {modo === 'grupo' && grupo && (
          <div className="px-5 py-3 bg-brand-50 border-b text-sm">
            <span className="font-medium">Grupo: {grupo.nombre}</span>
            <span className="text-gray-500 ml-3">
              {clientes.filter((c) => String(c.grupo_id) === String(grupo.id)).length} clientes
            </span>
            <span className="text-gray-400 ml-3 italic">Stock consolidado de todos los clientes del grupo</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-center">Uds. sueltas</th>
                <th className="px-4 py-3 text-center">Total unidades</th>
                <th className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    Antigüedad
                    <HelpTooltip text="Días que lleva la mercancía más antigua de este producto en consignación. Verde: <30 días. Amarillo: 30-59. Naranja: 60-89. Rojo: 90+ (requiere atención)." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <Fragment key={s.id}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 ${s.ordenes?.length > 0 ? 'cursor-pointer select-none' : ''}`}
                    onClick={() => s.ordenes?.length > 0 && setExpanded(expanded === s.id ? null : s.id)}
                  >
                    <td className="px-4 py-3 w-6 text-gray-400 text-xs">
                      {s.ordenes?.length > 0 ? (expanded === s.id ? '▼' : '▶') : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.codigo}</td>
                    <td className="px-4 py-3 font-medium">{s.descripcion}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.unidades_por_bulto}</td>
                    <td className="px-4 py-3 text-center font-medium">{s.bultos}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{s.unidades_sueltas}</td>
                    <td className="px-4 py-3 text-center font-bold">{s.cantidad_unidades}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${agingClass(s.dias_antiguedad)}`}
                        title={s.fecha_mas_antigua ? `Desde ${s.fecha_mas_antigua}` : ''}
                      >
                        {agingLabel(s.dias_antiguedad)}
                      </span>
                    </td>
                  </tr>
                  {expanded === s.id && s.ordenes?.length > 0 && (
                    <tr>
                      <td colSpan={8} className="px-8 py-2 bg-brand-50 border-b border-brand-100">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase">Órdenes de origen</p>
                        <table className="text-xs w-full max-w-xl">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="py-1 text-left pr-4">N° Orden</th>
                              {modo === 'grupo' && <th className="py-1 text-left pr-4">Cliente</th>}
                              <th className="py-1 text-left pr-4">Fecha</th>
                              <th className="py-1 text-center pr-4">Cant. despachada</th>
                              <th className="py-1 text-left">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100">
                            {s.ordenes.map((o) => {
                              const upb = s.unidades_por_bulto || 1
                              return (
                                <tr key={o.id}>
                                  <td className="py-1.5 pr-4 font-mono font-medium text-brand-700">{o.numero_orden}</td>
                                  {modo === 'grupo' && <td className="py-1.5 pr-4 text-gray-700">{o.cliente}</td>}
                                  <td className="py-1.5 pr-4 text-gray-600">{o.fecha_emision}</td>
                                  <td className="py-1.5 pr-4 text-center">
                                    {Math.floor(o.cantidad_unidades / upb)}B+{o.cantidad_unidades % upb}u
                                  </td>
                                  <td className="py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                      {o.status}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {seleccionado && stock.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {modo === 'cliente' ? 'Este cliente no tiene stock en consignación' : 'Ningún cliente de este grupo tiene stock en consignación'}
                  </td>
                </tr>
              )}
              {!seleccionado && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {modo === 'cliente' ? 'Seleccione un cliente para ver su stock' : 'Seleccione un grupo para ver su stock consolidado'}
                  </td>
                </tr>
              )}
            </tbody>
            {stock.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold">Total unidades en consignación:</td>
                  <td className="px-4 py-3 text-center font-bold text-brand-700">{totalUds}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {seleccionado && ordenesReportando.length > 0 && (
        <div className="bg-white rounded-lg shadow mt-4">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1">
              Órdenes con reportes de venta en curso
              <HelpTooltip text="Órdenes que ya tienen reportes de venta registrados pero aún no han sido reportadas/confirmadas en su totalidad. Puedes seguir registrando reportes hasta cubrir todo lo despachado; al confirmarse por completo, la orden saldrá de esta lista y solo se verá en Órdenes de Despacho." />
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">N° Orden</th>
                  {modo === 'grupo' && <th className="px-4 py-3 text-left">Cliente</th>}
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Total USD</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {ordenesReportando.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{o.numero_orden}</td>
                    {modo === 'grupo' && <td className="px-4 py-3">{o.cliente}</td>}
                    <td className="px-4 py-3 text-gray-500">{o.fecha_emision}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${Number(o.total_usd).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirReporte(o.id)}
                        className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded"
                      >
                        Registrar reporte
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReporteVentaModal
        open={reporteModalOpen}
        onClose={() => setReporteModalOpen(false)}
        onSaved={reload}
        orden={reporteOrden}
      />
    </div>
  )
}
