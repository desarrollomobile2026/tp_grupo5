// ============================================================================
// app.js — Estado global, navegación entre pantallas, render y arranque
// Es el último script que carga: inicializa Firebase y enciende la app.
// ============================================================================

// -------------------- ESTADO GLOBAL --------------------
// Un solo objeto guarda todo lo que la app necesita recordar mientras corre.
const S = {
  usuario: null,        // Datos del usuario logueado { uid, email, nombre }
  rol: null,            // Rol: 'cliente' | 'vendedora' | 'duena'
  productos: [],        // Lista de productos (se llena con onSnapshot)
  pantalla: null,       // Id de la pantalla actual (sin el prefijo "screen-")
  anterior: null,       // Pantalla anterior (para el botón "volver")
  fichaSku: null,       // SKU del producto que se está viendo en la ficha
  ventaSku: null,       // SKU del producto que se está vendiendo
  ventaCant: 1,         // Cantidad elegida en la pantalla de venta
  filtroCat: null,      // Categoría elegida en el catálogo (null = todas)
  filtroTxt: '',        // Texto del buscador del catálogo
  filtroInv: '',        // Texto del buscador del inventario
  editSku: null,        // SKU que se está editando (null = alta nueva)
  carrito: [],          // Carrito de compra/venta: lista de { sku, cantidad } (ver cart.js)
  ultimaCompra: null,   // Última compra confirmada, para mostrar el comprobante (ver cart.js)
  skuPendiente: null,   // SKU que vino en la URL (?sku=) al entrar escaneando el QR desde la cámara
  accesoPendiente: null,// Cuenta demo que vino en la URL (?acceso=profe/ayudante) para rellenar el login
  medioPago: 'mercadopago', // Medio de pago elegido en el checkout (mercadopago/transferencia/efectivo)
  ventas: [],           // Ventas registradas (se llena con onSnapshot para la Dueña)
};
window.S = S;           // Lo dejamos global para que lo usen los otros archivos

// Variables para poder "apagar" los listeners en tiempo real si hace falta
let unsubProductos = null;
let unsubVentas = null;

// -------------------- HELPERS (ayudas chiquitas) --------------------

// Atajo para escribir menos: q('id') en vez de document.getElementById('id')
function q(id) { return document.getElementById(id); }

// Da formato de precio argentino: 18900 -> "$18.900"
function precio(n) { return '$' + Number(n || 0).toLocaleString('es-AR'); }

// Etiqueta linda del rol para mostrar
function nombreRol(rol) {
  if (rol === 'vendedora') return 'Vendedora';
  if (rol === 'duena') return 'Dueña';
  return 'Clienta';
}

// Muestra un aviso flotante (toast) durante 2.5 segundos
let toastTimer = null;                                  // Guarda el temporizador
function mostrarToast(mensaje) {
  const t = q('toast');                                 // Caja del toast
  t.textContent = mensaje;                              // Pone el texto
  t.classList.add('ver');                               // Lo muestra
  clearTimeout(toastTimer);                             // Cancela un toast anterior
  toastTimer = setTimeout(() => t.classList.remove('ver'), 2500); // Lo oculta a los 2.5s
}

// -------------------- POP-UP DE ACCESO (entrada por QR desde la cámara) --------------------

// Muestra el pop-up que invita a loguearse (cuando entrás por el QR y NO estás logueada)
function mostrarPopupAcceso() {
  document.getElementById('popup-acceso').style.display = 'flex'; // Lo hace visible
}

// Botón "Aceptar e ingresar" del pop-up: lo cierra y te lleva al login
function aceptarPopupAcceso() {
  document.getElementById('popup-acceso').style.display = 'none'; // Oculta el pop-up
  mostrarPantalla('login');                                       // Va a la pantalla de login
}

// -------------------- NAVEGACIÓN --------------------

