import { cn } from '../../lib/utils'

export default function Input({ error, className, ...props }) {
  return (
    <input
      className={cn(
        'w-full border rounded-lg px-3 py-2.5 text-sm bg-white transition-colors',
        'placeholder:text-gray-400',
        'hover:border-gray-400',
        'focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20',
        'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
          : 'border-gray-300',
        className,
      )}
      {...props}
    />
  )
}
