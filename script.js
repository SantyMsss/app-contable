// Variables globales para almacenar datos
let presupuesto = {
    proyeccion: {
        ingresos: {},
        gastos: {}
    },
    modificaciones: [],
    actualizado: {
        ingresos: {},
        gastos: {}
    },
    ejecucion: {
        ingresos: {},
        gastos: {}
    },
    indicadores: {},
    analisis: ""
};

// Constantes
const SMMLV_2022 = 1000000; // Valor del salario mínimo 2022 (ejemplo)
const TASA_INFLACION_2025 = 9; // Según el documento

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Configurar tabs principales
    setupTabs('.tabs .tab', '.tab-content');
    
    // Configurar subtabs
    setupTabs('.tabs .tab[data-subtab]', '.subtab-content', 'data-subtab');
    
    // Eventos para proyección inicial
    // Ejecutar automáticamente proyección y verificación al cambiar cualquier input relevante
   // Listener delegado: cualquier cambio en un input[type="number"] recalcula y verifica
    document.addEventListener('input', function(e) {
        if (e.target.matches('input[type="number"]')) {
            calcularProyeccion();
            verificarEquilibrio();
        }
    });


    
    // Eventos para modificaciones
    document.getElementById('tipo-modificacion').addEventListener('change', toggleDestinoTraslado);
    document.getElementById('area-modificacion').addEventListener('change', actualizarConceptosModificacion);
    document.getElementById('agregar-modificacion').addEventListener('click', agregarModificacion);
    
    // Eventos para distribución
    document.getElementById('agregar-distribucion').addEventListener('click', agregarFilaDistribucion);
    document.getElementById('guardar-distribucion').addEventListener('click', guardarDistribucion);
    
    // Eventos para análisis
    document.getElementById('guardar-analisis').addEventListener('click', guardarAnalisis);
    
    // Eventos para exportación/importación
    document.getElementById('exportar-datos').addEventListener('click', exportarDatos);
    document.getElementById('importar-datos').addEventListener('change', importarDatos);
    
    // Cargar datos de ejemplo (para demostración)
    cargarDatosEjemplo();
    
    // Calcular indicadores iniciales una vez
    calcularIndicadores();





});

// Delegar evento de eliminación de filas dinámicas
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-eliminar-fila')) {
        const id = e.target.getAttribute('data-id');
        const tipo = e.target.getAttribute('data-tipo'); // 'ingreso' o 'gasto'
        const fila = document.querySelector(`.fila-dinamica-${tipo}[data-id="${id}"]`);

        if (fila) {
            // Obtener el concepto escrito en el campo de texto
            const conceptoInput = document.getElementById(`concepto-${tipo}-${id}`);
            const concepto = conceptoInput?.value?.trim();

            // Eliminar de presupuesto.proyeccion si existe
            if (concepto && presupuesto.proyeccion[tipo + 's'][concepto]) {
                delete presupuesto.proyeccion[tipo + 's'][concepto];
            }

            // Eliminar la fila del DOM
            fila.remove();

            // Recalcular proyecciones y totales sin ese concepto
            calcularProyeccion();
        }
    }
    
    // Eliminar filas de distribución
    if (e.target.classList.contains('btn-eliminar-fila-distribucion')) {
        e.target.parentElement.remove();
        actualizarSumaDistribucion();
    }
    
    // Actualizar suma cuando cambian los valores de distribución
    if (e.target.classList.contains('valor-distribucion')) {
        actualizarSumaDistribucion();
    }
});

// Event listener para cambios en tiempo real en los inputs de distribución
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('valor-distribucion')) {
        actualizarSumaDistribucion();
    }
});



// Funciones para tabs
function setupTabs(tabSelector, contentSelector, attribute = 'data-tab') {
    const tabs = document.querySelectorAll(tabSelector);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover clase active de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Agregar clase active al tab clickeado
            tab.classList.add('active');
            
            // Ocultar todos los contenidos
            document.querySelectorAll(contentSelector).forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar el contenido correspondiente
            const target = tab.getAttribute(attribute);
            document.getElementById(target).classList.add('active');
            
            // Si es la pestaña de indicadores, calcular indicadores
            if (target === 'indicadores') {
                calcularIndicadores();
            }
        });
    });
}

function toggleDestinoTraslado() {
    const tipo = document.getElementById('tipo-modificacion').value;
    const area = document.getElementById('area-modificacion');
    const destinoGroup = document.getElementById('concepto-destino-group');

    if (tipo === 'traslado') {
        destinoGroup.style.display = 'block';

        // Forzar selección de 'gastos' y deshabilitar
        area.value = 'gastos';
        area.disabled = true;

        // Cargar conceptos disponibles para gastos
        actualizarConceptosModificacion();
    } else if (tipo === 'adicion' || tipo === 'reduccion') {
        destinoGroup.style.display = 'none'; // NO mostrar selector de concepto destino

        // Forzar selección de 'ingresos' y deshabilitar
        area.value = 'ingresos';
        area.disabled = true;

        // Cargar conceptos disponibles para ingresos (origen)
        actualizarConceptosModificacion();
    } else {
        destinoGroup.style.display = 'none';

        // Habilitar selector de área
        area.disabled = false;

        // Actualizar conceptos según nueva área seleccionada (si es que cambió)
        actualizarConceptosModificacion();
    }
}


function actualizarConceptosModificacion() {
    const area = document.getElementById('area-modificacion').value;
    const conceptoSelect = document.getElementById('concepto-modificacion');
    const destinoSelect = document.getElementById('concepto-destino');
    
    // Limpiar opciones
    conceptoSelect.innerHTML = '';
    destinoSelect.innerHTML = '';
    
    // Obtener conceptos según el área seleccionada
    const conceptos = area === 'ingresos' ? 
        Object.keys(presupuesto.proyeccion.ingresos) : 
        Object.keys(presupuesto.proyeccion.gastos);
        
    // Agregar opciones
    conceptos.forEach(concepto => {
        const option = document.createElement('option');
        option.value = concepto;
        option.textContent = concepto;
        conceptoSelect.appendChild(option);
        
        // Para destino, excluir el concepto actual
        if (area === 'ingresos' || area === 'gastos') {
            const optionDestino = document.createElement('option');
            optionDestino.value = concepto;
            optionDestino.textContent = concepto;
            destinoSelect.appendChild(optionDestino);
        }
    });
}

function actualizarConceptosDestino() {
    const destinoSelect = document.getElementById('concepto-destino');
    
    // Limpiar opciones
    destinoSelect.innerHTML = '';
    
    // Cargar conceptos de gastos para el destino
    const conceptosGastos = Object.keys(presupuesto.proyeccion.gastos);
        
    // Agregar opciones de gastos
    conceptosGastos.forEach(concepto => {
        const optionDestino = document.createElement('option');
        optionDestino.value = concepto;
        optionDestino.textContent = concepto;
        destinoSelect.appendChild(optionDestino);
    });
}

// Funciones para proyección inicial
function calcularProyeccion() {
    // Calcular ingresos
    calcularIngresos();
    
    // Calcular gastos
    calcularGastos();
    
    // Actualizar totales
    actualizarTotales();
    
    // Mostrar mensaje de éxito
    //mostrarMensaje('Proyección calculada correctamente', 'success');
}

function calcularIngresos() {
    presupuesto.proyeccion.ingresos = {};
    
    // Solo procesar ingresos dinámicos agregados por el usuario
    let totalBase2025 = 0;
    
    document.querySelectorAll('[id^="concepto-ingreso-"]').forEach(input => {
        const id = input.id.split('-')[2];
        const concepto = input.value.trim() || `Ingreso ${id}`;
        const base = parseFloat(document.getElementById(`base-ingreso-${id}`)?.value) || 0;
        const tasa = parseFloat(document.getElementById(`crec-ingreso-${id}`)?.value) || 0;
        const proy = base * (1 + tasa / 100);
        
        const proyElement = document.getElementById(`proy-ingreso-${id}`);
        if (proyElement) {
            proyElement.textContent = formatNumber(proy);
        }
        
        if (concepto) {
            presupuesto.proyeccion.ingresos[concepto] = proy;
        }
        totalBase2025 += base;
    });

    // Calcular total ingresos 2025 (base)
    document.getElementById('total-ingresos-2025').textContent = formatNumber(totalBase2025);
}

function calcularGastos() {
    presupuesto.proyeccion.gastos = {};
    
    // Solo procesar gastos dinámicos agregados por el usuario
    let totalBase2025 = 0;
    
    document.querySelectorAll('[id^="concepto-gasto-"]').forEach(input => {
        const id = input.id.split('-')[2];
        const concepto = input.value.trim() || `Gasto ${id}`;
        const base = parseFloat(document.getElementById(`base-gasto-${id}`)?.value) || 0;
        const tasa = parseFloat(document.getElementById(`crec-gasto-${id}`)?.value) || 0;
        const proy = base * (1 + tasa / 100);
        
        const proyElement = document.getElementById(`proy-gasto-${id}`);
        if (proyElement) {
            proyElement.textContent = formatNumber(proy);
        }
        
        if (concepto) {
            presupuesto.proyeccion.gastos[concepto] = proy;
        }
        totalBase2025 += base;
    });

    // Calcular total gastos 2025 (base)
    document.getElementById('total-gastos-2025').textContent = formatNumber(totalBase2025);
}

