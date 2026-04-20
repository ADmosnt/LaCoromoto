import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Dialog({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  )
}

const sizeClass = { md: 'md:max-w-2xl', lg: 'md:max-w-3xl', xl: 'md:max-w-4xl' }

export function DialogContent({ children, title, className, wide = false, size = 'md' }) {
  const maxW = wide ? sizeClass.lg : (sizeClass[size] ?? sizeClass.md)
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className="fixed inset-0 z-40 bg-black/50
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
          duration-200"
      />
      <RadixDialog.Content
        className={cn(
          'fixed z-50 bg-white shadow-xl outline-none flex flex-col',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[92vh]',
          // Desktop: centered modal
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:rounded-xl md:w-full md:max-h-[90vh]',
          maxW,
          // Mobile slide animation
          'data-[state=open]:animate-in data-[state=closed]:animate-out duration-300',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          // Desktop zoom + fade (override slide)
          'md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0',
          'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
          'md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0',
          className,
        )}
      >
        {/* Drag handle — visible on mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b flex-shrink-0">
          <RadixDialog.Title className="text-lg font-bold text-gray-800">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Close className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </RadixDialog.Close>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
