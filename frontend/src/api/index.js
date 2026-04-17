import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Config empresa
export const getConfig = () => api.get('/config')
export const updateConfig = (data) => api.put('/config', data)

// Dashboard
export const getDashboard = () => api.get('/dashboard')

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
export const getClienteStock = (id) => api.get(`/clientes/${id}/stock`)

// Productos
export const getProductos = (params) => api.get('/productos', { params })
export const getProducto = (id) => api.get(`/productos/${id}`)
export const createProducto = (data) => api.post('/productos', data)
export const updateProducto = (id, data) => api.put(`/productos/${id}`, data)
export const deleteProducto = (id) => api.delete(`/productos/${id}`)

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
