// Utilidades de fecha compartidas: nombres de mes y agrupación por mes.
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// 'YYYY-MM' -> 'Mes Año' (ej. '2026-06' -> 'Junio 2026')
export function labelMes(key) {
  const [year, month] = key.split('-')
  return `${MESES[parseInt(month, 10) - 1]} ${year}`
}

// Agrupa una lista por los primeros 7 chars de un campo fecha (YYYY-MM).
// Devuelve [clave, items][] ordenado descendente por clave.
export function groupByMonth(items, dateField = 'fecha_emision') {
  const map = {}
  for (const it of items) {
    const key = (it[dateField] ?? '').slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(it)
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}