// Definición de la barra inferior según el rol (ícono, etiqueta y pantalla destino)
const NAV = {
  cliente: [
    { key: 'inicio',   label: 'Inicio',    ico: '🏠', target: 'home' },
    { key: 'escanear', label: 'Escanear',  ico: '⛶', target: 'escaner' },
    { key: 'carrito',  label: 'Carrito',   ico: '🛍️', target: 'carrito' },
    { key: 'micuenta', label: 'Mi cuenta', ico: '👤', target: 'perfil' },
  ],
  vendedora: [
    { key: 'inicio',   label: 'Inicio',    ico: '🏠', target: 'home' },
    { key: 'escanear', label: 'Escanear',  ico: '⛶', target: 'escaner' },
    { key: 'carrito',  label: 'Venta',     ico: '🛍️', target: 'carrito' },
    { key: 'micuenta', label: 'Mi cuenta', ico: '👤', target: 'perfil' },
  ],
  duena: [
    { key: 'inicio',    label: 'Inicio',    ico: '🏠', target: 'inventario' },
    { key: 'escanear',  label: 'Escanear',  ico: '⛶', target: 'escaner' },
    { key: 'carrito',   label: 'Venta',     ico: '🛍️', target: 'carrito' },   // La Dueña también vende (mismo flujo que la Vendedora)
    { key: 'dashboard', label: 'Dashboard', ico: '📊', target: 'dashboard' },
    { key: 'micuenta',  label: 'Mi cuenta', ico: '👤', target: 'perfil' },
  ],
};

// Dibuja la barra inferior marcando como activo el ítem de la pantalla actual
function renderNav(activeKey) {
  const items = NAV[S.rol] || NAV.cliente;             // Menú según el rol
  const nav = q('bottom-nav');                         // Contenedor del nav
  const n = contarCarrito();                           // Cuántos ítems hay en el carrito (cart.js)
  // Crea un botón por cada ítem del menú
  nav.innerHTML = items.map(it => {
    // Si es el ítem del carrito y hay ítems, le ponemos un globito con el número
    const globito = (it.target === 'carrito' && n > 0) ? `<span class="cart-badge">${n}</span>` : '';
    return `
    <button class="nav-item ${it.key === activeKey ? 'activo' : ''}" onclick="navTo('${it.target}')">
      <span class="ico" style="position:relative;">${it.ico}${globito}</span>
      <span>${it.label}</span>
    </button>`;
  }).join('');
}

// Acción al tocar un ítem del nav (algunos van a una pantalla, otros avisan)
function navTo(target) {
  if (target === '__fav') {                            // Favoritos todavía no está hecho
    mostrarToast('Favoritos: próximamente');           // Avisa
    return;                                             // Corta
  }
  mostrarPantalla(target);                             // Va a la pantalla destino
}

// Muestra una pantalla por su nombre (ej: 'home', 'login', 'ficha'...)
function mostrarPantalla(id) {
  // Si salimos del escáner, apagamos la cámara
  if (S.pantalla === 'escaner' && id !== 'escaner') detenerEscaner();

  // Guarda cuál era la pantalla anterior (para el botón volver)
  if (S.pantalla && S.pantalla !== id) S.anterior = S.pantalla;
  S.pantalla = id;                                      // Actualiza la pantalla actual

  // Oculta todas las pantallas y muestra solo la elegida
  document.querySelectorAll('.screen').forEach(sec => sec.classList.remove('activa'));
  const sec = q('screen-' + id);                       // Busca la sección
  if (sec) sec.classList.add('activa');                // La muestra

  // Sube el scroll al principio del contenido
  const cont = sec ? sec.querySelector('.contenido') : null;
  if (cont) cont.scrollTop = 0;

  // Maneja la barra inferior: se muestra solo en pantallas con data-nav distinto de "no"
  const navKey = sec ? sec.getAttribute('data-nav') : 'no';
  const nav = q('bottom-nav');
  if (navKey && navKey !== 'no') {                      // Pantalla interna con nav
    renderNav(navKey);                                 // Dibuja el nav con el ítem activo
    nav.style.display = 'flex';                         // Lo muestra
  } else {
    nav.style.display = 'none';                         // Lo oculta (login, ficha, etc.)
  }

  // Llama al render que corresponda a cada pantalla dinámica
  if (id === 'home') renderHome();
  if (id === 'dashboard') renderDashboard();
  if (id === 'inventario') renderInventario();
  if (id === 'ficha') renderFicha();
  if (id === 'venta') renderVenta();
  if (id === 'carrito') renderCarrito();          // Carrito de compra/venta (cart.js)
  if (id === 'comprobante') renderComprobante();  // Comprobante de lo comprado/vendido (cart.js)
  if (id === 'historial') renderHistorial();      // Historial de ventas de la Dueña (inventory.js)
  if (id === 'perfil') renderPerfil();
  if (id === 'escaner') iniciarEscaner();
}

