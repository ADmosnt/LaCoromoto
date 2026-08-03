import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { getOrdenesResumen, downloadOrdenesResumenPDF } from '../api'
import Alert from './Alert'

const statusBadge = {
  activa: 'bg-green-100 text-green-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-brand-100 text-brand-700',
  anulada: 'bg-red-100 text-red-700',
}

export default function OrdenesResumenModal({ open, onClose, ordenIds }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open || !ordenIds?.length) return
    setData(null)
    setError('')
    setLoading(true)
    getOrdenesResumen(ordenIds)
      .then((r) => setData(r.data))
      .catch(() => setError('Error al cargar el resumen'))
      .finally(() => setLoading(false))
  }, [open, ordenIds])

  const handlePDF = async () => {
    setDownloading(true)
    try {
      const r = await downloadOrdenesResumenPDF(ordenIds)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'resumen_general_despacho.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  const t = data?.totales

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Resumen general de despacho" size="xl">
        <Alert type="error" message={error} />

        {loading && <p className="text-sm text-gray-400 py-8 text-center">Cargando resumen...</p>}

        {data && !loading && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total de productos', value: t.total_productos },
                { label: 'Total de unidades', value: t.total_unidades },
                { label: 'Total de cajas', value: t.total_bultos },
                { label: 'Total de facturas', value: t.total_facturas },
              ].map((s) => (
                <div key={s.label} className="bg-brand-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-brand-700">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Órdenes incluidas */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5">Facturas / órdenes incluidas</p>
              <div className="flex flex-wrap gap-1.5">
                {data.ordenes.map((o) => (
                  <span
                    key={o.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1"
                    title={o.cliente}
                  >
                    <span className="font-mono font-medium text-brand-700">{o.numero_orden}</span>
                    <span className="text-gray-500 truncate max-w-[10rem]">{o.cliente}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Tabla de productos agregados */}
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-center">Facturas</th>
                    <th className="px-3 py-2 text-center">Unidades</th>
                    <th className="px-3 py-2 text-center">Cajas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.productos.map((p) => (
                    <tr key={p.producto_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.codigo}</td>
                      <td className="px-3 py-2 font-medium">{p.descripcion}</td>
                      <td className="px-3 py-2 text-center">{p.facturas}</td>
                      <td className="px-3 py-2 text-center font-semibold">{p.cantidad_unidades}</td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {p.bultos}c{p.sueltas > 0 && <span className="text-gray-400">+{p.sueltas}u</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={handlePDF}
                disabled={downloading}
                className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {downloading ? 'Generando PDF...' : 'Descargar PDF del resumen general'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
