import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HelpTooltip } from '../components/ui/Tooltip'
import {
  getConfig, updateConfig,
  getTasas, saveTasa, scrapeTasa,
  getZonas, createZona, updateZona, deleteZona,
  getGruposClientes, createGrupoCliente, updateGrupoCliente, deleteGrupoCliente,
  getGruposProductos, createGrupoProducto, updateGrupoProducto, deleteGrupoProducto,
  getListasPrecios, createListaPrecio, updateListaPrecio, deleteListaPrecio,
  changePassword, setupRecovery, exportData, importData,
} from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

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
  const [scraping, setScraping] = useState(false)

  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pwForm, setPwForm] = useState({ current_password: '', new_username: '', new_password: '', confirm_password: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState(null)

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
    try {
      await updateConfig(config)
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar la configuración')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password && pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }
    setPwLoading(true)
    try {
      await changePassword({
        current_password: pwForm.current_password,
        new_username: pwForm.new_username || undefined,
        new_password: pwForm.new_password || undefined,
      })
      toast.success('Credenciales actualizadas')
      setPwForm({ current_password: '', new_username: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al actualizar credenciales')
    } finally {
      setPwLoading(false)
    }
  }

  const handleGenerateRecovery = async () => {
    if (!confirm('Se generará un nuevo código de recuperación. El anterior (si existe) quedará inválido. ¿Continuar?')) return
    setGeneratingCode(true)
    try {
      const r = await setupRecovery()
      setRecoveryCode(r.data.code)
    } catch {
      toast.error('Error al generar el código')
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportData()
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/json' }))
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `lacoromoto_backup_${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup descargado')
    } catch {
      toast.error('Error al exportar los datos')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (backup?.version !== '1' || !backup?.data) {
        toast.error('El archivo no parece ser un backup válido de LaCoromoto')
        return
      }
      const counts = {
        clientes: backup.data.clientes?.length ?? 0,
        productos: backup.data.productos?.length ?? 0,
        ordenes: backup.data.ordenes_despacho?.length ?? 0,
        usuarios: backup.data.usuarios?.length ?? 0,
      }
      setImportPreview({ backup, counts, fecha: backup.exported_at })
    } catch {
      toast.error('No se pudo leer el archivo JSON')
    }
  }

  const confirmImport = async () => {
    if (!importPreview) return
    setImporting(true)
    try {
      await importData({ confirm: true, backup: importPreview.backup })
      toast.success('Datos restaurados. Inicia sesión nuevamente.')
      setImportPreview(null)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al importar los datos')
    } finally {
      setImporting(false)
    }
  }

  const saveTasaHandler = async () => {
    if (!tasaValor) return
    try {
      await saveTasa({ fecha: tasaFecha, valor: Number(tasaValor) })
      setTasaValor('')
      getTasas().then((r) => setTasas(r.data))
      toast.success('Tasa guardada')
    } catch {
      toast.error('Error al guardar la tasa')
    }
  }

  const handleScrape = async () => {
    setScraping(true)
    try {
      const r = await scrapeTasa()
      getTasas().then((d) => setTasas(d.data))
      toast.success(`Tasa obtenida del BCV: Bs. ${Number(r.data.valor).toFixed(4)}`)
    } catch {
      toast.error('No se pudo obtener la tasa del BCV. Ingrésela manualmente.')
    } finally {
      setScraping(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Configuración</h2>

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
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            Tasa BCV
            <HelpTooltip text="El sistema usa automáticamente la tasa más reciente para calcular los totales en bolívares. Si no hay tasa registrada para el día de hoy, usa la última disponible." side="right" />
          </h3>
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full sm:w-auto"
                value={tasaFecha} onChange={(e) => setTasaFecha(e.target.value)} />
              <input type="number" step="0.0001" min={0} placeholder="Bs. por USD"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full sm:flex-1"
                value={tasaValor} onChange={(e) => setTasaValor(e.target.value)} />
              <button onClick={saveTasaHandler} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 w-full sm:w-auto shrink-0">
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

      {/* Mi cuenta */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-1">Mi cuenta</h3>
          <p className="text-xs text-gray-400 mb-4">Usuario actual: <span className="font-mono font-medium text-gray-600">{user?.username}</span></p>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña actual *</label>
              <input type="password" className={inp} required
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuevo usuario (dejar en blanco para no cambiar)</label>
              <input className={inp} placeholder={user?.username}
                value={pwForm.new_username}
                onChange={(e) => setPwForm({ ...pwForm, new_username: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña (dejar en blanco para no cambiar)</label>
              <input type="password" className={inp}
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
            </div>
            {pwForm.new_password && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar nueva contraseña</label>
                <input type="password" className={inp}
                  value={pwForm.confirm_password}
                  onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
              </div>
            )}
            <button type="submit" disabled={pwLoading}
              className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {pwLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-1">Código de recuperación</h3>
          <p className="text-xs text-gray-500 mb-4">
            Si olvidas tu contraseña, puedes usar este código para restablecerla sin necesidad de correo electrónico.
            Guárdalo en un lugar seguro — solo se muestra una vez.
          </p>
          {recoveryCode ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-3">
              <p className="text-xs font-medium text-amber-700 mb-2">Copia este código ahora. No se mostrará de nuevo:</p>
              <code className="block text-sm font-mono bg-white border border-amber-300 rounded px-3 py-2 break-all select-all">
                {recoveryCode}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(recoveryCode); toast.success('Copiado') }}
                className="mt-2 text-xs text-amber-700 hover:underline">
                Copiar al portapapeles
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-md p-3 mb-3 text-xs text-gray-500">
              {user?.has_recovery_code ? '✓ Tienes un código activo generado.' : 'No tienes código de recuperación aún.'}
            </div>
          )}
          <button onClick={handleGenerateRecovery} disabled={generatingCode}
            className="w-full border border-gray-300 text-gray-700 text-sm py-2 rounded-md hover:bg-gray-50 disabled:opacity-50">
            {generatingCode ? 'Generando...' : recoveryCode ? 'Generar nuevo código' : 'Generar código de recuperación'}
          </button>
        </div>
      </div>

      {/* Datos y respaldo */}
      <div className="mt-6 bg-white rounded-lg shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-1">Datos y respaldo</h3>
        <p className="text-xs text-gray-500 mb-4">
          Descarga una copia completa de todos los datos en formato JSON, o restaura desde un backup previo.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
            {exporting ? 'Preparando...' : '↓ Descargar backup JSON'}
          </button>
          <label className="border border-amber-400 text-amber-700 hover:bg-amber-50 text-sm font-medium px-4 py-2 rounded-md cursor-pointer">
            ↑ Restaurar desde backup
            <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Modal de confirmación de import */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">⚠ Restaurar backup</h3>
            <p className="text-sm text-gray-700 mb-4">
              Esta acción <strong>borrará TODOS los datos actuales</strong> y los reemplazará con los del archivo. No se puede deshacer.
            </p>
            <div className="bg-gray-50 rounded-md p-3 mb-4 text-xs space-y-1">
              <p><strong>Fecha del backup:</strong> {new Date(importPreview.fecha).toLocaleString()}</p>
              <p><strong>Clientes:</strong> {importPreview.counts.clientes}</p>
              <p><strong>Productos:</strong> {importPreview.counts.productos}</p>
              <p><strong>Órdenes:</strong> {importPreview.counts.ordenes}</p>
              <p><strong>Usuarios:</strong> {importPreview.counts.usuarios}</p>
            </div>
            <p className="text-xs text-amber-700 mb-4">
              Después de restaurar, deberás iniciar sesión nuevamente con las credenciales del backup.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportPreview(null)} disabled={importing}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmImport} disabled={importing}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {importing ? 'Restaurando...' : 'Sí, restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
