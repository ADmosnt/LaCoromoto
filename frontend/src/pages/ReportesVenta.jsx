import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReportesVenta, confirmarReporteVenta, getClientes } from '../api'
import Alert from '../components/Alert'
import PageHeader from '../components/PageHeader'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

export default function ReportesVenta() {
  const [reportes, setReportes] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    getReportesVenta({ cliente_id: clienteId || undefined, status: status || undefined })
      .then((r) => setReportes(r.data))
      .catch(() => setError('Error al cargar reportes'))

  useEffect(() => { getClientes({ activo: true }).then((r) => setClientes(r.data)) }, [])
  useEffect(() => { load() }, [clienteId, status])

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar este reporte? Se descontará del stock en consignación.')) return
    try {
      await confirmarReporteVenta(id)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al confirmar')
    }
  }

  return (
    <div>
      <PageHeader title="Reportes de Venta" />
      <Alert type="error" message={error} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-3">
          <Select
            nullable
            noneLabel="Todos los clientes"
            value={clienteId}
            onChange={setClienteId}
            options={clientes.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            className="w-56"
          />
          <Select
            nullable
            noneLabel="Todos los estados"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmado', label: 'Confirmado' },
            ]}
            className="w-44"
          />
        </div>
        {reportes.length === 0 ? (
          <EmptyState message="No hay reportes registrados" />
        ) : (
          <Table borderless>
            <Table.Head>
              <Table.Row>
                <Table.Th>ID</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th align="right">Total USD</Table.Th>
                <Table.Th align="right">Total Bs.</Table.Th>
                <Table.Th align="center">Estado</Table.Th>
                <Table.Th align="center">Acciones</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {reportes.map((r) => (
                <Table.Row key={r.id} className="hover:bg-brand-50">
                  <Table.Td className="text-gray-500">#{r.id}</Table.Td>
                  <Table.Td className="font-medium">{r.cliente}</Table.Td>
                  <Table.Td>{r.fecha}</Table.Td>
                  <Table.Td align="right">${Number(r.total_usd).toFixed(2)}</Table.Td>
                  <Table.Td align="right">Bs. {Number(r.total_bs).toFixed(2)}</Table.Td>
                  <Table.Td align="center"><StatusBadge status={r.status} /></Table.Td>
                  <Table.Td align="center" className="space-x-2">
                    <Link to={`/reportes-venta/${r.id}`} className="text-brand-600 hover:underline text-xs">Ver</Link>
                    {r.status === 'pendiente' && (
                      <button onClick={() => handleConfirmar(r.id)} className="text-brand-600 hover:underline text-xs">
                        Confirmar
                      </button>
                    )}
                  </Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  )
}
