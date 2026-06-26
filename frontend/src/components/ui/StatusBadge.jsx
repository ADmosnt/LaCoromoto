const CONFIG = {
  activa:    { label: 'Activa',                bg: '#e0e7ff', text: '#3730a3' },
  pendiente: { label: 'Pendiente',             bg: '#fef9c3', text: '#854d0e' },
  parcial:   { label: 'Parcialmente reportada', bg: '#ede9fe', text: '#5b21b6' },
  confirmado:{ label: 'Confirmado',            bg: '#dcfce7', text: '#166534' },
  anulada:   { label: 'Anulada',               bg: '#fee2e2', text: '#991b1b' },
  devuelta:  { label: 'Devuelta',              bg: '#ffedd5', text: '#9a3412' },
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
