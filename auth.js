// ============================================================================
// auth.js — Login con Firebase Auth + detección de rol desde Firestore
// ============================================================================

// Inicia sesión con el email y la contraseña que se escribieron en el login
function iniciarSesion() {
  const email = document.getElementById('login-email').value.trim(); // Lee el email (sin espacios)
  const pass = document.getElementById('login-pass').value;          // Lee la contraseña
  const errorBox = document.getElementById('login-error');           // Caja de error
  errorBox.style.display = 'none';                                    // Oculta errores previos

  // Validación mínima: que no estén vacíos
  if (!email || !pass) {
    errorBox.textContent = 'Completá email y contraseña.';           // Mensaje
    errorBox.style.display = 'block';                                 // Lo muestra
    return;                                                           // Corta acá
  }

  // Pide a Firebase Auth que valide las credenciales
  window.auth.signInWithEmailAndPassword(email, pass)
    .catch((error) => {                                               // Si falla...
      // Mensaje genérico y simple para el usuario
      errorBox.textContent = 'Email o contraseña incorrectos.';      // Texto del error
      errorBox.style.display = 'block';                               // Lo muestra
      console.error('Error de login:', error.code);                  // Detalle en consola
    });
  // Si anda bien, el listener onAuthStateChanged (abajo) se encarga del resto.
}

// Cierra la sesión y vuelve a la pantalla de bienvenida
function cerrarSesion() {
  window.auth.signOut();                                             // Firebase cierra la sesión
}

// Se ejecuta CADA vez que cambia el estado de login (entra o sale un usuario)
async function manejarSesion(user) {
  if (!user) {                                                       // Si NO hay usuario logueado...
    S.usuario = null;                                                // Limpia el estado
    S.rol = null;                                                    // Limpia el rol
    mostrarPantalla('bienvenida');                                   // Muestra la bienvenida
    document.getElementById('bottom-nav').style.display = 'none';    // Oculta el nav
    // Si entramos escaneando el QR desde la cámara (?sku=) y no hay sesión,
    // mostramos el pop-up con el logo que invita a loguearse para ver el producto.
    if (S.skuPendiente) mostrarPopupAcceso();
    return;                                                          // Corta
  }

  // Hay usuario: buscamos su documento en la colección "usuarios" por su UID
  try {
    const doc = await window.db.collection('usuarios').doc(user.uid).get(); // Lee usuarios/{uid}
    // Si el documento existe, tomamos el rol; si no, lo tratamos como cliente
    const datos = doc.exists ? doc.data() : { rol: 'cliente', nombre: user.email };
    S.usuario = { uid: user.uid, email: user.email, nombre: datos.nombre || user.email }; // Guarda usuario
    S.rol = datos.rol || 'cliente';                                  // Guarda el rol
  } catch (e) {
    console.error('No se pudo leer el rol:', e);                     // Aviso en consola
    S.usuario = { uid: user.uid, email: user.email, nombre: user.email }; // Datos mínimos
    S.rol = 'cliente';                                               // Por defecto, cliente
  }

  // Limpia los campos del login (por las dudas)
  document.getElementById('login-email').value = '';                 // Vacía email
  document.getElementById('login-pass').value = '';                  // Vacía contraseña

  // Empieza a escuchar los productos en tiempo real (definido en app.js)
  escucharProductos();

  // Rutea a la pantalla principal según el rol
  if (S.rol === 'duena') {                                           // La dueña arranca en el dashboard
    mostrarPantalla('dashboard');
  } else {                                                           // Cliente y vendedora arrancan en home
    mostrarPantalla('home');
  }
}
