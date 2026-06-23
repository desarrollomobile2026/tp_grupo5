// ============================================================================
// seed.js - Carga de datos demo de Ayroma en Firestore
// ----------------------------------------------------------------------------
// Este archivo NO se usa en la app final: es una herramienta de un solo uso.
// Se abre desde seed.html, se aprietan los botones y listo.
// Usa el mismo SDK "compat" 10.7.1 que la base de Seba, para ser consistentes.
// ============================================================================

// Inicializa Firebase solo si no estaba ya inicializado (evita errores al recargar)
if (!firebase.apps.length) {            // Si todavía no hay ninguna app de Firebase creada...
    firebase.initializeApp(firebaseConfig); // ...la inicializa con la config de config.js
}
// Atajo a la base de datos Firestore (igual que en app.js)
const db = firebase.firestore();

// ----------------------------------------------------------------------------
// 1. USUARIOS — 6 documentos. El ID de cada documento ES el UID de Firebase Auth.
//    Así, al loguearse, auth.js podrá leer el rol con: db.collection('usuarios').doc(user.uid)
// ----------------------------------------------------------------------------
const USUARIOS = [                                  // Lista (array) con los 6 usuarios de prueba
    { uid: "tdIUVtm9ata7hytpgKif1fdX7wn1", nombre: "Cliente Demo",  email: "cliente@ayroma.com",   rol: "cliente"   }, // Clienta
    { uid: "cnGSxmpY9AMPCJfJtBDXACvfPru2", nombre: "Vendedora Demo", email: "vendedora@ayroma.com", rol: "vendedora" }, // Vendedora
    { uid: "F2tZ1IsFs1MmkeshEGGAVNQH9283", nombre: "Dueña Ayroma",  email: "duena@ayroma.com",     rol: "duena"     }, // Dueña
    { uid: "nhGfSlxuA0XWmtmPhM0WzSIVwJC3", nombre: "Profe",         email: "profe@ayroma.com",     rol: "cliente"   }, // Profe (entra como clienta)
    { uid: "ZVGTGHJrTtPvjLO9c0UleNHyJ0h1", nombre: "Ayudante",      email: "ayudante@ayroma.com",  rol: "cliente"   }, // Ayudante (entra como clienta)
    { uid: "92Q1sljzztZvlBkXpNEdB5wxbMw1", nombre: "Invitado",      email: "invitado@ayroma.com",  rol: "cliente"   }  // Invitado (entra como clienta)
];

