import { useState, useMemo, useCallback } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import ProyeccionTab from './components/ProyeccionTab.jsx'
import ModificacionesTab from './components/ModificacionesTab.jsx'
import IndicadoresTab from './components/IndicadoresTab.jsx'
import AnalisisTab from './components/AnalisisTab.jsx'
import { calcularIndicadores } from './utils/calcularIndicadores.js'
import { CATEGORIAS_INGRESO, CATEGORIAS_GASTO } from './utils/constants.js'

const TABS = [
  { id: 'proyeccion', label: '1. Proyección Inicial' },
  { id: 'modificaciones', label: '2. Modificaciones' },
  { id: 'indicadores', label: '3. Indicadores' },
  { id: 'analisis', label: '4. Análisis' },
]

// Aplica las modificaciones sobre un presupuesto base
function aplicarModificaciones(base, modificaciones, area) {
  const result = { ...base }
  modificaciones.forEach((mod) => {
    if (mod.area !== area) return
    if (mod.tipo === 'adicion') {
      result[mod.concepto] = (result[mod.concepto] || 0) + mod.valor
    } else if (mod.tipo === 'reduccion') {
      result[mod.concepto] = Math.max(0, (result[mod.concepto] || 0) - mod.valor)
    } else if (mod.tipo === 'traslado') {
      result[mod.concepto] = Math.max(0, (result[mod.concepto] || 0) - mod.valor)
      result[mod.conceptoDestino] = (result[mod.conceptoDestino] || 0) + mod.valor
    }
  })
  return result
}

