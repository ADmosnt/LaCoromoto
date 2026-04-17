import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getCliente, createCliente, updateCliente,
  getZonas, getGruposClientes, getListasPrecios,
} from '../api'
import Alert from '../components/Alert'

const emptyForm = {
  codigo: '', razon_social: '', rif: '', direccion: '',
  zona_id: '', grupo_id: '', contacto: '', cobrador: '',
  vendedor: '', observaciones: '', activo: true,
  telefonos: [''], listas_precios: [],
}

export default function ClienteForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [zonas, setZonas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([getZonas(), getGruposClientes(), getListasPrecios()]).then(
      ([z, g, l]) => {
        setZonas(z.data)
        setGrupos(g.data)
        setListas(l.data)
      }
    )
    if (isEdit) {
      getCliente(id).then((r) => {
        const c = r.data
        setForm({
          ...c,
          telefonos: c.telefonos?.length ? c.telefonos : [''],
          zona_id: c.zona_id ?? '',
          grupo_id: c.grupo_id ?? '',
        })
      })
    }
  }, [id])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const setTel = (i, val) => {
    const tels = [...form.telefonos]
    tels[i] = val
    set('telefonos', tels)
  }
  const addTel = () => set('telefonos', [...form.telefonos, ''])
  const removeTel = (i) => set('telefonos', form.telefonos.filter((_, idx) => idx !== i))

  const toggleLista = (listaId) => {
    const arr = form.listas_precios.includes(listaId)
      ? form.listas_precios.filter((x) => x !== listaId)
      : [...form.listas_precios, listaId]
    set('listas_precios', arr)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        telefonos: form.telefonos.filter((t) => t.trim()),
        zona_id: form.zona_id || null,
        grupo_id: form.grupo_id || null,
      }
      if (isEdit) await updateCliente(id, payload)
      else await createCliente(payload)
      nav('/clientes')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/clientes')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Código *</label>
            <input className={inp} value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required disabled={isEdit} />
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-3 gap-4">
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
          <button type="button" onClick={addTel} className="text-sm text-blue-600 hover:underline">+ Agregar teléfono</button>
        </div>

        {listas.length > 0 && (
          <div>
            <label className={lbl}>Listas de precios</label>
            <div className="flex flex-wrap gap-3">
              {listas.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.listas_precios.includes(l.id)}
                    onChange={() => toggleLista(l.id)}
                    className="rounded"
                  />
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

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => nav('/clientes')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
