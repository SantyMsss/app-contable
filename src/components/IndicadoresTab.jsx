/**
 * Pestaña 3: Indicadores Presupuestales
 * Muestra los 5 indicadores calculados automáticamente desde el estado.
 */

const INDICADORES_CONFIG = [
  {
    key: 'ejecucionIngresos',
    label: 'Ejecución de Ingresos',
    formula: '(Recaudado / Presupuestado) × 100',
    interpretacion: (v) =>
      v > 90 ? 'Excelente ejecución' : v > 70 ? 'Buena ejecución' : v > 50 ? 'Ejecución regular' : 'Baja ejecución',
  },
  {
    key: 'ejecucionGastos',
    label: 'Ejecución de Gastos',
    formula: '(Ejecutado / Presupuestado) × 100',
    interpretacion: (v) =>
      v > 90 ? 'Excelente ejecución' : v > 70 ? 'Buena ejecución' : v > 50 ? 'Ejecución regular' : 'Baja ejecución',
  },
  {
    key: 'relacionFuncionamiento',
    label: 'Relación Funcionamiento / Gasto Total',
    formula: '(Gastos de Funcionamiento / Gastos Totales) × 100',
    interpretacion: (v) =>
      v > 70
        ? 'Alto gasto en funcionamiento (riesgo)'
        : v > 50
        ? 'Gasto moderado en funcionamiento'
        : 'Bajo gasto en funcionamiento',
  },
  {
    key: 'relacionInversion',
    label: 'Relación Inversión / Gasto Total',
    formula: '(Gastos de Inversión / Gastos Totales) × 100',
    interpretacion: (v) =>
      v > 40 ? 'Alta inversión (positivo)' : v > 20 ? 'Inversión moderada' : 'Baja inversión (riesgo)',
  },
  {
    key: 'dependenciaTransferencias',
    label: 'Dependencia de Transferencias',
    formula: '(Transferencias / Ingresos Totales) × 100',
    interpretacion: (v) =>
      v > 60
        ? 'Alta dependencia de transferencias (riesgo)'
        : v > 30
        ? 'Dependencia moderada de transferencias'
        : 'Baja dependencia de transferencias',
  },
]

export default function IndicadoresTab({ indicadores }) {
  return (
    <>
      <div className="instructions">
        <h3>Indicadores Presupuestales</h3>
        <p>
          A continuación se presentan los principales indicadores calculados automáticamente
          a partir de su presupuesto. Estos indicadores le ayudarán a evaluar la salud
          financiera del municipio.
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Fórmula</th>
            <th>Valor</th>
            <th>Interpretación</th>
          </tr>
        </thead>
        <tbody>
          {INDICADORES_CONFIG.map(({ key, label, formula, interpretacion }) => {
            const valor = indicadores[key] || 0
            return (
              <tr key={key}>
                <td>{label}</td>
                <td>{formula}</td>
                <td>
                  <strong>{valor.toFixed(2)}%</strong>
                </td>
                <td>{interpretacion(valor)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