function actualizarTotales() {
    // Calcular total ingresos 2026
    let totalIngresos2026 = 0;
    for (const [key, value] of Object.entries(presupuesto.proyeccion.ingresos)) {
        totalIngresos2026 += value;
    }
    document.getElementById('total-ingresos-2026').textContent = formatNumber(totalIngresos2026);
    
    // Calcular total gastos 2026
    let totalGastos2026 = 0;
    for (const [key, value] of Object.entries(presupuesto.proyeccion.gastos)) {
        totalGastos2026 += value;
    }
    document.getElementById('total-gastos-2026').textContent = formatNumber(totalGastos2026);
    
    // Calcular subtotales por categoría
    calcularSubtotalesCategorias();
    
    // Inicializar presupuesto actualizado con la proyección
    presupuesto.actualizado.ingresos = JSON.parse(JSON.stringify(presupuesto.proyeccion.ingresos));
    presupuesto.actualizado.gastos = JSON.parse(JSON.stringify(presupuesto.proyeccion.gastos));
}

function calcularSubtotalesCategorias() {
    // Ingresos Tributarios
    let subtotalTributarios = 0;
    
    // Agregar dinámicos de tributarios
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="tributarios"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalTributarios += valor;
    });
    
    if (document.getElementById('subtotal-tributarios')) {
        document.getElementById('subtotal-tributarios').textContent = formatNumber(subtotalTributarios);
    }
    
    // Ingresos No Tributarios
    let subtotalNoTributarios = 0;
    
    // Agregar dinámicos de no-tributarios
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="no-tributarios"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalNoTributarios += valor;
    });
    
    if (document.getElementById('subtotal-no-tributarios')) {
        document.getElementById('subtotal-no-tributarios').textContent = formatNumber(subtotalNoTributarios);
    }
    
    // Transferencias (Ingresos)
    let subtotalTransferenciasIngreso = 0;
    
    // Agregar dinámicos de transferencias
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="transferencias"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalTransferenciasIngreso += valor;
    });
    
    if (document.getElementById('subtotal-transferencias-ingreso')) {
        document.getElementById('subtotal-transferencias-ingreso').textContent = formatNumber(subtotalTransferenciasIngreso);
    }
    
    // Recursos del Crédito
    let subtotalRecursosCredito = 0;
    
    // Agregar dinámicos de recursos-credito
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="recursos-credito"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalRecursosCredito += valor;
    });
    
    if (document.getElementById('subtotal-recursos-credito')) {
        document.getElementById('subtotal-recursos-credito').textContent = formatNumber(subtotalRecursosCredito);
    }

    // Recursos del Balance
    let subtotalRecursosBalance = 0;
    
    // Agregar dinámicos de recursos-balance
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="recursos-balance"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalRecursosBalance += valor;
    });
    
    if (document.getElementById('subtotal-recursos-balance')) {
        document.getElementById('subtotal-recursos-balance').textContent = formatNumber(subtotalRecursosBalance);
    }

    // Excedentes Financieros
    let subtotalExcedentesFinancieros = 0;
    
    // Agregar dinámicos de excedentes-financieros
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="excedentes-financieros"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalExcedentesFinancieros += valor;
    });
    
    if (document.getElementById('subtotal-excedentes-financieros')) {
        document.getElementById('subtotal-excedentes-financieros').textContent = formatNumber(subtotalExcedentesFinancieros);
    }

    // Rendimientos Financieros
    let subtotalRendimientosFinancieros = 0;
    
    // Agregar dinámicos de rendimientos-financieros
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="rendimientos-financieros"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalRendimientosFinancieros += valor;
    });
    
    if (document.getElementById('subtotal-rendimientos-financieros')) {
        document.getElementById('subtotal-rendimientos-financieros').textContent = formatNumber(subtotalRendimientosFinancieros);
    }

    // Venta de Activos
    let subtotalVentaActivos = 0;
    
    // Agregar dinámicos de venta-activos
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="venta-activos"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalVentaActivos += valor;
    });
    
    if (document.getElementById('subtotal-venta-activos')) {
        document.getElementById('subtotal-venta-activos').textContent = formatNumber(subtotalVentaActivos);
    }

    // Donaciones
    let subtotalDonaciones = 0;
    
    // Agregar dinámicos de donaciones
    document.querySelectorAll('.fila-dinamica-ingreso[data-categoria="donaciones"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-ingreso-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalDonaciones += valor;
    });
    
    if (document.getElementById('subtotal-donaciones')) {
        document.getElementById('subtotal-donaciones').textContent = formatNumber(subtotalDonaciones);
    }
    
    // Gastos de Funcionamiento
    let subtotalFuncionamiento = 0;
    
    // Agregar dinámicos de funcionamiento
    document.querySelectorAll('.fila-dinamica-gasto[data-categoria="funcionamiento"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-gasto-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalFuncionamiento += valor;
    });
    
    if (document.getElementById('subtotal-funcionamiento')) {
        document.getElementById('subtotal-funcionamiento').textContent = formatNumber(subtotalFuncionamiento);
    }
    
    // Transferencias (Gastos)
    let subtotalTransferenciasGasto = 0;
    
    // Agregar dinámicos de transferencias-gastos
    document.querySelectorAll('.fila-dinamica-gasto[data-categoria="transferencias-gastos"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-gasto-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalTransferenciasGasto += valor;
    });
    
    if (document.getElementById('subtotal-transferencias-gasto')) {
        document.getElementById('subtotal-transferencias-gasto').textContent = formatNumber(subtotalTransferenciasGasto);
    }
    
    // Gastos de Inversión
    let subtotalInversion = 0;
    
    // Agregar dinámicos de inversión
    document.querySelectorAll('.fila-dinamica-gasto[data-categoria="inversion"]').forEach(fila => {
        const id = fila.getAttribute('data-id');
        const valor = parseFloat(document.getElementById(`proy-gasto-${id}`)?.textContent.replace(/\./g, '')) || 0;
        subtotalInversion += valor;
    });
    
    if (document.getElementById('subtotal-inversion')) {
        document.getElementById('subtotal-inversion').textContent = formatNumber(subtotalInversion);
    }
}

function verificarEquilibrio() {
    const totalIngresos = parseFloat(document.getElementById('total-ingresos-2026').textContent.replace(/\./g, '')) || 0;
    const totalGastos = parseFloat(document.getElementById('total-gastos-2026').textContent.replace(/\./g, '')) || 0;
    
    const diferencia = totalIngresos - totalGastos;
    const alertDiv = document.getElementById('balance-alert');
    
    if (Math.abs(diferencia) < 1) { // Consideramos iguales si la diferencia es menor a 1 millón
        alertDiv.textContent = 'El presupuesto está en equilibrio. Ingresos y gastos coinciden.';
        alertDiv.className = 'alert alert-success';
        alertDiv.style.display = 'block';
    } else if (diferencia > 0) {
        alertDiv.textContent = `El presupuesto tiene superávit. Los ingresos exceden los gastos por ${formatNumber(diferencia)} millones.`;
        alertDiv.className = 'alert alert-success';
        alertDiv.style.display = 'block';
    } else {
        alertDiv.textContent = `El presupuesto tiene déficit. Los gastos exceden los ingresos por ${formatNumber(Math.abs(diferencia))} millones.`;
        alertDiv.className = 'alert alert-danger';
        alertDiv.style.display = 'block';
    }
}

// Funciones para modificaciones presupuestales
function agregarModificacion() {
    const tipo = document.getElementById('tipo-modificacion').value;
    const area = document.getElementById('area-modificacion').value;
    const concepto = document.getElementById('concepto-modificacion').value;
    const conceptoDestino = tipo === 'traslado' ? document.getElementById('concepto-destino').value : '';
    const valor = parseFloat(document.getElementById('valor-modificacion').value) || 0;
    const justificacion = document.getElementById('justificacion-modificacion').value;
    
    // Validación mejorada de campos
    if (!tipo) {
        mostrarMensaje('Debe seleccionar un tipo de modificación', 'warning');
        return;
    }
    if (!area) {
        mostrarMensaje('Debe seleccionar un área (Ingresos o Gastos)', 'warning');
        return;
    }
    if (!concepto) {
        mostrarMensaje('Debe seleccionar un concepto', 'warning');
        return;
    }
    if (valor <= 0) {
        mostrarMensaje('Debe ingresar un valor mayor a cero', 'warning');
        return;
    }
    if (!justificacion.trim()) {
        mostrarMensaje('Debe ingresar una justificación para la modificación', 'warning');
        return;
    }

    // Verificar disponibilidad del concepto origen (solo en reducción y traslado)
    if (tipo === 'reduccion' || tipo === 'traslado') {
        const disponible = presupuesto.actualizado[area][concepto] || 0;

        if (valor > disponible) {
            mostrarMensaje(`No se puede ${tipo === 'traslado' ? 'trasladar' : 'reducir'} ${formatNumber(valor)} millones del concepto "${concepto}" porque solo hay disponibles ${formatNumber(disponible)} millones.`, 'danger');
            return;
        }
    }
    
    // Para traslados, crear y aplicar inmediatamente
    if (tipo === 'traslado') {
        if (!conceptoDestino) {
            mostrarMensaje('Debe seleccionar un concepto destino para el traslado', 'danger');
            return;
        }
        
        const modificacion = {
            id: Date.now(),
            tipo,
            area,
            concepto,
            conceptoDestino,
            valor,
            justificacion,
            fecha: new Date().toLocaleDateString()
        };

        presupuesto.modificaciones.push(modificacion);
        aplicarModificacion(modificacion);
        actualizarTablas();
        resetearFormularioCompleto();
        mostrarMensaje('Traslado aplicado correctamente', 'success');
        return;
    }
    
    // Para adiciones y reducciones de ingresos, mostrar sistema de distribución en gastos
    if ((tipo === 'adicion' || tipo === 'reduccion') && area === 'ingresos') {
        // No limpiar formulario aún, mostrar distribución
        mostrarDistribucionIngreso(valor, concepto, justificacion, tipo);
        return;
    }
    
    // Para otros casos (adiciones/reducciones directas en gastos), aplicar directamente
    const modificacion = {
        id: Date.now(),
        tipo,
        area,
        concepto,
        conceptoDestino,
        valor,
        justificacion,
        fecha: new Date().toLocaleDateString()
    };

    presupuesto.modificaciones.push(modificacion);
    aplicarModificacion(modificacion);
    actualizarTablas();
    resetearFormularioCompleto();
    mostrarMensaje('Modificación aplicada correctamente', 'success');
    
    // Actualizar tabla de modificaciones
    actualizarTablaModificaciones();
    
    // Actualizar tablas de presupuesto actualizado
    actualizarPresupuestoActualizado();
    
    // Limpiar formulario
    document.getElementById('valor-modificacion').value = '';
    document.getElementById('justificacion-modificacion').value = '';
}