// ----------------------------------------------------------------------------
// 2. PRODUCTOS — 10 artículos de lencería Ayroma. El ID del documento ES el SKU.
//    Ventaja: el escáner lee el SKU del QR y busca directo con db...doc(sku).get()
//    Para la DEMO se cargan TODOS con el mismo stock alto (ver DEMO_NIVELES abajo): arrancan
//    en VERDE y no hay que tocar stock el día de la prueba. El stock/umbral de cada producto
//    que figura más abajo es solo de ejemplo: al cargar se pisa con DEMO_NIVELES.
//    foto_url está VACÍO: cargá las fotos desde la app (Dueña → editar producto) o pegá la URL acá.
// ----------------------------------------------------------------------------
const PRODUCTOS = [                                 // Lista con los 10 productos demo
    {
        sku: "AY-BD-0407",                          // Código único del producto (sirve de ID y de QR)
        nombre: "Body Aurelia",                     // Nombre comercial
        categoria: "bodies",                        // Categoría
        precio: 18900,                              // Precio en pesos
        stock: 3,                                   // Stock actual → CRÍTICO (<= 5)
        umbralBajo: 10,                             // A partir de acá o menos es BAJO (amarillo)
        umbralCritico: 5,                           // A partir de acá o menos es CRÍTICO (rojo)
        talles: ["85B", "90B", "95B"],              // Talles disponibles
        colores: ["Negro", "Bordó"],                // Colores disponibles
        foto_url: "",                               // TODO: pegar URL real de la foto
        descripcion: "Body de encaje con espalda descubierta.", // Descripción breve
        activo: true                                // Si está activo (visible en la tienda)
    },
    {
        sku: "AY-CJ-1102",                          // Código único
        nombre: "Conjunto Selene",                  // Nombre
        categoria: "conjuntos",                     // Categoría
        precio: 22500,                              // Precio
        stock: 8,                                   // Stock → BAJO (<= 10)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["85B", "90B"],                     // Talles
        colores: ["Negro", "Azul noche"],           // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Corpiño y bombacha de encaje floral.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-CR-0815",                          // Código único
        nombre: "Corsé Venus",                      // Nombre
        categoria: "corseteria",                    // Categoría
        precio: 31000,                              // Precio
        stock: 12,                                  // Stock → NORMAL (> 10)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["S", "M", "L"],                    // Talles
        colores: ["Dorado", "Negro"],               // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Corsé con varillas y detalle dorado.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-CJ-2203",                          // Código único
        nombre: "Conjunto Afrodita",                // Nombre
        categoria: "conjuntos",                     // Categoría
        precio: 24900,                              // Precio
        stock: 2,                                   // Stock → CRÍTICO (<= 5)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["90B", "95C"],                     // Talles
        colores: ["Bordó", "Negro"],                // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Conjunto de encaje con tiras ajustables.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-BD-0520",                          // Código único
        nombre: "Body Lumière",                     // Nombre
        categoria: "bodies",                        // Categoría
        precio: 19900,                              // Precio
        stock: 15,                                  // Stock → NORMAL
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["S", "M", "L"],                    // Talles
        colores: ["Negro", "Blanco"],               // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Body satinado con breteles finos.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-MD-0301",                          // Código único
        nombre: "Medias Noche",                     // Nombre
        categoria: "medias",                        // Categoría
        precio: 8900,                               // Precio
        stock: 5,                                   // Stock → CRÍTICO (<= 5)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["Único"],                          // Talle único
        colores: ["Negro"],                         // Color
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Medias de red con cintura alta.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-HW-0710",                          // Código único
        nombre: "Robe Celeste",                     // Nombre
        categoria: "homewear",                      // Categoría
        precio: 27500,                              // Precio
        stock: 9,                                   // Stock → BAJO (<= 10)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["S", "M", "L"],                    // Talles
        colores: ["Azul noche", "Dorado"],          // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Bata de gasa liviana con lazo.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-CJ-3304",                          // Código único
        nombre: "Conjunto Estela",                  // Nombre
        categoria: "conjuntos",                     // Categoría
        precio: 23500,                              // Precio
        stock: 20,                                  // Stock → NORMAL
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["85B", "90B", "95B"],              // Talles
        colores: ["Negro", "Bordó"],                // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Conjunto clásico de microfibra.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-CR-0922",                          // Código único
        nombre: "Corsé Aurora",                     // Nombre
        categoria: "corseteria",                    // Categoría
        precio: 33900,                              // Precio
        stock: 4,                                   // Stock → CRÍTICO (<= 5)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["M", "L"],                         // Talles
        colores: ["Negro", "Dorado"],               // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Corsé premium con bordado dorado.", // Descripción
        activo: true                                // Activo
    },
    {
        sku: "AY-BD-0611",                          // Código único
        nombre: "Body Náyade",                      // Nombre
        categoria: "bodies",                        // Categoría
        precio: 20900,                              // Precio
        stock: 11,                                  // Stock → NORMAL (> 10)
        umbralBajo: 10,                             // Umbral bajo
        umbralCritico: 5,                           // Umbral crítico
        talles: ["S", "M"],                         // Talles
        colores: ["Bordó", "Negro"],                // Colores
        foto_url: "",                               // TODO: pegar URL real
        descripcion: "Body de encaje con transparencias.", // Descripción
        activo: true                                // Activo
    }
];

