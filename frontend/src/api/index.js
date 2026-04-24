import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({ baseURL: '/api' })

let _unauthorizedHandler = null
export const setUnauthorizedHandler = (fn) => { _unauthorizedHandler = fn }

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      toast.error('Sin conexión. Verifica tu red e intenta de nuevo.')
      return Promise.reject(err)
    }
    if (err.response.status === 401 && !err.config.url?.endsWith('/auth/login')) {
      if (_unauthorizedHandler) _unauthorizedHandler()
    }
    return Promise.reject(err)
  }
)

// Config empresa
export const getConfig = () => api.get('/config')
export const updateConfig = (data) => api.put('/config', data)

// Dashboard
export const getDashboard = (params) => api.get('/dashboard', { params })

// Tasas BCV
export const getTasas = () => api.get('/tasas')
export const getTasaHoy = () => api.get('/tasas/hoy')
export const saveTasa = (data) => api.post('/tasas', data)
export const scrapeTasa = () => api.post('/tasas/scrape')

// Zonas
export const getZonas = () => api.get('/zonas')
export const createZona = (data) => api.post('/zonas', data)
export const updateZona = (id, data) => api.put(`/zonas/${id}`, data)
export const deleteZona = (id) => api.delete(`/zonas/${id}`)

// Grupos Clientes
export const getGruposClientes = () => api.get('/grupos-clientes')
export const createGrupoCliente = (data) => api.post('/grupos-clientes', data)
export const updateGrupoCliente = (id, data) => api.put(`/grupos-clientes/${id}`, data)
export const deleteGrupoCliente = (id) => api.delete(`/grupos-clientes/${id}`)

// Grupos Productos
export const getGruposProductos = () => api.get('/grupos-productos')
export const createGrupoProducto = (data) => api.post('/grupos-productos', data)
export const updateGrupoProducto = (id, data) => api.put(`/grupos-productos/${id}`, data)
export const deleteGrupoProducto = (id) => api.delete(`/grupos-productos/${id}`)

// Listas de Precios
export const getListasPrecios = () => api.get('/listas-precios')
export const createListaPrecio = (data) => api.post('/listas-precios', data)
export const updateListaPrecio = (id, data) => api.put(`/listas-precios/${id}`, data)
export const deleteListaPrecio = (id) => api.delete(`/listas-precios/${id}`)

// Clientes
export const getClientes = (params) => api.get('/clientes', { params })
export const getCliente = (id) => api.get(`/clientes/${id}`)
export const createCliente = (data) => api.post('/clientes', data)
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data)
export const deleteCliente = (id) => api.delete(`/clientes/${id}`)
export const reactivarCliente = (id) => api.post(`/clientes/${id}/reactivar`)
export const getClienteStock = (id) => api.get(`/clientes/${id}/stock`)
export const getGrupoConsolidado = (grupoId) => api.get(`/clientes/grupos/${grupoId}/consolidado`)

// Productos
export const getProductos = (params) => api.get('/productos', { params })
export const getProducto = (id) => api.get(`/productos/${id}`)
export const createProducto = (data) => api.post('/productos', data)
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data)
export const deleteProducto = (id) => api.delete(`/productos/${id}`)
export const reactivarProducto = (id) => api.post(`/productos/${id}/reactivar`)
export const ajustePrecios = (data) => api.post('/productos/precios/ajuste', data)

// Órdenes de Despacho
export const getOrdenes = (params) => api.get('/ordenes', { params })
export const getOrden = (id) => api.get(`/ordenes/${id}`)
export const createOrden = (data) => api.post('/ordenes', data)
export const anularOrden = (id) => api.put(`/ordenes/${id}/anular`)
export const downloadOrdenPDF = (id) =>
  api.get(`/ordenes/${id}/pdf`, { responseType: 'blob' })

// Inventario Central
export const getInventario = () => api.get('/inventario')
export const getEntradas = (params) => api.get('/inventario/entradas', { params })
export const createEntrada = (data) => api.post('/inventario/entradas', data)

// Reportes de Venta
export const getReportesVenta = (params) => api.get('/reportes-venta', { params })
export const getReporteVenta = (id) => api.get(`/reportes-venta/${id}`)
export const createReporteVenta = (data) => api.post('/reportes-venta', data)
export const confirmarReporteVenta = (id) => api.put(`/reportes-venta/${id}/confirmar`)

// Devoluciones
export const getDevoluciones = (params) => api.get('/devoluciones', { params })
export const getDevolucion = (id) => api.get(`/devoluciones/${id}`)
export const createDevolucion = (data) => api.post('/devoluciones', data)

// Auth
export const authLogin = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.put('/auth/me/password', data)
export const setupRecovery = () => api.post('/auth/setup-recovery')
export const recoverPassword = (data) => api.post('/auth/recover', data)

// Admin
export const exportData = () => api.get('/admin/export', { responseType: 'blob' })

// Usuarios (admin)
export const getUsuarios = () => api.get('/usuarios')
export const createUsuario = (data) => api.post('/usuarios', data)
export const updateUsuario = (id, data) => api.put(`/usuarios/${id}`, data)
export const deleteUsuario = (id) => api.delete(`/usuarios/${id}`)