// Nueva función para distribución de modificaciones de ingresos en gastos
function mostrarDistribucionIngreso(valor, conceptoIngreso, justificacion, tipoOperacion) {
    const contenedor = document.getElementById('distribucion-contenedor');
    const seccion = document.getElementById('distribucion-gasto');
    const etiqueta = seccion.querySelector('label');
    const infoValor = seccion.querySelector('.info-valor-distribucion');
    const spanValor = document.getElementById('valor-total-distribucion');
    
    contenedor.innerHTML = '';
    seccion.style.display = 'block';
    infoValor.style.display = 'block';
    spanValor.textContent = formatNumber(valor);
    
    seccion.setAttribute('data-valor-total', valor);
    seccion.setAttribute('data-concepto-ingreso', conceptoIngreso);
    seccion.setAttribute('data-justificacion', justificacion);
    seccion.setAttribute('data-tipo-operacion', tipoOperacion);

    // Actualizar texto de la etiqueta
    etiqueta.textContent = `Distribución de la ${tipoOperacion.charAt(0).toUpperCase() + tipoOperacion.slice(1)} en Gastos (Debe sumar exactamente el valor ingresado):`;

    const conceptosGasto = Object.keys(presupuesto.proyeccion.gastos);
    
    // Agregar primera fila inicial
    agregarFilaDistribucionGasto(conceptosGasto);
}

// Funciones para manejar la distribución
function agregarFilaDistribucion() {
    const contenedor = document.getElementById('distribucion-contenedor');
    const conceptoIngreso = document.getElementById('distribucion-gasto').getAttribute('data-concepto-ingreso');
    
    let conceptos;
    if (conceptoIngreso) {
        // Es distribución de ingresos en gastos
        conceptos = Object.keys(presupuesto.proyeccion.gastos);
        agregarFilaDistribucionGasto(conceptos);
    } else {
        // Es distribución normal (gastos en gastos)
        conceptos = Object.keys(presupuesto.proyeccion.gastos);
        const fila = document.createElement('div');
        fila.classList.add('fila-distribucion');

        fila.innerHTML = `
            <select class="concepto-distribucion">
                ${conceptos.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <input type="number" class="valor-distribucion" min="0" placeholder="Valor (millones)">
            <button type="button" class="btn-eliminar-fila-distribucion">✖</button>
        `;

        contenedor.appendChild(fila);
        actualizarSumaDistribucion();
    }
}

function guardarDistribucion() {
    const conceptoIngreso = document.getElementById('distribucion-gasto').getAttribute('data-concepto-ingreso');
    
    if (conceptoIngreso) {
        // Es distribución de ingresos en gastos
        guardarDistribucionIngreso();
    } else {
        // Es distribución normal (no implementada aún)
        mostrarMensaje('Tipo de distribución no implementado', 'danger');
    }
}

function agregarFilaDistribucionGasto(conceptos) {
    const contenedor = document.getElementById('distribucion-contenedor');
    const fila = document.createElement('div');
    fila.classList.add('fila-distribucion');

    fila.innerHTML = `
        <select class="concepto-distribucion">
            ${conceptos.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="number" class="valor-distribucion" min="0" placeholder="Valor (millones)">
        <button type="button" class="btn-eliminar-fila-distribucion">X</button>
    `;

    contenedor.appendChild(fila);
    
    // Actualizar suma después de agregar nueva fila
    actualizarSumaDistribucion();
}

// Función para actualizar la suma en tiempo real
function actualizarSumaDistribucion() {
    const seccionDistribucion = document.getElementById('distribucion-gasto');
    
    // Verificar que la sección de distribución esté visible
    if (!seccionDistribucion || seccionDistribucion.style.display === 'none') {
        return;
    }
    
    const valorTotal = parseFloat(seccionDistribucion.getAttribute('data-valor-total')) || 0;
    const filas = document.querySelectorAll('.fila-distribucion');
    let sumaActual = 0;
    
    filas.forEach(fila => {
        const valorInput = fila.querySelector('.valor-distribucion');
        if (valorInput) {
            const valor = parseFloat(valorInput.value) || 0;
            sumaActual += valor;
        }
    });
    
    const sumaSpan = document.getElementById('suma-actual-distribucion');
    const diferenciaSpan = document.getElementById('diferencia-distribucion');
    
    if (sumaSpan && diferenciaSpan) {
        sumaSpan.textContent = formatNumber(sumaActual);
        
        const diferencia = valorTotal - sumaActual;
        if (Math.abs(diferencia) < 0.01) {
            diferenciaSpan.textContent = '✓ ¡Correcto!';
            diferenciaSpan.style.color = '#28a745';
        } else if (diferencia > 0) {
            diferenciaSpan.textContent = `(Faltan ${formatNumber(diferencia)} millones)`;
            diferenciaSpan.style.color = '#dc3545';
        } else {
            diferenciaSpan.textContent = `(Sobran ${formatNumber(Math.abs(diferencia))} millones)`;
            diferenciaSpan.style.color = '#dc3545';
        }
    }
}

function guardarDistribucionIngreso() {
    const totalEsperado = parseFloat(document.getElementById('distribucion-gasto').getAttribute('data-valor-total'));
    const conceptoIngreso = document.getElementById('distribucion-gasto').getAttribute('data-concepto-ingreso');
    const justificacion = document.getElementById('distribucion-gasto').getAttribute('data-justificacion');
    const tipoOperacion = document.getElementById('distribucion-gasto').getAttribute('data-tipo-operacion');
    const filas = document.querySelectorAll('.fila-distribucion');

    let sumaDistribucion = 0;
    const distribuciones = [];

    filas.forEach(fila => {
        const concepto = fila.querySelector('.concepto-distribucion').value;
        const valor = parseFloat(fila.querySelector('.valor-distribucion').value) || 0;
        if (valor > 0) {
            sumaDistribucion += valor;
            distribuciones.push({ concepto, valor });
        }
    });

    if (Math.abs(sumaDistribucion - totalEsperado) > 0.01) {
        mostrarMensaje(`La suma de la distribución (${formatNumber(sumaDistribucion)}) debe ser igual al valor original (${formatNumber(totalEsperado)}).`, 'danger');
        return;
    }

    if (distribuciones.length === 0) {
        mostrarMensaje('Debe distribuir al menos en un concepto de gasto', 'danger');
        return;
    }

    // Para reducciones, verificar disponibilidad en cada concepto de gasto
    if (tipoOperacion === 'reduccion') {
        for (const dist of distribuciones) {
            const disponible = presupuesto.actualizado.gastos[dist.concepto] || 0;
            if (dist.valor > disponible) {
                mostrarMensaje(`No se puede reducir ${formatNumber(dist.valor)} millones del concepto de gasto "${dist.concepto}" porque solo hay disponibles ${formatNumber(disponible)} millones.`, 'danger');
                return;
            }
        }
    }

    // Crear modificación en ingresos
    const modificacionIngreso = {
        id: Date.now(),
        tipo: tipoOperacion,
        area: 'ingresos',
        concepto: conceptoIngreso,
        conceptoDestino: '',
        valor: totalEsperado,
        justificacion: justificacion,
        fecha: new Date().toLocaleDateString()
    };

    presupuesto.modificaciones.push(modificacionIngreso);
    aplicarModificacion(modificacionIngreso);

    // Crear modificaciones en gastos para cada distribución
    distribuciones.forEach((dist, index) => {
        const modificacionGasto = {
            id: Date.now() + index + 1,
            tipo: tipoOperacion,
            area: 'gastos',
            concepto: dist.concepto,
            conceptoDestino: '',
            valor: dist.valor,
            justificacion: `Equilibrio por ${tipoOperacion} de ingreso "${conceptoIngreso}": ${justificacion}`,
            fecha: new Date().toLocaleDateString(),
            esEquilibrio: true
        };
        
        presupuesto.modificaciones.push(modificacionGasto);
        aplicarModificacion(modificacionGasto);
    });

    actualizarTablas();
    console.log('Modificaciones después de distribución:', presupuesto.modificaciones); // Debug
    const mensajeOperacion = tipoOperacion === 'adicion' ? 
        'Adición distribuida correctamente en gastos para mantener equilibrio' : 
        'Reducción distribuida correctamente en gastos para mantener equilibrio';
    mostrarMensaje(mensajeOperacion, 'success');

    // Limpiar UI de distribución ANTES del reset
    ocultarSeccionDistribucion();
    
    // Resetear formulario completamente para distribución
    resetearFormularioPostDistribucion();
}

