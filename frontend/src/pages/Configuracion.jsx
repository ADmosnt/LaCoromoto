import { useEffect, useState } from 'react'
import {
  getConfig, updateConfig,
  getTasas, saveTasa, scrapeTasa,
  getZonas, createZona, updateZona, deleteZona,
  getGruposClientes, createGrupoCliente, updateGrupoCliente, deleteGrupoCliente,
  getGruposProductos, createGrupoProducto, updateGrupoProducto, deleteGrupoProducto,
  getListasPrecios, createListaPrecio, updateListaPrecio, deleteListaPrecio,
} from '../api'
import Alert from '../components/Alert'

function CatalogSection({ title, items, onCreate, onUpdate, onDelete }) {
  const [input, setInput] = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')

  const handleCreate = async () => {
    if (!input.trim()) return
    await onCreate({ nombre: input.trim() })
    setInput('')
  }

  const handleUpdate = async (id) => {
    await onUpdate(id, { nombre: editVal })
    setEditId(null)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 font-medium text-sm border-b">{title}</div>
      <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editId === item.id ? (
              <>
                <input value={editVal} onChange={(e) => setEditVal(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm" />
                <button onClick={() => handleUpdate(item.id)} className="text-xs text-green-600 hover:underline">Guardar</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{item.nombre}</span>
                <button onClick={() => { setEditId(item.id); setEditVal(item.nombre) }} className="text-xs text-blue-600 hover:underline">Editar</button>
                <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 py-2">Sin registros</p>}
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nombre..."
          className="flex-1 border rounded px-2 py-1.5 text-sm"
        />
        <button onClick={handleCreate} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">+</button>
      </div>
    </div>
  )
}

export default function Configuracion() {
  const [config, setConfig] = useState({ nombre: '', rif: '', direccion: '', ciudad: '' })
  const [tasas, setTasas] = useState([])
  const [tasaFecha, setTasaFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tasaValor, setTasaValor] = useState('')
  const [zonas, setZonas] = useState([])
  const [gruposClientes, setGruposClientes] = useState([])
  const [gruposProductos, setGruposProductos] = useState([])
  const [listasPrecios, setListasPrecios] = useState([])
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [scraping, setScraping] = useState(false)

  const loadAll = () => {
    getConfig().then((r) => setConfig(r.data))
    getTasas().then((r) => setTasas(r.data))
    getZonas().then((r) => setZonas(r.data))
    getGruposClientes().then((r) => setGruposClientes(r.data))
    getGruposProductos().then((r) => setGruposProductos(r.data))
    getListasPrecios().then((r) => setListasPrecios(r.data))
  }
  useEffect(() => { loadAll() }, [])

  const saveConfig = async (e) => {
    e.preventDefault()
    await updateConfig(config)
    setMsg({ type: 'success', text: 'Configuración guardada' })
    setTimeout(() => setMsg({}), 3000)
  }

  const saveTasaHandler = async () => {
    if (!tasaValor) return
    await saveTasa({ fecha: tasaFecha, valor: Number(tasaValor) })
    setTasaValor('')
    getTasas().then((r) => setTasas(r.data))
    setMsg({ type: 'success', text: 'Tasa guardada' })
    setTimeout(() => setMsg({}), 3000)
  }

  const handleScrape = async () => {
    setScraping(true)
    try {
      const r = await scrapeTasa()
      getTasas().then((d) => setTasas(d.data))
      setMsg({ type: 'success', text: `Tasa obtenida del BCV: Bs. ${Number(r.data.valor).toFixed(4)}` })
    } catch {
      setMsg({ type: 'error', text: 'No se pudo obtener la tasa del BCV. Ingrésela manualmente.' })
    } finally {
      setScraping(false)
      setTimeout(() => setMsg({}), 5000)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Configuración</h2>
      {msg.text && <Alert type={msg.type} message={msg.text} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Empresa */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Datos de la empresa</h3>
          <form onSubmit={saveConfig} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social</label>
              <input className={inp} value={config.nombre} onChange={(e) => setConfig({ ...config, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RIF</label>
              <input className={inp} value={config.rif} onChange={(e) => setConfig({ ...config, rif: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <textarea className={inp} rows={2} value={config.direccion} onChange={(e) => setConfig({ ...config, direccion: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input className={inp} value={config.ciudad} onChange={(e) => setConfig({ ...config, ciudad: e.target.value })} required />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700">Guardar</button>
          </form>
        </div>

        {/* Tasas BCV */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Tasa BCV</h3>
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={tasaFecha} onChange={(e) => setTasaFecha(e.target.value)} />
              <input type="number" step="0.0001" min={0} placeholder="Bs. por USD"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
                value={tasaValor} onChange={(e) => setTasaValor(e.target.value)} />
              <button onClick={saveTasaHandler} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                Guardar
              </button>
            </div>
            <button onClick={handleScrape} disabled={scraping}
              className="w-full border border-blue-300 text-blue-600 text-sm py-2 rounded hover:bg-blue-50 disabled:opacity-50">
              {scraping ? 'Consultando BCV...' : '↻ Obtener tasa del BCV automáticamente'}
            </button>
          </div>
          <div className="overflow-y-auto max-h-48 border rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Bs./USD</th>
                  <th className="px-3 py-2 text-center">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">{t.fecha}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(t.valor).toFixed(4)}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{t.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catálogos */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CatalogSection title="Zonas" items={zonas}
            onCreate={async (d) => { await createZona(d); getZonas().then((r) => setZonas(r.data)) }}
            onUpdate={async (id, d) => { await updateZona(id, d); getZonas().then((r) => setZonas(r.data)) }}
            onDelete={async (id) => { await deleteZona(id); getZonas().then((r) => setZonas(r.data)) }}
          />
          <CatalogSection title="Grupos de clientes" items={gruposClientes}
            onCreate={async (d) => { await createGrupoCliente(d); getGruposClientes().then((r) => setGruposClientes(r.data)) }}
            onUpdate={async (id, d) => { await updateGrupoCliente(id, d); getGruposClientes().then((r) => setGruposClientes(r.data)) }}
            onDelete={async (id) => { await deleteGrupoCliente(id); getGruposClientes().then((r) => setGruposClientes(r.data)) }}
          />
          <CatalogSection title="Grupos de productos" items={gruposProductos}
            onCreate={async (d) => { await createGrupoProducto(d); getGruposProductos().then((r) => setGruposProductos(r.data)) }}
            onUpdate={async (id, d) => { await updateGrupoProducto(id, d); getGruposProductos().then((r) => setGruposProductos(r.data)) }}
            onDelete={async (id) => { await deleteGrupoProducto(id); getGruposProductos().then((r) => setGruposProductos(r.data)) }}
          />
          <CatalogSection title="Listas de precios" items={listasPrecios}
            onCreate={async (d) => { await createListaPrecio(d); getListasPrecios().then((r) => setListasPrecios(r.data)) }}
            onUpdate={async (id, d) => { await updateListaPrecio(id, d); getListasPrecios().then((r) => setListasPrecios(r.data)) }}
            onDelete={async (id) => { await deleteListaPrecio(id); getListasPrecios().then((r) => setListasPrecios(r.data)) }}
          />
        </div>
      </div>
    </div>
  )
}
