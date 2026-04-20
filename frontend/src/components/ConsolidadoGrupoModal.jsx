import { useEffect, useState, Fragment } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { getGrupoConsolidado } from '../api'

export default function ConsolidadoGrupoModal({ open, onClose, grupoId, grupoNombre }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!open || !grupoId) return
    setExpanded(null)
    setLoading(true)
    getGrupoConsolidado(grupoId)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Error al cargar consolidado del grupo'))
      .finally(() => setLoading(false))
  }, [open, grupoId])

  const totalUds = data?.stock_consolidado.reduce((s, x) => s + x.total_unidades, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" title={`Consolidado: ${grupoNombre ?? '...'}`}>
        {loading && <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>}

        {data && !loading && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Clientes en el grupo', value: data.total_clientes },
                { label: 'Productos en consignación', value: data.stock_consolidado.length },
                { label: 'Total unidades', value: totalUds },
              ].map((s) => (
                <div key={s.label} className="bg-blue-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-blue-700">{s.value}</p>
                </div>
              ))}
            </div>

            {data.stock_consolidado.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">
                Ningún cliente de este grupo tiene stock en consignación.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 w-6"></th>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Uds/Bulto</th>
                      <th className="px-3 py-2 text-center">Bultos</th>
                      <th className="px-3 py-2 text-center">Sueltas</th>
                      <th className="px-3 py-2 text-center">Total uds</th>
                      <th className="px-3 py-2 text-center"># Clientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stock_consolidado.map((prod) => (
                      <Fragment key={prod.producto_id}>
                        <tr
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer select-none"
                          onClick={() => setExpanded(expanded === prod.producto_id ? null : prod.producto_id)}
                        >
                          <td className="px-3 py-2 text-gray-400 text-xs">
                            {expanded === prod.producto_id ? '▼' : '▶'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{prod.descripcion}</div>
                            <div className="text-xs font-mono text-gray-400">{prod.codigo}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">{prod.unidades_por_bulto}</td>
                          <td className="px-3 py-2 text-center font-medium">{prod.total_bultos}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{prod.total_sueltas}</td>
                          <td className="px-3 py-2 text-center font-bold text-blue-700">{prod.total_unidades}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{prod.clientes_con_stock}</td>
                        </tr>
                        {expanded === prod.producto_id && (
                          <tr>
                            <td colSpan={7} className="bg-blue-50 px-6 py-2 border-b border-blue-100">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Distribución por cliente</p>
                              <table className="text-xs w-full max-w-lg">
                                <thead className="text-gray-400">
                                  <tr>
                                    <th className="py-1 text-left pr-4">Cliente</th>
                                    <th className="py-1 text-left pr-4">Código</th>
                                    <th className="py-1 text-center pr-4">Bultos</th>
                                    <th className="py-1 text-center pr-4">Sueltas</th>
                                    <th className="py-1 text-center">Total uds</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-100">
                                  {prod.por_cliente.map((pc) => (
                                    <tr key={pc.cliente_id}>
                                      <td className="py-1.5 pr-4 font-medium">{pc.razon_social}</td>
                                      <td className="py-1.5 pr-4 font-mono text-gray-400">{pc.codigo}</td>
                                      <td className="py-1.5 pr-4 text-center">{pc.bultos}</td>
                                      <td className="py-1.5 pr-4 text-center">{pc.sueltas}</td>
                                      <td className="py-1.5 text-center font-semibold text-blue-700">{pc.cantidad_unidades}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total unidades del grupo:</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{totalUds}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
