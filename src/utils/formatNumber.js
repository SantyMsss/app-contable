export function formatNumber(num) {
  return new Intl.NumberFormat('es-CO').format(Math.round(num))
}
