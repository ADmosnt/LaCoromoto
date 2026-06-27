import { cn } from '../../lib/utils'

function TableRoot({ children, className, borderless = false }) {
  return (
    <div className={cn(!borderless && 'rounded-lg border border-gray-200 overflow-hidden', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Head({ children }) {
  return <thead>{children}</thead>
}

function Body({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>
}

function Row({ children, onClick, className }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        onClick && 'cursor-pointer hover:bg-gray-50/60 transition-colors',
        className,
      )}
    >
      {children}
    </tr>
  )
}

function Th({ children, align = 'left', className }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'left', className, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-gray-700',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

const Table = Object.assign(TableRoot, { Head, Body, Row, Th, Td })
export default Table
