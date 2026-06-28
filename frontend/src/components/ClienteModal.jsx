import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/Dialog'
import {
  getCliente, createCliente, updateCliente,
  getZonas, getGruposClientes, getListasPrecios,
} from '../api'
import Alert from './Alert'

const emptyForm = {
  codigo: '', razon_social: '', rif: '', direccion: '',
  zona_id: '', grupo_id: '', contacto: '', cobrador: '',
  vendedor: '', observaciones: '', activo: true,
  telefonos: [''], listas_precios: [],
}

export default function ClienteModal({ open, onClose, clienteId, onSaved }) {
  const isEdit = Boolean(clienteId)
  const [form, setForm] = useState(emptyForm)
  const [zonas, setZonas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('form') // 'form' | 'confirm'

  useEffect(() => {
    if (!open) return
    setError('')
    setStep('form')
    Promise.all([getZonas(), getGruposClientes(), getListasPrecios()]).then(
      ([z, g, l]) => { setZonas(z.data); setGrupos(g.data); setListas(l.data) }
    )
    if (isEdit) {
      getCliente(clienteId).then((r) => {
        const c = r.data
        setForm({ ...c, telefonos: c.telefonos?.length ? c.telefonos : [''], zona_id: c.zona_id ?? '', grupo_id: c.grupo_id ?? '' })
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, clienteId])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))
  const setTel = (i, val) => { const t = [...form.telefonos]; t[i] = val; set('telefonos', t) }
  const addTel = () => set('telefonos', [...form.telefonos, ''])
  const removeTel = (i) => set('telefonos', form.telefonos.filter((_, idx) => idx !== i))
  const toggleLista = (id) => set('listas_precios', form.listas_precios.includes(id) ? form.listas_precios.filter((x) => x !== id) : [...form.listas_precios, id])

  const goConfirm = (e) => {
    e.preventDefault()
    setError('')
    if (!form.codigo.trim() || !form.razon_social.trim()) {
      setError('Código y razón social son requeridos')
      return
    }
    setStep('confirm')
  }

  const doSave = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, codigo: form.codigo.trim(), telefonos: form.telefonos.filter((t) => t.trim()), zona_id: form.zona_id || null, grupo_id: form.grupo_id || null }
      if (isEdit) await updateCliente(clienteId, payload)
      else await createCliente(payload)
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  const nombreZona = zonas.find((z) => String(z.id) === String(form.zona_id))?.nombre
  const nombreGrupo = grupos.find((g) => String(g.id) === String(form.grupo_id))?.nombre
  const nombresListas = listas.filter((l) => form.listas_precios.includes(l.id)).map((l) => l.nombre)
  const telefonosLlenos = form.telefonos.filter((t) => t.trim())

  const SummaryRow = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={
        step === 'confirm'
          ? (isEdit ? 'Confirmar cambios del cliente' : 'Confirmar nuevo cliente')
          : (isEdit ? 'Editar cliente' : 'Nuevo cliente')
      }>
        <Alert type="error" message={error} />

        {step === 'confirm' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Revisa los datos antes de {isEdit ? 'guardar los cambios' : 'crear el cliente'}:
            </p>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <SummaryRow label="Código" value={<span className="font-mono font-medium">{form.codigo.trim()}</span>} />
              <SummaryRow label="Razón social" value={<span className="font-medium">{form.razon_social}</span>} />
              <SummaryRow label="RIF" value={form.rif} />
              <SummaryRow label="Dirección" value={form.direccion} />
              <SummaryRow label="Zona" value={nombreZona} />
              <SummaryRow label="Grupo" value={nombreGrupo} />
              <SummaryRow label="Contacto" value={form.contacto} />
              <SummaryRow label="Cobrador" value={form.cobrador} />
              <SummaryRow label="Vendedor" value={form.vendedor} />
              <SummaryRow label="Teléfonos" value={telefonosLlenos.length ? telefonosLlenos.join(', ') : null} />
              <SummaryRow label="Listas de precios" value={nombresListas.length ? nombresListas.join(', ') : null} />
              <SummaryRow label="Observaciones" value={form.observaciones} />
              <SummaryRow label="Estado" value={form.activo ? 'Activo' : 'Inactivo'} />
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t">
              <button type="button" onClick={() => setStep('form')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                ← Volver a editar
              </button>
              <button type="button" onClick={doSave} disabled={loading} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                {loading ? 'Guardando...' : (isEdit ? 'Confirmar y guardar' : 'Confirmar y crear')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={goConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Código *</label>
                <input className={inp} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required />
                {isEdit && <p className="text-xs text-gray-400 mt-1">Editable. Debe ser único.</p>}
              </div>
              <div>
                <label className={lbl}>RIF</label>
                <input className={inp} value={form.rif ?? ''} onChange={(e) => set('rif', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={lbl}>Razón Social *</label>
              <input className={inp} value={form.razon_social} onChange={(e) => set('razon_social', e.target.value)} required />
            </div>

            <div>
              <label className={lbl}>Dirección</label>
              <textarea className={inp} rows={2} value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Zona</label>
                <select className={inp} value={form.zona_id} onChange={(e) => set('zona_id', e.target.value)}>
                  <option value="">Sin zona</option>
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Grupo</label>
                <select className={inp} value={form.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
                  <option value="">Sin grupo</option>
                  {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Contacto</label>
                <input className={inp} value={form.contacto ?? ''} onChange={(e) => set('contacto', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Cobrador</label>
                <input className={inp} value={form.cobrador ?? ''} onChange={(e) => set('cobrador', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Vendedor</label>
                <input className={inp} value={form.vendedor ?? ''} onChange={(e) => set('vendedor', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={lbl}>Teléfonos</label>
              {form.telefonos.map((tel, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className={inp} value={tel} onChange={(e) => setTel(i, e.target.value)} placeholder="04XX-XXXXXXX" />
                  {form.telefonos.length > 1 && (
                    <button type="button" onClick={() => removeTel(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTel} className="text-sm text-brand-600 hover:underline">+ Agregar teléfono</button>
            </div>

            {listas.length > 0 && (
              <div>
                <label className={lbl}>Listas de precios</label>
                <div className="flex flex-wrap gap-3">
                  {listas.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.listas_precios.includes(l.id)} onChange={() => toggleLista(l.id)} className="rounded" />
                      {l.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={lbl}>Observaciones</label>
              <textarea className={inp} rows={2} value={form.observaciones ?? ''} onChange={(e) => set('observaciones', e.target.value)} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
                Revisar →
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
