import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import Ordenes from './pages/Ordenes'
import ReportesVenta from './pages/ReportesVenta'
import ReporteVentaDetalle from './pages/ReporteVentaDetalle'
import Devoluciones from './pages/Devoluciones'
import Stock from './pages/Stock'
import InventarioCentral from './pages/InventarioCentral'
import Configuracion from './pages/Configuracion'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="productos" element={<Productos />} />
          <Route path="ordenes" element={<Ordenes />} />
          <Route path="reportes-venta" element={<ReportesVenta />} />
          <Route path="reportes-venta/:id" element={<ReporteVentaDetalle />} />
          <Route path="devoluciones" element={<Devoluciones />} />
          <Route path="stock" element={<Stock />} />
          <Route path="inventario" element={<InventarioCentral />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
