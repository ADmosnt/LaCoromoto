import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getOrden, downloadOrdenPDF, anularOrden, confirmarReporteVenta } from '../api'
import { HelpTooltip } from './ui/Tooltip'
import Button from './ui/Button'
import { STATUS_CONFIG } from './ui/StatusBadge'
import ReporteVentaModal from './ReporteVentaModal'

// Avisos del panel según el estado. Los colores NO se hardcodean: se derivan
// de STATUS_CONFIG (la misma fuente de verdad que StatusBadge), así el banner
// y la píldora de estado siempre concuerdan.
const STATUS_NOTICE = {
  anulada: 'Orden anulada. El stock fue revertido al almacén.',
  pendiente: 'Reporte de venta registrado — pendiente de confirmación.',
  parcial: 'Reportada y confirmada parcialmente. Aún queda stock en consignación por reportar.',
  confirmado: 'Venta confirmada. Stock descontado.',
}

function StatusNotice({ status }) {
  const msg = STATUS_NOTICE[status]
  if (!msg) return null
  const cfg = STATUS_CONFIG[status]
  return (
    <div
      className="mb-2 text-xs rounded px-2 py-1 border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: `${cfg.text}33` }}
    >
      {msg}
    </div>
  )
}

export default function OrdenDetailPanel({ ordenId, refreshKey, onAnulada, onReporteCreated, onEditar, onVerEdiciones }) {
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [reporteModalOpen, setReporteModalOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const fetchDetail = () => {
    setDetail(null)
    setLoadError(false)
    getOrden(ordenId).then((r) => setDetail(r.data)).catch(() => setLoadError(true))
  }

  useEffect(() => { fetchDetail() }, [ordenId, refreshKey])

  // Cantidades devueltas/reportadas por producto. Se memoiza para no recorrer
  // los arrays anidados en cada render del panel (solo recalcula si cambia detail).
  const { devueltoMap, reportadoMap, hayDevolucion, hayReporte } = useMemo(() => {
    if (!detail) return { devueltoMap: {}, reportadoMap: {}, hayDevolucion: false, hayReporte: false }
    const devMap = {}
    for (const dev of detail.devoluciones ?? []) {
      for (const det of dev.detalles ?? []) {
        devMap[det.producto_id] = (devMap[det.producto_id] || 0) + det.cantidad_unidades
      }
    }
    const repMap = {}
    for (const rep of detail.reportes ?? []) {
      if (rep.status === 'pendiente' || rep.status === 'confirmado') {
        for (const det of rep.detalles ?? []) {
          repMap[det.producto_id] = (repMap[det.producto_id] || 0) + det.cantidad_unidades
        }
      }
    }
    return {
      devueltoMap: devMap,
      reportadoMap: repMap,
      hayDevolucion: Object.keys(devMap).length > 0,
      hayReporte: Object.keys(repMap).length > 0,
    }
  }, [detail])

  const handlePDF = async () => {
    try {
      const r = await downloadOrdenPDF(ordenId)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `orden_${detail.numero_orden}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el PDF')
    }
  }

  const handleAnular = async () => {
    if (!confirm(`¿Anular la orden #${detail.numero_orden}? Esta acción revertirá el stock en consignación.`)) return
    try {
      await anularOrden(ordenId)
      toast.success(`Orden #${detail.numero_orden} anulada`)
      onAnulada()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al anular la orden')
    }
  }

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar la venta? Esto descontará el stock en consignación.')) return
    setConfirmando(true)
    try {
      await confirmarReporteVenta(detail.reporte_id)
      toast.success('Venta confirmada. Stock descontado.')
      fetchDetail()
      onReporteCreated()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al confirmar la venta')
    } finally {
      setConfirmando(false)
    }
  }

  if (loadError) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-red-500">Error al cargar el detalle</div>
  if (!detail) return <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-400">Cargando...</div>

  const { status } = detail
  const isActiva = status === 'activa'
  const isPendiente = status === 'pendiente'
  const isParcial = status === 'parcial'
  const puedeEditar = Boolean(detail.puede_editar)
  const edicionesCount = detail.ediciones_count ?? 0

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      {edicionesCount > 0 && (
        <div className="mb-2 flex items-center">
          <button
            onClick={() => onVerEdiciones(detail)}
            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 rounded px-2 py-1 font-medium inline-flex items-center gap-1"
          >
            <span>✎</span>
            <span>Editada {edicionesCount > 1 ? `(${edicionesCount} cambios)` : '(1 cambio)'} — ver historial</span>
          </button>
        </div>
      )}
      <StatusNotice status={status} />
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-center">Despachado</th>
              {hayDevolucion && <th className="px-3 py-2 text-center text-orange-700">Devuelto</th>}
              {hayDevolucion && <th className="px-3 py-2 text-center">Neto</th>}
              {hayReporte && <th className="px-3 py-2 text-center text-brand-700">Reportado</th>}
              {hayReporte && <th className="px-3 py-2 text-center">Pendiente</th>}
              <th className="px-3 py-2 text-right">Precio/Caja</th>
              <th className="px-3 py-2 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {detail.detalles?.map((d) => {
              const upb = d.unidades_por_bulto || 1
              const precioBulto = Number(d.precio_usd_momento) * upb
              const devuelto = devueltoMap[d.producto_id] || 0
              const neto = d.cantidad_unidades - devuelto
              const reportado = reportadoMap[d.producto_id] || 0
              const pendienteReporte = d.cantidad_unidades - reportado
              return (
                <tr key={d.id} className="hover:bg-gray-100">
                  <td className="px-3 py-2 font-mono">{d.codigo}</td>
                  <td className="px-3 py-2">{d.descripcion}</td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {Math.floor(d.cantidad_unidades / upb)}B+{d.cantidad_unidades % upb}u
                  </td>
                  {hayDevolucion && (
                    <td className="px-3 py-2 text-center text-orange-600">
                      {devuelto > 0 ? `-${devuelto} uds` : '—'}
                    </td>
                  )}
                  {hayDevolucion && (
                    <td className="px-3 py-2 text-center font-medium">
                      {Math.floor(neto / upb)}B+{neto % upb}u
                    </td>
                  )}
                  {hayReporte && (
                    <td className="px-3 py-2 text-center text-brand-600">
                      {reportado > 0 ? `${reportado} uds` : '—'}
                    </td>
                  )}
                  {hayReporte && (
                    <td className="px-3 py-2 text-center font-medium">
                      {pendienteReporte > 0 ? `${pendienteReporte} uds` : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">${precioBulto.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">${Number(d.total_usd).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {detail.devoluciones?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Devoluciones vinculadas</p>
          {detail.devoluciones.map((dev) => (
            <div key={dev.id} className="text-xs bg-orange-50 border border-orange-200 rounded px-3 py-2 mb-1">
              <span className="font-medium">{dev.fecha}</span>
              {dev.nota && <span className="ml-2 italic text-gray-600">"{dev.nota}"</span>}
              <ul className="mt-1 ml-2 text-gray-700 space-y-0.5">
                {dev.detalles?.map((det) => (
                  <li key={det.id}>{det.descripcion}: <strong>{det.cantidad_unidades} uds</strong> devueltas</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={handlePDF}>
            Descargar PDF
          </Button>
          {puedeEditar && (
            <span className="inline-flex items-center gap-1">
              <Button variant="purple" size="sm" onClick={() => onEditar(detail)}>
                Editar Orden
              </Button>
              <HelpTooltip text="Edita los productos, cantidades, precios, fecha o nota. Se registrará un historial de cambios visible para auditoría." side="top" />
            </span>
          )}
          {(isActiva || isParcial) && (
            <span className="inline-flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={() => setReporteModalOpen(true)}>
                Registrar Reporte de Venta
              </Button>
              <HelpTooltip text="Registra cuántas unidades fueron vendidas y cobradas. Puedes registrar varios reportes por partes hasta cubrir todo lo despachado. Cada uno queda pendiente de confirmación hasta que el administrador lo apruebe." side="top" />
            </span>
          )}
          {isPendiente && (
            <span className="inline-flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? 'Confirmando...' : 'Confirmar Venta'}
              </Button>
              <HelpTooltip text="Confirma el reporte de venta pendiente. Esto descuenta permanentemente las unidades vendidas del stock en consignación del cliente." side="top" />
            </span>
          )}
          {isActiva && (
            <span className="inline-flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={handleAnular}>
                Anular Orden
              </Button>
              <HelpTooltip text="Cancela esta orden y devuelve todas las unidades despachadas al inventario central. Esta acción no se puede deshacer." side="top" />
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 text-right">
          <span>Tasa: Bs. {Number(detail.tasa_valor).toFixed(4)}</span>
          <span className="ml-3 font-semibold text-gray-700">Total Bs. {Number(detail.total_bs).toFixed(2)}</span>
          {detail.nota && <span className="ml-3 italic">"{detail.nota}"</span>}
        </div>
      </div>

      <ReporteVentaModal
        open={reporteModalOpen}
        onClose={() => setReporteModalOpen(false)}
        onSaved={() => { fetchDetail(); onReporteCreated() }}
        orden={detail}
      />
    </div>
  )
}
