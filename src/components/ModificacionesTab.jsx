import { useState, useMemo } from 'react'
import { formatNumber } from '../utils/formatNumber.js'

/**
 * Pestaña 2: Modificaciones Presupuestales
 *
 * Lógica:
 *  - Adición/Reducción sobre Ingresos → requiere distribuir el valor en Gastos (equilibrio)
 *  - Traslado → entre conceptos de Gastos
 *  - Adición/Reducción directa sobre Gastos (si se selecciona área manualmente)
 */
export default function ModificacionesTab({
  proyeccionIngresos,
  proyeccionGastos,
  actualizadoIngresos,
  actualizadoGastos,
  modificaciones,
  onAddModificacion,
  onRemoveModificacion,
}) {
  // ── Estado del formulario ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    tipo: '',
    area: '',
    concepto: '',
    conceptoDestino: '',
    valor: '',
    justificacion: '',
  })

  // ── Estado de la distribución en gastos ──────────────────────────────────
  const [showDistribucion, setShowDistribucion] = useState(false)
  const [distribucionData, setDistribucionData] = useState(null)
  const [distribucionItems, setDistribucionItems] = useState([])

  // ── Mensaje de feedback ───────────────────────────────────────────────────
  const [mensaje, setMensaje] = useState(null)

  // ── Sub-pestañas del presupuesto actualizado ──────────────────────────────
  const [subTabAct, setSubTabAct] = useState('ingresos')

  // Muestra un mensaje temporal
  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 5000)
  }

  // ── Listas de conceptos para los selects ──────────────────────────────────
  const conceptosOrigen = useMemo(() => {
    if (!form.area) return []
    return form.area === 'ingresos'
      ? Object.keys(proyeccionIngresos)
      : Object.keys(proyeccionGastos)
  }, [form.area, proyeccionIngresos, proyeccionGastos])

  const conceptosGasto = useMemo(() => Object.keys(proyeccionGastos), [proyeccionGastos])

  // ── Manejo del tipo de modificación (autocompletado de área) ─────────────
  const handleTipoChange = (tipo) => {
    if (tipo === 'adicion' || tipo === 'reduccion') {
      setForm({ tipo, area: 'ingresos', concepto: '', conceptoDestino: '', valor: '', justificacion: '' })
    } else if (tipo === 'traslado') {
      setForm({ tipo, area: 'gastos', concepto: '', conceptoDestino: '', valor: '', justificacion: '' })
    } else {
      setForm({ tipo: '', area: '', concepto: '', conceptoDestino: '', valor: '', justificacion: '' })
    }
    setShowDistribucion(false)
  }

  // ── Reset del formulario ──────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ tipo: '', area: '', concepto: '', conceptoDestino: '', valor: '', justificacion: '' })
    setShowDistribucion(false)
    setDistribucionData(null)
    setDistribucionItems([])
  }

  // ── Agregar modificación ──────────────────────────────────────────────────
  const handleAgregar = () => {
    const { tipo, area, concepto, conceptoDestino, valor, justificacion } = form
    const valorNum = parseFloat(valor) || 0

    if (!tipo) { mostrarMensaje('Seleccione un tipo de modificación.', 'warning'); return }
    if (!concepto) { mostrarMensaje('Seleccione un concepto.', 'warning'); return }
    if (valorNum <= 0) { mostrarMensaje('Ingrese un valor mayor a cero.', 'warning'); return }
    if (!justificacion.trim()) { mostrarMensaje('Ingrese una justificación.', 'warning'); return }

    // Validar disponibilidad para reducción y traslado
    if (tipo === 'reduccion' || tipo === 'traslado') {
      const fuente = area === 'ingresos' ? actualizadoIngresos : actualizadoGastos
      const disponible = fuente[concepto] || 0
      if (valorNum > disponible) {
        mostrarMensaje(
          `Disponible en "${concepto}": ${formatNumber(disponible)} millones. No puede ${tipo === 'traslado' ? 'trasladar' : 'reducir'} ${formatNumber(valorNum)}.`,
          'danger',
        )
        return
      }
    }

    // Traslado (entre gastos)
    if (tipo === 'traslado') {
      if (!conceptoDestino) { mostrarMensaje('Seleccione el concepto destino.', 'danger'); return }
      onAddModificacion({
        id: Date.now(), tipo, area, concepto, conceptoDestino, valor: valorNum,
        justificacion, fecha: new Date().toLocaleDateString(), esEquilibrio: false,
      })
      resetForm()
      mostrarMensaje('Traslado registrado correctamente.', 'success')
      return
    }

    // Adición/Reducción en ingresos → pedir distribución en gastos
    if ((tipo === 'adicion' || tipo === 'reduccion') && area === 'ingresos') {
      setDistribucionData({ valor: valorNum, concepto, justificacion, tipo })
      setDistribucionItems([{ id: Date.now(), concepto: '', valor: '' }])
      setShowDistribucion(true)
      return
    }

    // Adición/Reducción directa en gastos
    onAddModificacion({
      id: Date.now(), tipo, area, concepto, conceptoDestino: '', valor: valorNum,
      justificacion, fecha: new Date().toLocaleDateString(), esEquilibrio: false,
    })
    resetForm()
    mostrarMensaje('Modificación registrada correctamente.', 'success')
  }

  // ── Distribución ──────────────────────────────────────────────────────────
  const sumaDistribucion = distribucionItems.reduce(
    (s, i) => s + (parseFloat(i.valor) || 0),
    0,
  )

  const guardarDistribucion = () => {
    if (!distribucionData) return
    const { valor: totalEsperado, concepto: conceptoIngreso, justificacion, tipo } = distribucionData
    const activas = distribucionItems.filter((i) => parseFloat(i.valor) > 0 && i.concepto)

    if (Math.abs(sumaDistribucion - totalEsperado) > 0.01) {
      mostrarMensaje(
        `La suma de la distribución (${formatNumber(sumaDistribucion)}) debe ser igual al valor (${formatNumber(totalEsperado)}).`,
        'danger',
      )
      return
    }
    if (activas.length === 0) {
      mostrarMensaje('Distribuya en al menos un concepto de gasto.', 'danger')
      return
    }

    // Para reducciones, verificar disponibilidad en cada gasto
    if (tipo === 'reduccion') {
      for (const dist of activas) {
        const disponible = actualizadoGastos[dist.concepto] || 0
        if (parseFloat(dist.valor) > disponible) {
          mostrarMensaje(
            `No hay ${formatNumber(dist.valor)} disponibles en gasto "${dist.concepto}". Disponible: ${formatNumber(disponible)}.`,
            'danger',
          )
          return
        }
      }
    }

    const now = Date.now()
    // Modificación en ingresos
    onAddModificacion({
      id: now, tipo, area: 'ingresos', concepto: conceptoIngreso, conceptoDestino: '',
      valor: totalEsperado, justificacion, fecha: new Date().toLocaleDateString(), esEquilibrio: false,
    })
    // Modificaciones en gastos (equilibrio)
    activas.forEach((dist, idx) => {
      onAddModificacion({
        id: now + idx + 1, tipo, area: 'gastos', concepto: dist.concepto, conceptoDestino: '',
        valor: parseFloat(dist.valor),
        justificacion: `Equilibrio por ${tipo} de ingreso "${conceptoIngreso}": ${justificacion}`,
        fecha: new Date().toLocaleDateString(), esEquilibrio: true,
      })
    })

    resetForm()
    mostrarMensaje(
      tipo === 'adicion'
        ? 'Adición registrada y distribuida en gastos correctamente.'
        : 'Reducción registrada y distribuida en gastos correctamente.',
      'success',
    )
  }

  // ── Totales del presupuesto actualizado ───────────────────────────────────
  const totalActI = Object.values(actualizadoIngresos).reduce((s, v) => s + v, 0)
  const totalActG = Object.values(actualizadoGastos).reduce((s, v) => s + v, 0)
  const diferenciaAct = totalActI - totalActG
  const tieneDataAct = totalActI > 0 || totalActG > 0

  return (
    <>
      {/* Instrucciones */}
      <div className="instructions">
        <h3>Instrucciones para modificaciones presupuestales</h3>
        <p>
          <strong>Puede agregar múltiples modificaciones de forma consecutiva.</strong> El formulario
          se limpiará automáticamente tras cada registro exitoso.
        </p>
        <ul>
          <li><strong>Adición:</strong> Incrementa el valor de un concepto de ingreso y requiere distribuirlo en gastos.</li>
          <li><strong>Reducción:</strong> Disminuye el valor de un concepto de ingreso y requiere distribuirlo en gastos.</li>
          <li><strong>Traslado:</strong> Mueve valor de un concepto de gasto a otro concepto de gasto.</li>
        </ul>
      </div>

      {/* Mensaje de feedback */}
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {/* ── Formulario ─────────────────────────────────────────────────────── */}
      <div className="form-group">
        <label>Tipo de Modificación:</label>
        <select
          className="form-control"
          value={form.tipo}
          onChange={(e) => handleTipoChange(e.target.value)}
        >
          <option value="">-- Seleccione tipo --</option>
          <option value="adicion">Adición</option>
          <option value="reduccion">Reducción</option>
          <option value="traslado">Traslado</option>
        </select>
      </div>

      <div className="form-group">
        <label>Área Afectada:</label>
        <select
          className="form-control"
          value={form.area}
          disabled={form.tipo === 'adicion' || form.tipo === 'reduccion' || form.tipo === 'traslado'}
          onChange={(e) => setForm((p) => ({ ...p, area: e.target.value, concepto: '' }))}
        >
          <option value="">-- Seleccione área --</option>
          <option value="ingresos">Ingresos</option>
          <option value="gastos">Gastos</option>
        </select>
      </div>

      <div className="form-group">
        <label>Concepto:</label>
        <select
          className="form-control"
          value={form.concepto}
          onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
        >
          <option value="">-- Seleccione concepto --</option>
          {conceptosOrigen.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {form.tipo === 'traslado' && (
        <div className="form-group">
          <label>Concepto Destino (Gastos):</label>
          <select
            className="form-control"
            value={form.conceptoDestino}
            onChange={(e) => setForm((p) => ({ ...p, conceptoDestino: e.target.value }))}
          >
            <option value="">-- Seleccione concepto destino --</option>
            {conceptosGasto.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Valor (millones):</label>
        <input
          type="number"
          className="form-control"
          min="0"
          value={form.valor}
          onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
        />
      </div>

      {/* ── Sección de distribución en gastos ──────────────────────────────── */}
      {showDistribucion && distribucionData && (
        <div
          className="form-group"
          style={{ border: '1px solid #dee2e6', padding: 15, borderRadius: 4 }}
        >
          <label>
            Distribución en Gastos – debe sumar exactamente{' '}
            <strong>{formatNumber(distribucionData.valor)}</strong> millones:
          </label>

          {/* Indicador de suma */}
          <div style={{ background: '#e9ecef', padding: 10, marginBottom: 10, borderRadius: 4 }}>
            <strong>Valor a distribuir: {formatNumber(distribucionData.valor)} millones</strong>
            <br />
            Suma actual:{' '}
            <span
              style={{
                color:
                  Math.abs(sumaDistribucion - distribucionData.valor) < 0.01
                    ? '#28a745'
                    : '#dc3545',
                fontWeight: 'bold',
              }}
            >
              {formatNumber(sumaDistribucion)}
            </span>{' '}
            millones
            {Math.abs(sumaDistribucion - distribucionData.valor) < 0.01 ? (
              <span style={{ color: '#28a745', marginLeft: 10 }}>✓ ¡Correcto!</span>
            ) : distribucionData.valor - sumaDistribucion > 0 ? (
              <span style={{ color: '#dc3545', marginLeft: 10 }}>
                (Faltan {formatNumber(distribucionData.valor - sumaDistribucion)} millones)
              </span>
            ) : (
              <span style={{ color: '#dc3545', marginLeft: 10 }}>
                (Sobran {formatNumber(sumaDistribucion - distribucionData.valor)} millones)
              </span>
            )}
          </div>

          {/* Filas de distribución */}
          {distribucionItems.map((item, idx) => (
            <div key={item.id} className="fila-distribucion">
              <select
                value={item.concepto}
                onChange={(e) =>
                  setDistribucionItems((prev) =>
                    prev.map((it, i) =>
                      i === idx ? { ...it, concepto: e.target.value } : it,
                    ),
                  )
                }
              >
                <option value="">-- Concepto de gasto --</option>
                {conceptosGasto.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                placeholder="Valor (millones)"
                value={item.valor}
                onChange={(e) =>
                  setDistribucionItems((prev) =>
                    prev.map((it, i) =>
                      i === idx ? { ...it, valor: e.target.value } : it,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  setDistribucionItems((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                ✖
              </button>
            </div>
          ))}

          <div style={{ marginTop: 10 }}>
            <button
              className="btn-secundario"
              onClick={() =>
                setDistribucionItems((prev) => [
                  ...prev,
                  { id: Date.now(), concepto: '', valor: '' },
                ])
              }
            >
              + Añadir línea
            </button>
            <button
              className="btn-principal"
              style={{ marginLeft: 10 }}
              onClick={guardarDistribucion}
            >
              Registrar distribución
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Justificación:</label>
        <textarea
          className="form-control"
          rows="3"
          value={form.justificacion}
          onChange={(e) => setForm((p) => ({ ...p, justificacion: e.target.value }))}
        />
      </div>

      {!showDistribucion && (
        <button type="button" onClick={handleAgregar}>
          Agregar Modificación
        </button>
      )}

      {/* Contador */}
      <div
        className="contador-modificaciones"
        style={{ margin: '15px 0', padding: 10, background: '#f8f9fa', borderRadius: 4, textAlign: 'center' }}
      >
        <strong>📊 Modificaciones registradas: {modificaciones.length}</strong>
      </div>

      {/* ── Historial de Modificaciones ────────────────────────────────────── */}
      <h3>Historial de Modificaciones</h3>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Área</th>
            <th>Concepto</th>
            <th>Concepto Destino</th>
            <th>Valor</th>
            <th>Justificación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {modificaciones.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', color: '#999' }}>
                Sin modificaciones registradas
              </td>
            </tr>
          )}
          {modificaciones.map((mod) => (
            <tr
              key={mod.id}
              style={mod.esEquilibrio ? { backgroundColor: '#f0fff0' } : {}}
            >
              <td>
                {mod.tipo.charAt(0).toUpperCase() + mod.tipo.slice(1)}
                {mod.esEquilibrio ? ' (Eq.)' : ''}
              </td>
              <td>{mod.area.charAt(0).toUpperCase() + mod.area.slice(1)}</td>
              <td>{mod.concepto}</td>
              <td>{mod.conceptoDestino || '-'}</td>
              <td>{formatNumber(mod.valor)}</td>
              <td style={{ maxWidth: 200 }}>{mod.justificacion}</td>
              <td>
                {mod.esEquilibrio ? (
                  <span style={{ color: '#28a745' }}>Equilibrio automático</span>
                ) : (
                  <button
                    className="btn-eliminar"
                    onClick={() => onRemoveModificacion(mod.id)}
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Presupuesto Actualizado ─────────────────────────────────────────── */}
      <h3>Presupuesto Actualizado</h3>

      <div className="tabs" style={{ marginBottom: 0 }}>
        <div
          className={`tab ${subTabAct === 'ingresos' ? 'active' : ''}`}
          onClick={() => setSubTabAct('ingresos')}
        >
          Ingresos
        </div>
        <div
          className={`tab ${subTabAct === 'gastos' ? 'active' : ''}`}
          onClick={() => setSubTabAct('gastos')}
        >
          Gastos
        </div>
      </div>

      {subTabAct === 'ingresos' && (
        <div className="tab-content active">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Proyección Inicial</th>
                <th>Modificaciones</th>
                <th>Total Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(proyeccionIngresos).map(([concepto, valorInicial]) => {
                const valorActual = actualizadoIngresos[concepto] || 0
                const diff = valorActual - valorInicial
                return (
                  <tr key={concepto}>
                    <td>{concepto}</td>
                    <td>{formatNumber(valorInicial)}</td>
                    <td>{diff !== 0 ? formatNumber(diff) : '-'}</td>
                    <td>{formatNumber(valorActual)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTabAct === 'gastos' && (
        <div className="tab-content active">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Proyección Inicial</th>
                <th>Modificaciones</th>
                <th>Total Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(proyeccionGastos).map(([concepto, valorInicial]) => {
                const valorActual = actualizadoGastos[concepto] || 0
                const diff = valorActual - valorInicial
                return (
                  <tr key={concepto}>
                    <td>{concepto}</td>
                    <td>{formatNumber(valorInicial)}</td>
                    <td>{diff !== 0 ? formatNumber(diff) : '-'}</td>
                    <td>{formatNumber(valorActual)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerta de equilibrio del presupuesto actualizado */}
      {tieneDataAct && (
        <div
          className={`alert ${
            Math.abs(diferenciaAct) < 1
              ? 'alert-success'
              : diferenciaAct > 0
              ? 'alert-success'
              : 'alert-danger'
          }`}
          style={{ marginTop: '1rem' }}
        >
          {Math.abs(diferenciaAct) < 1
            ? '✅ Presupuesto actualizado está en equilibrio.'
            : diferenciaAct > 0
            ? `✅ Superávit actualizado: ${formatNumber(diferenciaAct)} millones.`
            : `⚠️ Déficit actualizado: ${formatNumber(Math.abs(diferenciaAct))} millones.`}
        </div>
      )}
    </>
  )
}
