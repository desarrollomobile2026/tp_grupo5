// ============================================================================
// cart.js — Carrito de compra (Clienta) y de venta (Vendedora)
// La Clienta arma su carrito y FINALIZA COMPRA; la Vendedora arma la venta y la
// CONFIRMA. En los dos casos se descuenta el stock en tiempo real y se muestra
// un comprobante con TODO lo que se compró/vendió.
// ============================================================================

// -------------------- ESTADO DEL CARRITO --------------------
// El carrito vive dentro del objeto global S (definido en app.js):
//   S.carrito       → lista de ítems { sku, cantidad }
//   S.ultimaCompra  → última compra guardada para mostrar el comprobante
// Ya quedan inicializados en el objeto S de app.js, así que acá solo los usamos.

// -------------------- AYUDAS (cuentas chiquitas) --------------------

// Cuenta cuántas unidades hay en total en el carrito (para el globito del menú)
function contarCarrito() {
  // Suma todas las cantidades de cada ítem
  return S.carrito.reduce((suma, item) => suma + item.cantidad, 0);
}

// Calcula el precio total del carrito ($ unitario × cantidad de cada ítem)
function totalCarrito() {
  return S.carrito.reduce((suma, item) => {
    const p = S.productos.find(x => x.sku === item.sku);   // Busca el producto
    if (!p) return suma;                                   // Si no está, lo saltea
    return suma + (p.precio * item.cantidad);              // Suma su subtotal
  }, 0);
}

// -------------------- AGREGAR / QUITAR / CAMBIAR CANTIDAD --------------------

// Agrega un producto al carrito (o suma 1 si ya estaba). No deja pasar el stock.
function agregarAlCarrito(sku) {
  const p = S.productos.find(x => x.sku === sku);          // Busca el producto
  if (!p) return;                                          // Si no está, corta
  if (p.stock <= 0) {                                      // Si no hay stock...
    mostrarToast('Sin stock disponible');                 // Avisa
    return;                                                // Corta
  }
  const item = S.carrito.find(i => i.sku === sku);         // ¿Ya estaba en el carrito?
  if (item) {                                              // Si ya estaba...
    if (item.cantidad >= p.stock) {                        // ...y ya llegamos al stock máximo
      mostrarToast('No hay más stock disponible');         // Avisa
      return;                                              // Corta
    }
    item.cantidad++;                                       // Suma uno
  } else {
    S.carrito.push({ sku: sku, cantidad: 1 });             // Si no estaba, lo agrega con cantidad 1
  }
  const n = contarCarrito();                               // Total de ítems ahora
  // Mensaje según el rol (carrito de compra vs venta)
  mostrarToast(S.rol === 'cliente' ? ('Agregado al carrito · ' + n) : ('Agregado a la venta · ' + n));
  actualizarBadgeCarrito();                                // Refresca el globito del menú
}

// Cambia la cantidad de un ítem del carrito (sin bajar de 1 ni pasar el stock)
function cambiarCantCarrito(sku, delta) {
  const item = S.carrito.find(i => i.sku === sku);         // Busca el ítem
  if (!item) return;                                       // Si no está, corta
  const p = S.productos.find(x => x.sku === sku);          // Busca el producto (para el stock)
  if (!p) return;                                          // Si no está, corta
  let nueva = item.cantidad + delta;                       // Cantidad propuesta
  if (nueva < 1) nueva = 1;                                // Mínimo 1
  if (nueva > p.stock) {                                   // Si se pasa del stock...
    nueva = p.stock;                                       // ...la deja en el máximo
    mostrarToast('No hay más stock disponible');           // Avisa
  }
  item.cantidad = nueva;                                   // Guarda
  renderCarrito();                                         // Redibuja el carrito
  actualizarBadgeCarrito();                                // Y el globito del menú
}

// Saca un producto del carrito por completo
function quitarDelCarrito(sku) {
  S.carrito = S.carrito.filter(i => i.sku !== sku);        // Deja todos menos ese
  renderCarrito();                                         // Redibuja el carrito
  actualizarBadgeCarrito();                                // Refresca el globito
}

