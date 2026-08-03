import * as RadixLabel from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

export default function Label({ className, ...props }) {
  return (
    <RadixLabel.Root
      className={cn('text-sm font-medium text-gray-700', className)}
      {...props}
    />
  )
}