// Vuelve a la pantalla anterior (o al home si no hay anterior)
function volverAtras() {
  mostrarPantalla(S.anterior || 'home');
}

// -------------------- DATOS EN TIEMPO REAL --------------------

// Escucha la colección "productos" y actualiza la app en vivo (onSnapshot)
function escucharProductos() {
  if (unsubProductos) unsubProductos();                // Si ya escuchábamos, cortamos antes
  unsubProductos = window.db.collection('productos').onSnapshot((snap) => {
    S.productos = [];                                  // Vacía la lista
    snap.forEach((doc) => {                            // Recorre cada producto
      S.productos.push({ ...doc.data(), sku: doc.id }); // Lo agrega (el id del doc es el SKU)
    });
    // Si entramos escaneando el QR desde la cámara (?sku=), abrimos la ficha apenas
    // tenemos los productos cargados. Lo hacemos una sola vez (limpiamos skuPendiente).
    if (S.skuPendiente) {
      const sku = S.skuPendiente;                      // SKU que vino en la URL
      S.skuPendiente = null;                           // Lo limpiamos (que no se repita)
      const prod = S.productos.find(x => x.sku.toLowerCase() === sku.toLowerCase());
      if (prod) abrirFicha(prod.sku);                  // Si existe, abre su ficha
      else mostrarToast('Producto no encontrado: ' + sku); // Si no, avisa
    }
    // Si estamos parados en una pantalla que muestra productos, la refrescamos
    if (S.pantalla === 'home') renderHome();
    if (S.pantalla === 'dashboard') renderDashboard();
    if (S.pantalla === 'inventario') renderInventario();
    if (S.pantalla === 'ficha') renderFicha();
    if (S.pantalla === 'venta') renderVenta();
    if (S.pantalla === 'carrito') renderCarrito();   // Refresca el carrito si cambió el stock
  }, (error) => console.error('Error escuchando productos:', error)); // Si falla
}

// Escucha la colección "ventas" en tiempo real (para el dashboard y el historial de la Dueña).
// Se llama solo para la Dueña (es la única que ve esos datos).
function escucharVentas() {
  if (unsubVentas) unsubVentas();                      // Si ya escuchábamos, cortamos antes
  unsubVentas = window.db.collection('ventas').onSnapshot((snap) => {
    S.ventas = [];                                     // Vacía la lista
    snap.forEach((doc) => S.ventas.push({ ...doc.data(), id: doc.id })); // Carga cada venta
    // Ordena de la más nueva a la más vieja (las recién creadas pueden no tener fecha todavía)
    S.ventas.sort((a, b) => ((b.fecha && b.fecha.seconds) || 0) - ((a.fecha && a.fecha.seconds) || 0));
    if (S.pantalla === 'dashboard') renderDashboard(); // Si la Dueña está en el dashboard, lo refresca
    if (S.pantalla === 'historial') renderHistorial(); // Si está en el historial, lo refresca
  }, (error) => console.error('Error escuchando ventas:', error));
}

