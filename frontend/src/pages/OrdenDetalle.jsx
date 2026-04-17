import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrden, downloadOrdenPDF, anularOrden } from '../api'
import Alert from '../components/Alert'

export default function OrdenDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const [orden, setOrden] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    getOrden(id).then((r) => setOrden(r.data)).catch(() => setError('Error al cargar la orden'))

  useEffect(() => { load() }, [id])

  const handlePDF = async () => {
    try {
      const r = await downloadOrdenPDF(id)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `orden_${orden.numero_orden}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al generar el PDF')
    }
  }

  const handleAnular = async () => {
    if (!confirm(`¿Anular la orden #${orden.numero_orden}? Esta acción revertirá el stock en consignación y en el almacén. No se puede deshacer.`)) return
    try {
      await anularOrden(id)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al anular la orden')
    }
  }

  if (!orden) return <div className="text-gray-400 p-6">Cargando...</div>

  const isAnulada = orden.status === 'anulada'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => nav('/ordenes')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">Orden #{orden.numero_orden}</h2>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isAnulada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {orden.status}
        </span>
        <div className="ml-auto flex gap-2">
          {!isAnulada && (
            <button onClick={handleAnular} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md">
              Anular Orden
            </button>
          )}
          <button onClick={handlePDF} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md">
            Descargar PDF
          </button>
        </div>
      </div>

      <Alert type="error" message={error} />

      {isAnulada && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          Esta orden fue anulada. El stock fue revertido al almacén.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Cliente:</span> <span className="font-medium ml-2">{orden.cliente}</span></div>
          <div><span className="text-gray-500">Fecha:</span> <span className="ml-2">{orden.fecha_emision}</span></div>
          <div><span className="text-gray-500">RIF cliente:</span> <span className="ml-2">{orden.cliente_rif}</span></div>
          <div><span className="text-gray-500">Tasa BCV:</span> <span className="ml-2">Bs. {Number(orden.tasa_valor).toFixed(4)}</span></div>
          {orden.nota && <div className="col-span-2"><span className="text-gray-500">Nota:</span> <span className="ml-2">{orden.nota}</span></div>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-white text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-center">Cantidad</th>
              <th className="px-4 py-3 text-center">Bultos</th>
              <th className="px-4 py-3 text-right">Precio USD</th>
              <th className="px-4 py-3 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orden.detalles?.map((d) => {
              const upb = d.unidades_por_bulto || 1
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{d.codigo}</td>
                  <td className="px-4 py-3">{d.descripcion}</td>
                  <td className="px-4 py-3 text-center">{d.cantidad_unidades}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {Math.floor(d.cantidad_unidades / upb)}B + {d.cantidad_unidades % upb}u
                  </td>
                  <td className="px-4 py-3 text-right">${Number(d.precio_usd_momento).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex justify-end gap-8 text-sm">
        <div className="text-right">
          <p className="text-gray-500">Total USD</p>
          <p className="text-xl font-bold">${Number(orden.total_usd).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Total Bs.</p>
          <p className="text-xl font-bold">Bs. {Number(orden.total_bs).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
