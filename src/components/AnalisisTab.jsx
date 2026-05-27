import { generarPDF } from '../utils/generarPDF.js'
import { CATEGORIAS_INGRESO, CATEGORIAS_GASTO } from '../utils/constants.js'

function getRecomendaciones(indicadores) {
  const rec = []
  if ((indicadores.ejecucionIngresos || 0) < 70) {
    rec.push('Considerar estrategias para mejorar el recaudo de ingresos, como fortalecer la gestión de cobro o revisar tarifas.')
  }
  if ((indicadores.ejecucionGastos || 0) < 60) {
    rec.push('Analizar las causas de la baja ejecución del gasto y revisar los procesos de contratación y ejecución.')
  }
  if ((indicadores.relacionFuncionamiento || 0) > 70) {
    rec.push('Evaluar oportunidades de eficiencia en gastos de funcionamiento para liberar recursos hacia inversión.')
  }
  if ((indicadores.relacionInversion || 0) < 20) {
    rec.push('Priorizar la asignación de recursos a proyectos de inversión que generen desarrollo en el municipio.')
  }
  if ((indicadores.dependenciaTransferencias || 0) > 60) {
    rec.push('Diversificar fuentes de ingresos propios para reducir la dependencia de transferencias nacionales.')
  }
  return rec
}

/**
 * Pestaña 4: Análisis Presupuestal
 * - Área de texto para el análisis cualitativo
 * - Resumen de indicadores
 * - Recomendaciones automáticas
 * - Botón para generar PDF
 */
export default function AnalisisTab({
  analisis,
  setAnalisis,
  indicadores,
  itemsIngreso,
  itemsGasto,
  proyeccionIngresos,
  proyeccionGastos,
  actualizadoIngresos,
  actualizadoGastos,
  modificaciones,
}) {
  const recomendaciones = getRecomendaciones(indicadores)

  const handleGenerarPDF = () => {
    generarPDF({
      itemsIngreso,
      itemsGasto,
      proyeccionIngresos,
      proyeccionGastos,
      actualizadoIngresos,
      actualizadoGastos,
      modificaciones,
      indicadores,
      analisis,
      CATEGORIAS_INGRESO,
      CATEGORIAS_GASTO,
    })
  }

  return (
    <>
      <div className="instructions">
        <h3>Análisis Presupuestal</h3>
        <p>
          Realice aquí su análisis cualitativo del comportamiento presupuestal basado en los
          indicadores calculados. Considere aspectos como sostenibilidad financiera,
          priorización de gastos y dependencia de transferencias.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="analisis-texto">Análisis:</label>
        <textarea
          id="analisis-texto"
          className="form-control"
          rows="15"
          placeholder="Escriba aquí su análisis..."
          value={analisis}
          onChange={(e) => setAnalisis(e.target.value)}
        />
      </div>

      <div className="form-group">
        <button className="btn-exportar" onClick={handleGenerarPDF}>
          📄 Generar Reporte PDF
        </button>
      </div>

      {/* Resumen de Indicadores */}
      <h3>Resumen de Indicadores</h3>
      <ul>
        <li>
          <strong>Ejecución de Ingresos:</strong>{' '}
          {(indicadores.ejecucionIngresos || 0).toFixed(2)}%
        </li>
        <li>
          <strong>Ejecución de Gastos:</strong>{' '}
          {(indicadores.ejecucionGastos || 0).toFixed(2)}%
        </li>
        <li>
          <strong>Gasto en Funcionamiento:</strong>{' '}
          {(indicadores.relacionFuncionamiento || 0).toFixed(2)}% del gasto total
        </li>
        <li>
          <strong>Gasto en Inversión:</strong>{' '}
          {(indicadores.relacionInversion || 0).toFixed(2)}% del gasto total
        </li>
        <li>
          <strong>Dependencia de Transferencias:</strong>{' '}
          {(indicadores.dependenciaTransferencias || 0).toFixed(2)}% de los ingresos totales
        </li>
      </ul>

      {/* Recomendaciones Automáticas */}
      <h3>Recomendaciones Automáticas</h3>
      <div className="alert">
        {recomendaciones.length > 0 ? (
          <ul>
            {recomendaciones.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        ) : (
          <p>El presupuesto muestra indicadores saludables. Mantenga las buenas prácticas actuales.</p>
        )}
      </div>
    </>
  )
}