// -------------------- RENDER: HOME / CATÁLOGO --------------------

function renderHome() {
  q('home-nombre').textContent = S.usuario ? S.usuario.nombre : '—';   // Saludo
  q('home-chip-rol').textContent = nombreRol(S.rol);                    // Chip de rol

  // Productos visibles en la tienda: solo los activos
  const activos = S.productos.filter(p => p.activo !== false);

  // Arma la lista de categorías únicas para los chips
  const cats = [...new Set(activos.map(p => p.categoria).filter(Boolean))]; // Sin repetir
  const contCats = q('home-cats');                                     // Contenedor de chips
  // Chip "Todas" + un chip por categoría
  contCats.innerHTML =
    `<span class="cat-chip ${!S.filtroCat ? 'activa' : ''}" onclick="filtrarCategoria(null)">Todas</span>` +
    cats.map(c => `<span class="cat-chip ${S.filtroCat === c ? 'activa' : ''}" onclick="filtrarCategoria('${c}')">${c}</span>`).join('');

  // Aplica filtros de categoría y de texto de búsqueda
  let lista = activos;                                                  // Empieza con los activos
  if (S.filtroCat) lista = lista.filter(p => p.categoria === S.filtroCat); // Filtro categoría
  if (S.filtroTxt) {                                                    // Filtro texto
    const t = S.filtroTxt.toLowerCase();                               // En minúscula
    lista = lista.filter(p => p.nombre.toLowerCase().includes(t));     // Por nombre
  }

  // Dibuja la grilla de tarjetas
  const grid = q('home-grid');                                         // Contenedor grilla
  if (lista.length === 0) {                                            // Si no hay resultados
    grid.innerHTML = '<p class="subtxt" style="grid-column:1/3;text-align:center;padding:20px;">No hay productos para mostrar.</p>';
    return;                                                            // Corta
  }
  grid.innerHTML = lista.map(crearCard).join('');                     // Una card por producto
}

// Crea el HTML de una tarjeta de producto
function crearCard(p) {
  // La foto: si hay URL la usa; si no, un recuadro rosa
  const foto = p.foto_url ? `<img class="foto" src="${p.foto_url}" alt="">` : '<div class="foto"></div>';
  // El semáforo SOLO se muestra a vendedora y dueña (la clienta no ve stock)
  let badge = '';
  if (S.rol !== 'cliente') {                                           // Si NO es clienta
    const est = estadoSemaforo(p);                                     // Calcula estado
    const info = infoSemaforo(est);                                    // Datos visuales
    badge = `<div class="badge-semaforo"><span class="punto ${info.clase}"></span>${p.stock} u</div>`;
  }
  // Devuelve la tarjeta completa (al tocarla, abre la ficha)
  return `
    <div class="card" onclick="abrirFicha('${p.sku}')">
      <div style="position:relative;">${foto}${badge}</div>
      <div class="body">
        <div class="nombre">${p.nombre}</div>
        <div class="precio">${precio(p.precio)}</div>
      </div>
    </div>`;
}

// Cambia el filtro de categoría y redibuja
function filtrarCategoria(cat) { S.filtroCat = cat; renderHome(); }

// Cambia el filtro de texto (buscador) y redibuja
function filtrarBusqueda(valor) { S.filtroTxt = valor; renderHome(); }

// -------------------- RENDER: FICHA DE PRODUCTO --------------------

// Abre la ficha de un producto por su SKU
function abrirFicha(sku) {
  S.fichaSku = sku;                                     // Recuerda qué producto se ve
  mostrarPantalla('ficha');                            // Muestra la pantalla (que llama a renderFicha)
}

