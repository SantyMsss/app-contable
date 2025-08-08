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
    
    // Eventos para análisis
    document.getElementById('guardar-analisis').addEventListener('click', guardarAnalisis);
    
    // Eventos para exportación/importación
    document.getElementById('exportar-datos').addEventListener('click', exportarDatos);
    document.getElementById('importar-datos').addEventListener('change', importarDatos);
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Cargar datos de ejemplo (para demostración)
    cargarDatosEjemplo();
    actualizarGraficos();

    // En la función setupTabs(), cuando se detecta el clic en la pestaña de Indicadores:
if (target === 'indicadores') {
    calcularIndicadores();
    actualizarGraficos();
}





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
            
            // Si es la pestaña de indicadores, actualizar gráficos
            if (target === 'indicadores') {
                actualizarGraficos();
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
    
    // Ingresos Tributarios
    const predial2025 = parseFloat(document.getElementById('predial-2025').value) || 0;
    const crecimientoPredial = parseFloat(document.getElementById('crec-predial').value) || 0;
    const predial2026 = predial2025 * (1 + crecimientoPredial / 100);
    document.getElementById('predial-2026').textContent = formatNumber(predial2026);
    presupuesto.proyeccion.ingresos['Impuesto Predial'] = predial2026;
    
    const industria2025 = parseFloat(document.getElementById('industria-2025').value) || 0;
    const crecimientoIndustria = parseFloat(document.getElementById('crec-industria').value) || 0;
    const industria2026 = industria2025 * (1 + crecimientoIndustria / 100);
    document.getElementById('industria-2026').textContent = formatNumber(industria2026);
    presupuesto.proyeccion.ingresos['Impuesto Industria y Comercio'] = industria2026;
    
    const tasaVias2025 = parseFloat(document.getElementById('tasa-vias-2025').value) || 0;
    const crecTasaVias = parseFloat(document.getElementById('crec-tasa-vias').value) || 0;
    const tasaVias2026 = tasaVias2025 * (1 + crecTasaVias / 100);
    document.getElementById('tasa-vias-2026').textContent = formatNumber(tasaVias2026);
    presupuesto.proyeccion.ingresos['Tasa por Ocupación de Vías'] = tasaVias2026;
    
    // Ingresos No Tributarios
    const venta2025 = parseFloat(document.getElementById('venta-2025').value) || 0;
    const crecimientoVenta = parseFloat(document.getElementById('crec-venta').value) || 0;
    const venta2026 = venta2025 * (1 + crecimientoVenta / 100);
    document.getElementById('venta-2026').textContent = formatNumber(venta2026);
    presupuesto.proyeccion.ingresos['Venta de Bienes y Servicios'] = venta2026;
    
    const otrosNoTrib2025 = parseFloat(document.getElementById('otros-no-trib-2025').value) || 0;
    const crecimientoOtrosNoTrib = parseFloat(document.getElementById('crec-otros-no-trib').value) || 0;
    const otrosNoTrib2026 = otrosNoTrib2025 * (1 + crecimientoOtrosNoTrib / 100);
    document.getElementById('otros-no-trib-2026').textContent = formatNumber(otrosNoTrib2026);
    presupuesto.proyeccion.ingresos['Otros Ingresos No Tributarios'] = otrosNoTrib2026;
    
    // Transferencias
    const sgp2024 = parseFloat(document.getElementById('sgp-2024').value) || 0;
    const crecimientoSGP = parseFloat(document.getElementById('crec-sgp-input').value) || (TASA_INFLACION_2025 + 4);
    const sgp2026 = sgp2024 * (1 + crecimientoSGP / 100);
    document.getElementById('sgp-2026').textContent = formatNumber(sgp2026);
    presupuesto.proyeccion.ingresos['SGP - Propósito General'] = sgp2026;
    
    const fonpet2023 = parseFloat(document.getElementById('fonpet-2023').value) || 0;
    const crecFonpet = parseFloat(document.getElementById('crec-fonpet').value) || 20;
    const fonpet2026 = fonpet2023 * (1 + crecFonpet / 100);
    document.getElementById('fonpet-2026').textContent = formatNumber(fonpet2026);
    presupuesto.proyeccion.ingresos['FONPET'] = fonpet2026;
    
    // Recursos de Capital
    const creditoFindeter2025 = parseFloat(document.getElementById('credito-findeter-2025').value) || 0;
    const crecCreditoFindeter = parseFloat(document.getElementById('crec-credito-findeter').value) || 0;
    const creditoFindeter2026 = creditoFindeter2025 * (1 + crecCreditoFindeter / 100);
    document.getElementById('credito-findeter-2026').textContent = formatNumber(creditoFindeter2026);
    presupuesto.proyeccion.ingresos['Crédito FINDETER EXTERNO'] = creditoFindeter2026;
    
    const creditoEnterritorio2025 = parseFloat(document.getElementById('credito-enterritorio-2025').value) || 0;
    const crecCreditoEnterritorio = parseFloat(document.getElementById('crec-credito-enterritorio').value) || 0;
    const creditoEnterritorio2026 = creditoEnterritorio2025 * (1 + crecCreditoEnterritorio / 100);
    document.getElementById('credito-enterritorio-2026').textContent = formatNumber(creditoEnterritorio2026);
    presupuesto.proyeccion.ingresos['Crédito ENTerritorio'] = creditoEnterritorio2026;
    
    const donacionAlemana2025 = parseFloat(document.getElementById('donacion-alemana-2025').value) || 0;
    const crecDonacionAlemana = parseFloat(document.getElementById('crec-donacion-alemana').value) || 0;
    const donacionAlemana2026 = donacionAlemana2025 * (1 + crecDonacionAlemana / 100);
    document.getElementById('donacion-alemana-2026').textContent = formatNumber(donacionAlemana2026);
    presupuesto.proyeccion.ingresos['Donación Gobierno Alemán'] = donacionAlemana2026;
    
    // Ingresos dinámicos agregados por el usuario
    let totalBaseDinamicoIngresos = 0;
    document.querySelectorAll('[id^="concepto-ingreso-"]').forEach(input => {
        const id = input.id.split('-')[2];
        const concepto = input.value.trim() || `Ingreso ${id}`;
        const base = parseFloat(document.getElementById(`base-ingreso-${id}`).value) || 0;
        const tasa = parseFloat(document.getElementById(`crec-ingreso-${id}`).value) || 0;
        const proy = base * (1 + tasa / 100);
        document.getElementById(`proy-ingreso-${id}`).textContent = formatNumber(proy);
        presupuesto.proyeccion.ingresos[concepto] = proy;
        totalBaseDinamicoIngresos += base;
    });

    // Calcular total ingresos 2025
    const totalIngresos2025 = predial2025 + industria2025 + tasaVias2025 + venta2025 + otrosNoTrib2025 + 
                             sgp2024 + fonpet2023 + creditoFindeter2025 + creditoEnterritorio2025 + 
                             donacionAlemana2025 + totalBaseDinamicoIngresos;
    document.getElementById('total-ingresos-2025').textContent = formatNumber(totalIngresos2025);
}

