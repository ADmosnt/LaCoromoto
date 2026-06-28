import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { HelpTooltip } from './ui/Tooltip'
import { createDevolucion, updateDevolucion, getClientes, getOrdenes, getOrden, getDevolucion } from '../api'
import Alert from './Alert'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import FormField from './ui/FormField'

export default function DevolucionModal({ open, onClose, onSaved, devolucionId }) {
  const isEdit = Boolean(devolucionId)
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [ordenId, setOrdenId] = useState('')
  const [ordenNumero, setOrdenNumero] = useState('')
  const [rows, setRows] = useState([])
  const [nota, setNota] = useState('')
  const [reingresar, setReingresar] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const buildRowsFromOrden = (ordenData, returnedMap = {}) =>
    (ordenData.detalles ?? []).map((d) => {
      const upb = d.unidades_por_bulto || 1
      const ret = returnedMap[d.producto_id] || 0
      return {
        producto_id: d.producto_id,
        descripcion: d.descripcion,
        codigo: d.codigo,
        upb,
        cantidad_despachada: d.cantidad_unidades,
        bultos: ret ? String(Math.floor(ret / upb)) : '',
        sueltas: ret ? String(ret % upb) : '',
      }
    })

  useEffect(() => {
    if (!open) return
    setError(''); setRows([]); setNota(''); setReingresar(false)
    setOrdenes([]); setOrdenId(''); setOrdenNumero(''); setClienteNombre('')

    if (isEdit) {
      setClienteId('')
      ;(async () => {
        try {
          const dr = await getDevolucion(devolucionId)
          const dev = dr.data
          setClienteNombre(dev.cliente)
          setOrdenNumero(dev.numero_orden_origen ?? '')
          setOrdenId(dev.orden_origen_id ? String(dev.orden_origen_id) : '')
          setNota(dev.nota || '')
          setReingresar(dev.reingresar_almacen)

          const returnedMap = {}
          for (const det of dev.detalles ?? []) returnedMap[det.producto_id] = det.cantidad_unidades

          if (dev.orden_origen_id) {
            const or = await getOrden(dev.orden_origen_id)
            const baseRows = buildRowsFromOrden(or.data, returnedMap)
            // Productos devueltos que ya no están en la orden de origen
            const enOrden = new Set((or.data.detalles ?? []).map((d) => d.producto_id))
            for (const det of dev.detalles ?? []) {
              if (!enOrden.has(det.producto_id)) {
                baseRows.push({
                  producto_id: det.producto_id, descripcion: det.descripcion, codigo: det.codigo,
                  upb: 1, cantidad_despachada: det.cantidad_unidades,
                  bultos: String(det.cantidad_unidades), sueltas: '0',
                })
              }
            }
            setRows(baseRows)
          }
        } catch {
          setError('Error al cargar la devolución')
        }
      })()
    } else {
      setClienteId('')
      getClientes({ activo: true })
        .then((r) => setClientes(r.data))
        .catch(() => setError('Error al cargar clientes'))
    }
  }, [open, devolucionId])

  // Cadena cliente → órdenes (solo en modo crear)
  useEffect(() => {
    if (isEdit || !open) return
    if (!clienteId) { setOrdenes([]); setOrdenId(''); setRows([]); return }
    getOrdenes({ cliente_id: clienteId, status: 'activa' })
      .then((r) => setOrdenes(r.data))
      .catch(() => setError('Error al cargar órdenes'))
    setOrdenId('')
    setRows([])
  }, [clienteId])

  // orden → detalles (solo en modo crear)
  useEffect(() => {
    if (isEdit || !open) return
    if (!ordenId) { setRows([]); return }
    getOrden(ordenId).then((r) => setRows(buildRowsFromOrden(r.data)))
  }, [ordenId])

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

    if (!detalles.length) { setError('Ingrese al menos una unidad a devolver'); return }

    const excede = detalles.find((r) => r.cantidad_unidades > r.cantidad_despachada)
    if (excede) {
      setError(`"${excede.descripcion}": no puede devolver más de lo despachado (${excede.cantidad_despachada} uds)`)
      return
    }

    setLoading(true)
    try {
      const detallesOut = detalles.map((r) => ({
        producto_id: Number(r.producto_id),
        cantidad_unidades: r.cantidad_unidades,
      }))
      if (isEdit) {
        await updateDevolucion(devolucionId, { nota, reingresar_almacen: reingresar, detalles: detallesOut })
        toast.success('Devolución actualizada')
      } else {
        await createDevolucion({
          cliente_id: Number(clienteId),
          orden_origen_id: Number(ordenId),
          nota,
          reingresar_almacen: reingresar,
          detalles: detallesOut,
        })
        toast.success('Devolución registrada')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar la devolución')
    } finally {
      setLoading(false)
    }
  }

  const inpRO = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-600'

  const mostrarDetalle = isEdit || Boolean(ordenId)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={
        <span className="inline-flex items-center gap-1">
          {isEdit ? 'Editar Devolución' : 'Nueva Devolución'}
          <HelpTooltip text="Registra la devolución de productos que el cliente tenía en consignación. Las unidades se retiran del stock del cliente. Marca 'Reingresar al almacén' si la mercancía sirve para volver a despacharla." side="bottom" />
        </span>
      } size="lg">
        <Alert type="error" message={error} />
        <form onSubmit={submit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            {isEdit ? (
              <div className={inpRO}>{clienteNombre}</div>
            ) : (
              <Select
                placeholder="Seleccionar cliente..."
                value={clienteId}
                onChange={setClienteId}
                options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              />
            )}
          </div>

          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de origen</label>
              <div className={inpRO}>#{ordenNumero}</div>
            </div>
          ) : clienteId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de origen *</label>
              {ordenes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">Este cliente no tiene órdenes activas.</p>
              ) : (
                <Select
                  placeholder="Seleccionar orden..."
                  value={ordenId}
                  onChange={setOrdenId}
                  options={ordenes.map((o) => ({ value: String(o.id), label: `#${o.numero_orden} — ${o.fecha_emision}` }))}
                />
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidades a devolver</label>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Uds/Bulto</th>
                      <th className="px-3 py-2 text-center">Despachado</th>
                      <th className="px-3 py-2 text-center">Bultos</th>
                      <th className="px-3 py-2 text-center">Uds. sueltas</th>
                      <th className="px-3 py-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, i) => {
                      const upb = row.upb || 1
                      const total = totalUnidades(row)
                      const excede = total > row.cantidad_despachada
                      return (
                        <tr key={i} className={excede ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 font-medium">
                            <div>{row.descripcion}</div>
                            <div className="text-xs text-gray-400 font-mono">{row.codigo}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs font-medium">{upb}</td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs">
                            {Math.floor(row.cantidad_despachada / upb)}B+{row.cantidad_despachada % upb}u
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="text" inputMode="numeric"
                              className="w-16 text-center py-1 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              value={row.bultos}
                              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRowField(i, 'bultos', e.target.value) }}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="text" inputMode="numeric"
                              className="w-16 text-center py-1 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                              value={row.sueltas}
                              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setRowField(i, 'sueltas', e.target.value) }}
                            />
                          </td>
                          <td className={`px-3 py-2 text-center text-xs font-medium ${excede ? 'text-red-600' : 'text-gray-700'}`}>
                            {total > 0 ? `${total} uds` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mostrarDetalle && (
            <>
              <FormField id="nota" label="Nota / Motivo">
                <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Producto en mal estado..." />
              </FormField>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    checked={reingresar}
                    onChange={(e) => setReingresar(e.target.checked)}
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-800 inline-flex items-center gap-1">
                      Reingresar mercancía al almacén central
                      <HelpTooltip text="Activa esto cuando el producto devuelto está en buen estado y puede volver a venderse. Las unidades se sumarán al inventario central. Déjalo desactivado si la mercancía está dañada o vencida (se da de baja como merma)." />
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {reingresar
                        ? 'Las unidades se sumarán al inventario central.'
                        : 'Las unidades se descontarán del stock del cliente y se darán por perdidas (merma).'}
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || (!isEdit && !ordenId)}>
              {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar Devolución')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