function renderFicha() {
  const p = S.productos.find(x => x.sku === S.fichaSku); // Busca el producto
  if (!p) return;                                       // Si no está, corta
  q('ficha-titulo').textContent = p.nombre;             // Título del appbar

  // Foto grande de la ficha. La foto REAL (img) se ve COMPLETA, sin recortar (ver style.css).
  // Si el producto no tiene foto, queda el recuadro rosa (div) con su alto fijo.
  const foto = p.foto_url ? `<img class="ficha-foto" src="${p.foto_url}" alt="">` : '<div class="ficha-foto"></div>';

  // Chips de talles (visuales; al tocar se resaltan)
  const talles = (p.talles || []).map(t => `<span class="opcion" onclick="seleccionarOpcion(this)">${t}</span>`).join('');
  // Chips de colores
  const colores = (p.colores || []).map(c => `<span class="opcion" onclick="seleccionarOpcion(this)">${c}</span>`).join('');

  // Bloque que cambia según el rol (acciones permitidas)
  let accionesHTML = '';
  if (S.rol === 'cliente') {
    // La clienta agrega al carrito y puede ir a verlo (no ve stock)
    accionesHTML = `
      <button class="btn-primary" onclick="agregarAlCarrito('${p.sku}')">AGREGAR AL CARRITO</button>
      <button class="btn-secondary" style="margin-top:10px;" onclick="navTo('carrito')">VER MI CARRITO</button>`;
  } else {
    // Vendedora y dueña ven el stock con semáforo
    const est = estadoSemaforo(p);                      // Estado del stock
    const info = infoSemaforo(est);                     // Datos visuales
    accionesHTML = `
      <div class="caja-stock ${est}">
        <span><span class="punto ${info.clase}"></span> &nbsp; Stock actual · ${info.label}</span>
        <strong>${p.stock} u</strong>
      </div>`;
    if (S.rol === 'vendedora' || S.rol === 'duena') {
      // Vendedora Y DUEÑA arman una venta con varios productos (mismo flujo de carrito de venta)
      accionesHTML += `
        <button class="btn-primary" onclick="agregarAlCarrito('${p.sku}')">AGREGAR A LA VENTA</button>
        <button class="btn-secondary" style="margin-top:10px;" onclick="navTo('carrito')">VER LA VENTA</button>`;
      // Extra SOLO para la Dueña: además del flujo de venta, puede editar el producto
      if (S.rol === 'duena') {
        accionesHTML += `
        <button class="btn-secondary" style="margin-top:10px;" onclick="abrirEditarProducto('${p.sku}')">EDITAR PRODUCTO</button>`;
      }
    }
  }

  // Arma todo el contenido de la ficha
  q('ficha-content').innerHTML = `
    ${foto}
    <div class="ficha-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div class="titulo-serif" style="font-size:22px;">${p.nombre}</div>
        <div class="precio" style="font-size:21px;white-space:nowrap;">${precio(p.precio)}</div>
      </div>
      <p class="subtxt" style="margin-top:8px;">${p.descripcion || ''}</p>
      <div class="subtxt" style="margin-top:6px;font-size:11.5px;">Código (SKU): <strong style="color:var(--bordo);">${p.sku}</strong></div>
      ${talles ? `<div class="label" style="margin-top:18px;">Talle</div><div class="opciones">${talles}</div>` : ''}
      ${colores ? `<div class="label">Color</div><div class="opciones">${colores}</div>` : ''}
      <div style="margin-top:10px;">${accionesHTML}</div>
    </div>`;
}