function calcularGastos() {
    presupuesto.proyeccion.gastos = {};
    
    // Gastos de Funcionamiento
    const servPersonales2025 = parseFloat(document.getElementById('serv-personales-2025').value) || 0;
    const crecServPersonales = parseFloat(document.getElementById('crec-serv-personales').value) || 0;
    const servPersonales2026 = servPersonales2025 * (1 + Math.min(crecServPersonales, 14) / 100);
    document.getElementById('serv-personales-2026').textContent = formatNumber(servPersonales2026);
    presupuesto.proyeccion.gastos['Servicios Personales'] = servPersonales2026;
    
    const honorarios2025 = parseFloat(document.getElementById('honorarios-concejales-2025').value) || 0;
    const crecHonorarios = parseFloat(document.getElementById('crec-honorarios-concejales').value) || 0;
    const honorarios2026 = honorarios2025 * (1 + crecHonorarios / 100);
    document.getElementById('honorarios-concejales-2026').textContent = formatNumber(honorarios2026);
    presupuesto.proyeccion.gastos['Honorarios Concejales'] = honorarios2026;
    
    const gastosGenerales2025 = parseFloat(document.getElementById('gastos-generales-2025').value) || 0;
    const crecGastosGenerales = parseFloat(document.getElementById('crec-gastos-generales').value) || 0;
    const gastosGenerales2026 = gastosGenerales2025 * (1 + crecGastosGenerales / 100);
    document.getElementById('gastos-generales-2026').textContent = formatNumber(gastosGenerales2026);
    presupuesto.proyeccion.gastos['Gastos Generales'] = gastosGenerales2026;
    
    const sistematizacion2025 = parseFloat(document.getElementById('sistematizacion-2025').value) || 0;
    const crecSistematizacion = parseFloat(document.getElementById('crec-sistematizacion').value) || 0;
    const sistematizacion2026 = sistematizacion2025 * (1 + crecSistematizacion / 100);
    document.getElementById('sistematizacion-2026').textContent = formatNumber(sistematizacion2026);
    presupuesto.proyeccion.gastos['Sistematización'] = sistematizacion2026;
    
    const contribuciones2025 = parseFloat(document.getElementById('contribuciones-nomina-2025').value) || 0;
    const crecContribuciones = parseFloat(document.getElementById('crec-contribuciones-nomina').value) || 0;
    const contribuciones2026 = contribuciones2025 * (1 + crecContribuciones / 100);
    document.getElementById('contribuciones-nomina-2026').textContent = formatNumber(contribuciones2026);
    presupuesto.proyeccion.gastos['Contribuciones Nómina'] = contribuciones2026;
    
    // Transferencias
    const fondoDeporte2025 = parseFloat(document.getElementById('fondo-deporte-cultura-2025').value) || 0;
    const crecFondoDeporte = parseFloat(document.getElementById('crec-fondo-deporte-cultura').value) || 0;
    const fondoDeporte2026 = fondoDeporte2025 * (1 + crecFondoDeporte / 100);
    document.getElementById('fondo-deporte-cultura-2026').textContent = formatNumber(fondoDeporte2026);
    presupuesto.proyeccion.gastos['Fondo Local Deporte y Cultura'] = fondoDeporte2026;
    
    const fondoSalud2025 = parseFloat(document.getElementById('fondo-salud-2025').value) || 0;
    const crecFondoSalud = parseFloat(document.getElementById('crec-fondo-salud').value) || 0;
    const fondoSalud2026 = fondoSalud2025 * (1 + crecFondoSalud / 100);
    document.getElementById('fondo-salud-2026').textContent = formatNumber(fondoSalud2026);
    presupuesto.proyeccion.gastos['Fondo Local de Salud'] = fondoSalud2026;
    
    const concejo2025 = parseFloat(document.getElementById('concejo-municipal-2025').value) || 0;
    const crecConcejo = parseFloat(document.getElementById('crec-concejo-municipal').value) || 0;
    const concejo2026 = concejo2025 * (1 + crecConcejo / 100);
    document.getElementById('concejo-municipal-2026').textContent = formatNumber(concejo2026);
    presupuesto.proyeccion.gastos['Concejo Municipal'] = concejo2026;
    
    const personeria2025 = parseFloat(document.getElementById('personeria-municipal-2025').value) || 0;
    const crecPersoneria = parseFloat(document.getElementById('crec-personeria-municipal').value) || 0;
    const personeria2026 = personeria2025 * (1 + crecPersoneria / 100);
    document.getElementById('personeria-municipal-2026').textContent = formatNumber(personeria2026);
    presupuesto.proyeccion.gastos['Personería Municipal'] = personeria2026;
    
    // Gastos de Inversión
    const proyecto1_2025 = parseFloat(document.getElementById('proyecto1-2025').value) || 0;
    const crecProyecto1 = parseFloat(document.getElementById('crec-proyecto1').value) || 0;
    const proyecto1_2026 = proyecto1_2025 * (1 + crecProyecto1 / 100);
    document.getElementById('proyecto1-2026').textContent = formatNumber(proyecto1_2026);
    presupuesto.proyeccion.gastos['Proyecto 1'] = proyecto1_2026;
    
    const proyecto2_2025 = parseFloat(document.getElementById('proyecto2-2025').value) || 0;
    const crecProyecto2 = parseFloat(document.getElementById('crec-proyecto2').value) || 0;
    const proyecto2_2026 = proyecto2_2025 * (1 + crecProyecto2 / 100);
    document.getElementById('proyecto2-2026').textContent = formatNumber(proyecto2_2026);
    presupuesto.proyeccion.gastos['Proyecto 2'] = proyecto2_2026;
    
    const proyecto3_2025 = parseFloat(document.getElementById('proyecto3-2025').value) || 0;
    const crecProyecto3 = parseFloat(document.getElementById('crec-proyecto3').value) || 0;
    const proyecto3_2026 = proyecto3_2025 * (1 + crecProyecto3 / 100);
    document.getElementById('proyecto3-2026').textContent = formatNumber(proyecto3_2026);
    presupuesto.proyeccion.gastos['Proyecto 3'] = proyecto3_2026;
    
    const proyecto4_2025 = parseFloat(document.getElementById('proyecto4-2025').value) || 0;
    const crecProyecto4 = parseFloat(document.getElementById('crec-proyecto4').value) || 0;
    const proyecto4_2026 = proyecto4_2025 * (1 + crecProyecto4 / 100);
    document.getElementById('proyecto4-2026').textContent = formatNumber(proyecto4_2026);
    presupuesto.proyeccion.gastos['Proyecto 4'] = proyecto4_2026;
    
    const cobertura2025 = parseFloat(document.getElementById('cobertura-salud-2025').value) || 0;
    const crecCobertura = parseFloat(document.getElementById('crec-cobertura-salud').value) || 0;
    const cobertura2026 = cobertura2025 * (1 + crecCobertura / 100);
    document.getElementById('cobertura-salud-2026').textContent = formatNumber(cobertura2026);
    presupuesto.proyeccion.gastos['Cobertura Salud'] = cobertura2026;
    
    // Gastos dinámicos agregados por el usuario
    let totalBaseDinamicoGastos = 0;
    document.querySelectorAll('[id^="concepto-gasto-"]').forEach(input => {
        const id = input.id.split('-')[2];
        const concepto = input.value.trim() || `Gasto ${id}`;
        const base = parseFloat(document.getElementById(`base-gasto-${id}`).value) || 0;
        const tasa = parseFloat(document.getElementById(`crec-gasto-${id}`).value) || 0;
        const proy = base * (1 + tasa / 100);
        document.getElementById(`proy-gasto-${id}`).textContent = formatNumber(proy);
        presupuesto.proyeccion.gastos[concepto] = proy;
        totalBaseDinamicoGastos += base;
    });

    // Calcular total gastos 2025
    const totalGastos2025 = servPersonales2025 + honorarios2025 + gastosGenerales2025 + sistematizacion2025 + 
                           contribuciones2025 + fondoDeporte2025 + fondoSalud2025 + concejo2025 + 
                           personeria2025 + proyecto1_2025 + proyecto2_2025 + proyecto3_2025 + 
                           proyecto4_2025 + cobertura2025 + totalBaseDinamicoGastos;
    document.getElementById('total-gastos-2025').textContent = formatNumber(totalGastos2025);
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
    
    // Inicializar presupuesto actualizado con la proyección
    presupuesto.actualizado.ingresos = JSON.parse(JSON.stringify(presupuesto.proyeccion.ingresos));
    presupuesto.actualizado.gastos = JSON.parse(JSON.stringify(presupuesto.proyeccion.gastos));
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
    
    if (!concepto || valor <= 0) {
        mostrarMensaje('Complete todos los campos requeridos', 'danger');
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

    
    // Crear objeto de modificación
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

    
    // Agregar al array de modificaciones
    presupuesto.modificaciones.push(modificacion);
    
    // Aplicar modificación al presupuesto actualizado
    aplicarModificacion(modificacion);
    
    // Actualizar tabla de modificaciones
    actualizarTablaModificaciones();
    
    // Actualizar tablas de presupuesto actualizado
    actualizarPresupuestoActualizado();
    
    // Limpiar formulario
    document.getElementById('valor-modificacion').value = '';
    document.getElementById('justificacion-modificacion').value = '';
    
    mostrarMensaje('Modificación agregada correctamente', 'success');

        if (tipo === 'adicion') {
        mostrarDistribucion(valor, area);
    }

        function mostrarDistribucion(valor, areaOrigen) {
        const contenedor = document.getElementById('distribucion-contenedor');
        const seccion = document.getElementById('distribucion-gasto');
        contenedor.innerHTML = '';
        seccion.style.display = 'block';
        seccion.setAttribute('data-valor-total', valor);
        seccion.setAttribute('data-area-origen', areaOrigen);

        const conceptos = Object.keys(presupuesto.proyeccion.gastos); // por defecto: distribuir a gastos
        agregarFilaDistribucion(conceptos);
    }

    function agregarFilaDistribucion(conceptos) {
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
    }

        document.getElementById('agregar-distribucion').addEventListener('click', () => {
        const conceptos = Object.keys(presupuesto.proyeccion.gastos);
        agregarFilaDistribucion(conceptos);
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-eliminar-fila-distribucion')) {
            e.target.parentElement.remove();
        }
    });

    document.getElementById('guardar-distribucion').addEventListener('click', () => {
    const totalEsperado = parseFloat(document.getElementById('distribucion-gasto').getAttribute('data-valor-total'));
    const areaOrigen = document.getElementById('distribucion-gasto').getAttribute('data-area-origen');
    const filas = document.querySelectorAll('.fila-distribucion');

    let sumaDistribucion = 0;
    const distribuciones = [];

    filas.forEach(fila => {
        const concepto = fila.querySelector('.concepto-distribucion').value;
        const valor = parseFloat(fila.querySelector('.valor-distribucion').value) || 0;
        sumaDistribucion += valor;
        distribuciones.push({ concepto, valor });
    });

    if (sumaDistribucion !== totalEsperado) {
        mostrarMensaje(`La suma de la distribución (${formatNumber(sumaDistribucion)}) debe ser igual al valor original (${formatNumber(totalEsperado)}).`, 'danger');
        return;
    }

    // Aplicar al presupuesto actualizado
    distribuciones.forEach(d => {
        presupuesto.actualizado.gastos[d.concepto] = (presupuesto.actualizado.gastos[d.concepto] || 0) + d.valor;
    });

    actualizarPresupuestoActualizado();
    mostrarMensaje('Distribución aplicada correctamente.', 'success');

    // Limpiar UI
    document.getElementById('distribucion-gasto').style.display = 'none';
    document.getElementById('distribucion-contenedor').innerHTML = '';
});




}

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
    
    presupuesto.modificaciones.forEach(mod => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${mod.tipo.charAt(0).toUpperCase() + mod.tipo.slice(1)}</td>
            <td>${mod.area.charAt(0).toUpperCase() + mod.area.slice(1)}</td>
            <td>${mod.concepto}</td>
            <td>${mod.conceptoDestino || '-'}</td>
            <td>${formatNumber(mod.valor)}</td>
            <td>${mod.justificacion}</td>
            <td><button class="btn-eliminar" data-id="${mod.id}">Eliminar</button></td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar eventos a botones eliminar
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
}

