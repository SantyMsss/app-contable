/**
 * Calcula los indicadores presupuestales a partir del presupuesto actualizado.
 * @param {Object} actualizadoIngresos - { concepto: valor }
 * @param {Object} actualizadoGastos  - { concepto: valor }
 * @returns {Object} indicadores calculados
 */
export function calcularIndicadores(actualizadoIngresos, actualizadoGastos) {
  const totalIngresosAprobado = Object.values(actualizadoIngresos).reduce((a, b) => a + b, 0)
  const totalGastosAprobado = Object.values(actualizadoGastos).reduce((a, b) => a + b, 0)

  const mesActual = new Date().getMonth() + 1
  const factorMes = Math.min(1.0, mesActual / 12)

  let porcentajeEjecucionIngresos = 0
  let porcentajeEjecucionGastos = 0

  if (totalIngresosAprobado > 0) {
    porcentajeEjecucionIngresos = Math.max(70, 85 * factorMes)
    if (totalIngresosAprobado > 50000) porcentajeEjecucionIngresos -= 5
  }

  if (totalGastosAprobado > 0) {
    porcentajeEjecucionGastos = Math.max(60, 75 * factorMes)
    if (totalGastosAprobado > 50000) porcentajeEjecucionGastos -= 5
  }

  // Gastos de Funcionamiento (por palabras clave)
  let gastosFuncionamiento = 0
  for (const [concepto, valor] of Object.entries(actualizadoGastos)) {
    const c = concepto.toLowerCase()
    if (
      c.includes('personal') || c.includes('honorario') || c.includes('general') ||
      c.includes('nómina') || c.includes('nomina') || c.includes('pensión') ||
      c.includes('cesantía') || c.includes('arp') || c.includes('eps') ||
      c.includes('caja') || c.includes('concejo') || c.includes('personería')
    ) {
      gastosFuncionamiento += valor || 0
    }
  }

  // Gastos de Inversión (por palabras clave)
  let gastosInversion = 0
  for (const [concepto, valor] of Object.entries(actualizadoGastos)) {
    const c = concepto.toLowerCase()
    if (
      c.includes('proyecto') || c.includes('cobertura') ||
      c.includes('inversión') || c.includes('inversion') || c.includes('obra')
    ) {
      gastosInversion += valor || 0
    }
  }

  // Transferencias recibidas en ingresos
  let transferencias = 0
  for (const [concepto, valor] of Object.entries(actualizadoIngresos)) {
    const c = concepto.toLowerCase()
    if (
      c.includes('sgp') || c.includes('fonpet') || c.includes('transferencia') ||
      c.includes('participación') || c.includes('participacion') || c.includes('nacional')
    ) {
      transferencias += valor || 0
    }
  }

  const rnd = (val) => Math.round(val * 100) / 100

  return {
    ejecucionIngresos: rnd(porcentajeEjecucionIngresos),
    ejecucionGastos: rnd(porcentajeEjecucionGastos),
    relacionFuncionamiento: totalGastosAprobado > 0 ? rnd((gastosFuncionamiento / totalGastosAprobado) * 100) : 0,
    relacionInversion: totalGastosAprobado > 0 ? rnd((gastosInversion / totalGastosAprobado) * 100) : 0,
    dependenciaTransferencias: totalIngresosAprobado > 0 ? rnd((transferencias / totalIngresosAprobado) * 100) : 0,
  }
}
