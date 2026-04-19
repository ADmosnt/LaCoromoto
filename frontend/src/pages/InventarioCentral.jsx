import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getInventario, getEntradas } from '../api'
import EntradaInventarioModal from '../components/EntradaInventarioModal'

export default function InventarioCentral() {
  const [inventario, setInventario] = useState([])
  const [entradas, setEntradas] = useState([])
  const [tab, setTab] = useState('stock')
  const [modalOpen, setModalOpen] = useState(false)

  const load = () => {
    getInventario().then((r) => setInventario(r.data)).catch(() => toast.error('Error al cargar inventario'))
    getEntradas().then((r) => setEntradas(r.data)).catch(() => toast.error('Error al cargar entradas'))
  }

  useEffect(() => { load() }, [])

  const totalUds = inventario.reduce((s, i) => s + i.cantidad_unidades, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">Inventario Central (Almacén)</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Registrar entrada
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['stock', 'entradas'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md font-medium ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'stock' ? 'Stock actual' : 'Historial de entradas'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Grupo</th>
                <th className="px-4 py-3 text-center">Uds/Bulto</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-center">Uds. sueltas</th>
                <th className="px-4 py-3 text-center">Total uds.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventario.map((i) => (
                <tr key={i.id} className={`hover:bg-gray-50 ${i.cantidad_unidades === 0 ? 'text-gray-400' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{i.codigo}</td>
                  <td className="px-4 py-3 font-medium">{i.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{i.grupo}</td>
                  <td className="px-4 py-3 text-center">{i.unidades_por_bulto}</td>
                  <td className="px-4 py-3 text-center font-medium">{i.bultos}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{i.unidades_sueltas}</td>
                  <td className={`px-4 py-3 text-center font-bold ${i.cantidad_unidades === 0 ? 'text-red-400' : 'text-gray-800'}`}>
                    {i.cantidad_unidades}
                  </td>
                </tr>
              ))}
              {inventario.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay productos en inventario.{' '}
                    <button onClick={() => setModalOpen(true)} className="text-blue-600 hover:underline">
                      Registrar primera entrada.
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            {inventario.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold text-sm">Total unidades en almacén:</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{totalUds}</td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
      )}

      {tab === 'entradas' && (
        <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Cantidad (uds)</th>
                <th className="px-4 py-3 text-center">Bultos</th>
                <th className="px-4 py-3 text-left">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entradas.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{e.fecha}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.codigo}</td>
                  <td className="px-4 py-3 font-medium">{e.descripcion}</td>
                  <td className="px-4 py-3 text-center font-medium">{e.cantidad_unidades}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{e.bultos}</td>
                  <td className="px-4 py-3 text-gray-500">{e.nota}</td>
                </tr>
              ))}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin entradas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <EntradaInventarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
