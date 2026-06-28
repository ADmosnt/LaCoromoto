import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const NONE = '__none__'

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder,
  nullable = false,
  noneLabel = '—',
  error,
  disabled,
  className,
}) {
  const radixValue = (value === '' || value == null)
    ? (nullable ? NONE : undefined)
    : value

  const handleChange = (v) => onChange(v === NONE ? '' : v)

  return (
    <RadixSelect.Root value={radixValue} onValueChange={handleChange} disabled={disabled}>
      <RadixSelect.Trigger
        id={id}
        className={cn(
          'flex items-center justify-between w-full border rounded-lg px-3 py-2.5 text-sm bg-white',
          'transition-colors cursor-pointer',
          'hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          'data-[placeholder]:text-gray-400',
          error
            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400'
            : 'border-gray-300',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0 ml-2" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden',
            'w-[var(--radix-select-trigger-width)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-150',
          )}
        >
          <RadixSelect.Viewport className="p-1 max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-y-auto">
            {nullable && (
              <RadixSelect.Item
                value={NONE}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer outline-none',
                  'text-gray-400 italic hover:bg-brand-50 focus:bg-brand-50',
                )}
              >
                <RadixSelect.ItemText>{noneLabel}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-brand-600" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            )}
            {options.map((opt) => (
              <RadixSelect.Item
                key={String(opt.value)}
                value={String(opt.value)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer outline-none',
                  'hover:bg-brand-50 focus:bg-brand-50',
                  'data-[state=checked]:text-brand-600 data-[state=checked]:font-medium',
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-brand-600" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