// Función específica para reset después de distribución exitosa
function resetearFormularioPostDistribucion() {
    // Limpiar formulario sin manejar distribución (ya se hizo)
    document.getElementById('tipo-modificacion').value = '';
    document.getElementById('area-modificacion').value = '';
    document.getElementById('concepto-modificacion').value = '';
    document.getElementById('concepto-destino').value = '';
    document.getElementById('valor-modificacion').value = '';
    document.getElementById('justificacion-modificacion').value = '';
    
    // Limpiar las listas de conceptos
    document.getElementById('concepto-modificacion').innerHTML = '';
    document.getElementById('concepto-destino').innerHTML = '';
    
    // Ocultar grupo de concepto destino
    document.getElementById('concepto-destino-group').style.display = 'none';
    
    // Habilitar área de modificación
    document.getElementById('area-modificacion').disabled = false;
    
    // Actualizar contador
    actualizarContadorModificaciones();
    
    // Mensaje específico para distribución
    mostrarMensaje('✅ Distribución registrada correctamente. Formulario listo para nueva modificación.', 'success');
}

// Función específica para ocultar la sección de distribución
function ocultarSeccionDistribucion() {
    const distribucionSection = document.getElementById('distribucion-gasto');
    const infoValor = document.querySelector('.info-valor-distribucion');
    const contenedor = document.getElementById('distribucion-contenedor');
    
    if (distribucionSection) {
        distribucionSection.style.display = 'none';
    }
    if (infoValor) {
        infoValor.style.display = 'none';
    }
    if (contenedor) {
        contenedor.innerHTML = '';
    }
    
    // Limpiar valores de distribución de forma segura
    const valorTotal = document.getElementById('valor-total-distribucion');
    const sumaActual = document.getElementById('suma-actual-distribucion');
    const diferencia = document.getElementById('diferencia-distribucion');
    
    if (valorTotal) valorTotal.textContent = '0';
    if (sumaActual) sumaActual.textContent = '0';
    if (diferencia) diferencia.textContent = '';
}

function limpiarFormulario() {
    // Limpiar todos los campos del formulario
    document.getElementById('tipo-modificacion').value = '';
    document.getElementById('area-modificacion').value = '';
    document.getElementById('concepto-modificacion').value = '';
    document.getElementById('concepto-destino').value = '';
    document.getElementById('valor-modificacion').value = '';
    document.getElementById('justificacion-modificacion').value = '';
    
    // Limpiar las listas de conceptos
    document.getElementById('concepto-modificacion').innerHTML = '';
    document.getElementById('concepto-destino').innerHTML = '';
    
    // Ocultar grupo de concepto destino
    document.getElementById('concepto-destino-group').style.display = 'none';
    
    // Solo manejar distribución si NO está siendo manejada por otra función
    const distribucionSection = document.getElementById('distribucion-gasto');
    if (distribucionSection && distribucionSection.style.display !== 'none') {
        ocultarSeccionDistribucion();
    }
    
    // Habilitar área de modificación si estaba deshabilitada
    document.getElementById('area-modificacion').disabled = false;
}

// Nueva función para reset completo después de operación exitosa
function resetearFormularioCompleto() {
    // Llamar a limpiar formulario (que ya maneja la distribución inteligentemente)
    limpiarFormulario();
    
    // Actualizar contador de modificaciones
    actualizarContadorModificaciones();
    
    // Mostrar mensaje de que se puede agregar otra modificación (sin delay para distribuciones)
    mostrarMensaje('✅ Modificación guardada. Puede agregar otra modificación.', 'info');
}

// Función para actualizar el contador de modificaciones
function actualizarContadorModificaciones() {
    const contador = document.getElementById('contador-mods');
    if (contador) {
        contador.textContent = presupuesto.modificaciones.length;
    }
}

function actualizarTablas() {
    actualizarPresupuestoActualizado();
    actualizarTablaModificaciones();
    actualizarContadorModificaciones();
    calcularIndicadores();
    mostrarEquilibrio();
}

// Función para mantener equilibrio automático entre ingresos y gastos
function aplicarModificacion(modificacion) {
    const { tipo, area, concepto, conceptoDestino, valor } = modificacion;
    
    if (area === 'ingresos') {
        if (tipo === 'adicion') {
            presupuesto.actualizado.ingresos[concepto] = (presupuesto.actualizado.ingresos[concepto] || 0) + valor;
        } else if (tipo === 'reduccion') {
            presupuesto.actualizado.ingresos[concepto] = Math.max(0, (presupuesto.actualizado.ingresos[concepto] || 0) - valor);
        } else if (tipo === 'traslado') {
            presupuesto.actualizado.ingresos[concepto] = Math.max(0, (presupuesto.actualizado.ingresos[concepto] || 0) - valor);
            presupuesto.actualizado.ingresos[conceptoDestino] = (presupuesto.actualizado.ingresos[conceptoDestino] || 0) + valor;
        }
    } else { // Gastos
        if (tipo === 'adicion') {
            presupuesto.actualizado.gastos[concepto] = (presupuesto.actualizado.gastos[concepto] || 0) + valor;
        } else if (tipo === 'reduccion') {
            presupuesto.actualizado.gastos[concepto] = Math.max(0, (presupuesto.actualizado.gastos[concepto] || 0) - valor);
        } else if (tipo === 'traslado') {
            presupuesto.actualizado.gastos[concepto] = Math.max(0, (presupuesto.actualizado.gastos[concepto] || 0) - valor);
            presupuesto.actualizado.gastos[conceptoDestino] = (presupuesto.actualizado.gastos[conceptoDestino] || 0) + valor;
        }
    }
}

