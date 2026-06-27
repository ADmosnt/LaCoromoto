export default function PageHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      {title && <h2 className="font-display text-2xl font-bold text-ink tracking-tight">{title}</h2>}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
