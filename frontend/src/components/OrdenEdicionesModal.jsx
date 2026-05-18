import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from './ui/Dialog'
import { getOrdenEdiciones } from '../api'
import Alert from './Alert'

function indexByPid(detalles) {
  const m = {}
  for (const d of (detalles ?? [])) {
    m[d.producto_id] = d
  }
  return m
}

function fmtUds(n, upb) {
  if (!n && n !== 0) return '—'
  const b = Math.floor(n / upb)
  const u = n % upb
  return `${n} uds (${b}b+${u}u)`
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DiffField({ label, antes, despues, render }) {
  const changed = JSON.stringify(antes) !== JSON.stringify(despues)
  if (!changed) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-red-600 line-through">{render ? render(antes) : (antes ?? '—')}</span>
      <span className="text-green-700 font-medium">{render ? render(despues) : (despues ?? '—')}</span>
    </div>
  )
}

function EdicionItem({ edicion }) {
  const before = edicion.snapshot_antes ?? {}
  const after = edicion.snapshot_despues ?? {}

  const beforeMap = indexByPid(before.detalles)
  const afterMap = indexByPid(after.detalles)
  const allPids = Array.from(new Set([
    ...Object.keys(beforeMap),
    ...Object.keys(afterMap),
  ]))

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <span className="font-medium text-sm text-gray-800">{fmtFecha(edicion.editado_en)}</span>
            <span className="ml-2 text-xs text-gray-500">
              por <span className="font-medium">{edicion.editado_por || 'desconocido'}</span>
            </span>
          </div>
        </div>
        {edicion.motivo && (
          <p className="text-xs text-gray-600 mt-1 italic">"{edicion.motivo}"</p>
        )}
      </div>

      <div className="p-3 space-y-1">
        {/* Header diff */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-1 border-b border-gray-100 mb-1">
          <span></span>
          <span>Antes</span>
          <span>Después</span>
        </div>
        <DiffField label="Fecha" antes={before.fecha_emision} despues={after.fecha_emision} />
        <DiffField label="Nota" antes={before.nota} despues={after.nota} />
        <DiffField
          label="Total USD"
          antes={before.total_usd}
          despues={after.total_usd}
          render={(v) => `$${Number(v).toFixed(2)}`}
        />
        <DiffField
          label="Tasa BCV"
          antes={before.tasa_valor}
          despues={after.tasa_valor}
          render={(v) => `Bs. ${Number(v).toFixed(4)}`}
        />

        {/* Detalles diff */}
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Productos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left">Producto</th>
                  <th className="px-2 py-1.5 text-center">Antes</th>
                  <th className="px-2 py-1.5 text-center">Después</th>
                  <th className="px-2 py-1.5 text-right">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allPids.map((pid) => {
                  const a = beforeMap[pid]
                  const b = afterMap[pid]
                  const upb = (b?.unidades_por_bulto ?? a?.unidades_por_bulto) || 1
                  const aQty = a?.cantidad_unidades ?? 0
                  const bQty = b?.cantidad_unidades ?? 0
                  const aPrice = a ? Number(a.precio_usd_momento) * upb : null
                  const bPrice = b ? Number(b.precio_usd_momento) * upb : null

                  const tipo = !a ? 'agregado' : !b ? 'eliminado' : 'modificado'
                  const qtyChanged = aQty !== bQty
                  const priceChanged = aPrice !== bPrice
                  if (tipo === 'modificado' && !qtyChanged && !priceChanged) return null

                  return (
                    <tr key={pid} className={
                      tipo === 'agregado' ? 'bg-green-50' :
                      tipo === 'eliminado' ? 'bg-red-50' : ''
                    }>
                      <td className="px-2 py-1.5">
                        <div className="font-medium">{(b ?? a)?.descripcion}</div>
                        <div className="text-gray-400 font-mono">{(b ?? a)?.codigo}</div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {a ? (
                          <>
                            <div>{fmtUds(aQty, upb)}</div>
                            <div className="text-gray-400">${aPrice?.toFixed(2)}/B</div>
                          </>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {b ? (
                          <>
                            <div>{fmtUds(bQty, upb)}</div>
                            <div className="text-gray-400">${bPrice?.toFixed(2)}/B</div>
                          </>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {tipo === 'agregado' && <span className="text-green-700 font-medium">+ agregado</span>}
                        {tipo === 'eliminado' && <span className="text-red-700 font-medium">− eliminado</span>}
                        {tipo === 'modificado' && (
                          <div className="text-gray-600">
                            {qtyChanged && (
                              <div className={bQty > aQty ? 'text-green-700' : 'text-orange-700'}>
                                {bQty > aQty ? '+' : ''}{bQty - aQty} uds
                              </div>
                            )}
                            {priceChanged && (
                              <div className={bPrice > aPrice ? 'text-green-700' : 'text-orange-700'}>
                                {bPrice > aPrice ? '+' : ''}${(bPrice - aPrice).toFixed(2)}/B
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdenEdicionesModal({ open, onClose, ordenId, numeroOrden }) {
  const [ediciones, setEdiciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !ordenId) return
    setLoading(true)
    setError('')
    getOrdenEdiciones(ordenId)
      .then((r) => setEdiciones(r.data))
      .catch(() => setError('Error al cargar el historial'))
      .finally(() => setLoading(false))
  }, [open, ordenId])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={`Historial de cambios — Orden ${numeroOrden ?? ''}`} size="xl">
        <Alert type="error" message={error} />
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Cargando...</p>
        ) : ediciones.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Esta orden no tiene ediciones.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {ediciones.length} edición{ediciones.length !== 1 ? 'es' : ''} registrada{ediciones.length !== 1 ? 's' : ''} (más reciente primero):
            </p>
            {ediciones.map((e) => <EdicionItem key={e.id} edicion={e} />)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