// Funciones para indicadores
function calcularIndicadores() {
    // Totales
    const totalIngresos = Object.values(presupuesto.actualizado.ingresos).reduce((a, b) => a + b, 0);
    const totalGastos = Object.values(presupuesto.actualizado.gastos).reduce((a, b) => a + b, 0);
    
    // Ejecución (asumimos algún porcentaje de ejecución para el ejemplo)
    const ejecucionIngresos = Math.min(100, Math.round(Math.random() * 30 + 70)); // Entre 70% y 100%
    const ejecucionGastos = Math.min(100, Math.round(Math.random() * 20 + 60)); // Entre 60% y 80%
    
    // Gastos de funcionamiento (sumar servicios personales, honorarios, gastos generales, etc.)
    const gastosFuncionamiento = 
        (presupuesto.actualizado.gastos['Servicios Personales'] || 0) +
        (presupuesto.actualizado.gastos['Honorarios Concejales'] || 0) +
        (presupuesto.actualizado.gastos['Gastos Generales'] || 0) +
        (presupuesto.actualizado.gastos['Sistematización'] || 0) +
        (presupuesto.actualizado.gastos['Pensiones'] || 0) +
        (presupuesto.actualizado.gastos['Cesantías'] || 0) +
        (presupuesto.actualizado.gastos['EPS'] || 0) +
        (presupuesto.actualizado.gastos['Caja de Compensación'] || 0) +
        (presupuesto.actualizado.gastos['ESAP, Escuelas industriales'] || 0) +
        (presupuesto.actualizado.gastos['ARL'] || 0) +
        (presupuesto.actualizado.gastos['Concejo Municipal'] || 0) +
        (presupuesto.actualizado.gastos['Personería Municipal'] || 0);
    
    // Gastos de inversión (sumar proyectos y cobertura salud)
    const gastosInversion = 
        (presupuesto.actualizado.gastos['Proyecto 1'] || 0) +
        (presupuesto.actualizado.gastos['Proyecto 2'] || 0) +
        (presupuesto.actualizado.gastos['Proyecto 3'] || 0) +
        (presupuesto.actualizado.gastos['Proyecto 4'] || 0) +
        (presupuesto.actualizado.gastos['Cobertura Salud'] || 0);
    
    // Transferencias (SGP y FONPET)
    const transferencias = 
        (presupuesto.actualizado.ingresos['SGP - Propósito General'] || 0) +
        (presupuesto.actualizado.ingresos['FONPET'] || 0);
    
    // Calcular indicadores
    presupuesto.indicadores = {
        ejecucionIngresos,
        ejecucionGastos,
        relacionFuncionamiento: totalGastos > 0 ? (gastosFuncionamiento / totalGastos) * 100 : 0,
        relacionInversion: totalGastos > 0 ? (gastosInversion / totalGastos) * 100 : 0,
        dependenciaTransferencias: totalIngresos > 0 ? (transferencias / totalIngresos) * 100 : 0
    };
    
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

function inicializarGraficos() {
    // Verificar si los elementos canvas existen antes de crear gráficos
    const ejecucionCtx = document.getElementById('ejecucionChart')?.getContext('2d');
    const composicionCtx = document.getElementById('composicionGastosChart')?.getContext('2d');
    const comparativoCtx = document.getElementById('comparativoLineChart')?.getContext('2d');
    const topCtx = document.getElementById('topConceptosChart')?.getContext('2d');

    if (ejecucionCtx && !presupuesto.chartEjecucion) {
        presupuesto.chartEjecucion = new Chart(ejecucionCtx, {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos'],
                datasets: [{
                    label: '% Ejecución',
                    data: [0, 0],
                    backgroundColor: ['#3498db', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }

    if (composicionCtx && !presupuesto.chartComposicionGastos) {
        presupuesto.chartComposicionGastos = new Chart(composicionCtx, {
            type: 'pie',
            data: {
                labels: ['Funcionamiento', 'Inversión', 'Deuda', 'Otros'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#2ecc71', '#f1c40f', '#e67e22', '#9b59b6']
                }]
            }
        });
    }

    if (comparativoCtx && !presupuesto.chartComparativo) {
        presupuesto.chartComparativo = new Chart(comparativoCtx, {
            type: 'line',
            data: {
                labels: ['2025', '2026'],
                datasets: [
                    {
                        label: 'Ingresos',
                        data: [0, 0],
                        borderColor: '#3498db',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Gastos',
                        data: [0, 0],
                        borderColor: '#e74c3c',
                        fill: false,
                        tension: 0.4
                    }
                ]
            }
        });
    }

    if (topCtx && !presupuesto.chartTopConceptos) {
        presupuesto.chartTopConceptos = new Chart(topCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor (millones)',
                    data: [],
                    backgroundColor: '#34495e'
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
}




function actualizarGraficos() {
    // Asegurarse de que los gráficos están inicializados
    inicializarGraficos();
    
    calcularIndicadores(); // Esto ya actualiza las variables de ejecución

    const ingresos2025 = parseFloat(document.getElementById('total-ingresos-2025')?.textContent.replace(/\./g, '')) || 0;
    const ingresos2026 = Object.values(presupuesto.actualizado.ingresos).reduce((a, b) => a + b, 0);
    const gastos2025 = parseFloat(document.getElementById('total-gastos-2025')?.textContent.replace(/\./g, '')) || 0;
    const gastos2026 = Object.values(presupuesto.actualizado.gastos).reduce((a, b) => a + b, 0);

    // Solo actualizar gráficos si existen
    if (presupuesto.chartEjecucion) {
        presupuesto.chartEjecucion.data.datasets[0].data = [
            presupuesto.indicadores.ejecucionIngresos,
            presupuesto.indicadores.ejecucionGastos
        ];
        presupuesto.chartEjecucion.update();
    }

    if (presupuesto.chartComposicionGastos) {
        const funcionamiento = Object.entries(presupuesto.actualizado.gastos)
            .filter(([key]) => key.includes('Servicios') || key.includes('Honorarios') || key.includes('Gastos Generales') || key.includes('Pensiones'))
            .reduce((sum, [, value]) => sum + value, 0);
            
        const inversion = Object.entries(presupuesto.actualizado.gastos)
            .filter(([key]) => key.includes('Proyecto') || key.includes('Cobertura'))
            .reduce((sum, [, value]) => sum + value, 0);
            
        const otros = gastos2026 - funcionamiento - inversion;
        
        presupuesto.chartComposicionGastos.data.datasets[0].data = [
            funcionamiento,
            inversion,
            0, // Deuda (no hay en el ejemplo)
            otros
        ];
        presupuesto.chartComposicionGastos.update();
    }

    if (presupuesto.chartComparativo) {
        presupuesto.chartComparativo.data.datasets[0].data = [ingresos2025, ingresos2026];
        presupuesto.chartComparativo.data.datasets[1].data = [gastos2025, gastos2026];
        presupuesto.chartComparativo.update();
    }

    if (presupuesto.chartTopConceptos) {
        const topGastos = Object.entries(presupuesto.actualizado.gastos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        presupuesto.chartTopConceptos.data.labels = topGastos.map(([k]) => k);
        presupuesto.chartTopConceptos.data.datasets[0].data = topGastos.map(([, v]) => v);
        presupuesto.chartTopConceptos.update();
    }

    // Resto del código para el resumen estadístico...
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

// Eventos para añadir filas dinámicas
document.getElementById('agregar-ingreso').addEventListener('click', function () {
    const tabla = document.querySelector('#ingresos-table tbody');
    const fila = document.createElement('tr');
    const id = Date.now();

    fila.classList.add('fila-dinamica-ingreso');
    fila.setAttribute('data-id', id);

    fila.innerHTML = `
        <td><input type="text" placeholder="Nuevo Ingreso" id="concepto-ingreso-${id}"></td>
        <td><input type="number" class="base-input" id="base-ingreso-${id}" value="0"></td>
        <td><input type="number" id="crec-ingreso-${id}" value="0"></td>
        <td>
            <span id="proy-ingreso-${id}" class="calculated">0</span>
            <button class="btn-eliminar-fila" data-id="${id}" data-tipo="ingreso">✖</button>
        </td>
    `;
    tabla.insertBefore(fila, tabla.querySelector('.total'));

    document.getElementById(`base-ingreso-${id}`).addEventListener('input', calcularProyeccion);
    document.getElementById(`crec-ingreso-${id}`).addEventListener('input', calcularProyeccion);
});

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
    
    // Título del reporte
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Reporte de Análisis Presupuestal Municipal', pageWidth / 2 + margin, yPos + 20, { align: 'center' });
    
    // Fecha de generación
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, margin, yPos + 40);
    yPos += 60;
    
    // Función para agregar una nueva página si es necesario
    const checkPageBreak = (heightNeeded) => {
        if (yPos + heightNeeded > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
    };
    
    // Función auxiliar para obtener instancia de Chart.js por ID de canvas
    const obtenerChartPorId = (canvasId) => {
        const chartMapping = {
            'ejecucionChart': presupuesto.chartEjecucion,
            'composicionGastosChart': presupuesto.chartComposicionGastos,
            'comparativoLineChart': presupuesto.chartComparativo,
            'topConceptosChart': presupuesto.chartTopConceptos
        };
        return chartMapping[canvasId];
    };
    
    // Función mejorada para capturar gráficos
    const capturarGraficoComoImagen = async (chartInstance, width = 800) => {
        return new Promise((resolve) => {
            // Crear un canvas temporal con alta resolución
            const tempCanvas = document.createElement('canvas');
            const scaleFactor = 2; // Aumentar para mejor calidad
            tempCanvas.width = width * scaleFactor;
            tempCanvas.height = (chartInstance.height * width * scaleFactor) / chartInstance.width;
            
            // Configurar contexto
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Dibujar el gráfico
            tempCtx.drawImage(chartInstance.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            
            // Convertir a imagen
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = tempCanvas.toDataURL('image/png', 1.0);
        });
    };
    
    // Función para agregar gráficos al PDF
    const agregarGraficoAPDF = async (elementId, titulo) => {
        checkPageBreak(300);
        
        // Agregar título del gráfico
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(titulo, margin, yPos);
        yPos += 20;
        
        try {
            // Intentar obtener el gráfico de Chart.js
            const chart = obtenerChartPorId(elementId);
            if (chart) {
                // Capturar como imagen de alta calidad
                const img = await capturarGraficoComoImagen(chart, pageWidth);
                const imgHeight = (img.height * pageWidth) / img.width;
                
                // Asegurar que cabe en la página
                if (yPos + imgHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                
                doc.addImage(img.src, 'PNG', margin, yPos, pageWidth, imgHeight);
                yPos += imgHeight + 20;
                return;
            }
            
            // Fallback para elementos que no son gráficos de Chart.js
            const element = document.getElementById(elementId);
            if (!element) return;
            
            await new Promise(resolve => setTimeout(resolve, 300)); // Pequeña pausa
            
            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#FFFFFF',
                allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * pageWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', margin, yPos, pageWidth, imgHeight);
            yPos += imgHeight + 20;
        } catch (error) {
            console.error(`Error al capturar ${titulo}:`, error);
            agregarTextoAPDF(`[No se pudo cargar el gráfico: ${titulo}]`, 10);
        }
    };
    
    // Función para agregar tablas al PDF
    const agregarTablaAPDF = (elementId, titulo) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        checkPageBreak(300);
        
        // Agregar título de la tabla
        doc.setFontSize(14);
        doc.text(titulo, margin, yPos);
        yPos += 20;
        
        // Capturar datos de la tabla
        const rows = element.querySelectorAll('tr');
        if (rows.length === 0) return;
        
        const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
        const data = [];
        
        for (let i = 1; i < rows.length; i++) {
            data.push(Array.from(rows[i].querySelectorAll('td')).map(td => td.textContent.trim()));
        }
        
        // Configurar estilo de la tabla
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Configurar autoTable
        doc.autoTable({
            startY: yPos,
            head: [headers],
            body: data,
            margin: { left: margin },
            styles: {
                fontSize: 8,
                cellPadding: 4,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [44, 62, 80],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 20;
    };
    
    // Función para agregar texto al PDF
    const agregarTextoAPDF = (texto, fontSize = 12, isBold = false, align = 'left') => {
        checkPageBreak(fontSize * 5); // Estimación de espacio necesario
        
        doc.setFontSize(fontSize);
        doc.setFont(isBold ? 'helvetica-bold' : 'helvetica');
        doc.text(texto, margin, yPos, { align, maxWidth: pageWidth });
        
        yPos += fontSize * (doc.splitTextToSize(texto, pageWidth).length * 1.2);
    };
    
    // Proceso de generación del PDF (usando async/await)
    (async () => {
        try {
            // 1. Portada y resumen ejecutivo
            doc.setFillColor(240, 240, 240);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(44, 62, 80);
            doc.text('ANÁLISIS PRESUPUESTAL', pageWidth / 2 + margin, 120, { align: 'center' });
            doc.text('MUNICIPAL', pageWidth / 2 + margin, 160, { align: 'center' });
            
            doc.setFontSize(16);
            doc.text(`Período: 2025 - 2026`, pageWidth / 2 + margin, 220, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(`Generado por: ${document.querySelector('footer p:nth-child(2)').textContent.replace('Desarrollada por: ', '')}`, 
                    pageWidth / 2 + margin, 260, { align: 'center' });
            
            doc.addPage();
            yPos = margin;
            
            // 2. Resumen ejecutivo
            agregarTextoAPDF('RESUMEN EJECUTIVO', 16, true);
            agregarTextoAPDF('Este documento presenta un análisis completo del presupuesto municipal, incluyendo proyecciones, ejecución y modificaciones realizadas durante el período fiscal.', 10);
            
            // Datos clave
            const totalIngresos = parseFloat(document.getElementById('total-ingresos-2026').textContent.replace(/\./g, '')) || 0;
            const totalGastos = parseFloat(document.getElementById('total-gastos-2026').textContent.replace(/\./g, '')) || 0;
            const diferencia = totalIngresos - totalGastos;
            
            agregarTextoAPDF('DATOS CLAVE:', 12, true);
            agregarTextoAPDF(`• Total Ingresos 2026: $${formatNumber(totalIngresos)}`);
            agregarTextoAPDF(`• Total Gastos 2026: $${formatNumber(totalGastos)}`);
            agregarTextoAPDF(`• Resultado: ${diferencia >= 0 ? 'Superávit' : 'Déficit'} de $${formatNumber(Math.abs(diferencia))}`);
            
            // 3. Gráficos principales (con pausas entre ellos)
            await new Promise(resolve => setTimeout(resolve, 300));
            await agregarGraficoAPDF('ejecucionChart', 'Gráfico 1: Ejecución de Ingresos vs Gastos');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            await agregarGraficoAPDF('composicionGastosChart', 'Gráfico 2: Composición de Gastos');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            await agregarGraficoAPDF('comparativoLineChart', 'Gráfico 3: Comparativo 2025 vs 2026');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            await agregarGraficoAPDF('topConceptosChart', 'Gráfico 4: Top 5 Conceptos de Gasto');
            
            // 4. Tablas de datos
            agregarTablaAPDF('indicadores-table', 'Tabla 1: Indicadores Presupuestales');
            agregarTablaAPDF('modificaciones-table', 'Tabla 2: Historial de Modificaciones');
            
            // 5. Análisis cualitativo
            agregarTextoAPDF('ANÁLISIS CUALITATIVO', 16, true);
            const analisisText = document.getElementById('analisis-texto').value || 'No se ha ingresado análisis cualitativo.';
            doc.setFontSize(11);
            doc.text(analisisText, margin, yPos, { maxWidth: pageWidth });
            
            // 6. Pie de página
            doc.addPage();
            yPos = margin;
            agregarTextoAPDF('CONCLUSIONES Y RECOMENDACIONES', 16, true, 'center');
            agregarTextoAPDF(' ', 12);
            
            const recomendaciones = document.getElementById('recomendaciones')?.textContent || 
                                  'No se generaron recomendaciones automáticas.';
            doc.setFontSize(11);
            doc.text(recomendaciones, margin, yPos, { maxWidth: pageWidth });
            
            // Guardar el PDF
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


