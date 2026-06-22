// config.js - Configuración de Firebase del proyecto Ayroma (Grupo 5)
// NOTA: en una app web este objeto NO es secreto; viaja al navegador del cliente.
// Por eso es seguro tenerlo en el repo. Apunta a NUESTRO proyecto (no al de la cátedra).
const firebaseConfig = {
    apiKey: "AIzaSyBpWF3u9orGKwmrmwTCFme9vFD1GL3KevI",                 // Clave pública del proyecto Firebase
    authDomain: "project-bcac9961-b4c5-4631-9a2.firebaseapp.com",      // Dominio para el login (Authentication)
    projectId: "project-bcac9961-b4c5-4631-9a2",                       // ID único de nuestro proyecto
    storageBucket: "project-bcac9961-b4c5-4631-9a2.firebasestorage.app", // Bucket de Storage (no lo usamos, pero va igual)
    messagingSenderId: "163899431360",                                 // ID del remitente (notificaciones, no lo usamos)
    appId: "1:163899431360:web:e521c9ed05cf1caa349025"                 // ID de la app web "ayroma-web"
};
