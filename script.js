let datos = { soldados: [], eventos: [], asistencias: [], combates: [] };

function init() {
    const stored = localStorage.getItem('regimiento_data');
    if (stored) datos = JSON.parse(stored);
    actualizarTodo();
    updateClock();
}

function updateClock() {
    const now = new Date();
    document.getElementById('currentDateTime').textContent = now.toLocaleString();
    setTimeout(updateClock, 1000);
}

function guardar() {
    localStorage.setItem('regimiento_data', JSON.stringify(datos));
}

function switchTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function agregarEvento() {
    const f = document.getElementById('eventoFecha').value;
    const n = document.getElementById('eventoNombre').value.trim();
    if(!f || !n) return alert('Completa los campos');
    datos.eventos.push({fecha: f, nombre: n, id: Date.now()});
    guardar(); actualizarTodo();
}

function eliminarEvento() {
    const sel = document.querySelector('#tablaEventos tr.selected');
    if(!sel) return alert('Selecciona una fila');
    datos.eventos.splice(sel.dataset.index, 1);
    guardar(); actualizarTodo();
}

function marcarAsistencia() {
    const e = document.getElementById('asistenciaEvento').value;
    const s = document.getElementById('asistenciaSoldado').value;
    if(!e || !s) return alert('Faltan datos');
    if(datos.asistencias.find(x => x.eventoId == e && x.soldado == s)) return alert('Ya registrado');
    datos.asistencias.push({eventoId: parseInt(e), soldado: s, id: Date.now()});
    guardar(); actualizarTodo();
}

function registrarCombate() {
    const e = document.getElementById('combateEvento').value;
    const s = document.getElementById('combateSoldado').value;
    const k = parseInt(document.getElementById('combateKills').value) || 0;
    const a = parseInt(document.getElementById('combateAsistencias').value) || 0;
    if(!e || !s) return alert('Selecciona operador y op');
    datos.combates.push({eventoId: parseInt(e), soldado: s, kills: k, asistencias: a, id: Date.now()});
    guardar(); actualizarTodo();
}

function cargarNombres() {
    const input = document.getElementById('listaNombres').value;
    const nombres = input.split('\n').map(n => n.trim()).filter(n => n);
    datos.soldados = [...new Set([...datos.soldados, ...nombres])].sort();
    guardar(); actualizarTodo();
}

function eliminarSoldado(nombre) {
    if(!confirm('¿Eliminar operador y sus datos?')) return;
    datos.soldados = datos.soldados.filter(s => s !== nombre);
    datos.asistencias = datos.asistencias.filter(a => a.soldado !== nombre);
    datos.combates = datos.combates.filter(c => c.soldado !== nombre);
    guardar(); actualizarTodo();
}

function eliminarRegistro(tipo, id) {
    datos[tipo] = datos[tipo].filter(x => x.id !== id);
    guardar(); actualizarTodo();
}

function actualizarTodo() {
    // Eventos
    document.querySelector('#tablaEventos tbody').innerHTML = datos.eventos.map((e, i) => 
        `<tr data-index="${i}" onclick="this.parentElement.querySelectorAll('tr').forEach(r=>r.classList.remove('selected'));this.classList.add('selected')">
        <td>${e.fecha}</td><td>${e.nombre}</td></tr>`).join('');

    // Dropdowns
    const evOpt = datos.eventos.map(e => `<option value="${e.id}">${e.fecha} - ${e.nombre}</option>`).join('');
    const solOpt = datos.soldados.map(s => `<option value="${s}">${s}</option>`).join('');
    document.getElementById('asistenciaEvento').innerHTML = document.getElementById('combateEvento').innerHTML = '<option value="">-- SELECCIONAR OP --</option>' + evOpt;
    document.getElementById('asistenciaSoldado').innerHTML = document.getElementById('combateSoldado').innerHTML = '<option value="">-- OPERADOR --</option>' + solOpt;

    // Tablas
    document.querySelector('#tablaAsistencias tbody').innerHTML = datos.asistencias.map(a => {
        const ev = datos.eventos.find(x => x.id == a.eventoId);
        return ev ? `<tr><td>${a.soldado}</td><td>${ev.nombre}</td><td>${ev.fecha}</td><td><button class="danger" onclick="eliminarRegistro('asistencias', ${a.id})">X</button></td></tr>` : '';
    }).join('');

    document.querySelector('#tablaCombate tbody').innerHTML = datos.combates.map(c => {
        const ev = datos.eventos.find(x => x.id == c.eventoId);
        return ev ? `<tr><td>${c.soldado}</td><td>${ev.nombre}</td><td>${c.kills}</td><td>${c.asistencias}</td><td><button class="danger" onclick="eliminarRegistro('combates', ${c.id})">X</button></td></tr>` : '';
    }).join('');

    document.querySelector('#tablaNombres tbody').innerHTML = datos.soldados.map((s, i) => 
        `<tr><td>${i+1}</td><td>${s}</td><td><button class="danger" onclick="eliminarSoldado('${s}')">BORRAR</button></td></tr>`).join('');

    actualizarStats();
}

function actualizarStats() {
    const totalOps = datos.eventos.length;
    document.getElementById('totalOperaciones').textContent = totalOps;
    document.getElementById('totalPersonal').textContent = datos.soldados.length;

    let res = {};
    datos.soldados.forEach(s => res[s] = { k:0, a:0, asis:0 });
    datos.combates.forEach(c => { if(res[c.soldado]) { res[c.soldado].k += c.kills; res[c.soldado].a += c.asistencias; }});
    datos.asistencias.forEach(a => { if(res[a.soldado]) res[a.soldado].asis++; });

    const totalK = Object.values(res).reduce((acc, v) => acc + v.k, 0);
    const totalA = Object.values(res).reduce((acc, v) => acc + v.a, 0);
    document.getElementById('totalKills').textContent = totalK;
    document.getElementById('totalAsistencias').textContent = totalA;

    // Tops
    const topK = Object.entries(res).sort((a,b) => b[1].k - a[1].k).slice(0,5);
    document.querySelector('#tablaTopKills tbody').innerHTML = topK.map((s,i) => `<tr><td>${i+1}</td><td>${s[0]}</td><td>${s[1].k}</td></tr>`).join('');
    
    // Purga
    document.querySelector('#tablaPurga tbody').innerHTML = Object.entries(res)
        .map(s => ({n: s[0], as: s[1].asis, f: totalOps - s[1].asis}))
        .sort((a,b) => b.f - a.f)
        .map(s => `<tr><td>${s.n}</td><td>${totalOps}</td><td>${s.as}</td><td style="color:${s.f>0?'#da3633':''}">${s.f}</td></tr>`).join('');
}

function exportarDatos() {
    const blob = new Blob([JSON.stringify(datos)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "intel_regimiento.json"; a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { datos = JSON.parse(ev.target.result); guardar(); actualizarTodo(); };
    reader.readAsText(e.target.files[0]);
}

function resetearTodo() { if(confirm('¿BORRAR TODO EL SISTEMA?')) { localStorage.clear(); location.reload(); } }

init();
