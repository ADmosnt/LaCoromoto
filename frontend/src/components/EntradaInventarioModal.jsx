import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import ProductoCombobox from './ui/ProductoCombobox'
import {
  createEntrada, updateEntrada, getEntrada,
  getProductos, getGruposProductos, getInventario,
} from '../api'
import Alert from './Alert'

const emptyRow = () => ({
  grupo_filtro: '',
  producto_id: '', descripcion: '', codigo: '',
  unidades_por_bulto: 1,
  bultos: '', sueltas: '',
})

const rowUnidades = (row) => {
  const upb = row.unidades_por_bulto || 1
  return (Number(row.bultos) || 0) * upb + (Number(row.sueltas) || 0)
}

export default function EntradaInventarioModal({ open, onClose, onSaved, entradaId }) {
  const isEdit = Boolean(entradaId)
  const [productos, setProductos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [inventario, setInventario] = useState([])
  const [rows, setRows] = useState([emptyRow()])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [numeroEntrada, setNumeroEntrada] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'confirm'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setStep('form')
    setNota('')
    setNumeroEntrada('')
    setRows([emptyRow()])
    setFecha(new Date().toISOString().slice(0, 10))

    Promise.all([
      getProductos({ activo: true }),
      getGruposProductos(),
      getInventario(),
    ]).then(([p, g, inv]) => {
      setProductos(p.data)
      setGrupos(g.data)
      setInventario(inv.data)

      if (isEdit) {
        getEntrada(entradaId).then((r) => {
          const e = r.data
          setFecha(e.fecha)
          setNota(e.nota || '')
          setNumeroEntrada(e.numero_entrada || '')
          setRows(
            (e.detalles ?? []).map((d) => {
              const prod = p.data.find((x) => x.id === d.producto_id)
              const upb = d.unidades_por_bulto || prod?.unidades_por_bulto || 1
              return {
                grupo_filtro: prod?.grupo_id ? String(prod.grupo_id) : '',
                producto_id: d.producto_id,
                descripcion: d.descripcion,
                codigo: d.codigo,
                unidades_por_bulto: upb,
                bultos: Math.floor(d.cantidad_unidades / upb),
                sueltas: d.cantidad_unidades % upb,
              }
            })
          )
        }).catch(() => setError('Error al cargar entrada'))
      }
    }).catch(() => setError('Error al cargar datos'))
  }, [open, entradaId])

  const invMap = Object.fromEntries(inventario.map((inv) => [inv.producto_id, inv]))

  const setRow = (i, field, val) => {
    const rs = [...rows]
    rs[i] = { ...rs[i], [field]: val }
    if (field === 'grupo_filtro') {
      rs[i].producto_id = ''
      rs[i].descripcion = ''
      rs[i].codigo = ''
      rs[i].unidades_por_bulto = 1
      rs[i].bultos = ''
      rs[i].sueltas = ''
    }
    if (field === 'producto_id') {
      const prod = productos.find((p) => String(p.id) === String(val))
      if (prod) {
        rs[i].descripcion = prod.descripcion
        rs[i].codigo = prod.codigo
        rs[i].unidades_por_bulto = prod.unidades_por_bulto
      } else {
        rs[i].descripcion = ''
        rs[i].codigo = ''
        rs[i].unidades_por_bulto = 1
      }
      rs[i].bultos = ''
      rs[i].sueltas = ''
    }
    setRows(rs)
  }

  const addRow = () => setRows([...rows, emptyRow()])
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))

  const validRows = rows.filter((r) => r.producto_id && rowUnidades(r) > 0)
  const totalUds = validRows.reduce((s, r) => s + rowUnidades(r), 0)

  const goToConfirm = (e) => {
    e.preventDefault()
    setError('')
    if (!validRows.length) {
      setError('Agregue al menos un producto con cantidad')
      return
    }
    // Validar productos duplicados (acumular en lugar de error sería confuso para el usuario)
    const ids = validRows.map((r) => Number(r.producto_id))
    const dup = ids.find((id, idx) => ids.indexOf(id) !== idx)
    if (dup) {
      const prod = productos.find((p) => p.id === dup)
      setError(`Producto duplicado: ${prod?.descripcion || `id=${dup}`}. Agregue las cantidades en una sola fila.`)
      return
    }
    setStep('confirm')
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = {
        fecha,
        nota: nota || null,
        detalles: validRows.map((r) => ({
          producto_id: Number(r.producto_id),
          cantidad_unidades: rowUnidades(r),
        })),
      }
      if (isEdit) {
        await updateEntrada(entradaId, payload)
        toast.success(`Entrada ${numeroEntrada} actualizada`)
      } else {
        await createEntrada(payload)
        toast.success('Entrada registrada al almacén')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const inpNum = 'border border-gray-300 rounded px-2 py-1.5 text-sm w-full text-center focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        size="xl"
        title={
          isEdit
            ? `Editar entrada ${numeroEntrada}`
            : (step === 'confirm' ? 'Confirmar entrada' : 'Nueva entrada al almacén')
        }
      >
        <Alert type="error" message={error} />

        {step === 'form' && (
          <form onSubmit={goToConfirm} className="space-y-4">
            {/* Cabecera */}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input
                  className={inp} value={nota} onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Factura #123, proveedor XYZ..."
                />
              </div>
            </div>

            {/* Tabla productos */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">Productos a ingresar</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Grupo / Producto</th>
                      <th className="px-3 py-2 text-center w-14">Uds/B</th>
                      <th className="px-3 py-2 text-center w-20">Stock actual</th>
                      <th className="px-3 py-2 text-center w-20">Bultos</th>
                      <th className="px-3 py-2 text-center w-20">Sueltas</th>
                      <th className="px-3 py-2 text-center w-24">Total uds</th>
                      <th className="px-3 py-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, i) => {
                      const upb = row.unidades_por_bulto || 1
                      const total = rowUnidades(row)
                      const invItem = row.producto_id ? invMap[Number(row.producto_id)] : null
                      const stockUds = invItem?.cantidad_unidades ?? null

                      const productosFila = row.grupo_filtro
                        ? productos.filter((p) => String(p.grupo_id) === row.grupo_filtro)
                        : productos

                      return (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <select
                              className="border border-gray-200 rounded px-2 py-1 text-xs w-full mb-1 text-gray-500 bg-gray-50"
                              value={row.grupo_filtro}
                              onChange={(e) => setRow(i, 'grupo_filtro', e.target.value)}
                            >
                              <option value="">Todos los grupos</option>
                              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                            </select>
                            <ProductoCombobox
                              productos={productosFila}
                              selectedId={row.producto_id}
                              onSelect={(id) => setRow(i, 'producto_id', id)}
                              placeholder="Código o descripción..."
                              size="small"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs font-medium">{upb}</td>
                          <td className="px-3 py-2 text-center">
                            {stockUds == null ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : (
                              <span className="text-xs text-gray-600">
                                {Math.floor(stockUds / upb)}b
                                {stockUds % upb > 0 && <span className="text-gray-400">+{stockUds % upb}u</span>}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min={0} className={inpNum}
                              value={row.bultos}
                              onChange={(e) => setRow(i, 'bultos', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min={0} max={upb - 1} className={inpNum}
                              value={row.sueltas}
                              onChange={(e) => setRow(i, 'sueltas', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-xs font-medium text-gray-700">
                            {total > 0 ? `${total} uds` : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {rows.length > 1 && (
                              <button type="button" onClick={() => removeRow(i)}
                                className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addRow} className="mt-2 text-sm text-blue-600 hover:underline">
                + Agregar producto
              </button>
              {totalUds > 0 && (
                <p className="mt-2 text-right text-sm font-semibold text-gray-700">
                  Total a ingresar: <span className="text-blue-700">{totalUds} unidades</span>
                  {' · '}
                  <span className="text-gray-500">{validRows.length} producto{validRows.length !== 1 ? 's' : ''}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Revisar y confirmar →
              </button>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Revisa la entrada antes de guardar. Se {isEdit ? 'ajustará' : 'agregará'} al inventario central:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <span className="text-gray-500">Fecha: </span>
                  <span className="font-medium">{fecha}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total: </span>
                  <span className="font-bold text-blue-700">{totalUds} uds</span>
                  <span className="text-gray-500 ml-1">en {validRows.length} producto{validRows.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {nota && (
                <div className="mt-2 italic text-gray-600 text-xs">"{nota}"</div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Entrada</th>
                    <th className="px-3 py-2 text-center">Stock actual</th>
                    <th className="px-3 py-2 text-center">Stock resultante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validRows.map((row, i) => {
                    const upb = row.unidades_por_bulto || 1
                    const ingreso = rowUnidades(row)
                    const invItem = invMap[Number(row.producto_id)]
                    const stockActual = invItem?.cantidad_unidades ?? 0
                    const resultante = stockActual + ingreso
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.descripcion}</div>
                          <div className="text-xs text-gray-400 font-mono">{row.codigo}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="text-green-700 font-semibold">+{ingreso} uds</div>
                          <div className="text-xs text-gray-400">
                            {Math.floor(ingreso / upb)}b+{ingreso % upb}u
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">{stockActual} uds</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700">{resultante} uds</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setStep('form')} disabled={loading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                ← Volver y corregir
              </button>
              <button type="button" onClick={submit} disabled={loading}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar cambios' : 'Confirmar ingreso')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
