import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import Label from './Label'

export default function Checkbox({ id, checked, onCheckedChange, label, disabled, className }) {
  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded border border-gray-300 bg-white transition-colors',
          'hover:border-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
          'data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          className,
        )}
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center">
          <Check size={11} className="text-white" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <Label htmlFor={id} className="font-normal cursor-pointer">
          {label}
        </Label>
      )}
    </div>
  )
}
