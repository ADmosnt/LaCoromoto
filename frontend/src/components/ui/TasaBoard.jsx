// Elemento de firma de La Coromoto: la tasa BCV del día.

function fmt(valor) {
  const n = Number(valor)
  return Number.isFinite(n)
    ? n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'
}

export default function TasaBoard({ valor, fecha, fuente, size = 'sm', className = '' }) {
  if (valor == null) return null

  if (size === 'lg') {
    return (
      <div className={`bg-brand-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between gap-4 ${className}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-llama-400" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-brand-200 font-medium">
              Tasa del día · Bs/$
            </span>
          </div>
          <p className="font-mono text-llama-400 font-semibold tabular-nums leading-none text-4xl mt-2">
            {fmt(valor)}
          </p>
          {fecha && <p className="text-xs text-brand-200 mt-2">{fecha}</p>}
        </div>
        {fuente && (
          <span className="text-[10px] uppercase tracking-wide bg-brand-800 text-brand-200 px-2.5 py-1 rounded-full self-start">
            {fuente}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-brand-900 rounded-lg pl-2.5 pr-3 py-1.5 inline-flex items-center gap-2 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-llama-400 flex-shrink-0" />
      <span className="text-[10px] uppercase tracking-[0.12em] text-brand-200 font-medium">Bs/$</span>
      <span className="font-mono text-llama-400 font-semibold tabular-nums text-sm leading-none">
        {fmt(valor)}
      </span>
      <span className="text-[10px] text-brand-200/80">hoy</span>
    </div>
  )
}