// Refresca el globito con el número de ítems en el menú de abajo (si está visible)
function actualizarBadgeCarrito() {
  const sec = q('screen-' + S.pantalla);                  // Pantalla actual
  const navKey = sec ? sec.getAttribute('data-nav') : 'no'; // ¿Muestra menú?
  if (navKey && navKey !== 'no') renderNav(navKey);        // Si sí, lo vuelve a dibujar con el número
}

// -------------------- PANTALLA: CARRITO --------------------

function renderCarrito() {
  // Título y botón cambian según el rol
  const esCliente = (S.rol === 'cliente');
  q('carrito-titulo').textContent = esCliente ? 'Mi carrito' : 'Venta en curso';
  const textoBoton = esCliente ? 'FINALIZAR COMPRA' : 'CONFIRMAR VENTA';
  const cont = q('carrito-content');                       // Contenedor del contenido

  // Estado VACÍO: mensaje amable + botón al catálogo
  if (S.carrito.length === 0) {
    cont.innerHTML = `
      <div class="pad" style="text-align:center;padding-top:60px;">
        <div style="font-size:46px;">🛍️</div>
        <div class="titulo-serif" style="font-size:18px;margin-top:10px;">
          ${esCliente ? 'Tu carrito está vacío' : 'No hay productos en la venta'}
        </div>
        <p class="subtxt" style="margin:8px 0 22px;">Agregá productos desde el catálogo o el escáner.</p>
        <button class="btn-secondary" onclick="navTo('home')">VER CATÁLOGO</button>
      </div>`;
    return;                                                // Corta (no hay nada que listar)
  }

  // Arma una fila por cada producto del carrito
  const filas = S.carrito.map(item => {
    const p = S.productos.find(x => x.sku === item.sku);   // Producto del ítem
    if (!p) return '';                                     // Si ya no existe, fila vacía
    // Foto chica (o recuadro rosa si no hay URL)
    const foto = p.foto_url ? `<img class="inv-foto" src="${p.foto_url}" alt="">` : '<div class="inv-foto"></div>';
    return `
      <div class="inv-item">
        ${foto}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:500;">${p.nombre}</div>
          <div class="subtxt" style="font-size:11px;margin-top:4px;">${precio(p.precio)} c/u</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="stepper">
            <button class="menos" onclick="cambiarCantCarrito('${p.sku}',-1)">−</button>
            <span style="font-weight:700;min-width:26px;text-align:center;">${item.cantidad}</span>
            <button class="mas" onclick="cambiarCantCarrito('${p.sku}',1)">+</button>
          </div>
          <button onclick="quitarDelCarrito('${p.sku}')" style="background:none;border:none;color:var(--rojo);font-size:11px;cursor:pointer;padding:0;">Quitar</button>
        </div>
      </div>`;
  }).join('');

  // Caja de total + botón de confirmar
  const total = totalCarrito();
  cont.innerHTML = `
    <div style="padding:14px 16px 0;">${filas}</div>
    <div class="pad">
      <div style="background:#fff;border:1px solid var(--linea);border-radius:16px;padding:15px 16px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-weight:600;">Total</span>
          <span class="titulo-serif" style="font-size:22px;color:var(--bordo);">${precio(total)}</span>
        </div>
      </div>
      <button class="btn-primary" onclick="confirmarCarrito()">${textoBoton}</button>
    </div>`;
}

// -------------------- CONFIRMAR (descuenta el stock de todo el carrito) --------------------

