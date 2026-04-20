import { useEffect, useState, Fragment } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getCliente, getClienteStock, getOrdenes, getDevoluciones, getReportesVenta } from '../api'
import ClienteModal from '../components/ClienteModal'

const statusBadge = {
  activa:     'bg-green-100 text-green-700',
  pendiente:  'bg-yellow-100 text-yellow-700',
  anulada:    'bg-red-100 text-red-600',
  confirmado: 'bg-blue-100 text-blue-700',
}

const agingClass = (dias) => {
  if (dias == null) return 'text-gray-400'
  if (dias < 30) return 'text-green-600'
  if (dias < 60) return 'text-yellow-600'
  if (dias < 90) return 'text-orange-600'
  return 'text-red-600 font-semibold'
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [stock, setStock] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [reportes, setReportes] = useState([])
  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('stock')

  const load = async () => {
    setLoading(true)
    try {
      const [c, s, o, r, d] = await Promise.all([
        getCliente(id),
        getClienteStock(id),
        getOrdenes({ cliente_id: id }),
        getReportesVenta({ cliente_id: id }),
        getDevoluciones({ cliente_id: id }),
      ])
      setCliente(c.data)
      setStock(s.data)
      setOrdenes(o.data)
      setReportes(r.data)
      setDevoluciones(d.data)
    } catch {
      toast.error('Error al cargar la ficha del cliente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando ficha...</div>
  if (!cliente) return null

  const activeOrders = ordenes.filter((o) => o.status === 'activa')
  const pendingReports = reportes.filter((r) => r.status === 'pendiente')
  const totalStockUds = stock.reduce((s, x) => s + x.cantidad_unidades, 0)

  const tabs = [
    { id: 'stock',       label: `Stock (${stock.length})` },
    { id: 'ordenes',     label: `Órdenes (${activeOrders.length})` },
    { id: 'reportes',    label: `Reportes (${pendingReports.length} pend.)` },
    { id: 'devoluciones',label: `Devoluciones (${devoluciones.length})` },
  ]

  return (
    <div>
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
          ← Volver
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="border border-blue-400 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-md"
        >
          Editar datos del cliente
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-lg shadow p-5 mb-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Razón Social</p>
            <p className="text-xl font-bold text-gray-800">{cliente.razon_social}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Código</p>
            <p className="font-mono text-sm font-semibold text-gray-700">{cliente.codigo}</p>
          </div>
          {cliente.rif && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">RIF</p>
              <p className="text-sm text-gray-700">{cliente.rif}</p>
            </div>
          )}
          {cliente.zona && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Zona</p>
              <p className="text-sm text-gray-700">{cliente.zona}</p>
            </div>
          )}
          {cliente.vendedor && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Vendedor</p>
              <p className="text-sm text-gray-700">{cliente.vendedor}</p>
            </div>
          )}
          {cliente.cobrador && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Cobrador</p>
              <p className="text-sm text-gray-700">{cliente.cobrador}</p>
            </div>
          )}
          {cliente.telefonos?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfonos</p>
              <p className="text-sm text-gray-700">{cliente.telefonos.join(' / ')}</p>
            </div>
          )}
        </div>
        {cliente.observaciones && (
          <p className="mt-3 text-xs text-gray-500 italic">{cliente.observaciones}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Uds. en consignación', value: totalStockUds, color: 'text-blue-700' },
          { label: 'Órdenes activas',       value: activeOrders.length, color: 'text-green-700' },
          { label: 'Reportes pendientes',   value: pendingReports.length, color: pendingReports.length > 0 ? 'text-yellow-600' : 'text-gray-600' },
          { label: 'Devoluciones',          value: devoluciones.length, color: 'text-gray-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {/* Stock tab */}
          {activeTab === 'stock' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-center">Uds/Bulto</th>
                  <th className="px-4 py-3 text-center">Bultos</th>
                  <th className="px-4 py-3 text-center">Sueltas</th>
                  <th className="px-4 py-3 text-center">Total uds</th>
                  <th className="px-4 py-3 text-center">Antigüedad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stock.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.codigo}</td>
                    <td className="px-4 py-3 font-medium">{s.descripcion}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.unidades_por_bulto}</td>
                    <td className="px-4 py-3 text-center">{s.bultos}</td>
                    <td className="px-4 py-3 text-center">{s.unidades_sueltas}</td>
                    <td className="px-4 py-3 text-center font-bold">{s.cantidad_unidades}</td>
                    <td className={`px-4 py-3 text-center text-xs ${agingClass(s.dias_antiguedad)}`}>
                      {s.dias_antiguedad != null ? `${s.dias_antiguedad}d` : '—'}
                    </td>
                  </tr>
                ))}
                {stock.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin stock en consignación</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Órdenes tab */}
          {activeTab === 'ordenes' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">N° Orden</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Total USD</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Reporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{o.numero_orden}</td>
                    <td className="px-4 py-3 text-gray-600">{o.fecha_emision}</td>
                    <td className="px-4 py-3 text-right font-medium">${Number(o.total_usd).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.reporte_id
                        ? <Link to={`/reportes-venta/${o.reporte_id}`} className="text-xs text-blue-600 hover:underline">Ver reporte</Link>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin órdenes</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Reportes tab */}
          {activeTab === 'reportes' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Total USD</th>
                  <th className="px-4 py-3 text-right">Total Bs</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportes.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/reportes-venta/${r.id}`} className="text-blue-600 hover:underline text-xs font-medium">#{r.id}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.fecha}</td>
                    <td className="px-4 py-3 text-right font-medium">${Number(r.total_usd).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">Bs. {Number(r.total_bs).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {reportes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin reportes de venta</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* Devoluciones tab */}
          {activeTab === 'devoluciones' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Orden origen</th>
                  <th className="px-4 py-3 text-left">Destino</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devoluciones.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">#{d.id}</td>
                    <td className="px-4 py-3 text-gray-600">{d.fecha}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{d.numero_orden_origen ?? '—'}</td>
                    <td className="px-4 py-3">
                      {d.reingresar_almacen
                        ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Reingresada</span>
                        : <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Merma</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs italic">{d.nota ?? '—'}</td>
                  </tr>
                ))}
                {devoluciones.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin devoluciones</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ClienteModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clienteId={Number(id)}
        onSaved={load}
      />
    </div>
  )
}