// Comparte un producto por su link (deep-link). Usa el menú nativo del celu
// (WhatsApp, etc.); si el navegador no lo soporta, copia el link al portapapeles.
function compartirProducto(sku) {
  const p = S.productos.find(x => x.sku === sku);       // Busca el producto
  if (!p) return;                                       // Si no está, corta
  // El link lleva el ?sku=: al abrirlo entra a la app y cae en la ficha (tras login)
  const url = 'https://desarrollomobile2026.github.io/tp_grupo5/?sku=' + p.sku;
  const datos = {                                       // Lo que se comparte
    title: 'Ayroma — ' + p.nombre,
    text: '¡Mirá este producto de Ayroma! ' + p.nombre + ' — ' + precio(p.precio),
    url: url
  };
  if (navigator.share) {                                // Si el celu tiene menú de compartir nativo...
    navigator.share(datos).catch(() => {});             // ...lo abre (WhatsApp, Instagram, etc.)
  } else if (navigator.clipboard) {                     // Si no, copiamos el link al portapapeles
    navigator.clipboard.writeText(url)
      .then(() => mostrarToast('Link copiado ✓'))
      .catch(() => mostrarToast(url));
  } else {
    mostrarToast(url);                                  // Último recurso: lo mostramos
  }
}

// Resalta la opción tocada (talle/color) y desmarca sus hermanas
function seleccionarOpcion(el) {
  // Saca la marca a todas las opciones de la misma fila
  el.parentNode.querySelectorAll('.opcion').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');                              // Marca la tocada
}

// -------------------- RENDER: REGISTRAR VENTA --------------------

// Abre la pantalla de venta para un producto
function abrirVenta(sku) {
  S.ventaSku = sku;                                     // Producto a vender
  S.ventaCant = 1;                                      // Cantidad arranca en 1
  mostrarPantalla('venta');                            // Muestra la pantalla
}

function renderVenta() {
  const p = S.productos.find(x => x.sku === S.ventaSku); // Busca el producto
  if (!p) return;                                       // Si no está, corta
  const est = estadoSemaforo(p);                        // Estado del stock
  const info = infoSemaforo(est);                       // Datos visuales
  const total = p.precio * S.ventaCant;                 // Total de la venta

  // Arma la pantalla de venta
  q('venta-content').innerHTML = `
    <div class="pad">
      <div class="titulo-serif" style="font-size:18px;">${p.nombre}</div>
      <div class="precio" style="margin-top:6px;">${precio(p.precio)}</div>

      <div class="caja-stock ${est}" style="margin-top:16px;">
        <span><span class="punto ${info.clase}"></span> &nbsp; Stock actual · ${info.label}</span>
        <strong>${p.stock} u</strong>
      </div>

      <div class="label">Cantidad a vender</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;background:#fff;border:1px solid var(--linea);border-radius:14px;padding:12px;margin-bottom:18px;">
        <button class="menos" style="width:42px;height:42px;border-radius:50%;border:none;background:var(--rosa2);color:var(--bordo);font-size:22px;cursor:pointer;" onclick="cambiarCantidadVenta(-1)">−</button>
        <span style="font-size:26px;font-weight:700;min-width:36px;text-align:center;">${S.ventaCant}</span>
        <button class="mas" style="width:42px;height:42px;border-radius:50%;border:none;background:var(--bordo);color:#fff;font-size:22px;cursor:pointer;" onclick="cambiarCantidadVenta(1)">+</button>
      </div>

      <div style="background:#fff;border:1px solid var(--linea);border-radius:16px;padding:15px 16px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;" class="subtxt"><span>${S.ventaCant} × ${precio(p.precio)}</span><span>${precio(total)}</span></div>
        <div style="height:1px;background:var(--linea);margin:11px 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-weight:600;">Total venta</span><span class="titulo-serif" style="font-size:22px;color:var(--bordo);">${precio(total)}</span></div>
      </div>

      <button class="btn-primary" onclick="confirmarVenta()">CONFIRMAR VENTA</button>
    </div>`;
}

// Cambia la cantidad a vender (sin pasar de 1 ni del stock disponible)
function cambiarCantidadVenta(delta) {
  const p = S.productos.find(x => x.sku === S.ventaSku); // Producto
  if (!p) return;                                       // Si no está, corta
  let nueva = S.ventaCant + delta;                      // Calcula la nueva cantidad
  if (nueva < 1) nueva = 1;                             // Mínimo 1
  if (nueva > p.stock) nueva = p.stock;                 // Máximo, el stock que hay
  S.ventaCant = nueva;                                  // Guarda
  renderVenta();                                        // Redibuja
}

