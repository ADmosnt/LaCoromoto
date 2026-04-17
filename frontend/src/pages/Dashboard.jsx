import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api'

function StatCard({ label, value, to }) {
  return (
    <Link to={to} className="block bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
    </Link>
  )
}

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
        <StatCard label="Órdenes este mes" value={data?.ordenes_mes} to="/ordenes" />
        <StatCard label="Reportes pendientes" value={data?.reportes_pendientes} to="/reportes-venta" />
      </div>

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
                  <td className="px-5 py-3">
                    <Link to={`/ordenes/${o.id}`} className="text-blue-600 hover:underline font-mono">
                      {o.numero_orden}
                    </Link>
                  </td>
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
