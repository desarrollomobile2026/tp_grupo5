// ============================================================================
// inventory.js — Semáforo de stock, KPIs, registrar venta y gestión (dueña)
// ============================================================================

// Devuelve el ESTADO del semáforo de un producto según su stock y umbrales
function estadoSemaforo(p) {
  if (p.stock <= p.umbralCritico) return 'critico';   // Stock <= crítico → rojo
  if (p.stock <= p.umbralBajo)    return 'bajo';       // Stock <= bajo → amarillo
  return 'normal';                                     // Si no, verde
}

// Devuelve datos visuales (clase de color y etiqueta) según el estado
function infoSemaforo(estado) {
  if (estado === 'critico') return { clase: 'estado-critico', label: 'Crítico' };
  if (estado === 'bajo')    return { clase: 'estado-bajo',    label: 'Stock bajo' };
  return { clase: 'estado-normal', label: 'En stock' };
}

// --------------------------------------------------------------------------
// REGISTRAR VENTA: baja el stock del producto en Firestore (en tiempo real)
// --------------------------------------------------------------------------
function registrarVenta(sku, cantidad) {
  const p = S.productos.find(x => x.sku === sku);      // Busca el producto en memoria
  if (!p) return;                                      // Si no está, corta
  if (cantidad > p.stock) {                            // No se puede vender más de lo que hay
    mostrarToast('No hay stock suficiente');           // Avisa
    return;                                            // Corta
  }
  // Resta la cantidad al stock usando increment (operación atómica de Firestore)
  window.db.collection('productos').doc(sku).update({
    stock: firebase.firestore.FieldValue.increment(-cantidad)
  }).then(() => {
    mostrarToast('Venta registrada ✓');                // Confirma la venta
    // Registra la venta en la colección "ventas" (la Dueña vende de a uno; medio: efectivo por defecto)
    window.db.collection('ventas').add({
      fecha: firebase.firestore.FieldValue.serverTimestamp(), // Hora del servidor
      rol: S.rol,                                        // duena
      usuario: (S.usuario && S.usuario.email) || '',     // Quién la hizo
      medioPago: 'efectivo',                             // Por defecto efectivo (la venta directa no pide medio)
      total: p.precio * cantidad,                        // Total
      items: [{ sku: p.sku, nombre: p.nombre, cantidad: cantidad, precio: p.precio }] // El producto vendido
    }).catch((e) => console.error('No se pudo registrar la venta:', e));
    // Avisa si el stock quedó en nivel crítico tras la venta
    const nuevoStock = p.stock - cantidad;             // Stock estimado luego de la venta
    if (nuevoStock <= p.umbralCritico) {               // Si quedó crítico...
      setTimeout(() => mostrarToast('⚠️ ' + p.nombre + ' quedó en stock crítico'), 1200);
    }
    // Vuelve a un lugar claro: la dueña al inventario, la vendedora al catálogo
    mostrarPantalla(S.rol === 'duena' ? 'inventario' : 'home');
  }).catch((e) => {
    console.error('Error al registrar venta:', e);     // Aviso en consola
    mostrarToast('No se pudo registrar la venta');     // Avisa al usuario
  });
}

// --------------------------------------------------------------------------
// AJUSTAR STOCK a mano (solo dueña, desde el inventario con los botones − / +)
// --------------------------------------------------------------------------
function ajustarStock(sku, delta) {
  const p = S.productos.find(x => x.sku === sku);      // Busca el producto
  if (!p) return;                                      // Si no está, corta
  if (p.stock + delta < 0) return;                     // No deja stock negativo
  // Suma o resta 1 (delta) al stock
  window.db.collection('productos').doc(sku).update({
    stock: firebase.firestore.FieldValue.increment(delta)
  }).catch((e) => console.error('Error al ajustar stock:', e));
  // No hace falta re-renderizar: el onSnapshot actualiza la lista solo.
}

// --------------------------------------------------------------------------
// DASHBOARD de la dueña: ventas del mes (ficticias) + medios de pago +
// KPIs de inventario (reales) + alertas de stock (semáforo)
// --------------------------------------------------------------------------

