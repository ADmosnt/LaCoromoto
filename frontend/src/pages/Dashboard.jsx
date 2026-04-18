import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

function StatCard({ label, value, to, prefix = '', sub }) {
  const inner = (
    <div className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{prefix}{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

const fmt = (v) => `$${Number(v).toFixed(0)}`

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    getDashboard().then((r) => setData(r.data))
  }, [])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {data?.tasa_hoy && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-blue-600 font-medium">Tasa BCV hoy ({data.tasa_hoy.fecha})</p>
            <p className="text-2xl font-bold text-blue-800">Bs. {Number(data.tasa_hoy.valor).toFixed(4)}</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{data.tasa_hoy.fuente}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <StatCard label="Clientes activos" value={data?.total_clientes} to="/clientes" />
        <StatCard label="Productos activos" value={data?.total_productos} to="/productos" />
        <StatCard label="Despachos este mes" prefix="$" value={data?.total_despachos_mes?.toFixed(2)} to="/ordenes" sub={`${data?.ordenes_mes ?? '—'} órdenes`} />
        <StatCard label="Ventas confirmadas mes" prefix="$" value={data?.total_ventas_mes?.toFixed(2)} to="/reportes-venta" sub={`${data?.reportes_pendientes ?? '—'} pendientes`} />
      </div>

      {data?.mensual?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Despachos vs Ventas confirmadas (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.mensual} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, undefined]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="despachos" name="Despachos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ventas" name="Ventas confirmadas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.ultimas_ordenes?.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Últimas órdenes de despacho</h3>
            <Link to="/ordenes" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
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
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-blue-600">{o.numero_orden}</td>
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
    </div>
  )
}