export default function App() {
  const [activeTab, setActiveTab] = useState('proyeccion')
  const [itemsIngreso, setItemsIngreso] = useState([])
  const [itemsGasto, setItemsGasto] = useState([])
  const [modificaciones, setModificaciones] = useState([])
  const [analisis, setAnalisis] = useState('')

  // ── Proyección (derivada de items) ────────────────────────────────────────
  const proyeccionIngresos = useMemo(() => {
    const result = {}
    itemsIngreso.forEach((item) => {
      const concepto = item.concepto.trim() || `Ingreso ${item.id}`
      result[concepto] = (item.base || 0) * (1 + (item.tasa || 0) / 100)
    })
    return result
  }, [itemsIngreso])

  const proyeccionGastos = useMemo(() => {
    const result = {}
    itemsGasto.forEach((item) => {
      const concepto = item.concepto.trim() || `Gasto ${item.id}`
      result[concepto] = (item.base || 0) * (1 + (item.tasa || 0) / 100)
    })
    return result
  }, [itemsGasto])

  // ── Presupuesto actualizado (proyección + modificaciones) ─────────────────
  const actualizadoIngresos = useMemo(
    () => aplicarModificaciones(proyeccionIngresos, modificaciones, 'ingresos'),
    [proyeccionIngresos, modificaciones],
  )

  const actualizadoGastos = useMemo(
    () => aplicarModificaciones(proyeccionGastos, modificaciones, 'gastos'),
    [proyeccionGastos, modificaciones],
  )

  // ── Indicadores ───────────────────────────────────────────────────────────
  const indicadores = useMemo(
    () => calcularIndicadores(actualizadoIngresos, actualizadoGastos),
    [actualizadoIngresos, actualizadoGastos],
  )

  // ── Handlers de items de ingreso ──────────────────────────────────────────
  const addItemIngreso = useCallback((categoria) => {
    setItemsIngreso((prev) => [
      ...prev,
      { id: Date.now(), categoria, concepto: '', base: 0, tasa: 0 },
    ])
  }, [])

  const removeItemIngreso = useCallback((id) => {
    setItemsIngreso((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateItemIngreso = useCallback((id, field, value) => {
    setItemsIngreso((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    )
  }, [])

  // ── Handlers de items de gasto ────────────────────────────────────────────
  const addItemGasto = useCallback((categoria) => {
    setItemsGasto((prev) => [
      ...prev,
      { id: Date.now(), categoria, concepto: '', base: 0, tasa: 0 },
    ])
  }, [])

  const removeItemGasto = useCallback((id) => {
    setItemsGasto((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateItemGasto = useCallback((id, field, value) => {
    setItemsGasto((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    )
  }, [])

  // ── Handlers de modificaciones ────────────────────────────────────────────
  const addModificacion = useCallback((mod) => {
    setModificaciones((prev) => [...prev, mod])
  }, [])

  const removeModificacion = useCallback((id) => {
    setModificaciones((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ── Exportar / Importar datos JSON ────────────────────────────────────────
  const exportarDatos = useCallback(() => {
    const data = {
      version: '2.0',
      fechaExportacion: new Date().toISOString(),
      itemsIngreso,
      itemsGasto,
      modificaciones,
      analisis,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presupuesto-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [itemsIngreso, itemsGasto, modificaciones, analisis])

  const importarDatos = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const datos = JSON.parse(ev.target.result)
        if (datos.version === '2.0') {
          setItemsIngreso(datos.itemsIngreso || [])
          setItemsGasto(datos.itemsGasto || [])
          setModificaciones(datos.modificaciones || [])
          setAnalisis(datos.analisis || '')
        } else {
          alert('Formato de archivo no compatible con esta versión de la app.')
        }
      } catch {
        alert('Error al importar datos. Verifique que el archivo sea válido.')
      }
    }
    reader.readAsText(file)
    // Reset input para permitir re-importar el mismo archivo
    e.target.value = ''
  }, [])

  return (
    <div>
      <Header />

      <div className="container">
        {/* Exportar / Importar */}
        <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
          <button className="btn-exportar" onClick={exportarDatos}>
            ⬇ Exportar Datos (JSON)
          </button>
          <label className="btn-exportar" style={{ cursor: 'pointer' }}>
            ⬆ Importar Datos (JSON)
            <input
              type="file"
              accept=".json"
              onChange={importarDatos}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Navegación de pestañas */}
        <div className="tabs">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Contenido de pestañas */}
        {activeTab === 'proyeccion' && (
          <div className="tab-content active">
            <ProyeccionTab
              itemsIngreso={itemsIngreso}
              itemsGasto={itemsGasto}
              proyeccionIngresos={proyeccionIngresos}
              proyeccionGastos={proyeccionGastos}
              onAddIngreso={addItemIngreso}
              onRemoveIngreso={removeItemIngreso}
              onUpdateIngreso={updateItemIngreso}
              onAddGasto={addItemGasto}
              onRemoveGasto={removeItemGasto}
              onUpdateGasto={updateItemGasto}
            />
          </div>
        )}

        {activeTab === 'modificaciones' && (
          <div className="tab-content active">
            <ModificacionesTab
              proyeccionIngresos={proyeccionIngresos}
              proyeccionGastos={proyeccionGastos}
              actualizadoIngresos={actualizadoIngresos}
              actualizadoGastos={actualizadoGastos}
              modificaciones={modificaciones}
              onAddModificacion={addModificacion}
              onRemoveModificacion={removeModificacion}
            />
          </div>
        )}

        {activeTab === 'indicadores' && (
          <div className="tab-content active">
            <IndicadoresTab indicadores={indicadores} />
          </div>
        )}

        {activeTab === 'analisis' && (
          <div className="tab-content active">
            <AnalisisTab
              analisis={analisis}
              setAnalisis={setAnalisis}
              indicadores={indicadores}
              itemsIngreso={itemsIngreso}
              itemsGasto={itemsGasto}
              proyeccionIngresos={proyeccionIngresos}
              proyeccionGastos={proyeccionGastos}
              actualizadoIngresos={actualizadoIngresos}
              actualizadoGastos={actualizadoGastos}
              modificaciones={modificaciones}
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
