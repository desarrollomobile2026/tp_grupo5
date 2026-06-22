// ============================================================================
// scanner.js — Escáner de códigos QR con html5-qrcode + ingreso manual
// ============================================================================

// Variable que guarda la instancia del escáner mientras está prendido
let escaner = null;

// Prende la cámara y empieza a escanear (se llama al entrar a la pantalla Escáner)
function iniciarEscaner() {
  if (escaner) return;                                  // Si ya está prendido, no hace nada
  // Crea el escáner apuntando al div con id="reader"
  escaner = new Html5Qrcode('reader');
  // Configuración: cuadro de lectura de 220px
  const config = { fps: 10, qrbox: 220 };
  // Arranca usando la cámara trasera del celular ("environment")
  escaner.start(
    { facingMode: 'environment' },                      // Cámara trasera
    config,                                             // Config
    (textoLeido) => {                                   // Callback cuando lee un código
      detenerEscaner();                                 // Apaga la cámara
      abrirFichaPorSku(textoLeido.trim());              // Busca el producto por SKU
    },
    () => {}                                            // Callback de "no se leyó nada": lo ignoramos
  ).catch((e) => {
    // Si falla (sin permiso de cámara, sin HTTPS, etc.), avisamos y dejamos el ingreso manual
    console.error('No se pudo iniciar la cámara:', e);  // Consola
    mostrarToast('No se pudo abrir la cámara. Usá el código manual.'); // Aviso
    escaner = null;                                     // Limpia para poder reintentar
  });
}

// Apaga la cámara y libera el escáner (al salir de la pantalla)
function detenerEscaner() {
  if (!escaner) return;                                 // Si no hay escáner, nada
  escaner.stop()                                        // Detiene la cámara
    .then(() => { escaner.clear(); escaner = null; })   // Limpia el div y la variable
    .catch(() => { escaner = null; });                  // Si falla, igual limpia la variable
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
  // Compara sin distinguir mayúsculas/minúsculas, por las dudas
  const p = S.productos.find(x => x.sku.toLowerCase() === sku.toLowerCase());
  if (!p) {                                             // Si no se encontró...
    mostrarToast('Producto no encontrado: ' + sku);     // Avisa con el código
    return;                                             // Corta
  }
  abrirFicha(p.sku);                                    // Abre la ficha (función de app.js)
}
