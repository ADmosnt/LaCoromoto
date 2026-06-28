import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProducto, createProducto, updateProducto,
  getGruposProductos, getListasPrecios,
} from '../api'
import Alert from '../components/Alert'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import FormField from '../components/ui/FormField'

const emptyForm = {
  codigo: '', descripcion: '', unidades_por_bulto: 1,
  grupo_id: '', activo: true, precios: [],
}

export default function ProductoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [grupos, setGrupos] = useState([])
  const [listas, setListas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([getGruposProductos(), getListasPrecios()]).then(([g, l]) => {
      setGrupos(g.data)
      setListas(l.data)
    })
    if (isEdit) {
      getProducto(id).then((r) => {
        const p = r.data
        setForm({ ...p, grupo_id: p.grupo_id ?? '' })
      })
    }
  }, [id])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const setPrecio = (listaId, valor) => {
    const precios = [...form.precios]
    const idx = precios.findIndex((p) => p.lista_id === listaId)
    if (idx >= 0) {
      precios[idx] = { ...precios[idx], precio_usd: valor }
    } else {
      precios.push({ lista_id: listaId, precio_usd: valor })
    }
    set('precios', precios)
  }

  const getPrecio = (listaId) =>
    form.precios.find((p) => p.lista_id === listaId)?.precio_usd ?? ''

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        grupo_id: form.grupo_id || null,
        precios: form.precios.filter((p) => p.precio_usd !== '' && Number(p.precio_usd) > 0),
      }
      if (isEdit) await updateProducto(id, payload)
      else await createProducto(payload)
      nav('/productos')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/productos')} className="text-gray-500 hover:text-gray-700 text-sm">← Volver</button>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
      </div>

      <Alert type="error" message={error} />

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="codigo" label="Código *">
            <Input id="codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required disabled={isEdit} />
          </FormField>
          <FormField id="unidades_por_bulto" label="Unidades por bulto *">
            <Input id="unidades_por_bulto" type="number" min={1} value={form.unidades_por_bulto}
              onChange={(e) => set('unidades_por_bulto', parseInt(e.target.value) || 1)} required />
          </FormField>
        </div>

        <FormField id="descripcion" label="Descripción *">
          <Input id="descripcion" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} required />
        </FormField>

        <FormField id="grupo_id" label="Grupo">
          <Select
            id="grupo_id"
            nullable
            noneLabel="Sin grupo"
            value={form.grupo_id}
            onChange={(val) => set('grupo_id', val)}
            options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
          />
        </FormField>

        {listas.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Precios por lista (USD)</p>
            <div className="space-y-2">
              {listas.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-36">{l.nombre}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-32 py-1.5"
                    value={getPrecio(l.id)}
                    onChange={(e) => setPrecio(l.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => nav('/productos')}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </div>
  )
}
