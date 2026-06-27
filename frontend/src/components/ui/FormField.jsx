import Label from './Label'
import { cn } from '../../lib/utils'

export default function FormField({ label, hint, error, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