function actualizarTablaModificaciones() {
    const tbody = document.querySelector('#modificaciones-table tbody');
    tbody.innerHTML = '';
    
    console.log('Actualizando tabla con modificaciones:', presupuesto.modificaciones); // Debug
    
    presupuesto.modificaciones.forEach(mod => {
        const row = document.createElement('tr');
        
        // Agregar clase especial para modificaciones de equilibrio
        if (mod.esEquilibrio) {
            row.classList.add('modificacion-automatica');
        }
        
        const tipoTexto = mod.esEquilibrio ? 
            `${mod.tipo.charAt(0).toUpperCase() + mod.tipo.slice(1)} (Equilibrio)` :
            mod.tipo.charAt(0).toUpperCase() + mod.tipo.slice(1);
        
        row.innerHTML = `
            <td>${tipoTexto}</td>
            <td>${mod.area.charAt(0).toUpperCase() + mod.area.slice(1)}</td>
            <td>${mod.concepto}</td>
            <td>${mod.conceptoDestino || '-'}</td>
            <td>${formatNumber(mod.valor)}</td>
            <td>${mod.justificacion}</td>
            <td>${mod.esEquilibrio ? '<span style="color: #28a745;">Equilibrio</span>' : `<button class="btn-eliminar" data-id="${mod.id}">Eliminar</button>`}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar eventos a botones eliminar (solo para modificaciones manuales)
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            eliminarModificacion(id);
        });
    });
}

function eliminarModificacion(id) {
    // Encontrar índice de la modificación
    const index = presupuesto.modificaciones.findIndex(mod => mod.id === id);
    
    if (index !== -1) {
        // Obtener modificación
        const mod = presupuesto.modificaciones[index];
        
        // Revertir modificación
        revertirModificacion(mod);
        
        // Eliminar del array
        presupuesto.modificaciones.splice(index, 1);
        
        // Actualizar tablas
        actualizarTablaModificaciones();
        actualizarPresupuestoActualizado();
        actualizarContadorModificaciones();
        
        mostrarMensaje('Modificación eliminada correctamente', 'success');
    }
}

function revertirModificacion(modificacion) {
    const { tipo, area, concepto, conceptoDestino, valor } = modificacion;
    
    if (area === 'ingresos') {
        if (tipo === 'adicion') {
            presupuesto.actualizado.ingresos[concepto] = Math.max(0, (presupuesto.actualizado.ingresos[concepto] || 0) - valor);
        } else if (tipo === 'reduccion') {
            presupuesto.actualizado.ingresos[concepto] = (presupuesto.actualizado.ingresos[concepto] || 0) + valor;
        } else if (tipo === 'traslado') {
            presupuesto.actualizado.ingresos[concepto] = (presupuesto.actualizado.ingresos[concepto] || 0) + valor;
            presupuesto.actualizado.ingresos[conceptoDestino] = Math.max(0, (presupuesto.actualizado.ingresos[conceptoDestino] || 0) - valor);
        }
    } else { // Gastos
        if (tipo === 'adicion') {
            presupuesto.actualizado.gastos[concepto] = Math.max(0, (presupuesto.actualizado.gastos[concepto] || 0) - valor);
        } else if (tipo === 'reduccion') {
            presupuesto.actualizado.gastos[concepto] = (presupuesto.actualizado.gastos[concepto] || 0) + valor;
        } else if (tipo === 'traslado') {
            presupuesto.actualizado.gastos[concepto] = (presupuesto.actualizado.gastos[concepto] || 0) + valor;
            presupuesto.actualizado.gastos[conceptoDestino] = Math.max(0, (presupuesto.actualizado.gastos[conceptoDestino] || 0) - valor);
        }
    }
}

function actualizarPresupuestoActualizado() {
    // Actualizar tabla de ingresos actualizados
    const ingresosTbody = document.querySelector('#ingresos-actualizados-table tbody');
    ingresosTbody.innerHTML = '';
    
    for (const [concepto, valorInicial] of Object.entries(presupuesto.proyeccion.ingresos)) {
        const valorActual = presupuesto.actualizado.ingresos[concepto] || 0;
        const modificacion = valorActual - valorInicial;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${concepto}</td>
            <td>${formatNumber(valorInicial)}</td>
            <td>${modificacion !== 0 ? formatNumber(modificacion) : '-'}</td>
            <td>${formatNumber(valorActual)}</td>
        `;
        ingresosTbody.appendChild(row);
    }
    
    // Actualizar tabla de gastos actualizados
    const gastosTbody = document.querySelector('#gastos-actualizados-table tbody');
    gastosTbody.innerHTML = '';
    
    for (const [concepto, valorInicial] of Object.entries(presupuesto.proyeccion.gastos)) {
        const valorActual = presupuesto.actualizado.gastos[concepto] || 0;
        const modificacion = valorActual - valorInicial;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${concepto}</td>
            <td>${formatNumber(valorInicial)}</td>
            <td>${modificacion !== 0 ? formatNumber(modificacion) : '-'}</td>
            <td>${formatNumber(valorActual)}</td>
        `;
        gastosTbody.appendChild(row);
    }
    
    // Verificar equilibrio
    const totalIngresos = Object.values(presupuesto.actualizado.ingresos).reduce((a, b) => a + b, 0);
    const totalGastos = Object.values(presupuesto.actualizado.gastos).reduce((a, b) => a + b, 0);
    const diferencia = totalIngresos - totalGastos;
    const alertDiv = document.getElementById('balance-modificaciones');
    
    if (Math.abs(diferencia) < 1) {
        alertDiv.textContent = 'Presupuesto actualizado está en equilibrio.';
        alertDiv.className = 'alert alert-success';
        alertDiv.style.display = 'block';
    } else if (diferencia > 0) {
        alertDiv.textContent = `Presupuesto actualizado tiene superávit de ${formatNumber(diferencia)} millones.`;
        alertDiv.className = 'alert alert-success';
        alertDiv.style.display = 'block';
    } else {
        alertDiv.textContent = `Presupuesto actualizado tiene déficit de ${formatNumber(Math.abs(diferencia))} millones.`;
        alertDiv.className = 'alert alert-danger';
        alertDiv.style.display = 'block';
    }
    
    // Recalcular indicadores cuando se actualiza el presupuesto
    calcularIndicadores();
}

// Funciones para indicadores
function calcularIndicadores() {
    // ===== CÁLCULO DE TOTALES APROBADOS (PRESUPUESTO ACTUALIZADO) =====
    const totalIngresosAprobado = Object.values(presupuesto.actualizado.ingresos).reduce((a, b) => a + b, 0);
    const totalGastosAprobado = Object.values(presupuesto.actualizado.gastos).reduce((a, b) => a + b, 0);
    
    // ===== SIMULACIÓN DE EJECUCIÓN (en un caso real vendrían de inputs del usuario) =====
    // Para demostración, calcular porcentajes realistas de ejecución basados en:
    // - Mes del año (mayor ejecución hacia fin de año)
    // - Tamaño del presupuesto (presupuestos más grandes suelen tener menor ejecución)
    
    const mesActual = new Date().getMonth() + 1; // 1-12
    const factorMes = Math.min(1.0, mesActual / 12); // Factor de 0.08 a 1.0
    
    // Porcentajes base ajustados por el factor de mes y tamaño del presupuesto
    let porcentajeEjecucionIngresos = 0;
    let porcentajeEjecucionGastos = 0;
    
    if (totalIngresosAprobado > 0) {
        // Ingresos: Base 85%, ajustado por mes (mínimo 70%)
        porcentajeEjecucionIngresos = Math.max(70, 85 * factorMes);
        // Si el presupuesto es muy grande (>50000 millones), reducir 5%
        if (totalIngresosAprobado > 50000) porcentajeEjecucionIngresos -= 5;
    }
    
    if (totalGastosAprobado > 0) {
        // Gastos: Base 75%, ajustado por mes (mínimo 60%)
        porcentajeEjecucionGastos = Math.max(60, 75 * factorMes);
        // Si el presupuesto es muy grande (>50000 millones), reducir 5%
        if (totalGastosAprobado > 50000) porcentajeEjecucionGastos -= 5;
    }
    
    const totalIngresosEjecutado = (totalIngresosAprobado * porcentajeEjecucionIngresos) / 100;
    const totalGastosEjecutado = (totalGastosAprobado * porcentajeEjecucionGastos) / 100;
    
    // ===== CÁLCULO DE GASTOS DE FUNCIONAMIENTO =====
    // Incluir conceptos fijos de funcionamiento
    const conceptosFuncionamiento = [
        'Servicios Personales', 'Honorarios Concejales', 'Gastos Generales', 
        'Sistematización', 'Pensiones', 'Cesantías', 'EPS', 
        'Caja de Compensación', 'ESAP, Escuelas industriales', 'ARL', 
        'Concejo Municipal', 'Personería Municipal', 'Contribuciones Nómina'
    ];
    
    let gastosFuncionamiento = 0;
    for (const [concepto, valor] of Object.entries(presupuesto.actualizado.gastos)) {
        // Si el concepto está en la lista de funcionamiento, sumarlo
        if (conceptosFuncionamiento.some(cf => concepto.includes(cf) || cf.includes(concepto))) {
            gastosFuncionamiento += valor || 0;
        }
        // También incluir conceptos que contengan palabras clave de funcionamiento
        else if (concepto.toLowerCase().includes('personal') || 
                concepto.toLowerCase().includes('honorario') || 
                concepto.toLowerCase().includes('general') ||
                concepto.toLowerCase().includes('nómina') ||
                concepto.toLowerCase().includes('pensión')) {
            gastosFuncionamiento += valor || 0;
        }
    }
    
    // ===== CÁLCULO DE GASTOS DE INVERSIÓN =====
    // Incluir conceptos fijos de inversión
    const conceptosInversion = [
        'Proyecto 1', 'Proyecto 2', 'Proyecto 3', 'Proyecto 4', 'Cobertura Salud'
    ];
    
    let gastosInversion = 0;
    for (const [concepto, valor] of Object.entries(presupuesto.actualizado.gastos)) {
        // Si el concepto está en la lista de inversión, sumarlo
        if (conceptosInversion.some(ci => concepto.includes(ci) || ci.includes(concepto))) {
            gastosInversion += valor || 0;
        }
        // También incluir conceptos que contengan palabras clave de inversión
        else if (concepto.toLowerCase().includes('proyecto') || 
                concepto.toLowerCase().includes('cobertura') || 
                concepto.toLowerCase().includes('inversión') ||
                concepto.toLowerCase().includes('obra')) {
            gastosInversion += valor || 0;
        }
    }
    
    // ===== CÁLCULO DE TRANSFERENCIAS =====
    // Incluir conceptos fijos de transferencias
    const conceptosTransferencias = ['SGP - Propósito General', 'FONPET'];
    
    let transferencias = 0;
    for (const [concepto, valor] of Object.entries(presupuesto.actualizado.ingresos)) {
        // Si el concepto está en la lista de transferencias, sumarlo
        if (conceptosTransferencias.some(ct => concepto.includes(ct) || ct.includes(concepto))) {
            transferencias += valor || 0;
        }
        // También incluir conceptos que contengan palabras clave de transferencias
        else if (concepto.toLowerCase().includes('sgp') || 
                concepto.toLowerCase().includes('fonpet') || 
                concepto.toLowerCase().includes('transferencia') ||
                concepto.toLowerCase().includes('participación') ||
                concepto.toLowerCase().includes('nacional')) {
            transferencias += valor || 0;
        }
    }
    
    // ===== CÁLCULO DE INDICADORES PRESUPUESTALES =====
    presupuesto.indicadores = {
        // 1. Nivel de ejecución presupuestal de ingresos 
        // Fórmula: (Ingresos Ejecutados / Ingresos Aprobados) * 100
        ejecucionIngresos: Math.round((porcentajeEjecucionIngresos * 100) / 100),
        
        // 2. Nivel de ejecución presupuestal de gastos
        // Fórmula: (Gastos Ejecutados / Gastos Aprobados) * 100  
        ejecucionGastos: Math.round((porcentajeEjecucionGastos * 100) / 100),
        
        // 3. Relación gasto de funcionamiento / gasto total
        // Fórmula: (Gastos de Funcionamiento / Gastos Totales) * 100
        relacionFuncionamiento: totalGastosAprobado > 0 ? Math.round((gastosFuncionamiento / totalGastosAprobado) * 100 * 100) / 100 : 0,
        
        // 4. Relación inversión / gasto total  
        // Fórmula: (Gastos de Inversión / Gastos Totales) * 100
        relacionInversion: totalGastosAprobado > 0 ? Math.round((gastosInversion / totalGastosAprobado) * 100 * 100) / 100 : 0,
        
        // 5. Dependencia de las transferencias
        // Fórmula: (Transferencias / Ingresos Totales) * 100
        dependenciaTransferencias: totalIngresosAprobado > 0 ? Math.round((transferencias / totalIngresosAprobado) * 100 * 100) / 100 : 0
    };
    
    // Debug: Mostrar cálculos en consola para verificación
    console.log('=== CÁLCULO DE INDICADORES PRESUPUESTALES ===');
    console.log(`Total Ingresos Aprobado: ${totalIngresosAprobado.toLocaleString()}`);
    console.log(`Total Gastos Aprobado: ${totalGastosAprobado.toLocaleString()}`);
    console.log(`Gastos Funcionamiento: ${gastosFuncionamiento.toLocaleString()}`);
    console.log(`Gastos Inversión: ${gastosInversion.toLocaleString()}`);
    console.log(`Transferencias: ${transferencias.toLocaleString()}`);
    console.log('Indicadores calculados:', presupuesto.indicadores);
    
    // Actualizar tabla de indicadores
    document.getElementById('ejecucion-ingresos').textContent = presupuesto.indicadores.ejecucionIngresos.toFixed(2);
    document.getElementById('ejecucion-gastos').textContent = presupuesto.indicadores.ejecucionGastos.toFixed(2);
    document.getElementById('relacion-funcionamiento').textContent = presupuesto.indicadores.relacionFuncionamiento.toFixed(2);
    document.getElementById('relacion-inversion').textContent = presupuesto.indicadores.relacionInversion.toFixed(2);
    document.getElementById('dependencia-transferencias').textContent = presupuesto.indicadores.dependenciaTransferencias.toFixed(2);
    
    // Interpretaciones
    document.getElementById('interpretacion-ejecucion-ingresos').textContent = 
        presupuesto.indicadores.ejecucionIngresos > 90 ? 'Excelente ejecución' :
        presupuesto.indicadores.ejecucionIngresos > 70 ? 'Buena ejecución' :
        presupuesto.indicadores.ejecucionIngresos > 50 ? 'Ejecución regular' : 'Baja ejecución';
        
    document.getElementById('interpretacion-ejecucion-gastos').textContent = 
        presupuesto.indicadores.ejecucionGastos > 90 ? 'Excelente ejecución' :
        presupuesto.indicadores.ejecucionGastos > 70 ? 'Buena ejecución' :
        presupuesto.indicadores.ejecucionGastos > 50 ? 'Ejecución regular' : 'Baja ejecución';
        
    document.getElementById('interpretacion-funcionamiento').textContent = 
        presupuesto.indicadores.relacionFuncionamiento > 70 ? 'Alto gasto en funcionamiento (riesgo)' :
        presupuesto.indicadores.relacionFuncionamiento > 50 ? 'Gasto moderado en funcionamiento' : 'Bajo gasto en funcionamiento';
        
    document.getElementById('interpretacion-inversion').textContent = 
        presupuesto.indicadores.relacionInversion > 40 ? 'Alta inversión (positivo)' :
        presupuesto.indicadores.relacionInversion > 20 ? 'Inversión moderada' : 'Baja inversión (riesgo)';
        
    document.getElementById('interpretacion-transferencias').textContent = 
        presupuesto.indicadores.dependenciaTransferencias > 60 ? 'Alta dependencia de transferencias (riesgo)' :
        presupuesto.indicadores.dependenciaTransferencias > 30 ? 'Dependencia moderada de transferencias' : 'Baja dependencia de transferencias';
    
    // Actualizar resumen en pestaña de análisis
    actualizarResumenIndicadores();
    
    // Generar recomendaciones automáticas
    generarRecomendaciones();
}










// Funciones para análisis
function actualizarResumenIndicadores() {
    const resumenDiv = document.getElementById('resumen-indicadores');
    resumenDiv.innerHTML = `
        <h4>Resumen de Indicadores Clave</h4>
        <ul>
            <li><strong>Ejecución de Ingresos:</strong> ${presupuesto.indicadores.ejecucionIngresos.toFixed(2)}%</li>
            <li><strong>Ejecución de Gastos:</strong> ${presupuesto.indicadores.ejecucionGastos.toFixed(2)}%</li>
            <li><strong>Gasto en Funcionamiento:</strong> ${presupuesto.indicadores.relacionFuncionamiento.toFixed(2)}% del gasto total</li>
            <li><strong>Gasto en Inversión:</strong> ${presupuesto.indicadores.relacionInversion.toFixed(2)}% del gasto total</li>
            <li><strong>Dependencia de Transferencias:</strong> ${presupuesto.indicadores.dependenciaTransferencias.toFixed(2)}% de los ingresos totales</li>
        </ul>
    `;
}

function generarRecomendaciones() {
    const recomendacionesDiv = document.getElementById('recomendaciones');
    let recomendaciones = [];
    
    // Recomendaciones basadas en ejecución
    if (presupuesto.indicadores.ejecucionIngresos < 70) {
        recomendaciones.push("Considerar estrategias para mejorar el recaudo de ingresos, como fortalecer la gestión de cobro o revisar tarifas.");
    }
    
    if (presupuesto.indicadores.ejecucionGastos < 60) {
        recomendaciones.push("Analizar las causas de la baja ejecución del gasto y revisar procesos de contratación y ejecución.");
    }
    
    // Recomendaciones basadas en composición
    if (presupuesto.indicadores.relacionFuncionamiento > 70) {
        recomendaciones.push("Evaluar oportunidades de eficiencia en gastos de funcionamiento para liberar recursos para inversión.");
    }
    
    if (presupuesto.indicadores.relacionInversion < 20) {
        recomendaciones.push("Priorizar la asignación de recursos a proyectos de inversión que generen desarrollo en el municipio.");
    }
    
    if (presupuesto.indicadores.dependenciaTransferencias > 60) {
        recomendaciones.push("Diversificar fuentes de ingresos propios para reducir dependencia de transferencias nacionales.");
    }
    
    // Mostrar recomendaciones
    if (recomendaciones.length > 0) {
        recomendacionesDiv.innerHTML = `
            <h4>Recomendaciones para Mejora</h4>
            <ul>
                ${recomendaciones.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
    } else {
        recomendacionesDiv.innerHTML = `
            <h4>Recomendaciones para Mejora</h4>
            <p>El presupuesto muestra indicadores saludables. Mantener las buenas prácticas actuales.</p>
        `;
    }
}

function guardarAnalisis() {
    const texto = document.getElementById('analisis-texto').value;
    presupuesto.analisis = texto;
    
    mostrarMensaje('Análisis guardado correctamente', 'success');
}

// Funciones para exportación/importación
function exportarDatos() {
    // Crear objeto con todos los datos
    const datosExportar = {
        presupuesto: presupuesto,
        fechaExportacion: new Date().toISOString(),
        version: '1.0'
    };
    
    // Convertir a JSON
    const jsonStr = JSON.stringify(datosExportar, null, 2);
    
    // Crear blob y descargar
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-municipal-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarMensaje('Datos exportados correctamente', 'success');
}

function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            presupuesto = datos.presupuesto;
            
            // Actualizar toda la interfaz
            actualizarInterfazConDatos();
            mostrarMensaje('Datos importados correctamente', 'success');
        } catch (error) {
            mostrarMensaje('Error al importar datos: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}

function actualizarInterfazConDatos() {
    // No necesitamos establecer valores en los spans ya que se calcularán automáticamente
    
    // Actualizar tablas de modificaciones
    actualizarTablaModificaciones();
    
    // Actualizar presupuesto actualizado
    actualizarPresupuestoActualizado();
    
    // Actualizar indicadores
    actualizarGraficos();
    
    // Actualizar análisis
    document.getElementById('analisis-texto').value = presupuesto.analisis || '';
    
    // Forzar recálculo de proyecciones
    calcularProyeccion();
}
// Funciones auxiliares
function formatNumber(num) {
    return new Intl.NumberFormat('es-CO').format(Math.round(num));
}

function mostrarMensaje(texto, tipo) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.textContent = texto;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Función para cargar datos de ejemplo (simulación)
function cargarDatosEjemplo() {
    // Ingresos
    document.getElementById('crec-sgp-input').value = TASA_INFLACION_2025 + 4;
    document.getElementById('predial-2025').value = 50000;
    document.getElementById('industria-2025').value = 30000;
    document.getElementById('tasa-vias-2025').value = 0;
    document.getElementById('crec-tasa-vias').value = 0;
    document.getElementById('venta-2025').value = 10000;
    document.getElementById('otros-no-trib-2025').value = 5000;
    document.getElementById('sgp-2024').value = 80000;
    document.getElementById('fonpet-2023').value = 20000;
    document.getElementById('credito-findeter-2025').value = 0;
    document.getElementById('crec-credito-findeter').value = 0;
    document.getElementById('credito-enterritorio-2025').value = 0;
    document.getElementById('crec-credito-enterritorio').value = 0;
    document.getElementById('donacion-alemana-2025').value = 0;
    document.getElementById('crec-donacion-alemana').value = 0;

    // Gastos
    document.getElementById('serv-personales-2025').value = 40000;
    document.getElementById('honorarios-concejales-2025').value = 7500;
    document.getElementById('crec-honorarios-concejales').value = 0;
    document.getElementById('gastos-generales-2025').value = 15000;
    document.getElementById('sistematizacion-2025').value = 0;
    document.getElementById('crec-sistematizacion').value = 0;
    document.getElementById('contribuciones-nomina-2025').value = 12000;
    document.getElementById('crec-contribuciones-nomina').value = 0;
    document.getElementById('fondo-deporte-cultura-2025').value = 5000;
    document.getElementById('crec-fondo-deporte-cultura').value = 0;
    document.getElementById('fondo-salud-2025').value = 8000;
    document.getElementById('crec-fondo-salud').value = 0;
    document.getElementById('concejo-municipal-2025').value = 60000;
    document.getElementById('crec-concejo-municipal').value = 0;
    document.getElementById('personeria-municipal-2025').value = 190000;
    document.getElementById('crec-personeria-municipal').value = 0;
    document.getElementById('proyecto1-2025').value = 20000;
    document.getElementById('proyecto2-2025').value = 15000;
    document.getElementById('proyecto3-2025').value = 10000;
    document.getElementById('proyecto4-2025').value = 5000;
    document.getElementById('cobertura-salud-2025').value = 0;
    document.getElementById('crec-cobertura-salud').value = 0;

    // Calcular proyecciones con los datos de ejemplo
    calcularProyeccion();

    // Modificaciones de ejemplo
    const modificacionesEjemplo = [
        {
            tipo: 'adicion',
            area: 'ingresos',
            concepto: 'Impuesto Predial',
            valor: 2000,
            justificacion: 'Ajuste por actualización catastral',
            id: Date.now() + 1,
            fecha: new Date().toLocaleDateString()
        },
        {
            tipo: 'reduccion',
            area: 'gastos',
            concepto: 'Gastos Generales',
            valor: 1000,
            justificacion: 'Optimización de contratos de servicios',
            id: Date.now() + 2,
            fecha: new Date().toLocaleDateString()
        },
        {
            tipo: 'traslado',
            area: 'gastos',
            concepto: 'Proyecto 1',
            conceptoDestino: 'Proyecto 3',
            valor: 3000,
            justificacion: 'Reorientación de recursos a proyecto prioritario',
            id: Date.now() + 3,
            fecha: new Date().toLocaleDateString()
        }
    ];
    
    presupuesto.modificaciones = modificacionesEjemplo;
    modificacionesEjemplo.forEach(mod => aplicarModificacion(mod));
    
    actualizarTablaModificaciones();
    actualizarPresupuestoActualizado();
    actualizarContadorModificaciones();
    
    // Simular datos de ejecución
    presupuesto.ejecucion = {
        ingresos: {},
        gastos: {}
    };
    
    for (const [key, value] of Object.entries(presupuesto.actualizado.ingresos)) {
        presupuesto.ejecucion.ingresos[key] = value * (0.7 + Math.random() * 0.3);
    }
    
    for (const [key, value] of Object.entries(presupuesto.actualizado.gastos)) {
        presupuesto.ejecucion.gastos[key] = value * (0.6 + Math.random() * 0.3);
    }
    
    actualizarGraficos();
}

// Eventos para añadir filas dinámicas por categoría
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('agregar-item-btn')) {
        const categoria = e.target.getAttribute('data-categoria');
        const esIngreso = [
            'tributarios', 
            'no-tributarios', 
            'transferencias', 
            'recursos-credito', 
            'recursos-balance',
            'excedentes-financieros',
            'rendimientos-financieros',
            'venta-activos',
            'donaciones'
        ].includes(categoria);
        const tabla = esIngreso ? document.querySelector('#ingresos-table tbody') : document.querySelector('#gastos-table tbody');
        const tipo = esIngreso ? 'ingreso' : 'gasto';
        
        agregarFilaPorCategoria(tabla, categoria, tipo);
    }
});

