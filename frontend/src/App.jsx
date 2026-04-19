import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
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
import Usuarios from './pages/Usuarios'
import MisOrdenes from './pages/MisOrdenes'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            {/* Admin routes */}
            <Route path="dashboard" element={<RequireAuth role="admin"><Dashboard /></RequireAuth>} />
            <Route path="clientes" element={<RequireAuth role="admin"><Clientes /></RequireAuth>} />
            <Route path="productos" element={<RequireAuth role="admin"><Productos /></RequireAuth>} />
            <Route path="ordenes" element={<RequireAuth role="admin"><Ordenes /></RequireAuth>} />
            <Route path="reportes-venta" element={<RequireAuth role="admin"><ReportesVenta /></RequireAuth>} />
            <Route path="reportes-venta/:id" element={<RequireAuth role="admin"><ReporteVentaDetalle /></RequireAuth>} />
            <Route path="devoluciones" element={<RequireAuth role="admin"><Devoluciones /></RequireAuth>} />
            <Route path="stock" element={<RequireAuth role="admin"><Stock /></RequireAuth>} />
            <Route path="inventario" element={<RequireAuth role="admin"><InventarioCentral /></RequireAuth>} />
            <Route path="configuracion" element={<RequireAuth role="admin"><Configuracion /></RequireAuth>} />
            <Route path="usuarios" element={<RequireAuth role="admin"><Usuarios /></RequireAuth>} />
            {/* Client routes */}
            <Route path="mis-ordenes" element={<MisOrdenes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
