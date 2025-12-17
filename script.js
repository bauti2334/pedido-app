const RANGOS = ["Recluta", "Soldado", "Soldado Primera", "Cabo Segundo", "Cabo Primero", "Sargento Segundo", "Sargento Primero"];
const COMPANIAS = ["FUSILERO", "GRANADERO"];

let datos = { soldados: [], eventos: [], asistencias: [], combates: [] };

function init() {
    const stored = localStorage.getItem('regimiento_data_v2');
    if (stored) datos = JSON.parse(stored);
    actualizarTodo();
    setInterval(updateClock, 1000);
}

function updateClock() {
    document.getElementById('currentDateTime').textContent = new Date().toLocaleString();
}

function guardar() {
    localStorage.setItem('regimiento_data_v2', JSON.stringify(datos));
}

function switchTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- GESTIÓN DE PERSONAL ---
function cargarNombres() {
    const nombres = document.getElementById('listaNombres').value.split('\n').map(n => n.trim()).filter(n => n);
    nombres.forEach(n => {
        if (!datos.soldados.find(s => s.nombre === n)) {
            datos.soldados.push({ nombre: n, puntos: 0, rango: RANGOS[0], compañia: COMPANIAS[0] });
        }
    });
    document.getElementById('listaNombres').value = "";
    actualizarTodo();
}

function eliminarSoldado(nombre) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    datos.soldados = datos.soldados.filter(s => s.nombre !== nombre);
    datos.asistencias = datos.asistencias.filter(a => a.soldado !== nombre);
    datos.combates = datos.combates.filter(c => c.soldado !== nombre);
    actualizarTodo();
}

// --- GESTIÓN DE PUNTOS Y RANGOS ---
function ajustarPuntos(nombre, pts) {
    const s = datos.soldados.find(x => x.nombre === nombre);
    if (s) {
        s.puntos = Math.max(0, s.puntos + pts);
        actualizarTodo();
    }
}

function modificarPuntosMasivo() {
    const n = document.getElementById('promoSoldadoSeleccionado').value;
    const p = parseInt(document.getElementById('puntosInput').value);
    if (n && !isNaN(p)) ajustarPuntos(n, p);
}

function promoverSoldado(nombre) {
    const s = datos.soldados.find(x => x.nombre === nombre);
    const idx = RANGOS.indexOf(s.rango);
    if (idx < RANGOS.length - 1) {
        if (confirm(`¿Ascender a ${nombre} a ${RANGOS[idx+1]}? Puntos volverán a 0.`)) {
            s.rango = RANGOS[idx+1];
            s.puntos = 0;
            actualizarTodo();
        }
    } else { alert("Rango Máximo alcanzado."); }
}

function cambioManual(nombre, campo, valor) {
    const s = datos.soldados.find(x => x.nombre === nombre);
    if (s) s[campo] = valor;
    guardar();
}

// --- EVENTOS Y COMBATE ---
function agregarEvento() {
    const f = document.getElementById('eventoFecha').value;
    const n = document.getElementById('eventoNombre').value.trim();
    if (!f || !n) return alert("Faltan datos");
    datos.eventos.push({ fecha: f, nombre: n, id: Date.now() });
    actualizarTodo();
}

function eliminarEvento() {
    const sel = document.querySelector('#tablaEventos tr.selected');
    if (!sel) return alert("Selecciona una fila");
    datos.eventos.splice(sel.dataset.index, 1);
    actualizarTodo();
}

function marcarAsistencia() {
    const e = document.getElementById('asistenciaEvento').value;
    const s = document.getElementById('asistenciaSoldado').value;
    if (!e || !s) return;
    if (datos.asistencias.find(x => x.eventoId == e && x.soldado == s)) return alert("Ya asistió");
    datos.asistencias.push({ eventoId: parseInt(e), soldado: s, id: Date.now() });
    actualizarTodo();
}

function registrarCombate() {
    const e = document.getElementById('combateEvento').value;
    const s = document.getElementById('combateSoldado').value;
    const k = parseInt(document.getElementById('combateKills').value) || 0;
    const a = parseInt(document.getElementById('combateAsistencias').value) || 0;
    if (!e || !s) return;
    datos.combates.push({ eventoId: parseInt(e), soldado: s, kills: k, asistencias: a, id: Date.now() });
    actualizarTodo();
}

function eliminarFila(tipo, id) {
    datos[tipo] = datos[tipo].filter(x => x.id !== id);
    actualizarTodo();
}

