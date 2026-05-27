import { useMemo, Fragment } from 'react'
import { formatNumber } from '../utils/formatNumber.js'
import { PLACEHOLDER_TEXTOS } from '../utils/constants.js'

/**
 * Tabla genérica de presupuesto (Ingresos o Gastos).
 *
 * Props:
 *  - categorias: Array<{ id, label }>
 *  - items: Array<{ id, categoria, concepto, base, tasa }>
 *  - proyeccion: { [concepto]: valorProyectado }
 *  - tipo: 'ingreso' | 'gasto'
 *  - onAdd(categoriaId)
 *  - onRemove(itemId)
 *  - onUpdate(itemId, field, value)
 *  - totalBase: number
 *  - totalProy: number
 */
export default function TablaPresupuesto({
  categorias,
  items,
  proyeccion,
  tipo,
  onAdd,
  onRemove,
  onUpdate,
  totalBase,
  totalProy,
}) {
  // Subtotales por categoría
  const subtotales = useMemo(() => {
    const result = {}
    categorias.forEach((cat) => {
      result[cat.id] = items
        .filter((i) => i.categoria === cat.id)
        .reduce((s, i) => {
          const concepto = i.concepto.trim() || `${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} ${i.id}`
          return s + (proyeccion[concepto] || 0)
        }, 0)
    })
    return result
  }, [items, proyeccion, categorias, tipo])

  const tipoLabel = tipo === 'ingreso' ? 'INGRESOS' : 'GASTOS'

  return (
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th>2025 (Base)</th>
          <th>Tasa Crecimiento (%)</th>
          <th>2026 (Proyectado)</th>
        </tr>
      </thead>
      <tbody>
        {categorias.map((cat) => {
          const catItems = items.filter((i) => i.categoria === cat.id)
          return (
            <Fragment key={cat.id}>
              {/* Fila de categoría */}
              <tr className="category">
                <td colSpan="3">
                  <strong>{cat.label}</strong>
                </td>
                <td className="subtotal-categoria">
                  <span className="subtotal-value">
                    {formatNumber(subtotales[cat.id] || 0)}
                  </span>
                </td>
              </tr>

              {/* Filas de items de la categoría */}
              {catItems.map((item) => {
                const concepto = item.concepto.trim() || `${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} ${item.id}`
                const proy = proyeccion[concepto] || 0
                return (
                  <tr key={item.id} className={`fila-dinamica-${tipo}`}>
                    <td>
                      <input
                        type="text"
                        placeholder={PLACEHOLDER_TEXTOS[cat.id] || `Nuevo ${tipo}`}
                        value={item.concepto}
                        onChange={(e) => onUpdate(item.id, 'concepto', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.base}
                        min="0"
                        onChange={(e) =>
                          onUpdate(item.id, 'base', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.tasa}
                        onChange={(e) =>
                          onUpdate(item.id, 'tasa', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td>
                      <span className="calculated">{formatNumber(proy)}</span>
                      <button
                        type="button"
                        className="btn-eliminar-fila"
                        onClick={() => onRemove(item.id)}
                      >
                        ✖
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Botón AGREGAR */}
              <tr className="add-button-row">
                <td colSpan="4">
                  <button
                    type="button"
                    className="agregar-item-btn"
                    onClick={() => onAdd(cat.id)}
                  >
                    AGREGAR
                  </button>
                </td>
              </tr>
            </Fragment>
          )
        })}

        {/* Fila de total */}
        <tr className="total">
          <td>
            <strong>TOTAL {tipoLabel}</strong>
          </td>
          <td>
            <span>{formatNumber(totalBase)}</span>
          </td>
          <td></td>
          <td>
            <span>{formatNumber(totalProy)}</span>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
