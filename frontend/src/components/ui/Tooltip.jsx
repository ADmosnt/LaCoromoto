import * as RadixTooltip from '@radix-ui/react-tooltip'

export function TooltipProvider({ children }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </RadixTooltip.Provider>
  )
}

export function Tooltip({ text, children, side = 'top' }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>
        {children}
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-[200] max-w-xs rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg leading-relaxed
            data-[state=delayed-open]:animate-in data-[state=closed]:animate-out
            data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0
            data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95
            data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2"
        >
          {text}
          <RadixTooltip.Arrow className="fill-gray-800" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}

export function HelpTooltip({ text, side }) {
  return (
    <Tooltip text={text} side={side}>
      <button
        type="button"
        tabIndex={-1}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold hover:bg-gray-300 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ml-1 cursor-help leading-none flex-shrink-0"
        aria-label="Ayuda"
      >
        ?
      </button>
    </Tooltip>
  )
}
