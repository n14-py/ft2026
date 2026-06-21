const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tiktokLive = require('tiktok-live-connector');

// ============================================================================
// 🛡️ EXTRACCIÓN DEFINITIVA PARA RENDER Y NODE 24+
// Esto busca la clase en toda la librería sin importar cómo Render la empaquete
// ============================================================================
let WebcastPushConnection;

if (tiktokLive && typeof tiktokLive.WebcastPushConnection === 'function') {
    WebcastPushConnection = tiktokLive.WebcastPushConnection;
} else if (tiktokLive && tiktokLive.default && typeof tiktokLive.default.WebcastPushConnection === 'function') {
    WebcastPushConnection = tiktokLive.default.WebcastPushConnection;
} else {
    // Búsqueda profunda de la clase
    for (const key in tiktokLive) {
        if (key === 'WebcastPushConnection' || (typeof tiktokLive[key] === 'function' && tiktokLive[key].name === 'WebcastPushConnection')) {
            WebcastPushConnection = tiktokLive[key];
            break;
        }
    }
}

if (!WebcastPushConnection) {
    console.error("🛑 Error Crítico: Imposible encontrar WebcastPushConnection.");
    console.error("Revisa si la versión de tiktok-live-connector es compatible.");
    process.exit(1); // Detiene el servidor si la librería falla al cargar
}

// ============================================================================
// ⚙️ CONFIGURACIÓN DEL SERVIDOR EXPRESS Y WEBSOCKETS
// ============================================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Evita bloqueos si pruebas desde redes distintas
});

// Servimos los archivos estáticos (index.html, test.html y la carpeta de videos)
app.use(express.static('public'));

// ============================================================================
// 🗺️ DICCIONARIO DE REGALOS A JUGADORES (18 Goles)
// ============================================================================
const mapaGoles = {
    'Rose': 'matias_galarza.mp4',         // 1. Matías Galarza
    'Doughnut': 'mauricio.mp4',           // 2. Maurício
    'TikTok': 'lionel_messi.mp4',         // 3. Lionel Messi
    'Ice Cream': 'luis_diaz.mp4',         // 4. Luis Díaz
    'Panda': 'raul_jimenez.mp4',          // 5. Raúl Jiménez
    'Love Letter': 'luis_romo.mp4',       // 6. Luis Romo
    'Perfume': 'julian_quinones.mp4',     // 7. Julián Quiñones
    'Corgi': 'maximiliano_araujo.mp4',    // 8. Maximiliano Araújo
    'Mirror': 'jaminton_campaz.mp4',      // 10. Jaminton Campaz
    'Crown': 'vinicius_junior.mp4',       // 11. Vinícius Júnior
    'Motorcycle': 'matheus_cunha.mp4',    // 12. Matheus Cunha
    'Jet': 'kylian_mbappe.mp4',           // 13. Kylian Mbappé
    'Lion': 'erling_haaland.mp4',         // 14. Erling Haaland
    'Meteor': 'harry_kane.mp4',           // 15. Harry Kane
    'Whale': 'kai_havertz.mp4',           // 16. Kai Havertz
    'Trophy': 'cody_gakpo.mp4',           // 17. Cody Gakpo
    'Castle': 'jude_bellingham.mp4',      // 18. Jude Bellingham
    'Fire': 'viktor_gyokeres.mp4'         // 20. Viktor Gyökeres
};

// ============================================================================
// 👤 CONFIGURACIÓN DE TIKTOK LIVE
// ============================================================================
const tiktokUsername = "futbolmundial2026_";

// Opciones avanzadas para una conexión más robusta
let tiktokConnection = new WebcastPushConnection(tiktokUsername, {
    processInitialData: false,     // Ignora eventos que pasaron antes de encender el script
    enableExtendedGiftInfo: true,  // Trae mejor información de los regalos
    enableWebsocketUpgrade: true,  // Usa una conexión más estable
    requestPollingIntervalMs: 2000 // Frecuencia de chequeo interno
});

// 🔄 SISTEMA DE CONEXIÓN Y RECONEXIÓN AUTOMÁTICA
function conectarTikTok() {
    console.log(`\n⏳ Intentando conectar al Live de @${tiktokUsername}...`);
    
    tiktokConnection.connect().then(state => {
        console.log(`✅ ¡Conectado exitosamente al Live! Room ID: ${state.roomId}`);
    }).catch(err => {
        console.error('❌ Error al conectar. (Asegúrate de estar transmitiendo en vivo).');
        console.error(`Reintentando automáticamente en 10 segundos...`);
        // Si no está en vivo, reintenta cada 10 segundos silenciosamente
        setTimeout(conectarTikTok, 10000);
    });
}

// Iniciar la primera conexión
conectarTikTok();

// Evento: Se cayó el Live o la conexión a internet
tiktokConnection.on('disconnected', () => {
    console.log('⚠️ Conexión con TikTok interrumpida o Live finalizado. Reconectando...');
    conectarTikTok();
});

// Manejo de errores internos de la librería para evitar que el servidor crashee
tiktokConnection.on('error', (err) => {
    console.error('🚨 Error detectado en la librería de TikTok:', err.message);
});

// ============================================================================
// 🎁 ESCUCHADOR DE EVENTOS (REGALOS REALES)
// ============================================================================
tiktokConnection.on('gift', (data) => {
    // Evita el "spam" de la cola si un usuario manda un combo de 100 rosas seguidas.
    // Solo dispara la alerta final del combo.
    if (data.giftType === 1 && !data.repeatEnd) {
        return;
    }

    const nombreRegalo = data.giftName;
    const archivoVideo = mapaGoles[nombreRegalo];

    console.log(`[LIVE REAL] 🎁 ${data.uniqueId} envió: ${nombreRegalo}`);

    if (archivoVideo) {
        console.log(`[ALERTA OBS] ⚽ Disparando video: ${archivoVideo}`);
        // Mandamos la orden al frontend (OBS)
        io.emit('mostrar-gol', {
            video: `/videos/${archivoVideo}`,
            usuario: data.uniqueId,
            regalo: nombreRegalo,
            cantidad: data.repeatCount || 1
        });
    }
});

// ============================================================================
// 🧪 CANAL DE COMUNICACIÓN PARA PRUEBAS LOCALES (test.html)
// ============================================================================
io.on('connection', (socket) => {
    console.log('🔌 Nuevo cliente visual conectado (OBS o Panel de Pruebas)');

    socket.on('simular-regalo', (data) => {
        console.log(`[MODO PRUEBA] 🧪 Usuario simulado "${data.usuario}" envió: ${data.regalo}`);
        const archivoVideo = mapaGoles[data.regalo];
        
        if (archivoVideo) {
            io.emit('mostrar-gol', {
                video: `/videos/${archivoVideo}`,
                usuario: data.usuario,
                regalo: data.regalo,
                cantidad: 1
            });
        } else {
            console.log(`[MODO PRUEBA] ⚠️ Regalo '${data.regalo}' no está en el mapa.`);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Cliente visual desconectado');
    });
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// Render asigna dinámicamente un puerto en process.env.PORT, o usamos 3000 localmente.
// ============================================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('\n=============================================================');
    console.log(`🚀 SUPER SERVIDOR DE GOLES INICIADO CORRECTAMENTE`);
    console.log(`📡 Escuchando tráfico en el puerto: ${PORT}`);
    console.log('=============================================================\n');
});