import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrden, downloadOrdenPDF } from '../api'
import Alert from '../components/Alert'

export default function OrdenDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const [orden, setOrden] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getOrden(id).then((r) => setOrden(r.data)).catch(() => setError('Error al cargar la orden'))
  }, [id])

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

  if (!orden) return <div className="text-gray-400 p-6">Cargando...</div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav('/ordenes')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">Orden #{orden.numero_orden}</h2>
        <button onClick={handlePDF} className="ml-auto bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md">
          Descargar PDF
        </button>
      </div>

      <Alert type="error" message={error} />

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
              const bultos = Math.floor(d.cantidad_unidades / upb)
              const sueltas = d.cantidad_unidades % upb
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{d.codigo}</td>
                  <td className="px-4 py-3">{d.descripcion}</td>
                  <td className="px-4 py-3 text-center">{d.cantidad_unidades}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{bultos}B + {sueltas}u</td>
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