function renderDashboard() {
  document.getElementById('dash-nombre').textContent = S.usuario ? S.usuario.nombre : '—'; // Nombre

  // ---------- 1) VENTAS (datos REALES de la colección "ventas", en tiempo real) ----------
  const ventas = S.ventas || [];                       // Lista de ventas registradas (la llena escucharVentas)
  const operaciones = ventas.length;                   // Cantidad de ventas
  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0); // Total vendido
  const ticket = operaciones ? Math.round(totalVentas / operaciones) : 0; // Ticket promedio
  // Sumamos lo cobrado por cada medio de pago
  const porMedio = { mercadopago: 0, transferencia: 0, efectivo: 0 };
  ventas.forEach((v) => { if (porMedio[v.medioPago] !== undefined) porMedio[v.medioPago] += (v.total || 0); });
  const medios = [
    { ico: '💳', nombre: 'Mercado Pago',  monto: porMedio.mercadopago },
    { ico: '🏦', nombre: 'Transferencia', monto: porMedio.transferencia },
    { ico: '💵', nombre: 'Efectivo',      monto: porMedio.efectivo }
  ];

  // Tarjetas de KPIs de ventas
  document.getElementById('dash-ventas-kpis').innerHTML = `
    <div class="kpi destacado" style="grid-column:1/3;"><div class="label-kpi">Ventas del mes</div><div class="valor-kpi">${precio(totalVentas)}</div></div>
    <div class="kpi"><div class="label-kpi">Operaciones</div><div class="valor-kpi">${operaciones}</div></div>
    <div class="kpi"><div class="label-kpi">Ticket promedio</div><div class="valor-kpi">${precio(ticket)}</div></div>
  `;

  // Barras por medio de pago (cada una proporcional a su parte del total)
  document.getElementById('dash-medios').innerHTML = medios.map(m => {
    const pct = totalVentas ? Math.round(m.monto / totalVentas * 100) : 0; // % del total
    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
          <span>${m.ico} ${m.nombre}</span>
          <span style="font-weight:600;">${precio(m.monto)} · ${pct}%</span>
        </div>
        <div style="height:8px;background:var(--rosa2);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--bordo);"></div>
        </div>
      </div>`;
  }).join('');

  // ---------- 2) KPIs DE INVENTARIO (datos reales del stock) ----------
  const productos = S.productos;                       // Lista de productos en memoria
  const totalSkus = productos.length;                  // Cantidad de productos distintos (SKUs)
  const totalUnidades = productos.reduce((suma, p) => suma + p.stock, 0); // Suma de todo el stock
  const enCritico = productos.filter(p => estadoSemaforo(p) === 'critico').length; // Cuántos críticos
  const valorInv = productos.reduce((suma, p) => suma + (p.precio * p.stock), 0);  // Valor total del stock ($)

  // Dibuja las 4 tarjetas de KPIs de inventario
  document.getElementById('dash-kpis').innerHTML = `
    <div class="kpi"><div class="label-kpi">SKUs</div><div class="valor-kpi">${totalSkus}</div></div>
    <div class="kpi"><div class="label-kpi">Unidades</div><div class="valor-kpi">${totalUnidades}</div></div>
    <div class="kpi"><div class="label-kpi">En crítico</div><div class="valor-kpi" style="color:var(--rojo);">${enCritico}</div></div>
    <div class="kpi"><div class="label-kpi">Valor inventario</div><div class="valor-kpi">${precio(valorInv)}</div></div>
  `;

  // ---------- 3) REQUIERE ATENCIÓN (semáforo: stock bajo o crítico) ----------
  // Lista de productos que requieren atención (bajo o crítico)
  const atencion = productos.filter(p => estadoSemaforo(p) !== 'normal'); // Filtra no-normales
  const cont = document.getElementById('dash-alertas');                   // Contenedor
  if (atencion.length === 0) {                                            // Si no hay ninguno...
    cont.innerHTML = '<p class="subtxt pad">Todo el stock está en niveles normales. 🎉</p>';
    return;                                                               // Corta
  }
  // Dibuja una tarjeta por producto con problema
  cont.innerHTML = atencion.map(p => {
    const est = estadoSemaforo(p);                     // Estado del producto
    const info = infoSemaforo(est);                    // Datos visuales
    return `
      <div class="alerta ${est}">
        <span class="punto ${info.clase}"></span>
        <span style="flex:1;">${p.nombre}</span>
        <span style="font-weight:600;color:${est === 'critico' ? 'var(--rojo)' : 'var(--ambar)'};">${p.stock} u</span>
      </div>`;
  }).join('');
}

// --------------------------------------------------------------------------
// HISTORIAL de ventas (Dueña): lista todas las ventas registradas, la más nueva arriba
// --------------------------------------------------------------------------
function renderHistorial() {
  const cont = document.getElementById('hist-list');   // Contenedor de la lista
  const ventas = S.ventas || [];                       // Ventas registradas (ya ordenadas en escucharVentas)
  if (ventas.length === 0) {                            // Si no hay ninguna...
    cont.innerHTML = '<p class="subtxt pad">Todavía no hay ventas registradas.</p>';
    return;                                             // Corta
  }
  // Nombre lindo de cada medio de pago
  const nombreMedio = { mercadopago: '💳 Mercado Pago', transferencia: '🏦 Transferencia', efectivo: '💵 Efectivo' };
  // Dibuja una fila por venta
  cont.innerHTML = ventas.map((v) => {
    // Fecha legible (las recién creadas pueden no tener fecha todavía → "Recién")
    const fecha = (v.fecha && v.fecha.toDate)
      ? v.fecha.toDate().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : 'Recién';
    const cant = (v.items || []).reduce((s, it) => s + it.cantidad, 0); // Unidades vendidas
    const medio = nombreMedio[v.medioPago] || v.medioPago || '';        // Medio de pago
    const tipo = v.rol === 'cliente' ? 'Compra' : 'Venta';              // Compra (clienta) o Venta
    return `
      <div class="inv-item">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:600;">${precio(v.total)} <span class="subtxt" style="font-weight:400;">· ${cant} u</span></div>
          <div class="subtxt" style="font-size:11px;margin-top:4px;">${fecha} · ${medio} · ${tipo}</div>
        </div>
      </div>`;
  }).join('');
}

// --------------------------------------------------------------------------
// INVENTARIO de la dueña: lista con semáforo y botones − / + para ajustar
// --------------------------------------------------------------------------
function renderInventario() {
  const cont = document.getElementById('inv-list');    // Contenedor de la lista
  const txt = (S.filtroInv || '').toLowerCase();       // Texto de búsqueda en minúscula
  // Filtra por nombre o SKU según lo escrito
  const lista = S.productos.filter(p =>
    p.nombre.toLowerCase().includes(txt) || p.sku.toLowerCase().includes(txt)
  );
  // Dibuja cada producto del inventario
  cont.innerHTML = lista.map(p => {
    const est = estadoSemaforo(p);                     // Estado
    const info = infoSemaforo(est);                    // Datos visuales
    const foto = p.foto_url ? `<img class="inv-foto" src="${p.foto_url}" alt="">` : '<div class="inv-foto"></div>';
    return `
      <div class="inv-item">
        ${foto}
        <div style="flex:1;min-width:0;cursor:pointer;" onclick="abrirEditarProducto('${p.sku}')">
          <div style="font-size:13.5px;font-weight:500;">${p.nombre}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">
            <span class="punto ${info.clase}"></span>
            <span class="subtxt" style="font-size:11px;">${info.label} · ${p.sku}</span>
          </div>
        </div>
        <div class="stepper">
          <button class="menos" onclick="ajustarStock('${p.sku}',-1)">−</button>
          <span style="font-weight:700;min-width:26px;text-align:center;">${p.stock}</span>
          <button class="mas" onclick="ajustarStock('${p.sku}',1)">+</button>
        </div>
      </div>`;
  }).join('');
}

// Filtra el inventario cuando la dueña escribe en el buscador
function filtrarInventario(valor) {
  S.filtroInv = valor;                                 // Guarda el texto
  renderInventario();                                  // Vuelve a dibujar
}

// --------------------------------------------------------------------------
// ALTA / EDICIÓN de productos (solo dueña)
// --------------------------------------------------------------------------

// Abre el formulario VACÍO para crear un producto nuevo
function abrirNuevoProducto() {
  S.editSku = null;                                    // No estamos editando, es alta
  document.getElementById('nuevo-titulo').textContent = 'Nuevo producto'; // Título
  // Vacía todos los campos del formulario
  ['sku','nombre','precio','stock','bajo','critico','categoria','talles','colores','foto','desc']
    .forEach(c => document.getElementById('np-' + c).value = '');
  document.getElementById('np-sku').disabled = false;  // El SKU se puede escribir en un alta
  document.getElementById('np-baja').style.display = 'none'; // Sin botón de baja en alta
  mostrarPantalla('nuevo');                            // Muestra la pantalla
}

// Abre el formulario CARGADO con los datos de un producto existente
function abrirEditarProducto(sku) {
  const p = S.productos.find(x => x.sku === sku);      // Busca el producto
  if (!p) return;                                      // Si no está, corta
  S.editSku = sku;                                     // Marcamos que estamos editando este SKU
  document.getElementById('nuevo-titulo').textContent = 'Editar producto'; // Título
  // Carga cada campo con el valor actual
  document.getElementById('np-sku').value = p.sku;
  document.getElementById('np-sku').disabled = true;   // El SKU no se cambia al editar (es el ID)
  document.getElementById('np-nombre').value = p.nombre;
  document.getElementById('np-precio').value = p.precio;
  document.getElementById('np-stock').value = p.stock;
  document.getElementById('np-bajo').value = p.umbralBajo;
  document.getElementById('np-critico').value = p.umbralCritico;
  document.getElementById('np-categoria').value = p.categoria || '';
  document.getElementById('np-talles').value = (p.talles || []).join(', ');
  document.getElementById('np-colores').value = (p.colores || []).join(', ');
  document.getElementById('np-foto').value = p.foto_url || '';
  document.getElementById('np-desc').value = p.descripcion || '';
  document.getElementById('np-baja').style.display = 'block'; // Muestra el botón de baja
  mostrarPantalla('nuevo');                            // Muestra la pantalla
}

// Guarda el producto (alta o edición) en Firestore
function guardarProducto() {
  const sku = document.getElementById('np-sku').value.trim();      // SKU (ID del documento)
  const nombre = document.getElementById('np-nombre').value.trim(); // Nombre
  if (!sku || !nombre) {                                            // Campos mínimos
    mostrarToast('El SKU y el nombre son obligatorios');           // Avisa
    return;                                                         // Corta
  }
  // Arma el objeto del producto leyendo el formulario
  const producto = {
    sku: sku,                                                       // Código
    nombre: nombre,                                                 // Nombre
    categoria: document.getElementById('np-categoria').value.trim(), // Categoría
    precio: Number(document.getElementById('np-precio').value) || 0, // Precio (número)
    stock: Number(document.getElementById('np-stock').value) || 0,   // Stock (número)
    umbralBajo: Number(document.getElementById('np-bajo').value) || 10,    // Umbral bajo
    umbralCritico: Number(document.getElementById('np-critico').value) || 5, // Umbral crítico
    // Convierte "Negro, Bordó" en ["Negro","Bordó"] (saca espacios y vacíos)
    talles: document.getElementById('np-talles').value.split(',').map(s => s.trim()).filter(Boolean),
    colores: document.getElementById('np-colores').value.split(',').map(s => s.trim()).filter(Boolean),
    foto_url: document.getElementById('np-foto').value.trim(),      // URL de la foto
    descripcion: document.getElementById('np-desc').value.trim(),   // Descripción
    activo: true                                                    // Queda activo
  };
  // Guarda usando el SKU como ID (si existe, lo sobrescribe; si no, lo crea)
  window.db.collection('productos').doc(sku).set(producto)
    .then(() => {
      mostrarToast(S.editSku ? 'Producto actualizado ✓' : 'Producto creado ✓'); // Confirma
      volverAtras();                                                // Vuelve atrás
    })
    .catch((e) => {
      console.error('Error al guardar producto:', e);               // Consola
      mostrarToast('No se pudo guardar el producto');               // Avisa
    });
}

// Da de baja un producto (baja lógica: activo = false, no se borra de verdad)
function darDeBajaProducto() {
  if (!S.editSku) return;                                           // Solo si estamos editando
  if (!confirm('¿Seguro que querés dar de baja este producto?')) return; // Pide confirmación
  window.db.collection('productos').doc(S.editSku).update({ activo: false }) // Marca inactivo
    .then(() => {
      mostrarToast('Producto dado de baja');                        // Confirma
      volverAtras();                                                // Vuelve
    })
    .catch((e) => console.error('Error al dar de baja:', e));       // Consola
}
