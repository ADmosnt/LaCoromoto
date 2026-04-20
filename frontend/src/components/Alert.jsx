export default function Alert({ type = 'error', message }) {
  if (!message) return null
  const styles = {
    error: 'bg-red-50 border-red-400 text-red-700',
    success: 'bg-green-50 border-green-400 text-green-700',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-700',
  }
  return (
    <div className={`border-l-4 p-3 mb-4 text-sm rounded ${styles[type]}`}>
      {message}
    </div>
  )
}
