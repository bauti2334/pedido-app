// RELOJ
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDateTime').textContent = now.toLocaleString('es-AR', { hour12: false });
}
setInterval(updateDateTime, 1000);

// DATOS
let datos = { soldados: [], eventos: [], asistencias: [], combates: [] };

function init() {
    const stored = localStorage.getItem('regimiento_data');
    if (stored) datos = JSON.parse(stored);
    actualizarTodo();
}

function guardar() {
    localStorage.setItem('regimiento_data', JSON.stringify(datos));
}

// TABS
function switchTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// LÓGICA DE EVENTOS
function agregarEvento() {
    const fecha = document.getElementById('eventoFecha').value;
    const nombre = document.getElementById('eventoNombre').value.trim();
    if (!fecha || !nombre) return alert('Faltan datos');
    datos.eventos.push({ fecha, nombre, id: Date.now() });
    guardar(); actualizarTodo();
}

function eliminarEvento() {
    const sel = document.querySelector('#tablaEventos tr.selected');
    if (!sel) return alert('Selecciona una fila');
    datos.eventos.splice(sel.dataset.index, 1);
    guardar(); actualizarTodo();
}

// LÓGICA ASISTENCIA
function marcarAsistencia() {
    const eId = document.getElementById('asistenciaEvento').value;
    const sol = document.getElementById('asistenciaSoldado').value;
    if (!eId || !sol) return alert('Selecciona ambos');
    if (datos.asistencias.find(a => a.eventoId == eId && a.soldado == sol)) return alert('Ya registrado');
    datos.asistencias.push({ eventoId: parseInt(eId), soldado: sol, id: Date.now() });
    guardar(); actualizarTodo();
}

// LÓGICA COMBATE
function registrarCombate() {
    const eId = document.getElementById('combateEvento').value;
    const sol = document.getElementById('combateSoldado').value;
    const k = parseInt(document.getElementById('combateKills').value) || 0;
    const a = parseInt(document.getElementById('combateAsistencias').value) || 0;
    if (!eId || !sol) return alert('Faltan datos');
    datos.combates.push({ eventoId: parseInt(eId), soldado: sol, kills: k, asistencias: a, id: Date.now() });
    guardar(); actualizarTodo();
}

// LÓGICA NOMBRES
function cargarNombres() {
    const nombres = document.getElementById('listaNombres').value.split('\n').map(n => n.trim()).filter(n => n);
    datos.soldados = [...new Set([...datos.soldados, ...nombres])].sort();
    guardar(); actualizarTodo();
}

function eliminarSoldado(nombre) {
    if (!confirm('¿Borrar soldado y sus datos?')) return;
    datos.soldados = datos.soldados.filter(s => s !== nombre);
    datos.asistencias = datos.asistencias.filter(a => a.soldado !== nombre);
    datos.combates = datos.combates.filter(c => c.soldado !== nombre);
    guardar(); actualizarTodo();
}

// ACTUALIZACIONES DE TABLAS
function actualizarTodo() {
    // Eventos
    const tbEv = document.querySelector('#tablaEventos tbody');
    tbEv.innerHTML = datos.eventos.map((e, i) => `<tr data-index="${i}" onclick="this.parentElement.querySelectorAll('tr').forEach(r=>r.classList.remove('selected'));this.classList.add('selected')"><td>${e.fecha}</td><td>${e.nombre}</td></tr>`).join('');

    // Dropdowns
    const optEv = datos.eventos.map(e => `<option value="${e.id}">${e.fecha} - ${e.nombre}</option>`).join('');
    const optSol = datos.soldados.map(s => `<option value="${s}">${s}</option>`).join('');
    document.getElementById('asistenciaEvento').innerHTML = document.getElementById('combateEvento').innerHTML = '<option value="">--</option>' + optEv;
    document.getElementById('asistenciaSoldado').innerHTML = document.getElementById('combateSoldado').innerHTML = '<option value="">--</option>' + optSol;

    // Asistencias
    document.querySelector('#tablaAsistencias tbody').innerHTML = datos.asistencias.map(a => {
        const ev = datos.eventos.find(e => e.id == a.eventoId);
        return ev ? `<tr><td>${a.soldado}</td><td>${ev.nombre}</td><td>${ev.fecha}</td><td><button class="danger" onclick="eliminarRegistro('asistencias', ${a.id})">X</button></td></tr>` : '';
    }).join('');

    // Combate
    document.querySelector('#tablaCombate tbody').innerHTML = datos.combates.map(c => {
        const ev = datos.eventos.find(e => e.id == c.eventoId);
        return ev ? `<tr><td>${c.soldado}</td><td>${ev.nombre}</td><td>${c.kills}</td><td>${c.asistencias}</td><td><button class="danger" onclick="eliminarRegistro('combates', ${c.id})">X</button></td></tr>` : '';
    }).join('');

    // Personal
    document.getElementById('contadorSoldados').textContent = datos.soldados.length;
    document.querySelector('#tablaNombres tbody').innerHTML = datos.soldados.map((s, i) => `<tr><td>${i+1}</td><td>${s}</td><td><button class="danger" onclick="eliminarSoldado('${s}')">BORRAR</button></td></tr>`).join('');

    actualizarEstadisticas();
}

function eliminarRegistro(tipo, id) {
    datos[tipo] = datos[tipo].filter(r => r.id !== id);
    guardar(); actualizarTodo();
}

function actualizarEstadisticas() {
    const totalOps = datos.eventos.length;
    document.getElementById('totalOperaciones').textContent = totalOps;
    document.getElementById('totalPersonal').textContent = datos.soldados.length;

    let res = {};
    datos.soldados.forEach(s => res[s] = { k:0, a:0, asis:0 });
    datos.combates.forEach(c => { if(res[c.soldado]){ res[c.soldado].k += c.kills; res[c.soldado].a += c.asistencias; }});
    datos.asistencias.forEach(a => { if(res[a.soldado]) res[a.soldado].asis++; });

    // Tops y Purga
    const sortedKills = Object.entries(res).sort((a,b) => b[1].k - a[1].k).slice(0,5);
    document.querySelector('#tablaTopKills tbody').innerHTML = sortedKills.map((s,i) => `<tr><td>${i+1}</td><td>${s[0]}</td><td>${s[1].k}</td></tr>`).join('');
    
    document.querySelector('#tablaPurga tbody').innerHTML = Object.entries(res)
        .map(s => ({n: s[0], as: s[1].asis, f: totalOps - s[1].asis}))
        .sort((a,b) => b.f - a.f)
        .map(s => `<tr><td>${s.n}</td><td>${totalOps}</td><td>${s.as}</td><td style="color:${s.f>2?'#ff4444':''}">${s.f}</td></tr>`).join('');
}

function exportarDatos() {
    const blob = new Blob([JSON.stringify(datos)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "backup_regimiento.json"; a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { datos = JSON.parse(ev.target.result); guardar(); actualizarTodo(); };
    reader.readAsText(e.target.files[0]);
}

function resetearTodo() { if(confirm('¿BORRAR TODO?')) { localStorage.clear(); location.reload(); } }

init();
