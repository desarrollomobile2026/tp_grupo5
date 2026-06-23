// ============================================================================
// scanner.js — Escáner de códigos QR con html5-qrcode + ingreso manual
// ============================================================================

// Variable que guarda la instancia del escáner mientras está prendido
let escaner = null;

// Muestra un texto de estado debajo del visor (lo que la cámara va leyendo / avisos).
// Es CLAVE para no quedar "a ciegas": si la cámara lee algo, lo vemos en pantalla.
function estadoEscaner(texto) {
  const el = document.getElementById('scan-estado');   // Línea de estado del escáner
  if (el) el.textContent = texto || '';                // Si existe, le pone el texto
}

// Prende la cámara y empieza a escanear (se llama al entrar a la pantalla Escáner)
function iniciarEscaner() {
  if (escaner) return;                                  // Si ya está prendido, no hace nada
  estadoEscaner('Encendiendo la cámara…');             // Aviso mientras pide permiso
  // Crea el escáner apuntando al div con id="reader"
  escaner = new Html5Qrcode('reader');
  // Configuración del escáner.
  // qrbox va como FUNCIÓN (no un número fijo): el cuadro de lectura se calcula según
  // el tamaño REAL del visor, así funciona en cualquier celular. Sacamos el aspectRatio
  // forzado: que la cámara entregue su cuadro natural mejora MUCHO la lectura.
  const config = {
    fps: 10,                                            // Intentos de lectura por segundo
    qrbox: function (anchoVisor, altoVisor) {           // Recibe el tamaño real del visor
      const ladoMenor = Math.min(anchoVisor, altoVisor); // Tomamos el lado más corto
      const lado = Math.floor(ladoMenor * 0.8);         // Usamos el 80% de ese lado
      return { width: lado, height: lado };             // Cuadro de lectura cuadrado y proporcional
    }
  };
  // Arranca usando la cámara trasera del celular ("environment")
  escaner.start(
    { facingMode: 'environment' },                      // Cámara trasera
    config,                                             // Config
    (textoLeido) => {                                   // Callback cuando lee un código
      estadoEscaner('Leído: ' + textoLeido);            // Mostramos SIEMPRE qué se leyó (diagnóstico)
      detenerEscaner();                                 // Apaga la cámara
      abrirFichaPorSku(extraerSku(textoLeido));         // Busca el producto por SKU
    },
    () => {}                                            // Callback de "no se leyó nada": lo ignoramos
  ).then(() => {
    estadoEscaner('Apuntá al código QR del producto.'); // La cámara ya está lista
  }).catch((e) => {
    // Si falla (sin permiso de cámara, sin HTTPS, etc.), avisamos y dejamos el ingreso manual
    console.error('No se pudo iniciar la cámara:', e);  // Consola
    estadoEscaner('No se pudo abrir la cámara. Usá el código manual.'); // Aviso en pantalla
    mostrarToast('No se pudo abrir la cámara. Usá el código manual.');  // Aviso flotante
    escaner = null;                                     // Limpia para poder reintentar
  });
}

// Limpia el texto que leyó el QR por si vino dentro de una URL o con espacios.
// Nuestros QR guardan SOLO el SKU, pero por las dudas contemplamos una URL con ?sku=...
function extraerSku(texto) {
  let t = (texto || '').trim();                         // Saca espacios de los costados
  if (/^https?:\/\//i.test(t)) {                        // Si parece una dirección web (http...)
    try {
      const url = new URL(t);                           // La parseamos
      const param = url.searchParams.get('sku');        // ¿Tiene ?sku=...?
      if (param) return param.trim();                   // Si sí, ese es el SKU
      const partes = url.pathname.split('/').filter(Boolean); // Si no, tomamos el final de la ruta
      if (partes.length) return decodeURIComponent(partes[partes.length - 1]).trim();
    } catch (e) { /* si no se puede parsear, seguimos con el texto crudo */ }
  }
  return t;                                             // Caso normal: el texto ES el SKU
}

// Apaga la cámara y libera el escáner (al salir de la pantalla o al leer un QR).
// IMPORTANTE: esta función puede llamarse DOS veces seguidas (una al leer el QR y
// otra cuando mostrarPantalla cambia de pantalla). Si llamábamos a stop() dos veces,
// html5-qrcode tiraba un error que CORTABA la navegación y se quedaba en el escáner.
// Por eso ahora marcamos el escáner como apagado ANTES y protegemos el stop().
function detenerEscaner() {
  if (!escaner) return;                                 // Si ya está apagado, no hace nada
  const ref = escaner;                                  // Guardamos la instancia actual
  escaner = null;                                       // La marcamos apagada YA (la 2da llamada sale arriba)
  try {
    ref.stop()                                          // Detiene la cámara
      .then(() => ref.clear())                          // Limpia el div del visor
      .catch(() => {});                                 // Si falla al frenar, lo ignoramos
  } catch (e) {
    /* Si stop() tira un error sincrónico (cámara ya frenando), lo ignoramos. */
  }
}

// Busca el producto cuando se ingresa el SKU a mano y se aprieta el botón
function buscarPorSkuManual() {
  const sku = document.getElementById('sku-manual').value.trim(); // Lee el SKU escrito
  if (!sku) {                                           // Si está vacío...
    mostrarToast('Escribí un código (SKU)');            // Avisa
    return;                                             // Corta
  }
  document.getElementById('sku-manual').value = '';     // Limpia el campo
  abrirFichaPorSku(sku);                                // Busca y abre la ficha
}

// Busca un producto por su SKU y abre su ficha; si no existe, avisa
function abrirFichaPorSku(sku) {
  const limpio = (sku || '').trim();                    // SKU sin espacios
  // Compara sin distinguir mayúsculas/minúsculas, por las dudas
  const p = S.productos.find(x => x.sku.toLowerCase() === limpio.toLowerCase());
  if (!p) {                                             // Si no se encontró...
    estadoEscaner('No se encontró el producto: ' + limpio); // Lo deja a la vista
    mostrarToast('Producto no encontrado: ' + limpio);  // Avisa con el código
    return;                                             // Corta
  }
  abrirFicha(p.sku);                                    // Abre la ficha (función de app.js)
}
