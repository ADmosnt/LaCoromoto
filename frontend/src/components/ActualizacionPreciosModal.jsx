import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import { HelpTooltip } from './ui/Tooltip'
import { getListasPrecios, getGruposProductos, ajustePrecios } from '../api'
import Alert from './Alert'

const ARROW = '→'

export default function ActualizacionPreciosModal({ open, onClose, onSaved }) {
  const [listas, setListas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [listaId, setListaId] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [tipo, setTipo] = useState('porcentaje')
  const [valor, setValor] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setListaId(''); setGrupoId(''); setTipo('porcentaje'); setValor(''); setPreview(null); setError('')
    getListasPrecios().then((r) => setListas(r.data))
    getGruposProductos().then((r) => setGrupos(r.data))
  }, [open])

  // reset preview whenever filters change
  useEffect(() => { setPreview(null) }, [listaId, grupoId, tipo, valor])

  const handlePreview = async () => {
    setError('')
    if (!listaId) { setError('Selecciona una lista de precios'); return }
    const num = Number(valor)
    if (!valor || isNaN(num)) { setError('Ingresa un valor numérico'); return }
    if (num === 0) { setError('El valor no puede ser 0'); return }

    setLoading(true)
    try {
      const r = await ajustePrecios({
        lista_id: Number(listaId),
        grupo_id: grupoId ? Number(grupoId) : null,
        tipo,
        valor: num,
        dry_run: true,
      })
      setPreview(r.data)
      if (r.data.total === 0) setError('No hay productos con precio en esa lista/grupo')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al previsualizar')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!preview || preview.total === 0) return
    setError('')
    setApplying(true)
    try {
      const num = Number(valor)
      await ajustePrecios({
        lista_id: Number(listaId),
        grupo_id: grupoId ? Number(grupoId) : null,
        tipo,
        valor: num,
        dry_run: false,
      })
      toast.success(`${preview.total} precios actualizados`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al aplicar cambios')
    } finally {
      setApplying(false)
    }
  }

  const listaLabel = listas.find((l) => String(l.id) === listaId)?.nombre ?? ''
  const grupoLabel = grupos.find((g) => String(g.id) === grupoId)?.nombre ?? 'Todos los grupos'
  const signo = Number(valor) > 0 ? '+' : ''
  const resumen = valor
    ? `${signo}${valor}${tipo === 'porcentaje' ? '%' : ' USD'} — ${listaLabel}${grupoId ? ` / ${grupoLabel}` : ''}`
    : null

  const inp = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" title={
        <span className="inline-flex items-center gap-1">
          Actualización Masiva de Precios
          <HelpTooltip
            text="Ajusta los precios de un grupo de productos en una lista de precios. Puedes aumentar o disminuir por porcentaje (%) o por monto fijo en USD. Usa valores negativos para reducir."
            side="bottom"
          />
        </span>
      }>
        <Alert type="error" message={error} />

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios *</label>
            <select className={inp} value={listaId} onChange={(e) => setListaId(e.target.value)}>
              <option value="">Seleccionar lista...</option>
              {listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de productos</label>
            <select className={inp} value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              <option value="">Todos los grupos</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Tipo de ajuste
              <HelpTooltip text="Porcentaje: multiplica el precio actual. Ej: +10% sube $10 a $11. Monto fijo: suma o resta un valor en USD. Ej: +0.50 sube $10 a $10.50." />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('porcentaje')}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${tipo === 'porcentaje' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                % Porcentaje
              </button>
              <button
                type="button"
                onClick={() => setTipo('monto')}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${tipo === 'monto' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                $ Monto fijo
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Valor
              <HelpTooltip text="Positivo para aumentar, negativo para reducir. Ej: 10 aumenta un 10% (o $10). -5 reduce un 5% (o $5)." />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">
                {tipo === 'porcentaje' ? '%' : '$'}
              </span>
              <input
                type="number"
                step={tipo === 'porcentaje' ? '0.01' : '0.01'}
                placeholder={tipo === 'porcentaje' ? 'Ej: 10 o -5' : 'Ej: 0.50 o -1.00'}
                className={`${inp} pl-8`}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || !listaId || !valor}
          className="w-full border border-blue-400 text-blue-600 text-sm py-2 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed mb-5 font-medium"
        >
          {loading ? 'Calculando...' : '🔍 Vista previa de cambios'}
        </button>

        {/* Preview table */}
        {preview && preview.total > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {preview.total} producto{preview.total !== 1 ? 's' : ''} afectado{preview.total !== 1 ? 's' : ''}
                {resumen && <span className="ml-2 text-gray-400 font-normal">({resumen})</span>}
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-right">Precio actual</th>
                      <th className="px-3 py-2 text-center"></th>
                      <th className="px-3 py-2 text-right">Precio nuevo</th>
                      <th className="px-3 py-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.afectados.map((af) => {
                      const diff = af.precio_nuevo - af.precio_anterior
                      const up = diff > 0
                      return (
                        <tr key={af.producto_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{af.codigo}</td>
                          <td className="px-3 py-2 font-medium">{af.descripcion}</td>
                          <td className="px-3 py-2 text-right text-gray-500">${af.precio_anterior.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{ARROW}</td>
                          <td className="px-3 py-2 text-right font-semibold">${af.precio_nuevo.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                            {up ? '+' : ''}{diff.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !preview || preview.total === 0}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {applying ? 'Aplicando...' : preview ? `Aplicar ${preview.total} cambio${preview.total !== 1 ? 's' : ''}` : 'Aplicar cambios'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