// ----------------------------------------------------------------------------
// NIVELES DEMO — para la prueba del día queremos TODO el stock alto y en VERDE,
// así no hay que andar tocando stock. Estos valores se aplican a TODOS los
// productos por igual (pisan el stock/umbral que cada producto trae de ejemplo).
//   stock 80  → arranca en VERDE
//   baja a AMARILLO cuando llega a 40 (umbralBajo)
//   baja a ROJO cuando llega a 15 (umbralCritico)
// ----------------------------------------------------------------------------
const DEMO_NIVELES = {
    stock: 80,            // Unidades iniciales de cada artículo (alto → verde)
    umbralBajo: 40,       // Desde 40 o menos: AMARILLO (stock bajo)
    umbralCritico: 15     // Desde 15 o menos: ROJO (stock crítico)
};

// ----------------------------------------------------------------------------
// Función auxiliar: muestra mensajes en pantalla (en el div #log de seed.html)
// ----------------------------------------------------------------------------
function log(mensaje) {                              // Recibe un texto a mostrar
    const caja = document.getElementById("log");     // Busca el div donde escribimos
    caja.innerHTML += mensaje + "<br>";              // Agrega el mensaje y un salto de línea
    console.log(mensaje);                            // También lo manda a la consola del navegador
}

// ----------------------------------------------------------------------------
// 3. CARGAR USUARIOS — escribe los 6 documentos en la colección "usuarios"
//    Usa .set() con el UID como ID → si se corre de nuevo, sobrescribe (no duplica).
// ----------------------------------------------------------------------------
async function cargarUsuarios() {                    // Función asíncrona (espera a Firestore)
    log("⏳ Cargando usuarios...");                  // Avisa que empezó
    for (const u of USUARIOS) {                       // Recorre cada usuario de la lista
        // Guarda el documento usando el UID como identificador del documento
        await db.collection("usuarios").doc(u.uid).set({
            nombre: u.nombre,                         // Guarda el nombre
            email: u.email,                           // Guarda el email
            rol: u.rol                                // Guarda el rol (cliente/vendedora/duena)
        });
        log("✅ Usuario: " + u.email + " (" + u.rol + ")"); // Confirma cada uno
    }
    log("🎉 Listo: 6 usuarios cargados.");            // Avisa que terminó
}

// ----------------------------------------------------------------------------
// 4. CARGAR PRODUCTOS — escribe los 10 productos en la colección "productos"
//    Usa .set() con el SKU como ID → re-correr restaura el stock y no duplica.
// ----------------------------------------------------------------------------
async function cargarProductos() {                   // Función asíncrona
    log("⏳ Cargando productos...");                 // Avisa que empezó
    for (const p of PRODUCTOS) {                       // Recorre cada producto de la lista
        // Guarda el documento usando el SKU como ID. Con {...p, ...DEMO_NIVELES} pisamos el
        // stock y los umbrales de cada producto con los niveles altos de la demo (verde).
        await db.collection("productos").doc(p.sku).set({ ...p, ...DEMO_NIVELES });
        log("✅ Producto: " + p.sku + " — " + p.nombre + " (stock " + DEMO_NIVELES.stock + ")"); // Confirma
    }
    log("🎉 Listo: 10 productos cargados (todos en stock " + DEMO_NIVELES.stock + ", verde)."); // Avisa que terminó
}

// ----------------------------------------------------------------------------
// 5. PONER STOCK ALTO (DEMO) — deja TODOS los productos en stock 80 y umbrales 40/15.
//    Usa .update() con DEMO_NIVELES: toca SOLO stock + umbrales y NO pisa las fotos
//    ni el resto de los datos. Es lo que conviene correr antes de la prueba.
// ----------------------------------------------------------------------------
async function resetStock() {                         // Función asíncrona
    log("⏳ Poniendo stock alto (80) en todos los productos...");   // Avisa que empezó
    for (const p of PRODUCTOS) {                       // Recorre cada producto
        // Actualiza stock + umbrales con los niveles de la demo (no toca foto_url ni lo demás)
        await db.collection("productos").doc(p.sku).update(DEMO_NIVELES);
        log("🟢 " + p.sku + " → stock " + DEMO_NIVELES.stock + " (verde)"); // Confirma cada uno
    }
    log("🎉 Listo: todos en stock " + DEMO_NIVELES.stock + ", verde.");      // Avisa que terminó
}
