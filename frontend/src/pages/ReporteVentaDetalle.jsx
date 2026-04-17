import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReporteVenta, confirmarReporteVenta } from '../api'
import Alert from '../components/Alert'

const statusBadge = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-green-100 text-green-700',
}

export default function ReporteVentaDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const [reporte, setReporte] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    getReporteVenta(id)
      .then((r) => setReporte(r.data))
      .catch(() => setError('Error al cargar el reporte'))

  useEffect(() => { load() }, [id])

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar este reporte? Se descontará del stock en consignación. Esta acción no se puede deshacer.')) return
    try {
      await confirmarReporteVenta(id)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al confirmar el reporte')
    }
  }

  if (!reporte) return <div className="text-gray-400 p-6">Cargando...</div>

  const isPendiente = reporte.status === 'pendiente'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => nav('/reportes-venta')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">Reporte de Venta #{reporte.id}</h2>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[reporte.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {reporte.status}
        </span>
        {isPendiente && (
          <div className="ml-auto">
            <button
              onClick={handleConfirmar}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md"
            >
              Confirmar reporte
            </button>
          </div>
        )}
      </div>

      <Alert type="error" message={error} />

      {reporte.status === 'confirmado' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Reporte confirmado. El stock en consignación fue descontado.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Cliente:</span> <span className="font-medium ml-2">{reporte.cliente}</span></div>
          <div><span className="text-gray-500">Fecha:</span> <span className="ml-2">{reporte.fecha}</span></div>
          <div><span className="text-gray-500">Tasa BCV:</span> <span className="ml-2">Bs. {Number(reporte.tasa_valor).toFixed(4)}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-white text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-center">Cantidad</th>
              <th className="px-4 py-3 text-right">Precio USD</th>
              <th className="px-4 py-3 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reporte.detalles?.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{d.codigo}</td>
                <td className="px-4 py-3">{d.descripcion}</td>
                <td className="px-4 py-3 text-center">{d.cantidad_unidades}</td>
                <td className="px-4 py-3 text-right">${Number(d.precio_usd_momento).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex justify-end gap-8 text-sm">
        <div className="text-right">
          <p className="text-gray-500">Total USD</p>
          <p className="text-xl font-bold">${Number(reporte.total_usd).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Total Bs.</p>
          <p className="text-xl font-bold">Bs. {Number(reporte.total_bs).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
