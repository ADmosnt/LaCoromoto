import { Link } from 'react-router-dom'

export default function KpiCard({ label, value, prefix = '', sub, icon: Icon, to }) {
  const inner = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow h-full relative overflow-hidden">
      {Icon && (
        <Icon className="absolute top-4 right-4 text-brand-100" size={32} strokeWidth={1.5} />
      )}
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="font-display text-3xl font-bold text-ink mt-1 tabular-nums tracking-tight">
        {prefix}{value ?? '—'}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}
