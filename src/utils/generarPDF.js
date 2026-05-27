import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatNumber } from './formatNumber'

/**
 * Genera y descarga el reporte PDF del presupuesto.
 * Lee directamente del estado de React (no del DOM).
 */
export function generarPDF({
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
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = 10
  let yPos = margin
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  const checkPageBreak = (h) => {
    if (yPos + h > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  const fmt = (n) => formatNumber(Number.isFinite(+n) ? +n : 0)

  // ─── Encabezado ──────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setTextColor(44, 62, 80)
  doc.text('Presupuesto Público Municipal', margin, yPos)
  yPos += 8

  doc.setFontSize(11)
  doc.setTextColor(80, 80, 80)
  doc.text('Herramienta Educativa – Contaduría Pública', margin, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, margin, yPos)
  yPos += 12

  // ─── Helper: renderiza una tabla de proyección ────────────────────────────
  const renderTablaProyeccion = (categorias, items, totalBase, totalProy, titulo) => {
    checkPageBreak(24)
    doc.setFontSize(13)
    doc.setTextColor(44, 62, 80)
    doc.text(titulo, margin, yPos)
    yPos += 6

    const head = [['Concepto', '2025 (Base)', 'Tasa (%)', '2026 (Proyectado)']]
    const body = []

    categorias.forEach((cat) => {
      // Fila de categoría
      body.push([
        { content: cat.label, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        '', '', '',
      ])

      const catItems = items.filter((i) => i.categoria === cat.id)
      catItems.forEach((item) => {
        const proy = (item.base || 0) * (1 + (item.tasa || 0) / 100)
        body.push([
          item.concepto || '(Sin nombre)',
          fmt(item.base || 0),
          `${item.tasa || 0}%`,
          fmt(proy),
        ])
      })
    })

    // Fila total
    body.push([
      { content: titulo.includes('Ingreso') ? 'TOTAL INGRESOS' : 'TOTAL GASTOS', styles: { fontStyle: 'bold', fillColor: [200, 220, 240] } },
      { content: fmt(totalBase), styles: { fontStyle: 'bold', fillColor: [200, 220, 240] } },
      { content: '', styles: { fillColor: [200, 220, 240] } },
      { content: fmt(totalProy), styles: { fontStyle: 'bold', fillColor: [200, 220, 240] } },
    ])

    autoTable(doc, {
      startY: yPos,
      head,
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    })

    yPos = doc.lastAutoTable.finalY + 10
  }

  // ─── Sección 1 & 2: Proyección ────────────────────────────────────────────
  const totalBaseI = itemsIngreso.reduce((s, i) => s + (i.base || 0), 0)
  const totalPrI = Object.values(proyeccionIngresos).reduce((s, v) => s + v, 0)
  const totalBaseG = itemsGasto.reduce((s, i) => s + (i.base || 0), 0)
  const totalPrG = Object.values(proyeccionGastos).reduce((s, v) => s + v, 0)

  renderTablaProyeccion(CATEGORIAS_INGRESO, itemsIngreso, totalBaseI, totalPrI, '1. Proyección de Ingresos 2026')
  renderTablaProyeccion(CATEGORIAS_GASTO, itemsGasto, totalBaseG, totalPrG, '2. Proyección de Gastos 2026')

  // ─── Sección 3: Modificaciones ────────────────────────────────────────────
  if (modificaciones.length > 0) {
    checkPageBreak(24)
    doc.setFontSize(13)
    doc.setTextColor(44, 62, 80)
    doc.text('3. Modificaciones Presupuestales', margin, yPos)
    yPos += 6

    autoTable(doc, {
      startY: yPos,
      head: [['Tipo', 'Área', 'Concepto', 'Destino', 'Valor (M)', 'Justificación']],
      body: modificaciones.map((m) => [
        m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1) + (m.esEquilibrio ? ' (Eq.)' : ''),
        m.area.charAt(0).toUpperCase() + m.area.slice(1),
        m.concepto,
        m.conceptoDestino || '-',
        fmt(m.valor),
        m.justificacion,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 5: { cellWidth: 60 } },
    })

    yPos = doc.lastAutoTable.finalY + 10
  }

  // ─── Sección 4: Presupuesto Actualizado ──────────────────────────────────
  checkPageBreak(24)
  doc.setFontSize(13)
  doc.setTextColor(44, 62, 80)
  doc.text('4. Presupuesto Actualizado', margin, yPos)
  yPos += 6

  const renderTablaActualizada = (proyeccion, actualizado, titulo) => {
    checkPageBreak(16)
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(titulo, margin, yPos)
    yPos += 4

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Proyección Inicial', 'Modificaciones', 'Total Actualizado']],
      body: Object.entries(proyeccion).map(([concepto, valorInicial]) => {
        const valorActual = actualizado[concepto] || 0
        const mod = valorActual - valorInicial
        return [concepto, fmt(valorInicial), mod !== 0 ? fmt(mod) : '-', fmt(valorActual)]
      }),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
    })

    yPos = doc.lastAutoTable.finalY + 8
  }

  renderTablaActualizada(proyeccionIngresos, actualizadoIngresos, 'Ingresos Actualizados')
  renderTablaActualizada(proyeccionGastos, actualizadoGastos, 'Gastos Actualizados')

  // ─── Sección 5: Indicadores ───────────────────────────────────────────────
  checkPageBreak(60)
  doc.setFontSize(13)
  doc.setTextColor(44, 62, 80)
  doc.text('5. Indicadores Presupuestales', margin, yPos)
  yPos += 6

  const interp = {
    ejecucion: (v) => v > 90 ? 'Excelente' : v > 70 ? 'Buena' : v > 50 ? 'Regular' : 'Baja',
    funcionamiento: (v) => v > 70 ? 'Alto (riesgo)' : v > 50 ? 'Moderado' : 'Bajo',
    inversion: (v) => v > 40 ? 'Alta (positivo)' : v > 20 ? 'Moderada' : 'Baja (riesgo)',
    transferencias: (v) => v > 60 ? 'Alta dependencia' : v > 30 ? 'Moderada' : 'Baja',
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor', 'Interpretación']],
    body: [
      ['Ejecución de Ingresos', `${(indicadores.ejecucionIngresos || 0).toFixed(2)}%`, interp.ejecucion(indicadores.ejecucionIngresos || 0)],
      ['Ejecución de Gastos', `${(indicadores.ejecucionGastos || 0).toFixed(2)}%`, interp.ejecucion(indicadores.ejecucionGastos || 0)],
      ['Funcionamiento / Gasto Total', `${(indicadores.relacionFuncionamiento || 0).toFixed(2)}%`, interp.funcionamiento(indicadores.relacionFuncionamiento || 0)],
      ['Inversión / Gasto Total', `${(indicadores.relacionInversion || 0).toFixed(2)}%`, interp.inversion(indicadores.relacionInversion || 0)],
      ['Dependencia de Transferencias', `${(indicadores.dependenciaTransferencias || 0).toFixed(2)}%`, interp.transferencias(indicadores.dependenciaTransferencias || 0)],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
  })

  yPos = doc.lastAutoTable.finalY + 10

  // ─── Sección 6: Análisis ─────────────────────────────────────────────────
  if (analisis && analisis.trim()) {
    checkPageBreak(30)
    doc.setFontSize(13)
    doc.setTextColor(44, 62, 80)
    doc.text('6. Análisis Presupuestal', margin, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(analisis, pageWidth - 2 * margin)
    lines.forEach((line) => {
      checkPageBreak(6)
      doc.text(line, margin, yPos)
      yPos += 5
    })
  }

  // ─── Pie de página en todas las páginas ──────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Herramienta Educativa – Presupuesto Público Municipal | Página ${i} de ${totalPages}`,
      margin,
      pageHeight - 5,
    )
  }

  doc.save(`presupuesto-municipal-${new Date().toISOString().split('T')[0]}.pdf`)
}
