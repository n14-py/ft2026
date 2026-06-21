const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Servir la carpeta public para los HTML y los videos
app.use(express.static('public'));

// ============================================================================
// 🗺️ DICCIONARIO DE REGALOS A JUGADORES
// ============================================================================
const mapaGoles = {
    'Rose': 'matias_galarza.mp4',         
    'Doughnut': 'mauricio.mp4',           
    'TikTok': 'lionel_messi.mp4',         
    'Ice Cream': 'luis_diaz.mp4',         
    'Panda': 'raul_jimenez.mp4',          
    'Love Letter': 'luis_romo.mp4',       
    'Perfume': 'julian_quinones.mp4',     
    'Corgi': 'maximiliano_araujo.mp4',    
    'Mirror': 'jaminton_campaz.mp4',      
    'Crown': 'vinicius_junior.mp4',       
    'Motorcycle': 'matheus_cunha.mp4',    
    'Jet': 'kylian_mbappe.mp4',           
    'Lion': 'erling_haaland.mp4',         
    'Meteor': 'harry_kane.mp4',           
    'Whale': 'kai_havertz.mp4',           
    'Trophy': 'cody_gakpo.mp4',           
    'Castle': 'jude_bellingham.mp4',      
    'Fire': 'viktor_gyokeres.mp4'         
};

const tiktokUsername = "futbolmundial2026_";

// ============================================================================
// 👤 CONEXIÓN A TIKTOK LIVE
// ============================================================================
let tiktokConnection = new WebcastPushConnection(tiktokUsername, {
    processInitialData: false,     
    enableExtendedGiftInfo: true,  
    enableWebsocketUpgrade: true,  
    requestPollingIntervalMs: 2000 
});

function conectarTikTok() {
    console.log(`\n⏳ Intentando conectar al Live de @${tiktokUsername}...`);
    
    tiktokConnection.connect().then(state => {
        console.log(`✅ ¡Conectado exitosamente al Live! Room ID: ${state.roomId}`);
    }).catch(err => {
        console.error('❌ Error al conectar. (El directo debe estar activo). Reintentando en 10s...');
        setTimeout(conectarTikTok, 10000);
    });
}

// Arrancar la conexión
conectarTikTok();

// Si se cae el live, intenta reconectar automáticamente
tiktokConnection.on('disconnected', () => {
    console.log('⚠️ Conexión interrumpida o Live finalizado. Reconectando...');
    conectarTikTok();
});

// Manejo de errores de la librería
tiktokConnection.on('error', (err) => {
    console.error('🚨 Error interno de TikTok:', err.message);
});

// ============================================================================
// 🎁 ESCUCHADOR DE REGALOS (LIVE REAL)
// ============================================================================
tiktokConnection.on('gift', (data) => {
    // Filtrar combos de regalos para que no se spamee la alerta
    if (data.giftType === 1 && !data.repeatEnd) return; 

    const nombreRegalo = data.giftName;
    const archivoVideo = mapaGoles[nombreRegalo];

    console.log(`[LIVE REAL] 🎁 ${data.uniqueId} envió: ${nombreRegalo}`);

    if (archivoVideo) {
        console.log(`[ALERTA OBS] ⚽ Disparando video: ${archivoVideo}`);
        io.emit('mostrar-gol', {
            video: `/videos/${archivoVideo}`,
            usuario: data.uniqueId,
            regalo: nombreRegalo,
            cantidad: data.repeatCount || 1
        });
    }
});

// ============================================================================
// 🧪 CANAL DE COMUNICACIÓN PARA PRUEBAS (test.html)
// ============================================================================
io.on('connection', (socket) => {
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
        }
    });
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('\n=============================================================');
    console.log(`🚀 SERVIDOR INICIADO CORRECTAMENTE`);
    console.log(`📡 Escuchando tráfico en el puerto: ${PORT}`);
    console.log('=============================================================\n');
});