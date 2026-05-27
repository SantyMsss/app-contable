// Categorías de Ingresos
export const CATEGORIAS_INGRESO = [
  { id: 'tributarios', label: 'Ingresos Tributarios' },
  { id: 'no-tributarios', label: 'Ingresos No Tributarios' },
  { id: 'transferencias', label: 'Transferencias' },
  { id: 'recursos-credito', label: 'Recursos del Crédito' },
  { id: 'recursos-balance', label: 'Recursos del Balance' },
  { id: 'excedentes-financieros', label: 'Excedentes Financieros' },
  { id: 'rendimientos-financieros', label: 'Rendimientos Financieros' },
  { id: 'venta-activos', label: 'Venta de Activos' },
  { id: 'donaciones', label: 'Donación Gobierno Alemán' },
]

// Categorías de Gastos
export const CATEGORIAS_GASTO = [
  { id: 'servicios-directos', label: 'Servicios personales directos' },
  { id: 'servicios-indirectos', label: 'Servicios personales indirectos' },
  { id: 'contribuciones-nomina', label: 'Contribuciones inherentes a la nómina' },
  { id: 'gastos-generales', label: 'Gastos generales' },
  { id: 'transferencias-fondos', label: 'Transferencias a fondos y entidades' },
  { id: 'cuentas-pagar', label: 'Cuentas por pagar de la vigencia anterior' },
  { id: 'amortizacion-dpi', label: 'Amortización DPI' },
  { id: 'intereses-dpi', label: 'Intereses, comisiones, gastos de DPI' },
]

// Placeholders por categoría
export const PLACEHOLDER_TEXTOS = {
  'tributarios': 'Nuevo Ingreso Tributario',
  'no-tributarios': 'Nuevo Ingreso No Tributario',
  'transferencias': 'Nueva Transferencia',
  'recursos-credito': 'Nuevo Recurso del Crédito',
  'recursos-balance': 'Nuevo Recurso del Balance',
  'excedentes-financieros': 'Nuevo Excedente Financiero',
  'rendimientos-financieros': 'Nuevo Rendimiento Financiero',
  'venta-activos': 'Nueva Venta de Activo',
  'donaciones': 'Nueva Donación',
  'servicios-directos': 'Nuevo Servicio Personal Directo',
  'servicios-indirectos': 'Nuevo Servicio Personal Indirecto',
  'contribuciones-nomina': 'Nueva Contribución a la Nómina',
  'gastos-generales': 'Nuevo Gasto General',
  'transferencias-fondos': 'Nueva Transferencia a Fondos',
  'cuentas-pagar': 'Nueva Cuenta por Pagar',
  'amortizacion-dpi': 'Nueva Amortización DPI',
  'intereses-dpi': 'Nuevos Intereses / Comisiones DPI',
}