// Confirma la venta: baja el stock (la lógica está en inventory.js)
function confirmarVenta() {
  registrarVenta(S.ventaSku, S.ventaCant);
}

// -------------------- RENDER: PERFIL --------------------

function renderPerfil() {
  const u = S.usuario || {};                            // Datos del usuario
  q('perfil-nombre').textContent = u.nombre || '—';     // Nombre
  q('perfil-email').textContent = u.email || '—';       // Email
  q('perfil-rol').textContent = nombreRol(S.rol);       // Rol
  // Avatar: primera letra del nombre en mayúscula
  q('perfil-avatar').textContent = (u.nombre || 'A').charAt(0).toUpperCase();
}

// -------------------- ARRANQUE --------------------

// Cuentas demo para el link de acceso "?acceso=XXX". NO son secretas (son cuentas demo).
const ACCESOS_DEMO = {
  profe:     { email: 'profe@ayroma.com',     pass: 'demo1234' },  // Profe → acceso total (rol dueña, tras re-seed)
  ayudante:  { email: 'ayudante@ayroma.com',  pass: 'demo1234' },  // Ayudante → acceso total (rol dueña, tras re-seed)
  duena:     { email: 'duena@ayroma.com',     pass: 'demo1234' },  // Dueña
  vendedora: { email: 'vendedora@ayroma.com', pass: 'demo1234' },  // Vendedora
  cliente:   { email: 'cliente@ayroma.com',   pass: 'demo1234' }   // Clienta
};

// Si se entró por un link "?acceso=XXX", va al login y deja el usuario y la contraseña YA escritos.
// La persona solo toca INGRESAR. Devuelve true si rellenó (para no mostrar la bienvenida).
function prefillAcceso() {
  if (!S.accesoPendiente) return false;                 // Si no vino el parámetro, no hace nada
  const datos = ACCESOS_DEMO[S.accesoPendiente];        // Busca los datos de esa cuenta demo
  S.accesoPendiente = null;                             // Se usa una sola vez
  if (!datos) return false;                             // Si el token no existe (mal escrito), nada
  mostrarPantalla('login');                             // Lleva a la pantalla de login
  const e = document.getElementById('login-email');     // Campo de email
  const p = document.getElementById('login-pass');      // Campo de contraseña
  if (e) e.value = datos.email;                         // Escribe el email
  if (p) p.value = datos.pass;                          // Escribe la contraseña
  mostrarToast('Tus datos ya están cargados. Tocá INGRESAR 💛'); // Avisa qué hacer
  return true;                                          // Avisa que rellenó
}

function arrancar() {
  // Si entramos por un link de QR (.../tp_grupo5/?sku=AY-...), guardamos ese SKU.
  // Más tarde (después del login y con los productos cargados) abrimos su ficha.
  const params = new URLSearchParams(window.location.search); // Lee la parte "?sku=..." de la URL
  const skuURL = params.get('sku');                    // Toma el valor del parámetro sku
  if (skuURL) S.skuPendiente = skuURL.trim();           // Si vino, lo guardamos en el estado
  const accesoURL = params.get('acceso');              // Toma el valor de ?acceso=profe / ?acceso=ayudante
  if (accesoURL) S.accesoPendiente = accesoURL.trim().toLowerCase(); // Si vino, lo guardamos (cuenta demo)

  firebase.initializeApp(firebaseConfig);              // Inicializa Firebase con la config
  window.auth = firebase.auth();                       // Guarda el módulo de autenticación
  window.db = firebase.firestore();                    // Guarda la base de datos
  // Cada vez que cambia el login (entra/sale alguien), llama a manejarSesion (auth.js)
  window.auth.onAuthStateChanged(manejarSesion);
}

// Arranca cuando el HTML terminó de cargar
document.addEventListener('DOMContentLoaded', arrancar);