// --- RENDERIZADO ---
function actualizarTodo() {
    guardar();
    
    // Selects
    const optSol = datos.soldados.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
    const optEv = datos.eventos.map(e => `<option value="${e.id}">${e.fecha} - ${e.nombre}</option>`).join('');
    
    document.getElementById('asistenciaSoldado').innerHTML = document.getElementById('combateSoldado').innerHTML = document.getElementById('promoSoldadoSeleccionado').innerHTML = '<option value="">-- SELECCIONAR --</option>' + optSol;
    document.getElementById('asistenciaEvento').innerHTML = document.getElementById('combateEvento').innerHTML = '<option value="">-- SELECCIONAR --</option>' + optEv;

    // Tabla Eventos
    document.querySelector('#tablaEventos tbody').innerHTML = datos.eventos.map((e,i) => `<tr data-index="${i}" onclick="this.parentElement.querySelectorAll('tr').forEach(r=>r.classList.remove('selected'));this.classList.add('selected')"><td>${e.fecha}</td><td>${e.nombre}</td></tr>`).join('');

    // Tabla Asistencias
    document.querySelector('#tablaAsistencias tbody').innerHTML = datos.asistencias.map(a => {
        const ev = datos.eventos.find(x => x.id == a.eventoId);
        return `<tr><td>${a.soldado}</td><td>${ev?.nombre || '??'}</td><td>${ev?.fecha || '--'}</td><td><button class="danger" onclick="eliminarFila('asistencias', ${a.id})">X</button></td></tr>`;
    }).join('');

    // Tabla Combate
    document.querySelector('#tablaCombate tbody').innerHTML = datos.combates.map(c => {
        const ev = datos.eventos.find(x => x.id == c.eventoId);
        return `<tr><td>${c.soldado}</td><td>${ev?.nombre || '??'}</td><td>${c.kills}</td><td>${c.asistencias}</td><td><button class="danger" onclick="eliminarFila('combates', ${c.id})">X</button></td></tr>`;
    }).join('');

    // Tabla Promociones (Top Puntos)
    const sortedPromos = [...datos.soldados].sort((a,b) => b.puntos - a.puntos);
    document.querySelector('#tablaPromociones tbody').innerHTML = sortedPromos.map(s => `
        <tr>
            <td>${s.nombre}</td>
            <td><select onchange="cambioManual('${s.nombre}', 'rango', this.value)">${RANGOS.map(r => `<option ${s.rango==r?'selected':''}>${r}</option>`).join('')}</select></td>
            <td><select onchange="cambioManual('${s.nombre}', 'compañia', this.value)">${COMPANIAS.map(c => `<option ${s.compañia==c?'selected':''}>${c}</option>`).join('')}</select></td>
            <td><span class="puntos-badge">${s.puntos}</span></td>
            <td><button onclick="ajustarPuntos('${s.nombre}', 1)">+</button> <button class="danger" onclick="ajustarPuntos('${s.nombre}', -1)">-</button></td>
            <td><button class="btn-promote" onclick="promoverSoldado('${s.nombre}')">PROMOTE</button></td>
        </tr>`).join('');

    // Tabla Personal
    document.querySelector('#tablaNombres tbody').innerHTML = datos.soldados.map((s,i) => `<tr><td>${i+1}</td><td>${s.nombre}</td><td><button class="danger" onclick="eliminarSoldado('${s.nombre}')">BORRAR</button></td></tr>`).join('');

    renderIntel();
}

function renderIntel() {
    const totalK = datos.combates.reduce((acc, c) => acc + c.kills, 0);
    const totalA = datos.combates.reduce((acc, c) => acc + c.asistencias, 0);
    document.getElementById('totalOperaciones').textContent = datos.eventos.length;
    document.getElementById('totalPersonal').textContent = datos.soldados.length;
    document.getElementById('totalKills').textContent = totalK;
    document.getElementById('totalAsistencias').textContent = totalA;

    const kMap = {}; datos.combates.forEach(c => kMap[c.soldado] = (kMap[c.soldado] || 0) + c.kills);
    const topK = Object.entries(kMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.querySelector('#tablaTopKills tbody').innerHTML = topK.map(t => `<tr><td>${t[0]}</td><td>${t[1]} Kills</td></tr>`).join('');

    const sortedPts = [...datos.soldados].sort((a,b) => b.puntos - a.puntos).slice(0,5);
    document.querySelector('#tablaTopPuntos tbody').innerHTML = sortedPts.map(s => `<tr><td>${s.nombre}</td><td>${s.puntos} Pts</td></tr>`).join('');
}

// --- UTILIDADES ---
function exportarDatos() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datos));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "regimiento_backup.json");
    dlAnchorElem.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => { datos = JSON.parse(event.target.result); actualizarTodo(); };
    reader.readAsText(e.target.files[0]);
}

function resetearTodo() { if(confirm("¿BORRAR TODO EL SISTEMA?")) { localStorage.clear(); location.reload(); } }

init();
