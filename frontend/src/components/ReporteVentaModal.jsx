import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { HelpTooltip } from './ui/Tooltip'
import PrecioInput, { parsePrecio } from './ui/PrecioInput'
import { createReporteVenta, getTasaHoy } from '../api'
import { useAuth } from '../context/AuthContext'
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import FormField from './ui/FormField'

export default function ReporteVentaModal({ open, onClose, onSaved, orden }) {
  const { user } = useAuth()
  const isCliente = user?.rol === 'cliente'

  const [rows, setRows] = useState([])
  const [fecha, setFecha] = useState('')
  const [tasaManual, setTasaManual] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !orden) return
    setError('')
    setFecha(new Date().toISOString().slice(0, 10))
    getTasaHoy().then((r) => {
      if (r.data?.valor) setTasaManual(String(r.data.valor))
    }).catch(() => {})
    const reportadoMap = {}
    for (const rep of orden.reportes ?? []) {
      if (rep.status === 'pendiente' || rep.status === 'confirmado') {
        for (const det of rep.detalles ?? []) {
          reportadoMap[det.producto_id] = (reportadoMap[det.producto_id] || 0) + det.cantidad_unidades
        }
      }
    }

    setRows(
      (orden.detalles ?? [])
        .map((d) => {
          const upb = d.unidades_por_bulto || 1
          const reportado = reportadoMap[d.producto_id] || 0
          return {
            producto_id: d.producto_id,
            descripcion: d.descripcion,
            codigo: d.codigo,
            upb,
            despacho_uds: d.cantidad_unidades,
            restante: d.cantidad_unidades - reportado,
            bultos: '',
            sueltas: '',
            precio_bulto: (Number(d.precio_usd_momento) * upb).toFixed(2),
          }
        })
        .filter((r) => r.restante > 0)
    )
  }, [open, orden])

  const setRowField = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    setRows(rs)
  }

  const totalUnidades = (row) => {
    const upb = row.upb || 1
    return (Number(row.bultos) || 0) * upb + (Number(row.sueltas) || 0)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const detalles = rows
      .map((r) => ({ ...r, cantidad_unidades: totalUnidades(r) }))
      .filter((r) => r.cantidad_unidades > 0)

    if (!detalles.length) { setError('Ingrese al menos una unidad vendida'); return }

    const excede = detalles.find((r) => r.cantidad_unidades > r.restante)
    if (excede) {
      setError(`"${excede.descripcion}": no puede superar las ${excede.restante} unidades pendientes por reportar`)
      return
    }

    if (!isCliente && (!tasaManual || Number(tasaManual) <= 0)) {
      setError('Ingrese la tasa de cambio al momento del cobro')
      return
    }

    const detallesOut = []
    for (const r of detalles) {
      const precioBulto = parsePrecio(r.precio_bulto)
      if (precioBulto == null || precioBulto < 0) {
        setError(`Precio inválido para "${r.descripcion}". Usa "." o "," como separador decimal.`)
        return
      }
      detallesOut.push({
        producto_id: Number(r.producto_id),
        cantidad_unidades: r.cantidad_unidades,
        precio_usd_momento: precioBulto / (r.upb || 1),
      })
    }

    setLoading(true)
    try {
      await createReporteVenta({
        cliente_id: orden.cliente_id,
        orden_id: orden.id,
        fecha,
        tasa_valor: Number(tasaManual) || undefined,
        detalles: detallesOut,
      })
      toast.success('Reporte de venta registrado')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar el reporte')
    } finally {
      setLoading(false)
    }
  }

  if (!orden) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={
        <span className="inline-flex items-center gap-1">
          Reporte de Venta — Orden {orden.numero_orden}
          <HelpTooltip text="Registra cuántas unidades de esta orden fueron efectivamente vendidas y cobradas. El reporte queda 'pendiente' hasta que sea confirmado por el administrador." side="bottom" />
        </span>
      } size="xl">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">

          <div className={`grid grid-cols-1 gap-4 ${isCliente ? '' : 'sm:grid-cols-2'}`}>
            <FormField id="fecha" label="Fecha de cobro">
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </FormField>
            {!isCliente && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Tasa BCV al cobro (Bs/$)
                  <HelpTooltip text="Tipo de cambio del BCV al momento en que el cliente realizó el pago. Puede diferir de la tasa del despacho original." />
                </label>
                <Input
                  type="number" min="0" step="0.0001"
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                  placeholder="Ej: 45.50"
                  required
                />
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Ya se ha reportado la totalidad de las unidades despachadas en esta orden.</p>
          ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidades vendidas</label>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Uds/Bulto</th>
                    <th className="px-3 py-2 text-center">Pendiente por reportar</th>
                    <th className="px-3 py-2 text-center">Bultos</th>
                    <th className="px-3 py-2 text-center">Uds. sueltas</th>
                    <th className="px-3 py-2 text-center">Total uds</th>
                    {!isCliente && <th className="px-3 py-2 text-right">Precio/Bulto $</th>}
                    {!isCliente && <th className="px-3 py-2 text-right">Total $</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => {
                    const upb = row.upb || 1
                    const total = totalUnidades(row)
                    const excede = total > row.restante
                    const totalUsd = (total / upb) * (parsePrecio(row.precio_bulto) || 0)
                    return (
                      <tr key={i} className={excede ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 font-medium">
                          <div>{row.descripcion}</div>
                          <div className="text-xs text-gray-400 font-mono">{row.codigo}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500 text-xs font-medium">
                          {upb}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500 text-xs">
                          {Math.floor(row.restante / upb)}B+{row.restante % upb}u
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} max={Math.floor(row.restante / upb)}
                            className="w-16 text-center border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            value={row.bultos}
                            onChange={(e) => setRowField(i, 'bultos', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} max={upb - 1}
                            className="w-16 text-center border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            value={row.sueltas}
                            onChange={(e) => setRowField(i, 'sueltas', e.target.value)}
                          />
                        </td>
                        <td className={`px-3 py-2 text-center text-xs font-medium ${excede ? 'text-red-600' : 'text-gray-700'}`}>
                          {total > 0 ? `${total} uds` : '—'}
                        </td>
                        {!isCliente && (
                          <td className="px-3 py-2 text-right">
                            <PrecioInput
                              className="w-24 text-right border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              value={row.precio_bulto}
                              onChange={(v) => setRowField(i, 'precio_bulto', v)}
                            />
                          </td>
                        )}
                        {!isCliente && (
                          <td className="px-3 py-2 text-right font-medium text-xs">
                            {total > 0 ? `$${totalUsd.toFixed(2)}` : '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || rows.length === 0}>
              {loading ? 'Registrando...' : 'Registrar Reporte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
