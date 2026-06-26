import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboard } from '../api'
import OrdenModal from '../components/OrdenModal'
import DevolucionModal from '../components/DevolucionModal'
import KpiCard from '../components/ui/KpiCard'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import { Users, Box, TrendingUp, CheckCircle } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

const PERIODOS = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
]

const PERIODO_TITLE = {
  semanal:    'últimas 10 semanas',
  mensual:    'últimos 6 meses',
  trimestral: 'últimos 6 trimestres',
  semestral:  'últimos 4 semestres',
}

const fmt = (v) => `$${Number(v).toFixed(0)}`

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [periodo, setPeriodo] = useState('mensual')
  const [ordenModalOpen, setOrdenModalOpen] = useState(false)
  const [devModalOpen, setDevModalOpen] = useState(false)
  const navigate = useNavigate()

  const load = () => getDashboard({ periodo }).then((r) => setData(r.data))
  useEffect(() => { load() }, [periodo])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Button onClick={() => setOrdenModalOpen(true)} className="w-full justify-center py-3">
          + Nueva Orden
        </Button>
        <Button variant="ghost" onClick={() => setDevModalOpen(true)} className="w-full justify-center py-3 border-orange-300 text-orange-600 hover:bg-orange-50">
          + Nueva Devolución
        </Button>
        <Button variant="secondary" onClick={() => navigate('/ordenes')} className="w-full justify-center py-3">
          Ver Órdenes
        </Button>
        <Button variant="secondary" onClick={() => navigate('/stock')} className="w-full justify-center py-3 text-teal-700 hover:text-teal-800">
          Stock Consignación
        </Button>
      </div>

      {data?.tasa_hoy && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-brand-600 font-medium">Tasa BCV hoy ({data.tasa_hoy.fecha})</p>
            <p className="text-2xl font-bold text-brand-900">Bs. {Number(data.tasa_hoy.valor).toFixed(4)}</p>
          </div>
          <span className="text-xs bg-brand-100 text-brand-600 px-2.5 py-1 rounded-full font-medium">
            {data.tasa_hoy.fuente}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <KpiCard label="Clientes activos"       value={data?.total_clientes}                         to="/clientes"  icon={Users} />
        <KpiCard label="Productos activos"      value={data?.total_productos}                        to="/productos" icon={Box} />
        <KpiCard label="Despachos este mes"     value={data?.total_despachos_mes?.toFixed(2)} prefix="$" to="/ordenes" sub={`${data?.ordenes_mes ?? '—'} órdenes`} icon={TrendingUp} />
        <KpiCard label="Ventas confirmadas mes" value={data?.total_ventas_mes?.toFixed(2)}    prefix="$" sub={`${data?.reportes_pendientes ?? '—'} pendientes`} icon={CheckCircle} />
      </div>

      {data?.mensual && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-700">
              Despachos vs Ventas confirmadas —{' '}
              <span className="text-gray-400 font-normal">{PERIODO_TITLE[periodo]}</span>
            </h3>
            <div className="flex gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    periodo === p.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.mensual} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="despachos" name="Despachos"           fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ventas"    name="Ventas confirmadas"  fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.ultimos_reportes?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-700">Actividad reciente — Reportes de Venta</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Fecha cobro</th>
                  <th className="px-5 py-3 text-left">Orden</th>
                  <th className="px-5 py-3 text-right">Total USD</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ultimos_reportes.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-5 py-3 font-medium">{r.cliente}</td>
                    <td className="px-5 py-3">{r.fecha}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{r.orden_id ? `#${r.orden_id}` : '—'}</td>
                    <td className="px-5 py-3 text-right">${Number(r.total_usd).toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.ultimas_ordenes?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Últimas órdenes de despacho</h3>
            <Link to="/ordenes" className="text-sm text-brand-600 hover:underline">Ver todas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">N° Orden</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ultimas_ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-brand-600">{o.numero_orden}</td>
                    <td className="px-5 py-3">{o.cliente}</td>
                    <td className="px-5 py-3">{o.fecha_emision}</td>
                    <td className="px-5 py-3 text-right font-medium">${Number(o.total_usd).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrdenModal open={ordenModalOpen} onClose={() => setOrdenModalOpen(false)} onSaved={load} />
      <DevolucionModal open={devModalOpen} onClose={() => setDevModalOpen(false)} onSaved={() => {}} />
    </div>
  )
}
