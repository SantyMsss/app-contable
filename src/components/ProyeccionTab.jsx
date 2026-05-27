import { useState, useMemo } from 'react'
import TablaPresupuesto from './TablaPresupuesto.jsx'
import { CATEGORIAS_INGRESO, CATEGORIAS_GASTO } from '../utils/constants.js'
import { formatNumber } from '../utils/formatNumber.js'

/**
 * Pestaña 1: Proyección Inicial
 * Contiene sub-pestañas de Ingresos y Gastos con sus respectivas tablas.
 */
export default function ProyeccionTab({
  itemsIngreso,
  itemsGasto,
  proyeccionIngresos,
  proyeccionGastos,
  onAddIngreso,
  onRemoveIngreso,
  onUpdateIngreso,
  onAddGasto,
  onRemoveGasto,
  onUpdateGasto,
}) {
  const [subTab, setSubTab] = useState('ingresos')

  const totalBaseI = useMemo(
    () => itemsIngreso.reduce((s, i) => s + (i.base || 0), 0),
    [itemsIngreso],
  )
  const totalProyI = useMemo(
    () => Object.values(proyeccionIngresos).reduce((s, v) => s + v, 0),
    [proyeccionIngresos],
  )
  const totalBaseG = useMemo(
    () => itemsGasto.reduce((s, i) => s + (i.base || 0), 0),
    [itemsGasto],
  )
  const totalProyG = useMemo(
    () => Object.values(proyeccionGastos).reduce((s, v) => s + v, 0),
    [proyeccionGastos],
  )

  const diferencia = totalProyI - totalProyG
  const tieneData = totalProyI > 0 || totalProyG > 0

  return (
    <>
      <div className="instructions">
        <h3>Instrucciones para la proyección inicial</h3>
        <p>
          Complete los datos históricos y las proyecciones para el año 2026 según los
          lineamientos del taller. Recuerde mantener el equilibrio entre ingresos y gastos.
        </p>
      </div>

      {/* Sub-pestañas */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        <div
          className={`tab ${subTab === 'ingresos' ? 'active' : ''}`}
          onClick={() => setSubTab('ingresos')}
        >
          Ingresos
        </div>
        <div
          className={`tab ${subTab === 'gastos' ? 'active' : ''}`}
          onClick={() => setSubTab('gastos')}
        >
          Gastos
        </div>
      </div>

      {subTab === 'ingresos' && (
        <div className="tab-content active">
          <h2>Presupuesto de Ingresos 2026</h2>
          <TablaPresupuesto
            categorias={CATEGORIAS_INGRESO}
            items={itemsIngreso}
            proyeccion={proyeccionIngresos}
            tipo="ingreso"
            onAdd={onAddIngreso}
            onRemove={onRemoveIngreso}
            onUpdate={onUpdateIngreso}
            totalBase={totalBaseI}
            totalProy={totalProyI}
          />
        </div>
      )}

      {subTab === 'gastos' && (
        <div className="tab-content active">
          <h2>Presupuesto de Gastos 2026</h2>
          <TablaPresupuesto
            categorias={CATEGORIAS_GASTO}
            items={itemsGasto}
            proyeccion={proyeccionGastos}
            tipo="gasto"
            onAdd={onAddGasto}
            onRemove={onRemoveGasto}
            onUpdate={onUpdateGasto}
            totalBase={totalBaseG}
            totalProy={totalProyG}
          />
        </div>
      )}

      {/* Alerta de equilibrio */}
      {tieneData && (
        <div
          className={`alert ${
            Math.abs(diferencia) < 1
              ? 'alert-success'
              : diferencia > 0
              ? 'alert-success'
              : 'alert-danger'
          }`}
          style={{ marginTop: '1rem' }}
        >
          {Math.abs(diferencia) < 1
            ? '✅ El presupuesto está en equilibrio. Ingresos y gastos coinciden.'
            : diferencia > 0
            ? `✅ Superávit: Los ingresos exceden los gastos en ${formatNumber(diferencia)} millones.`
            : `⚠️ Déficit: Los gastos exceden los ingresos en ${formatNumber(Math.abs(diferencia))} millones.`}
        </div>
      )}
    </>
  )
}