function agregarFilaPorCategoria(tabla, categoria, tipo) {
    const fila = document.createElement('tr');
    const id = Date.now();
    
    fila.classList.add(`fila-dinamica-${tipo}`);
    fila.setAttribute('data-id', id);
    fila.setAttribute('data-categoria', categoria);
    
    const placeholderTextos = {
        'tributarios': 'Nuevo Ingreso Tributario',
        'no-tributarios': 'Nuevo Ingreso No Tributario',
        'transferencias': tipo === 'ingreso' ? 'Nueva Transferencia' : 'Nueva Transferencia',
        'recursos-credito': 'Nuevo Recurso del Crédito',
        'recursos-balance': 'Nuevo Recurso del Balance',
        'excedentes-financieros': 'Nuevo Excedente Financiero',
        'rendimientos-financieros': 'Nuevo Rendimiento Financiero',
        'venta-activos': 'Nueva Venta de Activo',
        'donaciones': 'Nueva Donación',
        'funcionamiento': 'Nuevo Gasto de Funcionamiento',
        'transferencias-gastos': 'Nueva Transferencia',
        'inversion': 'Nuevo Gasto de Inversión'
    };
    
    const placeholder = placeholderTextos[categoria] || `Nuevo ${tipo}`;
    
    fila.innerHTML = `
        <td><input type="text" placeholder="${placeholder}" id="concepto-${tipo}-${id}"></td>
        <td><input type="number" class="base-input" id="base-${tipo}-${id}" value="0"></td>
        <td><input type="number" id="crec-${tipo}-${id}" value="0"></td>
        <td>
            <span id="proy-${tipo}-${id}" class="calculated">0</span>
            <button class="btn-eliminar-fila" data-id="${id}" data-tipo="${tipo}">✖</button>
        </td>
    `;
    
    // Encontrar la fila del botón de la categoría correspondiente
    const botonRow = Array.from(tabla.querySelectorAll('.add-button-row')).find(row => {
        const btn = row.querySelector('.agregar-item-btn');
        return btn && btn.getAttribute('data-categoria') === categoria;
    });
    
    if (botonRow) {
        tabla.insertBefore(fila, botonRow);
    } else {
        // Si no encuentra el botón, insertar antes del total
        tabla.insertBefore(fila, tabla.querySelector('.total'));
    }
    
    // Agregar eventos
    document.getElementById(`base-${tipo}-${id}`).addEventListener('input', calcularProyeccion);
    document.getElementById(`crec-${tipo}-${id}`).addEventListener('input', calcularProyeccion);
}

