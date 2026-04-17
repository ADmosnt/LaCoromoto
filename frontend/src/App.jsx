import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteForm from './pages/ClienteForm'
import Productos from './pages/Productos'
import ProductoForm from './pages/ProductoForm'
import Ordenes from './pages/Ordenes'
import OrdenForm from './pages/OrdenForm'
import OrdenDetalle from './pages/OrdenDetalle'
import ReportesVenta from './pages/ReportesVenta'
import ReporteVentaForm from './pages/ReporteVentaForm'
import Devoluciones from './pages/Devoluciones'
import DevolucionForm from './pages/DevolucionForm'
import Stock from './pages/Stock'
import Configuracion from './pages/Configuracion'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/nuevo" element={<ClienteForm />} />
          <Route path="clientes/:id/editar" element={<ClienteForm />} />
          <Route path="productos" element={<Productos />} />
          <Route path="productos/nuevo" element={<ProductoForm />} />
          <Route path="productos/:id/editar" element={<ProductoForm />} />
          <Route path="ordenes" element={<Ordenes />} />
          <Route path="ordenes/nueva" element={<OrdenForm />} />
          <Route path="ordenes/:id" element={<OrdenDetalle />} />
          <Route path="reportes-venta" element={<ReportesVenta />} />
          <Route path="reportes-venta/nuevo" element={<ReporteVentaForm />} />
          <Route path="devoluciones" element={<Devoluciones />} />
          <Route path="devoluciones/nueva" element={<DevolucionForm />} />
          <Route path="stock" element={<Stock />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
