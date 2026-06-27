// Colores por "temperatura de atención", derivados de la paleta de marca:
// neutro = inactivo, maíz = requiere acción, pino = avanzando/cerrado,
// ladrillo = anulado. Una sola fuente de verdad para los estados de orden.
const CONFIG = {
  activa:     { label: 'Activa',                 bg: '#e7ebf0', text: '#3a4a63' },
  pendiente:  { label: 'Pendiente',              bg: '#fbeccb', text: '#8a5a06' },
  parcial:    { label: 'Parcialmente reportada', bg: '#dcebe1', text: '#1f4d3a' },
  confirmado: { label: 'Confirmado',             bg: '#cbe7d1', text: '#15603a' },
  anulada:    { label: 'Anulada',                bg: '#f4d9cf', text: '#8a2f12' },
  devuelta:   { label: 'Devuelta',               bg: '#f0e1cf', text: '#7a4a1e' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, bg: '#f3f4f6', text: '#374151' }
  return (
    <span
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
    >
      {cfg.label}
    </span>
  )
}
