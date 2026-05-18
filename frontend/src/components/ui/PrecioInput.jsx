const VALID = /^-?\d*[.,]?\d*$/
const VALID_POS = /^\d*[.,]?\d*$/

export default function PrecioInput({
  value,
  onChange,
  allowNegative = false,
  className = '',
  ...rest
}) {
  const handleChange = (e) => {
    const v = e.target.value
    const regex = allowNegative ? VALID : VALID_POS
    if (v === '' || regex.test(v)) {
      onChange(v)
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value ?? ''}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  )
}

export const parsePrecio = (s) => {
  if (s === '' || s == null) return null
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const formatPrecio = (n, decimals = 2) => {
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(decimals)
}