document.getElementById('agregar-gasto').addEventListener('click', function () {
    const tabla = document.querySelector('#gastos-table tbody');
    const fila = document.createElement('tr');
    const id = Date.now();

    fila.classList.add('fila-dinamica-gasto');
    fila.setAttribute('data-id', id);

    fila.innerHTML = `
        <td><input type="text" placeholder="Nuevo Gasto" id="concepto-gasto-${id}"></td>
        <td><input type="number" class="base-input" id="base-gasto-${id}" value="0"></td>
        <td><input type="number" id="crec-gasto-${id}" value="0"></td>
        <td>
            <span id="proy-gasto-${id}" class="calculated">0</span>
            <button class="btn-eliminar-fila" data-id="${id}" data-tipo="gasto">✖</button>
        </td>
    `;
    tabla.insertBefore(fila, tabla.querySelector('.total'));

    document.getElementById(`base-gasto-${id}`).addEventListener('input', calcularProyeccion);
    document.getElementById(`crec-gasto-${id}`).addEventListener('input', calcularProyeccion);
});

function generarPDF() {
    // Mostrar mensaje de carga
    mostrarMensaje("Generando PDF, por favor espere...", "info");
    
    // Crear un nuevo documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Configuración general del PDF
    const margin = 20;
    let yPos = margin;
    const pageWidth = doc.internal.pageSize.getWidth() - 2 * margin;
    const pageHeight = doc.internal.pageSize.getHeight();

    // ========= utilidades =========
    const checkPageBreak = (heightNeeded) => {
        if (yPos + heightNeeded > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
    };

    // Aux para formatear números sin romper si no existe formatNumber global
    const fmt = (n) => {
        const val = Number.isFinite(+n) ? +n : 0;
        try {
            return (typeof formatNumber === 'function')
                ? formatNumber(val)
                : new Intl.NumberFormat('es-CO').format(val);
        } catch {
            return String(val);
        }
    };

    // ========= NUEVO: exportar Proyección (lee inputs y spans) =========
    // ========= NUEVO: exportar Proyección (lee inputs, spans y también "nuevo ingreso/gasto") =========
const exportarProyeccionAPDF = (tableId, titulo, totalBaseId, totalProjId, tipo) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    checkPageBreak(120);

    // Título de sección
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(titulo, margin, yPos);
    yPos += 12;

    const head = [['Concepto', '2025 (Base)', 'Tasa Crecimiento (%)', '2026 (Proyectado)']];
    const body = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(tr => {
        // Saltar botones de añadir y filas vacías
        if (tr.classList.contains('add-button-row')) return;
        if (tr.querySelector('button.agregar-item-btn')) return;
        if (tr.querySelector('button#agregar-ingreso') || tr.querySelector('button#agregar-gasto')) return;

        if (tr.classList.contains('category')) {
            const catText = tr.textContent.trim().replace(/\s+/g, ' ');
            body.push({ concepto: catText, base: '', tasa: '', proj: '', _isGroup: true });
            return;
        }

        if (tr.classList.contains('total')) return;

        const tds = tr.querySelectorAll('td');
        if (!tds.length) return;

        const conceptoInput = tds[0]?.querySelector('input');
        const concepto = conceptoInput ? conceptoInput.value.trim() : (tds[0]?.textContent || '').trim();

        const baseInput = tds[1]?.querySelector('input');
        const base = baseInput ? fmt(baseInput.value || 0) : fmt((tds[1]?.textContent || '0').replace(/\./g, ''));
        const tasaInput = tds[2]?.querySelector('input');
        const tasa = tasaInput ? (tasaInput.value || '0') : ((tds[2]?.textContent || '0').trim());
        const projSpan = tds[3]?.querySelector('span');
        const proyectado = projSpan ? projSpan.textContent.trim() : (tds[3]?.textContent.trim() || '0');

        if (concepto || base || tasa || proyectado) {
            body.push({ concepto, base, tasa, proj: proyectado });
        }
    });

    // 🔹 Incluir los inputs de "nuevo ingreso" o "nuevo gasto"
    if (tipo === 'ingreso') {
        const conceptoNuevo = document.getElementById('nuevo-ingreso-nombre')?.value || '';
        const baseNuevo = document.getElementById('nuevo-ingreso-base')?.value || '0';
        const tasaNuevo = document.getElementById('nuevo-ingreso-tasa')?.value || '0';
        const projNuevo = document.getElementById('nuevo-ingreso-proyectado')?.textContent || '0';
        if (conceptoNuevo.trim() !== '') {
            body.push({ concepto: conceptoNuevo, base: fmt(baseNuevo), tasa: tasaNuevo, proj: projNuevo });
        }
    } else if (tipo === 'gasto') {
        const conceptoNuevo = document.getElementById('nuevo-gasto-nombre')?.value || '';
        const baseNuevo = document.getElementById('nuevo-gasto-base')?.value || '0';
        const tasaNuevo = document.getElementById('nuevo-gasto-tasa')?.value || '0';
        const projNuevo = document.getElementById('nuevo-gasto-proyectado')?.textContent || '0';
        if (conceptoNuevo.trim() !== '') {
            body.push({ concepto: conceptoNuevo, base: fmt(baseNuevo), tasa: tasaNuevo, proj: projNuevo });
        }
    }

    // Fila TOTAL
    const totalBaseSpan = document.getElementById(totalBaseId);
    const totalProjSpan = document.getElementById(totalProjId);
    const totalBase = totalBaseSpan ? totalBaseSpan.textContent.trim() : '0';
    const totalProj = totalProjSpan ? totalProjSpan.textContent.trim() : '0';
    const etiquetaTotal = titulo.toLowerCase().includes('ingresos') ? 'TOTAL INGRESOS' : 'TOTAL GASTOS';
    body.push({ concepto: etiquetaTotal, base: totalBase, tasa: '', proj: totalProj, _isTotal: true });

    // Pintar tabla
    doc.autoTable({
        startY: yPos + 8,
        head: head,
        body: body.map(r => [r.concepto, r.base, r.tasa, r.proj]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: (data) => {
            const meta = body[data.row.index];
            if (meta?._isGroup) {
                data.cell.styles.fillColor = [230, 230, 230];
                data.cell.styles.fontStyle = 'bold';
                if (data.column.index > 0) data.cell.text = '';
            }
            if (meta?._isTotal) {
                data.cell.styles.fontStyle = 'bold';
                if (data.column.index === 0) data.cell.styles.fillColor = [224, 224, 224];
            }
        }
    });

    yPos = doc.lastAutoTable.finalY + 20;
};




    const agregarTablaAPDF = (elementId, titulo) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        checkPageBreak(300);
        doc.setFontSize(14);
        doc.text(titulo, margin, yPos);
        yPos += 20;
        const rows = element.querySelectorAll('tr');
        if (rows.length === 0) return;
        const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            data.push(Array.from(rows[i].querySelectorAll('td')).map(td => td.textContent.trim()));
        }
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.autoTable({
            startY: yPos,
            head: [headers],
            body: data,
            margin: { left: margin },
            styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        yPos = doc.lastAutoTable.finalY + 20;
    };

    const agregarTextoAPDF = (texto, fontSize = 12, isBold = false, align = 'left') => {
        checkPageBreak(fontSize * 5);
        doc.setFontSize(fontSize);
        doc.setFont(isBold ? 'helvetica-bold' : 'helvetica');
        doc.text(texto, margin, yPos, { align, maxWidth: pageWidth });
        yPos += fontSize * (doc.splitTextToSize(texto, pageWidth).length * 1.2);
    };

    // ========= Proceso de generación =========
    (async () => {
        try {
            // === PÁGINA 1: Proyección Inicial (como pediste) ===
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text('Reporte de Análisis Presupuestal Municipal', pageWidth / 2 + margin, yPos + 20, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}`, margin, yPos + 40);
            yPos += 60;

            // Proyección de Ingresos y Gastos 2026 (lee Base, Tasa % y Proyectado)
            exportarProyeccionAPDF('ingresos-table', 'Presupuesto de Ingresos 2026', 'total-ingresos-2025', 'total-ingresos-2026');
            exportarProyeccionAPDF('gastos-table',   'Presupuesto de Gastos 2026',   'total-gastos-2025',   'total-gastos-2026');

            // === PÁGINA 2: Portada (se conserva igual que tu versión) ===
            doc.addPage();
            yPos = margin;

            doc.setFillColor(240, 240, 240);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(44, 62, 80);
            doc.text('ANÁLISIS PRESUPUESTAL', pageWidth / 2 + margin, 120, { align: 'center' });
            doc.text('MUNICIPAL', pageWidth / 2 + margin, 160, { align: 'center' });
            
            doc.setFontSize(16);
            doc.text(`Período: 2025 - 2026`, pageWidth / 2 + margin, 220, { align: 'center' });
            
            doc.setFontSize(12);
            const autor = document.querySelector('footer p:nth-child(2)')?.textContent.replace('Desarrollada por: ', '') || '';
            doc.text(`Generado por: ${"App Contable"}`, pageWidth / 2 + margin, 260, { align: 'center' });

            // === PÁGINA 3+: resto intacto ===
            doc.addPage();
            yPos = margin;

            // 2. Resumen ejecutivo
            agregarTextoAPDF('RESUMEN EJECUTIVO', 16, true);
            agregarTextoAPDF('Este documento presenta un análisis completo del presupuesto municipal, incluyendo proyecciones, ejecución y modificaciones realizadas durante el período fiscal.', 10);
            
            // Datos clave (usa los totales actuales de la UI)
            const totalIngresos = parseFloat((document.getElementById('total-ingresos-2026')?.textContent || '0').replace(/\./g, '')) || 0;
            const totalGastos = parseFloat((document.getElementById('total-gastos-2026')?.textContent || '0').replace(/\./g, '')) || 0;
            const diferencia = totalIngresos - totalGastos;
            
            agregarTextoAPDF('DATOS CLAVE:', 12, true);
            agregarTextoAPDF(`• Total Ingresos 2026: $${fmt(totalIngresos)}`);
            agregarTextoAPDF(`• Total Gastos 2026: $${fmt(totalGastos)}`);
            agregarTextoAPDF(`• Resultado: ${diferencia >= 0 ? 'Superávit' : 'Déficit'} de $${fmt(Math.abs(diferencia))}`);

            // 3. Indicadores calculados
            agregarTextoAPDF('INDICADORES PRESUPUESTALES', 16, true);
            agregarTextoAPDF(`• Ejecución de Ingresos: ${presupuesto.indicadores.ejecucionIngresos?.toFixed(2) || 0}%`);
            agregarTextoAPDF(`• Ejecución de Gastos: ${presupuesto.indicadores.ejecucionGastos?.toFixed(2) || 0}%`);
            agregarTextoAPDF(`• Relación Funcionamiento: ${presupuesto.indicadores.relacionFuncionamiento?.toFixed(2) || 0}%`);
            agregarTextoAPDF(`• Dependencia Transferencias: ${presupuesto.indicadores.dependenciaTransferencias?.toFixed(2) || 0}%`);

            // 4. Tablas de datos
            agregarTablaAPDF('indicadores-table', 'Tabla 1: Indicadores Presupuestales');
            agregarTablaAPDF('modificaciones-table', 'Tabla 2: Historial de Modificaciones');

            // 5. Análisis cualitativo
            agregarTextoAPDF('ANÁLISIS CUALITATIVO', 16, true);
            const analisisText = document.getElementById('analisis-texto')?.value || 'No se ha ingresado análisis cualitativo.';
            doc.setFontSize(11);
            doc.text(analisisText, margin, yPos, { maxWidth: pageWidth });

            // 6. Conclusiones y recomendaciones
            doc.addPage();
            yPos = margin;
            agregarTextoAPDF('CONCLUSIONES Y RECOMENDACIONES', 16, true, 'center');
            agregarTextoAPDF(' ', 12);
            const recomendaciones = document.getElementById('recomendaciones')?.textContent || 'No se generaron recomendaciones automáticas.';
            doc.setFontSize(11);
            doc.text(recomendaciones, margin, yPos, { maxWidth: pageWidth });

            // Guardar
            doc.save(`Analisis_Presupuestal_${new Date().toISOString().split('T')[0]}.pdf`);
            mostrarMensaje("PDF generado con éxito", "success");
        } catch (error) {
            console.error("Error al generar PDF:", error);
            mostrarMensaje("Error al generar PDF: " + error.message, "danger");
        }
    })();
}


// Agregar evento al botón de generar PDF
document.getElementById('generar-pdf')?.addEventListener('click', generarPDF);