function confirmarCarrito() {
  if (S.carrito.length === 0) {                            // Si está vacío...
    mostrarToast('El carrito está vacío');                 // Avisa
    return;                                                // Corta
  }

  // 1) Validar que haya stock suficiente de CADA producto antes de tocar nada
  for (const item of S.carrito) {
    const p = S.productos.find(x => x.sku === item.sku);   // Producto del ítem
    if (!p) {                                              // Si ya no existe...
      mostrarToast('Un producto del carrito ya no está disponible');
      return;                                              // Corta
    }
    if (item.cantidad > p.stock) {                         // Si no alcanza el stock...
      mostrarToast('No hay stock suficiente de ' + p.nombre); // Avisa con el nombre
      return;                                              // Corta
    }
  }

  // 2) Guardar el comprobante ANTES de vaciar el carrito (para mostrar qué se compró)
  S.ultimaCompra = {
    rol: S.rol,                                            // Quién compró/vendió
    total: totalCarrito(),                                 // Total de la operación
    items: S.carrito.map(item => {                         // Copia de cada ítem
      const p = S.productos.find(x => x.sku === item.sku);
      return { nombre: p.nombre, cantidad: item.cantidad, precio: p.precio };
    })
  };

  // 3) Descontar el stock de TODOS los productos de una sola vez (operación atómica)
  const lote = window.db.batch();                          // "Lote" de cambios de Firestore
  S.carrito.forEach(item => {
    const ref = window.db.collection('productos').doc(item.sku); // Documento del producto
    // Resta la cantidad comprada usando increment (no pisa cambios de otros)
    lote.update(ref, { stock: firebase.firestore.FieldValue.increment(-item.cantidad) });
  });

  // 4) Enviar el lote a Firestore
  lote.commit().then(() => {
    S.carrito = [];                                        // Vacía el carrito
    mostrarPantalla('comprobante');                        // Muestra lo comprado/vendido
  }).catch((e) => {
    console.error('Error al confirmar el carrito:', e);    // Consola
    mostrarToast('No se pudo completar la operación');     // Avisa al usuario
  });
}

// -------------------- PANTALLA: COMPROBANTE (lo que compraste/vendiste) --------------------

function renderComprobante() {
  const compra = S.ultimaCompra;                           // Última compra guardada
  const cont = q('comprobante-content');                   // Contenedor
  if (!compra) {                                           // Si no hay (entró de más)...
    cont.innerHTML = '<div class="pad"><button class="btn-secondary" onclick="navTo(\'home\')">VOLVER</button></div>';
    return;                                                // Corta
  }
  const esCliente = (compra.rol === 'cliente');            // ¿Fue compra de clienta?
  const titulo = esCliente ? '¡Compra realizada!' : 'Venta registrada ✓';
  const subtitulo = esCliente ? 'Gracias por tu compra 💛' : 'El stock se actualizó en tiempo real.';

  // Una fila por ítem comprado: nombre ×cantidad ... subtotal
  const filas = compra.items.map(it => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--linea);">
      <span>${it.nombre} <span class="subtxt">×${it.cantidad}</span></span>
      <span style="font-weight:600;">${precio(it.precio * it.cantidad)}</span>
    </div>`).join('');

  // Cabecera bordó + detalle + total + botón LISTO
  cont.innerHTML = `
    <div style="background:linear-gradient(150deg,var(--bordo),var(--bordo-osc));border-radius:0 0 30px 30px;padding:34px 20px 40px;text-align:center;color:#fff;">
      <div style="font-size:44px;line-height:1;">✓</div>
      <div class="titulo-serif" style="font-size:22px;color:#fff;margin-top:8px;">${titulo}</div>
      <p style="color:rgba(255,255,255,.85);font-size:13px;margin-top:6px;">${subtitulo}</p>
    </div>
    <div class="pad">
      <div class="label" style="margin-top:6px;">Detalle</div>
      <div style="background:#fff;border:1px solid var(--linea);border-radius:16px;padding:6px 16px 14px;">
        ${filas}
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:12px;">
          <span style="font-weight:700;">Total</span>
          <span class="titulo-serif" style="font-size:22px;color:var(--bordo);">${precio(compra.total)}</span>
        </div>
      </div>
      <button class="btn-primary" style="margin-top:20px;" onclick="navTo('home')">LISTO</button>
    </div>`;
}
